import type { BuildingBlockId, ContributionId, ProposalId } from '~/plumbing/ids.ts'
import { replay } from '../proposal/replay.ts'
import type { Disposition } from '../proposal/model.ts'
import type { ProposalEvent, SessionEvent } from '../schema/events.ts'
import type { InterpretationBar, InterpretedBlockKind } from '../schema/interpreted-track.ts'
import { sessionProposalIds } from './session-summary.ts'

/**
 * `proposalsView` — the read model behind `GET /sessions/:id/proposals`. Pure:
 * the caller supplies each proposal's stream. `overflow` is the ">7 among this
 * contribution's proposals" display grouping (S1-40) — a read-model computation,
 * never an event field (AD-020). Order follows `sessionProposalIds` (stream
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

export const proposalsView = (
  sessionEvents: SessionEvent[],
  streams: { proposalId: ProposalId; events: ProposalEvent[] }[],
): ProposalCard[] => {
  const byId = new Map(streams.map((s) => [s.proposalId, s.events]))
  const seenPerContribution = new Map<string, number>()
  const cards: ProposalCard[] = []

  for (const proposalId of sessionProposalIds(sessionEvents)) {
    const events = byId.get(proposalId) ?? []
    const birth = events.find((e) => e.type === 'Building Block Proposed')
    if (birth?.type !== 'Building Block Proposed') continue

    const wm = replay(events)
    const lastEdit = [...events].reverse().find((e) => e.type === 'Proposal Edited')
    const rejected = [...events].reverse().find((e) => e.type === 'Operation Rejected')

    const index = seenPerContribution.get(birth.contributionId) ?? 0
    seenPerContribution.set(birth.contributionId, index + 1)

    cards.push({
      proposalId,
      contributionId: birth.contributionId,
      blockKind: birth.blockKind,
      label: lastEdit?.type === 'Proposal Edited' ? lastEdit.label : birth.label,
      bar: birth.bar,
      disposition: wm.disposition,
      held: wm.held,
      overflow: index >= DISPLAY_CAP,
      ...(rejected?.type === 'Operation Rejected' ? { applyFailedReason: rejected.reason } : {}),
      ...(wm.buildingBlockId === undefined ? {} : { buildingBlockId: wm.buildingBlockId }),
    })
  }

  return cards
}
