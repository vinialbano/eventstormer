import type { BuildingBlockId, ProposalId, ResolutionId } from '~/plumbing/ids.ts'
import type { Disposition } from '../proposal/model.ts'
import type { ResolutionDisposition } from '../resolution/model.ts'
import { resolutionCard, sessionResolutionIds } from './resolutions-view.ts'
import { proposalCard } from './proposals-view.ts'
import type { ProposalEvent, ResolutionEvent, SessionEvent } from '../schema/events.ts'
import type { SessionTranscript } from './session-transcript-contract.ts'
import { sessionView } from './session-view.ts'

/**
 * `sessionTranscript` — the F19 read contract. Pure: the caller supplies the
 * `Session` stream, every `Proposal` stream it spawned, and the workshop scope.
 * Turn order and the held-back notice turns come from `sessionView`; disposition
 * and the intent summary come from `proposalCard`. All the derivation the DAG
 * renderer must NOT redo lives here.
 */

type ResolveLabel = (id: BuildingBlockId) => string | undefined

interface ProposalStream {
  proposalId: ProposalId
  events: ProposalEvent[]
}

interface ResolutionStream {
  resolutionId: ResolutionId
  events: ResolutionEvent[]
}

interface TranscriptOptions {
  scope: string | null
  resolveLabel?: ResolveLabel
}

const DISPOSITION: Record<Disposition, SessionTranscript['turns'][number]['proposals'][number]['disposition']> = {
  PROPOSED: 'proposed',
  EDITED: 'edited',
  ACCEPTED: 'accepted',
  APPLIED: 'applied',
  APPLY_FAILED: 'apply-failed',
  REJECTED: 'rejected',
  LAPSED: 'lapsed',
}

const RESOLUTION_DISPOSITION: Record<
  ResolutionDisposition,
  SessionTranscript['resolutions'][number]['disposition']
> = {
  PROPOSED: 'proposed',
  EDITED: 'edited',
  ACCEPTED: 'accepted',
  APPLIED: 'applied',
  REJECTED: 'rejected',
  LAPSED: 'lapsed',
}

type TranscriptResolution = SessionTranscript['resolutions'][number]

const transcriptResolutions = (
  sessionEvents: SessionEvent[],
  streams: ResolutionStream[],
): TranscriptResolution[] => {
  const byId = new Map(streams.map((stream) => [stream.resolutionId, stream.events]))
  const resolutions: TranscriptResolution[] = []
  for (const resolutionId of sessionResolutionIds(sessionEvents)) {
    const card = resolutionCard(byId.get(resolutionId) ?? [])
    if (card === undefined) continue
    resolutions.push({
      resolutionId: card.resolutionId,
      hotSpotId: card.hotSpotId,
      reference: card.reference,
      disposition: card.superseded === true ? 'superseded' : RESOLUTION_DISPOSITION[card.disposition],
      ...(card.supersededByReference === undefined
        ? {}
        : { supersededByReference: card.supersededByReference }),
    })
  }
  return resolutions
}

const birthContributionId = (events: ProposalEvent[]): string | undefined => {
  const birth = events.find(
    (event): event is Extract<ProposalEvent, { type: 'Building Block Proposed' | 'Model Change Proposed' }> =>
      event.type === 'Building Block Proposed' || event.type === 'Model Change Proposed',
  )
  return birth?.contributionId
}

type TranscriptProposal = SessionTranscript['turns'][number]['proposals'][number]

const transcriptProposal = (
  events: ProposalEvent[],
  resolveLabel: ResolveLabel | undefined,
): TranscriptProposal | undefined => {
  const card = proposalCard(events, false, resolveLabel)
  if (card === undefined) return undefined
  const applied = events.findLast((event) => event.type === 'Operation Applied')
  return {
    summary: card.intent?.summary ?? card.label ?? '',
    disposition: DISPOSITION[card.disposition],
    resultingBuildingBlockId:
      applied?.type === 'Operation Applied' ? applied.resultingBuildingBlockId : null,
  }
}

type ContributorCount = SessionTranscript['contributorCounts'][number]

const contributorCounts = (
  sessionEvents: SessionEvent[],
  streams: ProposalStream[],
  speakerByContribution: Map<string, string>,
): ContributorCount[] => {
  const counts = new Map<string, ContributorCount>()
  const rowFor = (speaker: string): ContributorCount => {
    const existing = counts.get(speaker)
    if (existing !== undefined) return existing
    const created: ContributorCount = { speaker, accepted: 0, edited: 0, rejected: 0 }
    counts.set(speaker, created)
    return created
  }

  for (const event of sessionEvents) {
    if (event.type === 'Contribution Made') rowFor(event.speaker)
  }

  for (const stream of streams) {
    const contributionId = birthContributionId(stream.events)
    const speaker = contributionId === undefined ? undefined : speakerByContribution.get(contributionId)
    if (speaker === undefined) continue
    const row = rowFor(speaker)
    if (stream.events.some((event) => event.type === 'Proposal Accepted')) row.accepted += 1
    if (stream.events.some((event) => event.type === 'Proposal Edited' || event.type === 'Model Change Edited')) {
      row.edited += 1
    }
    if (stream.events.some((event) => event.type === 'Proposal Rejected')) row.rejected += 1
  }

  return [...counts.values()].toSorted((left, right) => left.speaker.localeCompare(right.speaker))
}

export const sessionTranscript = (
  sessionEvents: SessionEvent[],
  streams: ProposalStream[],
  resolutionStreams: ResolutionStream[],
  options: TranscriptOptions,
): SessionTranscript => {
  const speakerByContribution = new Map<string, string>()
  for (const event of sessionEvents) {
    if (event.type === 'Contribution Made') speakerByContribution.set(event.contributionId, event.speaker)
  }

  const proposalsByContribution = new Map<string, ProposalEvent[][]>()
  for (const stream of streams) {
    const contributionId = birthContributionId(stream.events)
    if (contributionId === undefined) continue
    const list = proposalsByContribution.get(contributionId) ?? []
    list.push(stream.events)
    proposalsByContribution.set(contributionId, list)
  }

  const turns = sessionView(sessionEvents).transcript.map((turn) => ({
    kind: turn.kind,
    speaker: turn.speaker,
    text: turn.text,
    at: turn.at,
    proposals:
      turn.kind === 'contribution' && turn.contributionId !== undefined
        ? (proposalsByContribution.get(turn.contributionId) ?? [])
            .map((events) => transcriptProposal(events, options.resolveLabel))
            .filter((proposal): proposal is TranscriptProposal => proposal !== undefined)
        : [],
  }))

  return {
    format: 'big-picture',
    scope: options.scope,
    position: sessionEvents.length,
    turns,
    contributorCounts: contributorCounts(sessionEvents, streams, speakerByContribution),
    resolutions: transcriptResolutions(sessionEvents, resolutionStreams),
  }
}
