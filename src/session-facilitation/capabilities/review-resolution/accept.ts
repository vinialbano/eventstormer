import { Hono } from 'hono'
import { applyOperation, Operation } from '../../../domain-model-capture/api.ts'
import type { ResolutionId, SessionId } from '~/plumbing/ids.ts'
import { resolutionCard } from '../../domain/read-models/resolutions-view.ts'
import { decide } from '../../domain/resolution/decide.ts'
import { replay } from '../../domain/resolution/replay.ts'
import { replay as replayWorkshop } from '../../domain/workshop/replay.ts'
import { ResolutionEvent, SessionEvent, WorkshopEvent } from '../../domain/schema/events.ts'
import { resolutionStream, sessionStream, storedOps, workshopStream } from '../../infrastructure/streams.ts'
import type { ReviewResolutionDeps } from './deps.ts'

const readResolution = (deps: ReviewResolutionDeps, id: ResolutionId): ResolutionEvent[] =>
  deps.store.read(resolutionStream(id)).map((row) => ResolutionEvent.parse(row.operation))

const readSession = (deps: ReviewResolutionDeps, id: SessionId): SessionEvent[] =>
  deps.store.read(sessionStream(id)).map((row) => SessionEvent.parse(row.operation))

const appendResolution = (
  deps: ReviewResolutionDeps,
  id: ResolutionId,
  events: ResolutionEvent[],
): void => {
  if (events.length === 0) return
  const position = deps.store.read(resolutionStream(id)).length - 1
  deps.store.append(resolutionStream(id), position, storedOps(events))
}

/** Board rejections that lapse the resolution rather than surface an error. */
const LAPSE_REASONS = new Set(['kind-permission', 'withdrawn-target', 'already-resolved', 'unknown-target'])

/**
 * `POST /resolutions/:id/accept` — the synchronous cross-context resolve chain,
 * mirroring `review-proposal/accept.ts`:
 *
 * 1. `Resolution.decide(Accept Resolution)` → `ACCEPTED` (idempotent while
 *    `ACCEPTED` / `APPLIED`).
 * 2. Build the `resolve` `Operation` against the SSOT, author
 *    `{ proposer: 'facilitator', accepter: creatorName }`.
 * 3. `applyOperation` — its own transaction; the board is the authority on
 *    "already resolved".
 * 4. ok → `Record Hot Spot Resolved` (→ `APPLIED`); a lapsing board rejection →
 *    `Record Resolution Rejected(reason)` (→ `LAPSED`, no retry — canvas).
 *
 * The board stream and the `Resolution` stream commit in separate appends — each
 * context commits its own stream, never one transaction across both.
 */
export const acceptResolutionRoutes = (deps: ReviewResolutionDeps) =>
  new Hono().post('/resolutions/:id/accept', (context) => {
    const id = context.req.param('id') as ResolutionId
    const events = readResolution(deps, id)
    const birth = events.find((event) => event.type === 'Resolution Proposed')
    if (birth?.type !== 'Resolution Proposed') {
      return context.json({ error: 'unknown-resolution' as const }, 404)
    }

    const sessionEvents = readSession(deps, birth.sessionId)
    const workshopId = sessionEvents.find((event) => event.type === 'Session Started')?.workshopId
    if (workshopId === undefined) return context.json({ error: 'unknown-session' as const }, 404)
    const creatorName =
      replayWorkshop(
        deps.store.read(workshopStream(workshopId)).map((row) => WorkshopEvent.parse(row.operation)),
      ).creatorName ?? 'unknown'

    const cardOf = () => resolutionCard(readResolution(deps, id))

    const writeModel = replay(events)
    if (writeModel.disposition === 'APPLIED' || writeModel.disposition === 'LAPSED') {
      return context.json({ boardPosition: null, resolution: cardOf() }, 200)
    }

    // 1. accept — idempotent while ACCEPTED
    if (writeModel.disposition !== 'ACCEPTED') {
      const accepted = decide(writeModel, {
        type: 'Accept Resolution',
        resolutionId: id,
        accepter: creatorName,
        at: deps.clock(),
      })
      if (!accepted.ok) return context.json({ error: accepted.error.kind }, 409)
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
      appendResolution(
        deps,
        id,
        decideOrEmpty(after, { type: 'Record Hot Spot Resolved', resolutionId: id, at: deps.clock() }),
      )
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
      return context.json({ error: applied.error.kind, classification: 'systemic' as const }, 422)
    }

    return context.json({ boardPosition, resolution: cardOf() }, 200)
  })

const decideOrEmpty = (
  writeModel: Parameters<typeof decide>[0],
  command: Parameters<typeof decide>[1],
): ResolutionEvent[] => {
  const decided = decide(writeModel, command)
  return decided.ok ? decided.value : []
}
