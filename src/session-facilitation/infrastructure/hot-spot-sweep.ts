import type { Clock } from '~/plumbing/clock.ts'
import type { EventStore } from '~/plumbing/event-store/port.ts'
import { newBuildingBlockId } from '~/plumbing/ids.ts'
import type { SessionId, WorkshopId } from '~/plumbing/ids.ts'
import { applyOperation, Operation } from '../../domain-model-capture/api.ts'
import { SessionEvent, WorkshopEvent } from '../domain/schema/events.ts'
import { sessionStream, workshopStream } from './streams.ts'

/**
 * The `hot_spot_sweep` marker table — a `sweep_key` row means the hot-spot
 * reconciliation pass has already raised the hot spot that key stands for
 * (`kg:<questionId>` | `absent:<questionId>:<slug>` | `q:<questionId>` |
 * `proposal:<proposalId>`), so a later tick skips it.
 *
 * The DB handle is structural so this module never imports `node:sqlite`.
 */
interface Statement {
  all(...params: (string | number)[]): unknown[]
  run(...params: (string | number)[]): unknown
}
export interface HotSpotSweepDb {
  prepare(sql: string): Statement
}

interface Row {
  sweep_key: string
}

/** Every raised sweep key. */
export const readSweptKeys = (db: HotSpotSweepDb): Set<string> => {
  const rows = db.prepare('SELECT sweep_key FROM hot_spot_sweep').all() as Row[]
  return new Set(rows.map((row) => row.sweep_key))
}

/** Record that the hot spot for one sweep key is on the board. Idempotent. */
export const markSwept = (
  db: HotSpotSweepDb,
  key: string,
  buildingBlockId: string,
  at: string,
): void => {
  db.prepare(
    'INSERT OR IGNORE INTO hot_spot_sweep (sweep_key, building_block_id, at) VALUES (?, ?, ?)',
  ).run(key, buildingBlockId, at)
}

export interface ReconcileHotSpotsDeps {
  store: EventStore
  db: HotSpotSweepDb
  clock: Clock
}

const slug = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

interface SweepTarget {
  key: string
  label: string
}

/**
 * The hot-spot reconciliation pass. Choreography over persisted
 * `session-facilitation` facts: a `Knowledge Gap Revealed` or `Absent
 * Stakeholder Named` on the `Session` stream becomes a `raise-hot-spot`
 * operation on the board, once — the `hot_spot_sweep` marker gates each key and
 * `duplicate-id` from the board counts as success. A raise that fails any other
 * way is logged and left unmarked, so the next tick retries it.
 *
 * Runs from `reconcilePendingDerivations` (open sessions) and `finishClose`
 * (the closed session). No event bus.
 */
export const reconcileHotSpots = (deps: ReconcileHotSpotsDeps, sessionId: SessionId): void => {
  const events = deps.store
    .read(sessionStream(sessionId))
    .map((row) => SessionEvent.parse(row.operation))
  const workshopId = events.find((event) => event.type === 'Session Started')?.workshopId
  if (workshopId === undefined) return

  const questionText = new Map<string, string>()
  for (const event of events) {
    if (event.type === 'Question Asked') questionText.set(event.questionId, event.text)
  }

  const targets: SweepTarget[] = []
  for (const event of events) {
    if (event.type === 'Knowledge Gap Revealed') {
      targets.push({
        key: `kg:${event.questionId}`,
        label: questionText.get(event.questionId) ?? event.detail ?? 'Knowledge gap',
      })
    } else if (event.type === 'Absent Stakeholder Named') {
      targets.push({
        key: `absent:${event.questionId}:${slug(event.personName)}`,
        label: `Absent: ${event.personName}`,
      })
    }
  }

  raiseAll(deps, workshopId, targets)
}

const raiseAll = (
  deps: ReconcileHotSpotsDeps,
  workshopId: WorkshopId,
  targets: SweepTarget[],
): void => {
  if (targets.length === 0) return
  const swept = readSweptKeys(deps.db)
  const creatorName =
    deps.store
      .read(workshopStream(workshopId))
      .map((row) => WorkshopEvent.parse(row.operation))
      .find((event) => event.type === 'Workshop Started')?.creatorName ?? 'facilitator'
  const author = { proposer: { name: 'facilitator' }, accepter: { name: creatorName } }

  for (const target of targets) {
    if (swept.has(target.key)) continue
    const buildingBlockId = newBuildingBlockId()
    try {
      const raised = applyOperation(
        deps,
        workshopId,
        Operation.parse({
          kind: 'raise-hot-spot',
          id: buildingBlockId,
          label: target.label,
          modelAffecting: true,
          author,
        }),
      )
      if (raised.ok || raised.error.kind === 'duplicate-id') {
        markSwept(deps.db, target.key, buildingBlockId, deps.clock())
      } else {
        console.warn(`reconcileHotSpots: ${target.key} rejected (${raised.error.kind}) — retrying next tick`)
      }
    } catch (error) {
      console.warn(`reconcileHotSpots: ${target.key} failed — retrying next tick`, error)
    }
  }
}
