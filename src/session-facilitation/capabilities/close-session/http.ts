import { Hono } from 'hono'
import type { SessionId } from '~/plumbing/ids.ts'
import { decide } from '../../domain/session/decide.ts'
import { replay } from '../../domain/session/replay.ts'
import { SessionEvent } from '../../domain/schema/events.ts'
import { finishClose } from '../../infrastructure/session-close.ts'
import { sessionStream, storedOps } from '../../infrastructure/streams.ts'
import type { CloseSessionDeps } from './deps.ts'

/**
 * `POST /sessions/:id/close` — every step unconditional and idempotent (design
 * "close"): `Session.decide(Close Session)` appends `Session Closed` with raw
 * facts only (AD-023), then `finishClose` flips the `session_index` row and
 * lapses the session's non-terminal proposals. A re-run is a clean no-op; a
 * crash mid-close self-heals via `reconcilePendingDerivations`.
 */
export const closeSessionRoutes = (deps: CloseSessionDeps) =>
  new Hono().post('/sessions/:id/close', (c) => {
    const sessionId = c.req.param('id') as SessionId
    const rows = deps.store.read(sessionStream(sessionId))
    if (rows.length === 0) return c.json({ error: 'unknown-session' as const }, 404)

    const events = rows.map((r) => SessionEvent.parse(r.operation))
    const workshopId = events.find((e) => e.type === 'Session Started')?.workshopId
    if (workshopId === undefined) return c.json({ error: 'unknown-session' as const }, 404)

    const decided = decide(replay(events), {
      type: 'Close Session',
      sessionId,
      workshopId,
      at: deps.clock(),
    })
    if (decided.ok && decided.value.length > 0) {
      deps.store.append(sessionStream(sessionId), rows.length - 1, storedOps(decided.value))
    }

    finishClose(deps, sessionId)
    return c.json({ ok: true as const }, 200)
  })
