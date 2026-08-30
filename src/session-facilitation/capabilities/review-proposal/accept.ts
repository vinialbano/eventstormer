import { Hono } from 'hono'
import { applyOperation, Operation } from '../../../domain-model-capture/api.ts'
import { newBuildingBlockId } from '~/plumbing/ids.ts'
import type { BuildingBlockId, ProposalId, SessionId } from '~/plumbing/ids.ts'
import { proposalCard } from '../../domain/read-models/proposals-view.ts'
import { decide } from '../../domain/proposal/decide.ts'
import { replay } from '../../domain/proposal/replay.ts'
import { replay as replayWorkshop } from '../../domain/workshop/replay.ts'
import { ProposalEvent, SessionEvent, WorkshopEvent } from '../../domain/schema/events.ts'
import type { InterpretedBlockKind } from '../../domain/schema/interpreted-track.ts'
import { proposalStream, sessionStream, storedOps, workshopStream } from '../../infrastructure/streams.ts'
import type { ReviewProposalDeps } from './deps.ts'

const OP_KIND: Record<
  InterpretedBlockKind,
  'capture-domain-event' | 'identify-actor' | 'identify-system'
> = {
  'domain-event': 'capture-domain-event',
  actor: 'identify-actor',
  system: 'identify-system',
}

const readProposal = (deps: ReviewProposalDeps, id: ProposalId): ProposalEvent[] =>
  deps.store.read(proposalStream(id)).map((r) => ProposalEvent.parse(r.operation))

const readSession = (deps: ReviewProposalDeps, id: SessionId): SessionEvent[] =>
  deps.store.read(sessionStream(id)).map((r) => SessionEvent.parse(r.operation))

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
  new Hono().post('/proposals/:id/accept', (c) => {
    const id = c.req.param('id') as ProposalId
    const events = readProposal(deps, id)
    if (events.length === 0) return c.json({ error: 'unknown-proposal' as const }, 404)

    const birth = events.find((e) => e.type === 'Building Block Proposed')
    if (birth?.type !== 'Building Block Proposed') {
      return c.json({ error: 'unknown-proposal' as const }, 404)
    }
    const lastEdit = [...events].reverse().find((e) => e.type === 'Proposal Edited')
    const label = lastEdit?.type === 'Proposal Edited' ? lastEdit.label : birth.label

    const sessionEvents = readSession(deps, birth.sessionId)
    const workshopId = sessionEvents.find((e) => e.type === 'Session Started')?.workshopId
    if (workshopId === undefined) return c.json({ error: 'unknown-session' as const }, 404)
    const creatorName =
      replayWorkshop(
        deps.store.read(workshopStream(workshopId)).map((r) => WorkshopEvent.parse(r.operation)),
      ).creatorName ?? 'unknown'

    const cardOf = () => proposalCard(readProposal(deps, id))

    const wm = replay(events)
    if (wm.disposition === 'APPLIED') {
      return c.json({ boardPosition: null, proposal: cardOf() }, 200)
    }

    // 1. accept — mint once, reuse the stored id on a re-accept
    let buildingBlockId: BuildingBlockId | undefined = wm.buildingBlockId
    if (wm.disposition !== 'ACCEPTED') {
      buildingBlockId = buildingBlockId ?? newBuildingBlockId()
      const accepted = decide(wm, {
        type: 'Accept Proposal',
        proposalId: id,
        accepter: creatorName,
        buildingBlockId,
        at: deps.clock(),
      })
      if (!accepted.ok) return c.json({ error: accepted.error.kind }, 409)
      appendProposal(deps, id, accepted.value)
    }
    if (buildingBlockId === undefined) return c.json({ error: 'accept-failed' as const }, 500)

    // 2. build + parse the operation against the Slice 0 SSOT
    const operation = Operation.parse({
      kind: OP_KIND[birth.blockKind],
      id: buildingBlockId,
      label,
      author: { proposer: { name: 'facilitator' }, accepter: { name: creatorName } },
    })

    // 3. apply into domain-model-capture — its own transaction
    const applied = applyOperation(deps, workshopId, operation)

    // 4. record the outcome on the Proposal — its own transaction
    const wmAfter = replay(readProposal(deps, id))
    let boardPosition: number | null = null
    if (applied.ok) {
      boardPosition = applied.value.nextPosition
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
    } else if (applied.error.kind === 'duplicate-id') {
      // the board already has this id — a re-accept after a prior apply
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
    } else {
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
    }

    return c.json({ boardPosition, proposal: cardOf() }, 200)
  })

const decideOrEmpty = (
  wm: Parameters<typeof decide>[0],
  cmd: Parameters<typeof decide>[1],
): ProposalEvent[] => {
  const decided = decide(wm, cmd)
  return decided.ok ? decided.value : []
}
