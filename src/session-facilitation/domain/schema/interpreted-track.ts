import { z } from 'zod'
import { BuildingBlockId, ProposalId, QuestionId, ResolutionId } from './ids.ts'

/**
 * The **stored** interpretation of one strand of a contribution — the shape
 * `Contribution Interpreted` carries per track. It is *not* the model's output
 * shape: the Anthropic-shaped `FacilitationTurnSchema` lives in
 * `infrastructure/` and is mapped onto this union across an anticorruption seam,
 * minting the per-track `proposalId` / `questionId` here.
 *
 * No `z.unknown()` anywhere — every field is a concrete type.
 */

/** Domain events, actors, systems, and hot spots — not relations (ADR-010). */
export const InterpretedBlockKind = z.enum(['domain-event', 'actor', 'system', 'hot-spot'])
export type InterpretedBlockKind = z.infer<typeof InterpretedBlockKind>

/** How strictly the facilitator held the naming bar for this track. */
export const InterpretationBar = z.enum(['lenient', 'strict'])
export type InterpretationBar = z.infer<typeof InterpretationBar>

const proposeBuildingBlock = z.object({
  track: z.literal('propose-building-block'),
  proposalId: ProposalId,
  blockKind: InterpretedBlockKind,
  label: z.string().min(1).max(200),
  bar: InterpretationBar,
  /** The verbatim substring the label came from — carried when `bar` is lenient. */
  evidenceSpan: z.string().min(1).optional(),
  /**
   * Only meaningful when `blockKind` is `hot-spot`: whether the hot spot changes
   * the model (`true`) or is informational. Absent means model-affecting; a
   * proposal carrying neither this nor `annotatesTargetId` is a plain capture.
   */
  // SPEC_DEVIATION: design says `z.boolean().default(true)`; using `.optional()`.
  // Reason: `.default()` widens the Zod *output* type so `modelAffecting` becomes
  // required at every typed `InterpretedTrack` / `ProposalEvent` construction site
  // (production `map.ts`, `decide.ts`, and ~8 test fixtures). `.optional()` is
  // equally additive and keeps "absent = model-affecting plain capture"; consumers
  // read `modelAffecting ?? true`.
  modelAffecting: z.boolean().optional(),
  /** Only meaningful when `blockKind` is `hot-spot`: the block the hot spot annotates. */
  annotatesTargetId: BuildingBlockId.optional(),
})

const flagPhase = z.object({
  track: z.literal('flag-phase'),
  questionId: QuestionId,
  questionText: z.string().min(1),
})

const attributeToOtherFormat = z.object({
  track: z.literal('attribute-to-other-format'),
  /** The deeper format the content belongs to (e.g. "command", "policy"). */
  format: z.string().min(1),
  note: z.string().min(1),
})

const answerQuestion = z.object({
  track: z.literal('answer-question'),
  questionId: QuestionId,
})

/**
 * A contribution that closes an open hot spot — carried as a `Resolution` birth,
 * not a `Proposal` (the two aggregates have divergent outcomes). `reference` is
 * the recorded value; `hotSpotId` names the hot spot on the board.
 */
const proposeResolution = z.object({
  track: z.literal('propose-resolution'),
  resolutionId: ResolutionId,
  hotSpotId: BuildingBlockId,
  reference: z.string().min(1),
})

/**
 * The three question-track judgments — each names one open question the
 * contribution settles without answering it outright. They reuse the
 * `answer-question` shape (one `questionId`); the hot-spot raise a knowledge gap
 * or an absent stakeholder implies is left to the reconciliation pass.
 */
const revealKnowledgeGap = z.object({
  track: z.literal('reveal-knowledge-gap'),
  questionId: QuestionId,
  detail: z.string().min(1).optional(),
})

const nameAbsentStakeholder = z.object({
  track: z.literal('name-absent-stakeholder'),
  questionId: QuestionId,
  personName: z.string().min(1),
})

const confirmCompletePerspective = z.object({
  track: z.literal('confirm-complete-perspective'),
  questionId: QuestionId,
})

export const InterpretedTrack = z.discriminatedUnion('track', [
  proposeBuildingBlock,
  flagPhase,
  attributeToOtherFormat,
  answerQuestion,
  proposeResolution,
  revealKnowledgeGap,
  nameAbsentStakeholder,
  confirmCompletePerspective,
])
export type InterpretedTrack = z.infer<typeof InterpretedTrack>
