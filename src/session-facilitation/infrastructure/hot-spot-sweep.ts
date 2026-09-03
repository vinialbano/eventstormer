import { createHash } from 'node:crypto'
import type { Clock } from '~/plumbing/clock.ts'
import type { EventStore } from '~/plumbing/event-store/port.ts'
import type { SessionId, WorkshopId } from '~/plumbing/ids.ts'
import { applyOperation, Operation } from '../../domain-model-capture/api.ts'
import { replay as replayProposal } from '../domain/proposal/replay.ts'
import { sessionProposalIds } from '../domain/read-models/session-summary.ts'
import { ProposalEvent, SessionEvent, WorkshopEvent } from '../domain/schema/events.ts'
import { proposalStream, sessionStream, workshopStream } from './streams.ts'

/**
 * The `hot_spot_sweep` marker table — a `sweep_key` row means the hot-spot
 * reconciliation pass has already raised the hot spot that key stands for
 * (`kg:<questionId>` | `absent:<questionId>:<slug>` | `q:<questionId>` |
 * `proposal:<proposalId>` | `absent-sc:<slug>`), so a later tick skips it.
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
 * The board id for a sweep key, derived from the workshop and the key. A retry
 * after a lost `markSwept` write re-attempts the raise with the same id, so the
 * board answers `duplicate-id` (counted as success) instead of raising a second
 * hot spot for the key. `base64url` over `A-Za-z0-9_-`, 21 chars — the
 * `BuildingBlockId` shape.
 */
const sweptBlockId = (workshopId: WorkshopId, key: string): string =>
  createHash('sha256').update(`${workshopId}::${key}`).digest('base64url').slice(0, 21)

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

  raiseAll(deps, workshopId, [
    ...factTargets(events, questionText),
    ...closeTargets(deps, events, questionText),
    ...workshopTargets(deps, workshopId),
  ])
}

/**
 * The F09 stakeholder answer — an incomplete `Stakeholder Check Recorded` on the
 * workshop stream raises one hot spot per named absent stakeholder.
 */
const workshopTargets = (deps: ReconcileHotSpotsDeps, workshopId: WorkshopId): SweepTarget[] =>
  deps.store
    .read(workshopStream(workshopId))
    .map((row) => WorkshopEvent.parse(row.operation))
    .flatMap((event): SweepTarget[] => {
      if (event.type !== 'Stakeholder Check Recorded' || event.complete) return []
      return event.absentNames.map((name) => ({
        key: `absent-sc:${slug(name)}`,
        label: `Absent stakeholder: ${name}`,
      }))
    })

/** The always-on facts — a revealed knowledge gap or a named absent stakeholder. */
const factTargets = (
  events: SessionEvent[],
  questionText: Map<string, string>,
): SweepTarget[] =>
  events.flatMap((event): SweepTarget[] => {
    if (event.type === 'Knowledge Gap Revealed') {
      return [
        {
          key: `kg:${event.questionId}`,
          label: questionText.get(event.questionId) ?? event.detail ?? 'Knowledge gap',
        },
      ]
    }
    if (event.type === 'Absent Stakeholder Named') {
      return [
        {
          key: `absent:${event.questionId}:${slug(event.personName)}`,
          label: `Absent: ${event.personName}`,
        },
      ]
    }
    return []
  })

/** The close sweep — every still-unresolved question and every APPLY_FAILED proposal. */
const closeTargets = (
  deps: ReconcileHotSpotsDeps,
  events: SessionEvent[],
  questionText: Map<string, string>,
): SweepTarget[] => {
  const closed = events.find((event) => event.type === 'Session Closed')
  if (closed === undefined) return []

  const questions: SweepTarget[] = closed.unresolvedQuestionIds.map((questionId) => ({
    key: `q:${questionId}`,
    label: questionText.get(questionId) ?? 'Unanswered question',
  }))

  const proposals: SweepTarget[] = []
  for (const proposalId of sessionProposalIds(events)) {
    const proposalEvents = deps.store
      .read(proposalStream(proposalId))
      .map((row) => ProposalEvent.parse(row.operation))
    // APPLY_FAILED, or already lapsed from APPLY_FAILED by finishClose — the
    // lapse and the hot spot are consistent whichever ran first.
    const applyFailed =
      replayProposal(proposalEvents).disposition === 'APPLY_FAILED' ||
      proposalEvents.some(
        (event) => event.type === 'Proposal Lapsed' && event.cause === 'apply-failed',
      )
    if (!applyFailed) continue
    const label = proposalEvents.find((event) => event.type === 'Building Block Proposed')?.label
    proposals.push({
      key: `proposal:${proposalId}`,
      label: label === undefined ? 'Proposal could not be applied' : `Could not apply: ${label}`,
    })
  }

  return [...questions, ...proposals]
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
    const buildingBlockId = sweptBlockId(workshopId, target.key)
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
