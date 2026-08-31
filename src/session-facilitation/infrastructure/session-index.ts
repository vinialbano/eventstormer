import type { SessionId, WorkshopId } from '~/plumbing/ids.ts'
import { err, ok, type Result } from '~/plumbing/result.ts'
import type { EventStore } from '~/plumbing/event-store/port.ts'

/**
 * The `session_index` projection — session enumeration and the one-open-session
 * constraint. Maintained by the `start-session` / `close-session` handlers; read
 * by `priorSessionHistory` and `facilitationContext`.
 *
 * The DB handle is structural so this module never imports `node:sqlite`.
 */
type SqlValue = string | number | null
interface Statement {
  get(...params: SqlValue[]): unknown
  all(...params: SqlValue[]): unknown[]
  run(...params: SqlValue[]): unknown
}
export interface SessionIndexDb {
  prepare(sql: string): Statement
}

export interface SessionAlreadyOpen {
  kind: 'session-already-open'
}

interface Row {
  session_id: string
  status: 'open' | 'closed'
}

const sessionStream = (id: SessionId) => ({
  context: 'session-facilitation',
  aggregate: 'session',
  id,
})

/**
 * Reserve the one open slot for a workshop. The partial unique index is the real
 * guard: a concurrent second reserve loses the INSERT and comes back as
 * `session-already-open` (the handler compensates its orphan stream).
 */
export function reserve(
  db: SessionIndexDb,
  workshopId: WorkshopId,
  sessionId: SessionId,
  startedAt: string,
): Result<void, SessionAlreadyOpen> {
  try {
    db.prepare(
      `INSERT INTO session_index (workshop_id, session_id, status, started_at)
       VALUES (?, ?, 'open', ?)`,
    ).run(workshopId, sessionId, startedAt)
    return ok(undefined)
  } catch (error) {
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      return err({ kind: 'session-already-open' })
    }
    throw error
  }
}

/** Flip a session's row to `closed`, freeing the slot. Idempotent. */
export function close(
  db: SessionIndexDb,
  sessionId: SessionId,
  closedAt: string,
): void {
  db.prepare(
    `UPDATE session_index SET status = 'closed', closed_at = ?
     WHERE session_id = ? AND status = 'open'`,
  ).run(closedAt, sessionId)
}

/** Every session id for a workshop, split by status. `open` is at most one. */
export function sessionIdsFor(
  db: SessionIndexDb,
  workshopId: WorkshopId,
): { open?: SessionId; closed: SessionId[] } {
  const rows = db
    .prepare(
      `SELECT session_id, status FROM session_index WHERE workshop_id = ? ORDER BY started_at`,
    )
    .all(workshopId) as Row[]

  const closed: SessionId[] = []
  let open: SessionId | undefined
  for (const row of rows) {
    if (row.status === 'open') open = row.session_id as SessionId
    else closed.push(row.session_id as SessionId)
  }
  return open === undefined ? { closed } : { open, closed }
}

/** Every currently-open session across all workshops, oldest first — the worker's scan list. */
export function openSessions(db: SessionIndexDb): { workshopId: WorkshopId; sessionId: SessionId }[] {
  const rows = db
    .prepare(
      `SELECT workshop_id, session_id FROM session_index WHERE status = 'open' ORDER BY started_at`,
    )
    .all() as { workshop_id: string; session_id: string }[]
  return rows.map((row) => ({
    workshopId: row.workshop_id as WorkshopId,
    sessionId: row.session_id as SessionId,
  }))
}

/**
 * The session id of an `open` row whose session stream never got a
 * `Session Started` event — a crash between `reserve` and the aggregate append.
 * `start-session` deletes it before its own reserve. `undefined` when
 * the open row is sound, or when there is no open row.
 */
export function staleOpenRow(
  db: SessionIndexDb,
  store: EventStore,
  workshopId: WorkshopId,
): SessionId | undefined {
  const { open } = sessionIdsFor(db, workshopId)
  if (open === undefined) return undefined

  const started = store
    .read(sessionStream(open))
    .some((row) => (row.operation as { type?: string }).type === 'Session Started')
  return started ? undefined : open
}

/** Delete a session_index row outright — used to clear a stale `open` slot. */
export function deleteRow(db: SessionIndexDb, sessionId: SessionId): void {
  db.prepare(`DELETE FROM session_index WHERE session_id = ?`).run(sessionId)
}
