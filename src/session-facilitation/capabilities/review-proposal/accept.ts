import { Hono } from 'hono'
import { applyOperation, Operation } from '../../../domain-model-capture/api.ts'
import { newBuildingBlockId } from '~/plumbing/ids.ts'
import type { BuildingBlockId, ProposalId, SessionId, WorkshopId } from '~/plumbing/ids.ts'
import { proposalCard } from '../../domain/read-models/proposals-view.ts'
import { decide } from '../../domain/proposal/decide.ts'
import { replay } from '../../domain/proposal/replay.ts'
import { replay as replayWorkshop } from '../../domain/workshop/replay.ts'
import { ProposalEvent, SessionEvent, WorkshopEvent } from '../../domain/schema/events.ts'
import type { InterpretedBlockKind } from '../../domain/schema/interpreted-track.ts'
import { proposalStream, sessionStream, storedOps, workshopStream } from '../../infrastructure/streams.ts'
import type { ReviewProposalDeps } from './deps.ts'

const OP_KIND: Partial<
  Record<
    InterpretedBlockKind,
    'capture-domain-event' | 'identify-actor' | 'identify-system' | 'raise-hot-spot'
  >
> = {
  'domain-event': 'capture-domain-event',
  actor: 'identify-actor',
  system: 'identify-system',
  'hot-spot': 'raise-hot-spot',
}

const readProposal = (deps: ReviewProposalDeps, id: ProposalId): ProposalEvent[] =>
  deps.store.read(proposalStream(id)).map((row) => ProposalEvent.parse(row.operation))

const readSession = (deps: ReviewProposalDeps, id: SessionId): SessionEvent[] =>
  deps.store.read(sessionStream(id)).map((row) => SessionEvent.parse(row.operation))

const appendProposal = (deps: ReviewProposalDeps, id: ProposalId, events: ProposalEvent[]): void => {
  if (events.length === 0) return
  const position = deps.store.read(proposalStream(id)).length - 1
  deps.store.append(proposalStream(id), position, storedOps(events))
}

/**
 * `POST /proposals/:id/accept` — the synchronous cross-context apply chain:
 *
 * 1. `Proposal.decide(Accept Proposal)` mints + stores the `BuildingBlockId`
 *    once; a re-accept reuses the stored one (idempotent while `ACCEPTED` /
 *    `APPLIED`, re-acceptable from `APPLY_FAILED`).
 * 2. Build + `.parse` the kind-specific `Operation` against the SSOT, author
 *    `{ proposer: 'facilitator', accepter: creatorName }`.
 * 3. `applyOperation` — no `expectedPosition`; it owns board concurrency.
 * 4. `Proposal.decide(Record Operation Applied | Rejected)` records the outcome.
 *
 * Each context commits its own stream in its own `EventStore.append` — the two
 * are NEVER one SQLite transaction. `duplicate-id` from the board on a re-accept
 * after apply is the idempotency signal → recorded as applied.
 */
export const acceptRoutes = (deps: ReviewProposalDeps) =>
  new Hono().post('/proposals/:id/accept', (context) => {
    const id = context.req.param('id') as ProposalId
    const events = readProposal(deps, id)
    if (events.length === 0) return context.json({ error: 'unknown-proposal' as const }, 404)

    const birth = events.find((event) => event.type === 'Building Block Proposed')
    if (birth?.type !== 'Building Block Proposed') {
      return context.json({ error: 'unknown-proposal' as const }, 404)
    }
    const lastEdit = events.findLast((event) => event.type === 'Proposal Edited')
    const label = lastEdit?.type === 'Proposal Edited' ? lastEdit.label : birth.label

    const opKind = OP_KIND[birth.blockKind]
    if (opKind === undefined) return context.json({ error: 'unsupported-block-kind' as const }, 422)

    const sessionEvents = readSession(deps, birth.sessionId)
    const workshopId = sessionEvents.find((event) => event.type === 'Session Started')?.workshopId
    if (workshopId === undefined) return context.json({ error: 'unknown-session' as const }, 404)
    const creatorName =
      replayWorkshop(
        deps.store.read(workshopStream(workshopId)).map((row) => WorkshopEvent.parse(row.operation)),
      ).creatorName ?? 'unknown'

    const cardOf = () => proposalCard(readProposal(deps, id))

    const writeModel = replay(events)
    if (writeModel.disposition === 'APPLIED') {
      return context.json({ boardPosition: null, proposal: cardOf() }, 200)
    }

    // 1. accept — mint once, reuse the stored id on a re-accept
    let buildingBlockId: BuildingBlockId | undefined = writeModel.buildingBlockId
    if (writeModel.disposition !== 'ACCEPTED') {
      buildingBlockId = buildingBlockId ?? newBuildingBlockId()
      const accepted = decide(writeModel, {
        type: 'Accept Proposal',
        proposalId: id,
        accepter: creatorName,
        buildingBlockId,
        at: deps.clock(),
      })
      if (!accepted.ok) return context.json({ error: accepted.error.kind }, 409)
      appendProposal(deps, id, accepted.value)
    }
    if (buildingBlockId === undefined) return context.json({ error: 'accept-failed' as const }, 500)

    // 2. build + parse the operation against the operation schema SSOT
    const author = { proposer: { name: 'facilitator' }, accepter: { name: creatorName } }
    const operation = Operation.parse({
      kind: opKind,
      id: buildingBlockId,
      label,
      ...(birth.blockKind === 'hot-spot' ? { modelAffecting: writeModel.modelAffecting } : {}),
      author,
    })

    // 3. apply into domain-model-capture — its own transaction
    const applied = applyOperation(deps, workshopId, operation)

    // 4. record the outcome on the Proposal — its own transaction
    const boardPosition = recordApplyOutcome(deps, id, buildingBlockId, applied)

    // 5. hot spot only: attach it to the block it annotates — a second board
    // transaction, logged (not surfaced) on rejection.
    const hotSpotApplied = applied.ok || applied.error.kind === 'duplicate-id'
    if (birth.blockKind === 'hot-spot' && birth.annotatesTargetId !== undefined && hotSpotApplied) {
      annotateHotSpot(deps, workshopId, buildingBlockId, birth.annotatesTargetId, author)
    }

    return context.json({ boardPosition, proposal: cardOf() }, 200)
  })

/**
 * The follow-on `annotate` after a hot-spot proposal is applied. A rejection
 * (target withdrawn / gone / itself a hot spot) is logged, not surfaced: the hot
 * spot exists, unannotated, which is a valid state.
 */
const annotateHotSpot = (
  deps: ReviewProposalDeps,
  workshopId: WorkshopId,
  hotSpotId: BuildingBlockId,
  target: BuildingBlockId,
  author: { proposer: { name: string }; accepter: { name: string } },
): void => {
  const annotated = applyOperation(
    deps,
    workshopId,
    Operation.parse({ kind: 'annotate', hotSpot: hotSpotId, target, author }),
  )
  if (!annotated.ok) {
    console.warn(
      `accept: hot spot ${hotSpotId} left unannotated — annotate rejected (${annotated.error.kind})`,
    )
  }
}

const decideOrEmpty = (
  writeModel: Parameters<typeof decide>[0],
  command: Parameters<typeof decide>[1],
): ProposalEvent[] => {
  const decided = decide(writeModel, command)
  return decided.ok ? decided.value : []
}

type ApplyResult = ReturnType<typeof applyOperation>

/**
 * Record the board apply outcome on the `Proposal` — its own transaction, never
 * batched with the board append. `duplicate-id` on a re-accept after a prior
 * apply is the idempotency signal, recorded as applied. Returns the board
 * position on success, `null` otherwise.
 */
const recordApplyOutcome = (
  deps: ReviewProposalDeps,
  id: ProposalId,
  buildingBlockId: BuildingBlockId,
  applied: ApplyResult,
): number | null => {
  const wmAfter = replay(readProposal(deps, id))
  if (applied.ok) {
    appendProposal(
      deps,
      id,
      decideOrEmpty(wmAfter, {
        type: 'Record Operation Applied',
        proposalId: id,
        resultingBuildingBlockId: applied.value.resultingBuildingBlockId,
        at: deps.clock(),
      }),
    )
    return applied.value.nextPosition
  }
  if (applied.error.kind === 'duplicate-id') {
    appendProposal(
      deps,
      id,
      decideOrEmpty(wmAfter, {
        type: 'Record Operation Applied',
        proposalId: id,
        resultingBuildingBlockId: buildingBlockId,
        at: deps.clock(),
      }),
    )
    return null
  }
  appendProposal(
    deps,
    id,
    decideOrEmpty(wmAfter, {
      type: 'Record Operation Rejected',
      proposalId: id,
      reason: applied.error.kind,
      at: deps.clock(),
    }),
  )
  return null
}
