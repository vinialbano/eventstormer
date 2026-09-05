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
   * the model (`true`) or is informational. Absent means model-affecting;
   * consumers read `modelAffecting ?? true`. A proposal carrying neither this nor
   * `annotatesTargetId` is a plain capture. `.optional()` rather than
   * `.default(true)` because `.default()` widens the Zod output type, forcing
   * `modelAffecting` at every typed `InterpretedTrack` / `ProposalEvent`
   * construction site.
   */
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

/** The board relation kinds the facilitator may propose (not `unsequence`). */
const InterpretedRelationKind = z.enum([
  'sequence',
  'insert-between',
  'place',
  'unplace',
  'link-cause',
  'unlink-cause',
])
type InterpretedRelationKind = z.infer<typeof InterpretedRelationKind>

/** Which named endpoint fields a `propose-relation` track carries per kind — it
 * mirrors the `Operation` union exactly, so the accept path reads it field to
 * field with no positional spread. */
const RELATION_FIELDS: Record<InterpretedRelationKind, readonly RelationField[]> = {
  sequence: ['predecessor', 'successor'],
  'insert-between': ['predecessor', 'inserted', 'successor'],
  place: ['target'],
  unplace: ['target'],
  'link-cause': ['cause', 'effect'],
  'unlink-cause': ['cause', 'effect'],
}

type RelationField = 'predecessor' | 'successor' | 'inserted' | 'cause' | 'effect' | 'target'
const ALL_RELATION_FIELDS: readonly RelationField[] = [
  'predecessor',
  'successor',
  'inserted',
  'cause',
  'effect',
  'target',
]

/**
 * The facilitator proposes a board relation operation — id-resolved at the
 * anticorruption seam. The endpoint fields are **named** (never a positional
 * array): exactly the set the corresponding `Operation` needs, checked against
 * `relationKind` by the union refine.
 */
const proposeRelation = z.object({
  track: z.literal('propose-relation'),
  proposalId: ProposalId,
  relationKind: InterpretedRelationKind,
  predecessor: BuildingBlockId.optional(),
  successor: BuildingBlockId.optional(),
  inserted: BuildingBlockId.optional(),
  cause: BuildingBlockId.optional(),
  effect: BuildingBlockId.optional(),
  target: BuildingBlockId.optional(),
})

/**
 * The facilitator proposes a pivotal mark / unmark. Below the F07 readiness
 * threshold the track is `heldBack` — it carries the `eventLabel` for the notice
 * but no `proposalId` / `target` (no `Proposal` is born).
 */
const proposePivotal = z.object({
  track: z.literal('propose-pivotal'),
  proposalId: ProposalId.optional(),
  pivotalKind: z.enum(['mark-pivotal', 'unmark-pivotal']),
  target: BuildingBlockId.optional(),
  heldBack: z.boolean(),
  eventLabel: z.string().min(1),
})

/**
 * The facilitator proposes a reword of an existing block. Held back until the
 * model has structure (F04) — a held track carries `targetLabel` for the notice
 * but no `proposalId` / `target`.
 */
const proposeReword = z.object({
  track: z.literal('propose-reword'),
  proposalId: ProposalId.optional(),
  target: BuildingBlockId.optional(),
  newLabel: z.string().min(1).max(200),
  heldBack: z.boolean(),
  targetLabel: z.string().min(1),
})

const relationFieldSetMatchesKind = (
  track: z.infer<typeof proposeRelation>,
): boolean => {
  const expected = new Set<string>(RELATION_FIELDS[track.relationKind])
  return ALL_RELATION_FIELDS.every((field) => (track[field] !== undefined) === expected.has(field))
}

/** `proposalId` and `target` are present exactly when the track is not held back. */
const heldBackFieldsConsistent = (track: {
  heldBack: boolean
  proposalId?: unknown
  target?: unknown
}): boolean =>
  (track.proposalId !== undefined) === !track.heldBack &&
  (track.target !== undefined) === !track.heldBack

export const InterpretedTrack = z
  .discriminatedUnion('track', [
    proposeBuildingBlock,
    flagPhase,
    attributeToOtherFormat,
    answerQuestion,
    proposeResolution,
    revealKnowledgeGap,
    nameAbsentStakeholder,
    confirmCompletePerspective,
    proposeRelation,
    proposePivotal,
    proposeReword,
  ])
  .refine(
    (track) => track.track !== 'propose-relation' || relationFieldSetMatchesKind(track),
    { error: 'propose-relation: the endpoint field set must match relationKind' },
  )
  .refine(
    (track) =>
      (track.track !== 'propose-pivotal' && track.track !== 'propose-reword') ||
      heldBackFieldsConsistent(track),
    { error: 'a held-back track carries no proposalId/target; a released one carries both' },
  )
export type InterpretedTrack = z.infer<typeof InterpretedTrack>
