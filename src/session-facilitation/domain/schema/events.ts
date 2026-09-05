import { z } from 'zod'
import {
  BuildingBlockId,
  ContributionId,
  ProposalId,
  QuestionId,
  ResolutionId,
  SessionId,
  WorkshopId,
} from './ids.ts'
import { InterpretedBlockKind, InterpretationBar, InterpretedTrack } from './interpreted-track.ts'

/**
 * The frozen per-aggregate event SSOTs for `session-facilitation`. One
 * framework-free definition (ADR-004 discipline). Every event carries
 * `v: z.literal(1)` — a future shape change adds `z.literal(2)` variants beside
 * these, never mutates one. `at` is an ISO-8601 UTC string stamped from the
 * `Clock` in the application layer.
 */
const Timestamp = z.iso.datetime()
const base = { v: z.literal(1), at: Timestamp }

// --- Workshop ---------------------------------------------------------------

const WorkshopStarted = z.object({
  ...base,
  type: z.literal('Workshop Started'),
  workshopId: WorkshopId,
  format: z.literal('big-picture'),
  creatorName: z.string().min(1).max(80),
})

const ScopeSet = z.object({
  ...base,
  type: z.literal('Scope Set'),
  workshopId: WorkshopId,
  statement: z.string().min(1).max(10_000),
})

const StakeholderCheckRecorded = z.object({
  ...base,
  type: z.literal('Stakeholder Check Recorded'),
  workshopId: WorkshopId,
  complete: z.boolean(),
  absentNames: z.array(z.string().min(1)),
})

const ProblemChosen = z.object({
  ...base,
  type: z.literal('Problem Chosen'),
  workshopId: WorkshopId,
  problemHotSpotId: BuildingBlockId,
  qualification: z.enum(['firm', 'provisional']),
})

const ProblemChoiceSkipped = z.object({
  ...base,
  type: z.literal('Problem Choice Skipped'),
  workshopId: WorkshopId,
  reason: z.enum(['none-chosen', 'no-impediments-yet']),
})

export const WorkshopEvent = z.discriminatedUnion('type', [
  WorkshopStarted,
  ScopeSet,
  StakeholderCheckRecorded,
  ProblemChosen,
  ProblemChoiceSkipped,
])
export type WorkshopEvent = z.infer<typeof WorkshopEvent>

// --- Session ---------------------------------------------------------------

const SessionStarted = z.object({
  ...base,
  type: z.literal('Session Started'),
  sessionId: SessionId,
  workshopId: WorkshopId,
})

const ContributionMade = z.object({
  ...base,
  type: z.literal('Contribution Made'),
  sessionId: SessionId,
  contributionId: ContributionId,
  speaker: z.string().min(1),
  body: z.string().min(1).max(10_000),
  source: z.literal('typed'),
})

const ContributionInterpreted = z.object({
  ...base,
  type: z.literal('Contribution Interpreted'),
  sessionId: SessionId,
  contributionId: ContributionId,
  tracks: z.array(InterpretedTrack),
  /** Minted when the turn's `nextMove` is `ask` — the follow-up question's id. */
  askQuestionId: QuestionId.optional(),
  /** The follow-up question's text — carried with `askQuestionId` so the derived
   * `Question Asked {kind:'free'}` is a pure derivation of this event. */
  askQuestionText: z.string().min(1).optional(),
})

const ContributionInterpretationFailed = z.object({
  ...base,
  type: z.literal('Contribution Interpretation Failed'),
  sessionId: SessionId,
  contributionId: ContributionId,
  reason: z.string().min(1),
})

const QuestionAsked = z.object({
  ...base,
  type: z.literal('Question Asked'),
  sessionId: SessionId,
  questionId: QuestionId,
  kind: z.enum(['scope', 'phase', 'free', 'stakeholder']),
  text: z.string().min(1),
  /** Required iff `kind` is `scope` — the proposed scope statement to review. */
  scopeStatement: z.string().min(1).max(10_000).optional(),
})

const QuestionAnswered = z.object({
  ...base,
  type: z.literal('Question Answered'),
  sessionId: SessionId,
  questionId: QuestionId,
  byContributionId: ContributionId,
})

const KnowledgeGapRevealed = z.object({
  ...base,
  type: z.literal('Knowledge Gap Revealed'),
  sessionId: SessionId,
  questionId: QuestionId,
  byContributionId: ContributionId,
  /** What the contributor could say about the gap, when they said anything. */
  detail: z.string().min(1).optional(),
})

const AbsentStakeholderNamed = z.object({
  ...base,
  type: z.literal('Absent Stakeholder Named'),
  sessionId: SessionId,
  questionId: QuestionId,
  byContributionId: ContributionId,
  personName: z.string().min(1),
})

const CompletePerspectiveConfirmed = z.object({
  ...base,
  type: z.literal('Complete Perspective Confirmed'),
  sessionId: SessionId,
  questionId: QuestionId,
  byContributionId: ContributionId,
})

const ContributionAttributedToAnotherFormat = z.object({
  ...base,
  type: z.literal('Contribution Attributed To Another Format'),
  sessionId: SessionId,
  contributionId: ContributionId,
  format: z.string().min(1),
  note: z.string().min(1),
})

const SessionClosed = z.object({
  ...base,
  type: z.literal('Session Closed'),
  sessionId: SessionId,
  workshopId: WorkshopId,
  unresolvedQuestionIds: z.array(QuestionId),
})

/**
 * `Question Asked` refine: `scopeStatement` is present **iff** `kind === 'scope'`
 * (design — the event schema enforces the scope-turn contract). Applied at the
 * union so `Question Asked` stays a plain object in the discriminated union.
 */
export const SessionEvent = z
  .discriminatedUnion('type', [
    SessionStarted,
    ContributionMade,
    ContributionInterpreted,
    ContributionInterpretationFailed,
    QuestionAsked,
    QuestionAnswered,
    KnowledgeGapRevealed,
    AbsentStakeholderNamed,
    CompletePerspectiveConfirmed,
    ContributionAttributedToAnotherFormat,
    SessionClosed,
  ])
  .refine(
    (event) =>
      event.type !== 'Question Asked' ||
      (event.kind === 'scope') === (event.scopeStatement !== undefined),
    {
      error: 'Question Asked: scopeStatement is present iff kind is "scope"',
      path: ['scopeStatement'],
    },
  )
export type SessionEvent = z.infer<typeof SessionEvent>

// --- Proposal ------------------------------------------------------------------

const BuildingBlockProposed = z.object({
  ...base,
  type: z.literal('Building Block Proposed'),
  proposalId: ProposalId,
  sessionId: SessionId,
  contributionId: ContributionId,
  blockKind: InterpretedBlockKind,
  label: z.string().min(1).max(200),
  bar: InterpretationBar,
  evidenceSpan: z.string().min(1).optional(),
  /**
   * Only meaningful when `blockKind` is `hot-spot`: whether the hot spot changes
   * the model (`true`) or is informational. Absent means model-affecting;
   * consumers read `modelAffecting ?? true`. A proposal carrying neither this nor
   * `annotatesTargetId` is a plain capture. `.optional()` rather than
   * `.default(true)` because `.default()` widens the Zod output type, forcing
   * `modelAffecting` at every typed `ProposalEvent` construction site.
   */
  modelAffecting: z.boolean().optional(),
  /** Only meaningful when `blockKind` is `hot-spot`: the block the hot spot annotates. */
  annotatesTargetId: BuildingBlockId.optional(),
})

/**
 * A proposed board relation / pivotal / reword operation — the second `Proposal`
 * birth beside `Building Block Proposed`. `Intent` is frozen once shipped: append
 * `z.literal(2)` variants beside these, never mutate one. The id fields are
 * **named** (never positional), so the accept path builds the `Operation` field
 * to field.
 */
const RelationIntentKind = z.enum([
  'sequence',
  'insert-between',
  'place',
  'unplace',
  'link-cause',
  'unlink-cause',
])

const RelationIntent = z.object({
  kind: z.literal('relation'),
  relationKind: RelationIntentKind,
  predecessor: BuildingBlockId.optional(),
  successor: BuildingBlockId.optional(),
  inserted: BuildingBlockId.optional(),
  cause: BuildingBlockId.optional(),
  effect: BuildingBlockId.optional(),
  target: BuildingBlockId.optional(),
})

const PivotalIntent = z.object({
  kind: z.literal('pivotal'),
  pivotalKind: z.enum(['mark-pivotal', 'unmark-pivotal']),
  target: BuildingBlockId,
})

const RewordIntent = z.object({
  kind: z.literal('reword'),
  target: BuildingBlockId,
  newLabel: z.string().min(1).max(200),
})

export const Intent = z.discriminatedUnion('kind', [RelationIntent, PivotalIntent, RewordIntent])
export type Intent = z.infer<typeof Intent>

const ModelChangeProposed = z.object({
  ...base,
  type: z.literal('Model Change Proposed'),
  proposalId: ProposalId,
  sessionId: SessionId,
  contributionId: ContributionId,
  intent: Intent,
})

/** Only the mutable fields of the birth `intent` — never re-asserts `kind`
 * (mirrors `Proposal Edited` carrying only `label`). */
const ModelChangeEdited = z.object({
  ...base,
  type: z.literal('Model Change Edited'),
  proposalId: ProposalId,
  changed: z.object({
    predecessor: BuildingBlockId.optional(),
    successor: BuildingBlockId.optional(),
    inserted: BuildingBlockId.optional(),
    cause: BuildingBlockId.optional(),
    effect: BuildingBlockId.optional(),
    target: BuildingBlockId.optional(),
    newLabel: z.string().min(1).max(200).optional(),
  }),
})

const ProposalEdited = z.object({
  ...base,
  type: z.literal('Proposal Edited'),
  proposalId: ProposalId,
  label: z.string().min(1).max(200),
})

const ProposalKindSet = z.object({
  ...base,
  type: z.literal('Proposal Kind Set'),
  proposalId: ProposalId,
  modelAffecting: z.boolean(),
})

const ProposalAccepted = z.object({
  ...base,
  type: z.literal('Proposal Accepted'),
  proposalId: ProposalId,
  accepter: z.string().min(1),
  /** Absent when the accepted proposal is a model change — it mints no block. */
  buildingBlockId: BuildingBlockId.optional(),
})

const ProposalRejected = z.object({
  ...base,
  type: z.literal('Proposal Rejected'),
  proposalId: ProposalId,
})

const ProposalHeld = z.object({
  ...base,
  type: z.literal('Proposal Held'),
  proposalId: ProposalId,
})

const ProposalUnheld = z.object({
  ...base,
  type: z.literal('Proposal Unheld'),
  proposalId: ProposalId,
})

const OperationApplied = z.object({
  ...base,
  type: z.literal('Operation Applied'),
  proposalId: ProposalId,
  resultingBuildingBlockId: BuildingBlockId,
})

const OperationRejected = z.object({
  ...base,
  type: z.literal('Operation Rejected'),
  proposalId: ProposalId,
  reason: z.string().min(1),
})

const ProposalLapsed = z.object({
  ...base,
  type: z.literal('Proposal Lapsed'),
  proposalId: ProposalId,
  cause: z.enum(['undisposed', 'apply-failed']),
})

export const ProposalEvent = z.discriminatedUnion('type', [
  BuildingBlockProposed,
  ModelChangeProposed,
  ModelChangeEdited,
  ProposalEdited,
  ProposalKindSet,
  ProposalAccepted,
  ProposalRejected,
  ProposalHeld,
  ProposalUnheld,
  OperationApplied,
  OperationRejected,
  ProposalLapsed,
])
export type ProposalEvent = z.infer<typeof ProposalEvent>

// --- Resolution ---------------------------------------------------------------

const ResolutionReference = z.string().min(1)

const ResolutionProposed = z.object({
  ...base,
  type: z.literal('Resolution Proposed'),
  resolutionId: ResolutionId,
  sessionId: SessionId,
  contributionId: ContributionId,
  hotSpotId: BuildingBlockId,
  reference: ResolutionReference,
})

const ResolutionEdited = z.object({
  ...base,
  type: z.literal('Resolution Edited'),
  resolutionId: ResolutionId,
  reference: ResolutionReference,
})

const ResolutionAccepted = z.object({
  ...base,
  type: z.literal('Resolution Accepted'),
  resolutionId: ResolutionId,
  accepter: z.string().min(1),
})

const ResolutionRejected = z.object({
  ...base,
  type: z.literal('Resolution Rejected'),
  resolutionId: ResolutionId,
})

const ResolutionLapsed = z.object({
  ...base,
  type: z.literal('Resolution Lapsed'),
  resolutionId: ResolutionId,
})

const HotSpotResolved = z.object({
  ...base,
  type: z.literal('Hot Spot Resolved'),
  resolutionId: ResolutionId,
})

const HotSpotResolutionRejected = z.object({
  ...base,
  type: z.literal('Hot Spot Resolution Rejected'),
  resolutionId: ResolutionId,
  reason: z.string().min(1),
})

export const ResolutionEvent = z.discriminatedUnion('type', [
  ResolutionProposed,
  ResolutionEdited,
  ResolutionAccepted,
  ResolutionRejected,
  ResolutionLapsed,
  HotSpotResolved,
  HotSpotResolutionRejected,
])
export type ResolutionEvent = z.infer<typeof ResolutionEvent>
