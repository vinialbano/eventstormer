import { z } from 'zod'
import {
  BuildingBlockId,
  ContributionId,
  ProposalId,
  QuestionId,
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

export const WorkshopEvent = z.discriminatedUnion('type', [WorkshopStarted, ScopeSet])
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
  kind: z.enum(['scope', 'phase', 'free']),
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
})

const ProposalEdited = z.object({
  ...base,
  type: z.literal('Proposal Edited'),
  proposalId: ProposalId,
  label: z.string().min(1).max(200),
})

const ProposalAccepted = z.object({
  ...base,
  type: z.literal('Proposal Accepted'),
  proposalId: ProposalId,
  accepter: z.string().min(1),
  buildingBlockId: BuildingBlockId,
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
  ProposalEdited,
  ProposalAccepted,
  ProposalRejected,
  ProposalHeld,
  ProposalUnheld,
  OperationApplied,
  OperationRejected,
  ProposalLapsed,
])
export type ProposalEvent = z.infer<typeof ProposalEvent>
