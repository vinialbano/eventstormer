import { applyOperation, Operation, readBoardSnapshot } from '../../domain-model-capture/api.ts'
import type { ResolutionId, SessionId } from '~/plumbing/ids.ts'
import type { Clock } from '~/plumbing/clock.ts'
import type { EventStore } from '~/plumbing/event-store/port.ts'
import { resolutionCard } from '../domain/read-models/resolutions-view.ts'
import { decide } from '../domain/resolution/decide.ts'
import { replay } from '../domain/resolution/replay.ts'
import { replay as replayWorkshop } from '../domain/workshop/replay.ts'
import { ResolutionEvent, SessionEvent, WorkshopEvent } from '../domain/schema/events.ts'
import { resolutionStream, sessionStream, storedOps, workshopStream } from './streams.ts'

/** What the accept chain needs — the event store and the clock. It additionally
 * reaches `domain-model-capture` through its `api.ts`. */
export interface AcceptResolutionDeps {
  store: EventStore
  clock: Clock
}

const readResolution = (deps: AcceptResolutionDeps, id: ResolutionId): ResolutionEvent[] =>
  deps.store.read(resolutionStream(id)).map((row) => ResolutionEvent.parse(row.operation))

const readSession = (deps: AcceptResolutionDeps, id: SessionId): SessionEvent[] =>
  deps.store.read(sessionStream(id)).map((row) => SessionEvent.parse(row.operation))

const appendResolution = (
  deps: AcceptResolutionDeps,
  id: ResolutionId,
  events: ResolutionEvent[],
): void => {
  if (events.length === 0) return
  const position = deps.store.read(resolutionStream(id)).length - 1
  deps.store.append(resolutionStream(id), position, storedOps(events))
}

/**
 * Board rejections that lapse the resolution rather than leave it re-drivable.
 * Deliberately narrower than the full `Rejection` union: `Resolution` has no
 * `APPLY_FAILED` disposition (see `resolution/model.ts`) — once
 * `Record Resolution Rejected` is appended, `decide.ts` moves it to `LAPSED`
 * (terminal, no reopen) and every later call short-circuits to a `200`. That is
 * the right outcome for a genuine domain-level bounce, but recording it for a
 * `classification: 'systemic'` reason (e.g. `kind: 'schema'` — the board's own
 * belt-and-suspenders re-parse guard) would convert a real bug into a
 * permanent, silently-successful-looking terminal state. A systemic reason is
 * left unrecorded instead: the `Resolution` stays `ACCEPTED`, every retry keeps
 * surfacing the `422`, and `stuck-accepted-sweep.ts` re-drives and warns on it
 * every reconciliation tick until the underlying bug is fixed.
 */
const LAPSE_REASONS = new Set(['kind-permission', 'withdrawn-target', 'unknown-target'])

export interface Handled {
  json: unknown
  status: 200 | 404 | 409 | 422
}

/**
 * The synchronous cross-context resolve chain, mirroring
 * `accept-proposal.ts`'s `acceptProposal`:
 *
 * 1. `Resolution.decide(Accept Resolution)` → `ACCEPTED` (idempotent while
 *    `ACCEPTED` / `APPLIED`).
 * 2. Build the `resolve` `Operation` against the SSOT, author
 *    `{ proposer: 'facilitator', accepter: creatorName }`.
 * 3. `applyOperation` — its own transaction; the board is the authority on
 *    "already resolved".
 * 4. ok → `Record Hot Spot Resolved` (→ `APPLIED`); a lapsing board rejection →
 *    `Record Resolution Rejected(reason)` (→ `LAPSED`, no retry — canvas); a
 *    systemic rejection → nothing recorded, stays `ACCEPTED` (see
 *    `LAPSE_REASONS`'s comment).
 *
 * The board stream and the `Resolution` stream commit in separate appends — each
 * context commits its own stream, never one transaction across both. Called by
 * `review-resolution/accept.ts`'s HTTP route and by the stuck-`ACCEPTED`
 * reconciliation sweep, so both re-drive through the same path instead of two
 * implementations that could drift. Lives in `infrastructure/`, not a
 * capability slice, because both callers need it — capability slices may not
 * import each other.
 */
export const acceptResolution = (deps: AcceptResolutionDeps, id: ResolutionId): Handled => {
  const events = readResolution(deps, id)
  const birth = events.find((event) => event.type === 'Resolution Proposed')
  if (birth?.type !== 'Resolution Proposed') {
    return { json: { error: 'unknown-resolution' as const }, status: 404 }
  }

  const sessionEvents = readSession(deps, birth.sessionId)
  const workshopId = sessionEvents.find((event) => event.type === 'Session Started')?.workshopId
  if (workshopId === undefined) return { json: { error: 'unknown-session' as const }, status: 404 }
  const creatorName =
    replayWorkshop(
      deps.store.read(workshopStream(workshopId)).map((row) => WorkshopEvent.parse(row.operation)),
    ).creatorName ?? 'unknown'

  const cardOf = () => resolutionCard(readResolution(deps, id))

  const writeModel = replay(events)
  if (writeModel.disposition === 'APPLIED' || writeModel.disposition === 'LAPSED') {
    return { json: { boardPosition: null, resolution: cardOf() }, status: 200 }
  }

  // 1. accept — idempotent while ACCEPTED
  if (writeModel.disposition !== 'ACCEPTED') {
    const accepted = decide(writeModel, {
      type: 'Accept Resolution',
      resolutionId: id,
      accepter: creatorName,
      at: deps.clock(),
    })
    if (!accepted.ok) return { json: { error: accepted.error.kind }, status: 409 }
    appendResolution(deps, id, accepted.value)
  }

  const reference = replay(readResolution(deps, id)).reference ?? birth.reference

  // 2. build the resolve operation against the SSOT
  const operation = Operation.parse({
    kind: 'resolve',
    target: birth.hotSpotId,
    reference,
    author: { proposer: { name: 'facilitator' }, accepter: { name: creatorName } },
  })

  // 3. apply into domain-model-capture — its own transaction
  const applied = applyOperation(deps, workshopId, operation)

  // 4. record the outcome on the Resolution — its own transaction
  const after = replay(readResolution(deps, id))
  let boardPosition: number | null = null
  if (applied.ok) {
    boardPosition = applied.value.nextPosition
    // The board decider made this an idempotent no-op — the hot spot was
    // already resolved. If the board carries a different reference, this
    // resolution lost the race: record that it was superseded rather than
    // claim a resolution that never landed.
    const boardReference =
      applied.value.outcome === 'already-satisfied'
        ? readBoardSnapshot(deps, workshopId).blocks.find((block) => block.id === birth.hotSpotId)
            ?.reference
        : undefined
    const marker =
      typeof boardReference === 'string' && boardReference !== reference
        ? decideOrEmpty(after, {
            type: 'Record Resolution Superseded',
            resolutionId: id,
            hotSpotId: birth.hotSpotId,
            supersededByReference: boardReference,
            at: deps.clock(),
          })
        : decideOrEmpty(after, {
            type: 'Record Hot Spot Resolved',
            resolutionId: id,
            at: deps.clock(),
          })
    appendResolution(deps, id, marker)
  } else if (LAPSE_REASONS.has(applied.error.kind)) {
    appendResolution(
      deps,
      id,
      decideOrEmpty(after, {
        type: 'Record Resolution Rejected',
        resolutionId: id,
        reason: applied.error.kind,
        at: deps.clock(),
      }),
    )
  } else {
    return {
      json: { error: applied.error.kind, classification: 'systemic' as const },
      status: 422,
    }
  }

  return { json: { boardPosition, resolution: cardOf() }, status: 200 }
}

const decideOrEmpty = (
  writeModel: Parameters<typeof decide>[0],
  command: Parameters<typeof decide>[1],
): ResolutionEvent[] => {
  const decided = decide(writeModel, command)
  return decided.ok ? decided.value : []
}
