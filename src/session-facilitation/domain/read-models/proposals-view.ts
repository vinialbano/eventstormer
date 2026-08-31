import type { BuildingBlockId, ContributionId, ProposalId } from '~/plumbing/ids.ts'
import { replay } from '../proposal/replay.ts'
import type { Disposition } from '../proposal/model.ts'
import type { ProposalEvent, SessionEvent } from '../schema/events.ts'
import type { InterpretationBar, InterpretedBlockKind } from '../schema/interpreted-track.ts'
import { sessionProposalIds } from './session-summary.ts'

/**
 * `proposalsView` — the read model behind `GET /sessions/:id/proposals`. Pure:
 * the caller supplies each proposal's stream. `overflow` is the ">7 among this
 * contribution's proposals" display grouping — a read-model computation,
 * never an event field. Order follows `sessionProposalIds` (stream
 * order), so a contribution's proposals are contiguous.
 */
const DISPLAY_CAP = 7

interface ProposalCard {
  proposalId: ProposalId
  contributionId: ContributionId
  blockKind: InterpretedBlockKind
  label: string
  bar: InterpretationBar
  disposition: Disposition
  held: boolean
  overflow: boolean
  applyFailedReason?: string
  buildingBlockId?: BuildingBlockId
}

const birthOf = (
  events: ProposalEvent[],
): Extract<ProposalEvent, { type: 'Building Block Proposed' }> | undefined =>
  events.find(
    (event): event is Extract<ProposalEvent, { type: 'Building Block Proposed' }> =>
      event.type === 'Building Block Proposed',
  )

/** Project one `Proposal` stream to its card. `overflow` is caller-supplied
 * (it needs the sibling count, which only `proposalsView` has). Returns
 * `undefined` for a stream with no birth event. */
export const proposalCard = (events: ProposalEvent[], overflow = false): ProposalCard | undefined => {
  const birth = birthOf(events)
  if (birth === undefined) return undefined

  const writeModel = replay(events)
  const lastEdit = [...events].reverse().find((event) => event.type === 'Proposal Edited')
  const rejected = [...events].reverse().find((event) => event.type === 'Operation Rejected')

  return {
    proposalId: birth.proposalId,
    contributionId: birth.contributionId,
    blockKind: birth.blockKind,
    label: lastEdit?.type === 'Proposal Edited' ? lastEdit.label : birth.label,
    bar: birth.bar,
    disposition: writeModel.disposition,
    held: writeModel.held,
    overflow,
    ...(rejected?.type === 'Operation Rejected' ? { applyFailedReason: rejected.reason } : {}),
    ...(writeModel.buildingBlockId === undefined ? {} : { buildingBlockId: writeModel.buildingBlockId }),
  }
}

export const proposalsView = (
  sessionEvents: SessionEvent[],
  streams: { proposalId: ProposalId; events: ProposalEvent[] }[],
): ProposalCard[] => {
  const byId = new Map(streams.map((stream) => [stream.proposalId, stream.events]))
  const seenPerContribution = new Map<string, number>()
  const cards: ProposalCard[] = []

  for (const proposalId of sessionProposalIds(sessionEvents)) {
    const events = byId.get(proposalId) ?? []
    const contributionId = birthOf(events)?.contributionId ?? ''
    const index = seenPerContribution.get(contributionId) ?? 0
    seenPerContribution.set(contributionId, index + 1)

    const card = proposalCard(events, index >= DISPLAY_CAP)
    if (card !== undefined) cards.push(card)
  }

  return cards
}
