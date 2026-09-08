import type { BuildingBlockId, ContributionId, ProposalId } from '~/plumbing/ids.ts'
import { replay } from '../proposal/replay.ts'
import type { Disposition } from '../proposal/model.ts'
import type { Intent, ProposalEvent, SessionEvent } from '../schema/events.ts'
import {
  type InterpretationBar,
  type InterpretedBlockKind,
  RELATION_FIELDS,
} from '../schema/interpreted-track.ts'
import { sessionProposalIds } from './session-summary.ts'

/**
 * `proposalsView` — the read model behind `GET /sessions/:id/proposals`. Pure:
 * the caller supplies each proposal's stream. `overflow` is the ">7 among this
 * contribution's proposals" display grouping — a read-model computation,
 * never an event field. Order follows `sessionProposalIds` (stream
 * order), so a contribution's proposals are contiguous.
 *
 * `resolveLabel` maps a `BuildingBlockId` to its current board label for the
 * model-change `intent` card. The pure read model has no board access; the
 * capability supplies it from its snapshot read. A withdrawn / unknown endpoint
 * falls back to its id.
 */
const DISPLAY_CAP = 7

/** A resolved board relation / pivotal / reword the facilitator proposed. */
interface IntentCard {
  kind: Intent['kind']
  summary: string
  endpoints?: { id: BuildingBlockId; label: string }[]
  target?: { id: BuildingBlockId; label: string }
  newLabel?: string
}

interface ProposalCard {
  proposalId: ProposalId
  contributionId: ContributionId
  /** Present on a building-block proposal. */
  blockKind?: InterpretedBlockKind
  label?: string
  bar?: InterpretationBar
  /** The hot-spot kind the person can flip before accepting; `true` (model-affecting)
   * for every non-hot-spot proposal, and the default for a hot-spot proposal. */
  modelAffecting: boolean
  disposition: Disposition
  held: boolean
  overflow: boolean
  applyFailedReason?: string
  buildingBlockId?: BuildingBlockId
  /** Present on a model-change proposal — the resolved relation / pivotal / reword. */
  intent?: IntentCard
}

type ResolveLabel = (id: BuildingBlockId) => string | undefined

const blockBirthOf = (
  events: ProposalEvent[],
): Extract<ProposalEvent, { type: 'Building Block Proposed' }> | undefined =>
  events.find(
    (event): event is Extract<ProposalEvent, { type: 'Building Block Proposed' }> =>
      event.type === 'Building Block Proposed',
  )

const modelChangeBirthOf = (
  events: ProposalEvent[],
): Extract<ProposalEvent, { type: 'Model Change Proposed' }> | undefined =>
  events.find(
    (event): event is Extract<ProposalEvent, { type: 'Model Change Proposed' }> =>
      event.type === 'Model Change Proposed',
  )

const CHANGEABLE_ID_FIELDS = ['predecessor', 'successor', 'inserted', 'cause', 'effect', 'target'] as const

/** Fold the last `Model Change Edited.changed` over the birth `intent`. */
const editedIntent = (intent: Intent, events: ProposalEvent[]): Intent => {
  const change = events.findLast((event) => event.type === 'Model Change Edited')
  if (change?.type !== 'Model Change Edited') return intent
  const next = { ...intent } as Record<string, unknown>
  for (const field of CHANGEABLE_ID_FIELDS) {
    if (change.changed[field] !== undefined) next[field] = change.changed[field]
  }
  if (change.changed.newLabel !== undefined && intent.kind === 'reword') {
    next.newLabel = change.changed.newLabel
  }
  return next as Intent
}

const labelFor = (id: BuildingBlockId, resolve: ResolveLabel | undefined): string =>
  resolve?.(id) ?? id

const intentCard = (intent: Intent, resolve: ResolveLabel | undefined): IntentCard => {
  if (intent.kind === 'relation') {
    const endpoints = RELATION_FIELDS[intent.relationKind]
      .map((field) => intent[field])
      .filter((id): id is BuildingBlockId => id !== undefined)
      .map((id) => ({ id, label: labelFor(id, resolve) }))
    return {
      kind: 'relation',
      summary: `${intent.relationKind}: ${endpoints.map((endpoint) => endpoint.label).join(' → ')}`,
      endpoints,
    }
  }
  if (intent.kind === 'pivotal') {
    const label = labelFor(intent.target, resolve)
    return { kind: 'pivotal', summary: `${intent.pivotalKind}: ${label}`, target: { id: intent.target, label } }
  }
  const label = labelFor(intent.target, resolve)
  return {
    kind: 'reword',
    summary: `reword: ${label} → ${intent.newLabel}`,
    target: { id: intent.target, label },
    newLabel: intent.newLabel,
  }
}

/** Project one `Proposal` stream to its card. `overflow` is caller-supplied
 * (it needs the sibling count, which only `proposalsView` has). Returns
 * `undefined` for a stream with no birth event. */
export const proposalCard = (
  events: ProposalEvent[],
  overflow = false,
  resolveLabel?: ResolveLabel,
): ProposalCard | undefined => {
  const blockBirth = blockBirthOf(events)
  const modelChangeBirth = modelChangeBirthOf(events)
  const birth = blockBirth ?? modelChangeBirth
  if (birth === undefined) return undefined

  const writeModel = replay(events)
  const lastEdit = events.findLast((event) => event.type === 'Proposal Edited')
  const rejected = events.findLast((event) => event.type === 'Operation Rejected')

  const common = {
    proposalId: birth.proposalId,
    contributionId: birth.contributionId,
    modelAffecting: writeModel.modelAffecting,
    disposition: writeModel.disposition,
    held: writeModel.held,
    overflow,
    ...(rejected?.type === 'Operation Rejected' ? { applyFailedReason: rejected.reason } : {}),
    ...(writeModel.buildingBlockId === undefined ? {} : { buildingBlockId: writeModel.buildingBlockId }),
  }

  if (blockBirth !== undefined) {
    return {
      ...common,
      blockKind: blockBirth.blockKind,
      label: lastEdit?.type === 'Proposal Edited' ? lastEdit.label : blockBirth.label,
      bar: blockBirth.bar,
    }
  }
  if (modelChangeBirth === undefined) return undefined
  return { ...common, intent: intentCard(editedIntent(modelChangeBirth.intent, events), resolveLabel) }
}

const birthContributionId = (events: ProposalEvent[]): ContributionId | '' =>
  (blockBirthOf(events) ?? modelChangeBirthOf(events))?.contributionId ?? ''

export const proposalsView = (
  sessionEvents: SessionEvent[],
  streams: { proposalId: ProposalId; events: ProposalEvent[] }[],
  resolveLabel?: ResolveLabel,
): ProposalCard[] => {
  const byId = new Map(streams.map((stream) => [stream.proposalId, stream.events]))
  const seenPerContribution = new Map<string, number>()
  const cards: ProposalCard[] = []

  for (const proposalId of sessionProposalIds(sessionEvents)) {
    const events = byId.get(proposalId) ?? []
    const contributionId = birthContributionId(events)
    const index = seenPerContribution.get(contributionId) ?? 0
    seenPerContribution.set(contributionId, index + 1)

    const card = proposalCard(events, index >= DISPLAY_CAP, resolveLabel)
    if (card !== undefined) cards.push(card)
  }

  return cards
}
