import { Hono } from 'hono'
import { applyOperation, Operation } from '../../../domain-model-capture/api.ts'
import { newBuildingBlockId } from '~/plumbing/ids.ts'
import type { BuildingBlockId, ProposalId, SessionId, WorkshopId } from '~/plumbing/ids.ts'
import { proposalCard } from '../../domain/read-models/proposals-view.ts'
import { decide } from '../../domain/proposal/decide.ts'
import { replay } from '../../domain/proposal/replay.ts'
import { replay as replaySession } from '../../domain/session/replay.ts'
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

interface Author {
  proposer: { name: string }
  accepter: { name: string }
}
type Intent = Extract<ProposalEvent, { type: 'Model Change Proposed' }>['intent']
type IntentChange = Extract<ProposalEvent, { type: 'Model Change Edited' }>['changed']
type BuildingBlockProposed = Extract<ProposalEvent, { type: 'Building Block Proposed' }>
type ModelChangeProposed = Extract<ProposalEvent, { type: 'Model Change Proposed' }>
interface Handled {
  json: unknown
  status: 200 | 409 | 422 | 500
}

const INTENT_ID_FIELDS = [
  'predecessor',
  'successor',
  'inserted',
  'cause',
  'effect',
  'target',
] as const

const readProposal = (deps: ReviewProposalDeps, id: ProposalId): ProposalEvent[] =>
  deps.store.read(proposalStream(id)).map((row) => ProposalEvent.parse(row.operation))

const readSession = (deps: ReviewProposalDeps, id: SessionId): SessionEvent[] =>
  deps.store.read(sessionStream(id)).map((row) => SessionEvent.parse(row.operation))

const appendProposal = (deps: ReviewProposalDeps, id: ProposalId, events: ProposalEvent[]): void => {
  if (events.length === 0) return
  const position = deps.store.read(proposalStream(id)).length - 1
  deps.store.append(proposalStream(id), position, storedOps(events))
}

/** The last `Model Change Edited.changed` folded over the birth `intent`, field
 * to field — no id minting, no positional spread. */
const applyIntentChange = (intent: Intent, changed: IntentChange | undefined): Intent => {
  if (changed === undefined) return intent
  const next = { ...intent } as Record<string, unknown>
  for (const field of INTENT_ID_FIELDS) {
    if (changed[field] !== undefined) next[field] = changed[field]
  }
  if (changed.newLabel !== undefined && intent.kind === 'reword') next.newLabel = changed.newLabel
  return next as Intent
}

/** Build the `Operation` payload from the resolved `Intent`, field to field. */
const operationFromIntent = (intent: Intent, author: Author): Record<string, unknown> => {
  if (intent.kind === 'relation') {
    const named: Record<string, unknown> = {}
    for (const field of INTENT_ID_FIELDS) {
      const value = intent[field]
      if (value !== undefined) named[field] = value
    }
    return { kind: intent.relationKind, ...named, author }
  }
  if (intent.kind === 'pivotal') return { kind: intent.pivotalKind, target: intent.target, author }
  return { kind: 'reword', target: intent.target, label: intent.newLabel, author }
}

/** The block the operation results in — the outcome record's fallback id. */
const intentTarget = (intent: Intent): BuildingBlockId => {
  if (intent.kind !== 'relation') return intent.target
  return (intent.successor ??
    intent.effect ??
    intent.inserted ??
    intent.target ??
    intent.predecessor ??
    intent.cause) as BuildingBlockId
}

/** The accept-response card for a model-change proposal — disposition, held, and
 * the `APPLY_FAILED` reason. The full intent card is `proposalsView`'s. */
const modelChangeCard = (events: ProposalEvent[]) => {
  const birth = events.find((event) => event.type === 'Model Change Proposed')
  if (birth?.type !== 'Model Change Proposed') return undefined
  const writeModel = replay(events)
  const rejected = events.findLast((event) => event.type === 'Operation Rejected')
  return {
    proposalId: birth.proposalId,
    contributionId: birth.contributionId,
    intentKind: birth.intent.kind,
    disposition: writeModel.disposition,
    held: writeModel.held,
    ...(rejected?.type === 'Operation Rejected' ? { applyFailedReason: rejected.reason } : {}),
  }
}

/**
 * Model-change branch: no `buildingBlockId` is minted; the `Operation` is built
 * from the birth `intent` folded with the last `Model Change Edited`, field to
 * field. An already-satisfied relation / pivotal effect returns `ok` at the
 * current board position, so a crash-window retry converges to `APPLIED`.
 */
const acceptModelChange = (
  deps: ReviewProposalDeps,
  id: ProposalId,
  birth: ModelChangeProposed,
  events: ProposalEvent[],
  workshopId: WorkshopId,
  author: Author,
): Handled => {
  const writeModel = replay(events)
  if (writeModel.disposition !== 'ACCEPTED') {
    const accepted = decide(writeModel, {
      type: 'Accept Proposal',
      proposalId: id,
      accepter: author.accepter.name,
      at: deps.clock(),
    })
    if (!accepted.ok) return { json: { error: accepted.error.kind }, status: 409 }
    appendProposal(deps, id, accepted.value)
  }

  const lastChange = events.filter((event) => event.type === 'Model Change Edited').at(-1)
  const intent = applyIntentChange(
    birth.intent,
    lastChange?.type === 'Model Change Edited' ? lastChange.changed : undefined,
  )
  const operation = Operation.parse(operationFromIntent(intent, author))
  const applied = applyOperation(deps, workshopId, operation)
  const boardPosition = recordApplyOutcome(deps, id, intentTarget(intent), applied)
  return { json: { boardPosition, proposal: modelChangeCard(readProposal(deps, id)) }, status: 200 }
}

/**
 * Building-block branch: mint + store the `BuildingBlockId` once (a re-accept
 * reuses the stored one), build the kind-specific `Operation`, apply, record the
 * outcome, then — for a hot spot — attach it to the block it annotates.
 */
const acceptBuildingBlock = (
  deps: ReviewProposalDeps,
  id: ProposalId,
  birth: BuildingBlockProposed,
  events: ProposalEvent[],
  workshopId: WorkshopId,
  author: Author,
): Handled => {
  const writeModel = replay(events)
  const lastEdit = events.findLast((event) => event.type === 'Proposal Edited')
  const label = lastEdit?.type === 'Proposal Edited' ? lastEdit.label : birth.label

  const opKind = OP_KIND[birth.blockKind]
  if (opKind === undefined) return { json: { error: 'unsupported-block-kind' }, status: 422 }

  let buildingBlockId: BuildingBlockId | undefined = writeModel.buildingBlockId
  if (writeModel.disposition !== 'ACCEPTED') {
    buildingBlockId = buildingBlockId ?? newBuildingBlockId()
    const accepted = decide(writeModel, {
      type: 'Accept Proposal',
      proposalId: id,
      accepter: author.accepter.name,
      buildingBlockId,
      at: deps.clock(),
    })
    if (!accepted.ok) return { json: { error: accepted.error.kind }, status: 409 }
    appendProposal(deps, id, accepted.value)
  }
  if (buildingBlockId === undefined) return { json: { error: 'accept-failed' }, status: 500 }

  const operation = Operation.parse({
    kind: opKind,
    id: buildingBlockId,
    label,
    ...(birth.blockKind === 'hot-spot' ? { modelAffecting: writeModel.modelAffecting } : {}),
    author,
  })

  const applied = applyOperation(deps, workshopId, operation)
  const boardPosition = recordApplyOutcome(deps, id, buildingBlockId, applied)

  const hotSpotApplied = applied.ok || applied.error.kind === 'duplicate-id'
  if (birth.blockKind === 'hot-spot' && birth.annotatesTargetId !== undefined && hotSpotApplied) {
    annotateHotSpot(deps, workshopId, buildingBlockId, birth.annotatesTargetId, author)
  }

  return { json: { boardPosition, proposal: proposalCard(readProposal(deps, id)) }, status: 200 }
}

/**
 * `POST /proposals/:id/accept` — the synchronous cross-context apply chain. Each
 * context commits its own stream in its own `EventStore.append` — the two are
 * NEVER one SQLite transaction. A closed session rejects a late accept (409
 * `session-closed`, the Proposal left re-lapsable); an already-`APPLIED`
 * proposal is an idempotent 200.
 */
export const acceptRoutes = (deps: ReviewProposalDeps) =>
  new Hono().post('/proposals/:id/accept', (context) => {
    const id = context.req.param('id') as ProposalId
    const events = readProposal(deps, id)
    if (events.length === 0) return context.json({ error: 'unknown-proposal' as const }, 404)

    const birth = events.find(
      (event) => event.type === 'Building Block Proposed' || event.type === 'Model Change Proposed',
    )
    if (birth === undefined) return context.json({ error: 'unknown-proposal' as const }, 404)

    const sessionEvents = readSession(deps, birth.sessionId)
    const workshopId = sessionEvents.find((event) => event.type === 'Session Started')?.workshopId
    if (workshopId === undefined) return context.json({ error: 'unknown-session' as const }, 404)
    const creatorName =
      replayWorkshop(
        deps.store.read(workshopStream(workshopId)).map((row) => WorkshopEvent.parse(row.operation)),
      ).creatorName ?? 'unknown'
    const author: Author = { proposer: { name: 'facilitator' }, accepter: { name: creatorName } }

    if (replay(events).disposition === 'APPLIED') {
      const proposal =
        birth.type === 'Model Change Proposed' ? modelChangeCard(events) : proposalCard(events)
      return context.json({ boardPosition: null, proposal }, 200)
    }
    if (replaySession(sessionEvents).closed) {
      return context.json({ error: 'session-closed' as const }, 409)
    }

    const handled =
      birth.type === 'Model Change Proposed'
        ? acceptModelChange(deps, id, birth, events, workshopId, author)
        : acceptBuildingBlock(deps, id, birth, events, workshopId, author)
    return context.json(handled.json, handled.status)
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
  author: Author,
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
