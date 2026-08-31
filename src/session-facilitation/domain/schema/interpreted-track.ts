import { z } from 'zod'
import { ProposalId, QuestionId } from './ids.ts'

/**
 * The **stored** interpretation of one strand of a contribution — the shape
 * `Contribution Interpreted` carries per track. It is *not* the model's output
 * shape: the Anthropic-shaped `FacilitationTurnSchema` lives in
 * `infrastructure/` and is mapped onto this union across an anticorruption seam,
 * minting the per-track `proposalId` / `questionId` here.
 *
 * No `z.unknown()` anywhere — every field is a concrete type.
 */

/** Events / actors / systems only this slice (ADR-010). */
export const InterpretedBlockKind = z.enum(['domain-event', 'actor', 'system'])
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

export const InterpretedTrack = z.discriminatedUnion('track', [
  proposeBuildingBlock,
  flagPhase,
  attributeToOtherFormat,
  answerQuestion,
])
export type InterpretedTrack = z.infer<typeof InterpretedTrack>
