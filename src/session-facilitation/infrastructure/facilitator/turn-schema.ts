import { z } from 'zod'
import { InterpretationBar, InterpretedBlockKind } from '../../domain/schema/interpreted-track.ts'

/**
 * The **Anthropic-shaped** output schema the facilitator passes to
 * `Output.object`. It is a hand-shaped projection, NOT `z.array(Operation)`
 * and NOT the stored `InterpretedTrack` union:
 *
 * - only the strands the model actually produces — `v` / `author` / minted ids
 *   are absent (the app stamps / mints them);
 * - **no `z.unknown()`** — every field is a concrete type, so `z.toJSONSchema`
 *   never emits an empty `{}` subschema (Anthropic HTTP 400 "Empty schema");
 * - ≤ 24 optional parameters across the whole schema (Anthropic's grammar limit);
 * - `interpretation` is `z.array(Track).max(12)` — the hard "not an unbounded
 *   queue" ceiling (issue #38 AC14), not the display cap of 7;
 * - `label` is `.max(200)`.
 *
 * Every constraint is mirrored into `.describe()` — Anthropic's sanitiser strips
 * `min`/`max`/`.refine()` from the schema the model sees (docs/ai-harness-gotchas.md).
 */

const proposeBuildingBlock = z.object({
  track: z.literal('propose-building-block'),
  blockKind: InterpretedBlockKind.describe(
    'The Big-Picture building block: "domain-event" (a past-tense business fact), "actor" (a person/role), or "system" (an external system).',
  ),
  label: z
    .string()
    .min(1)
    .max(200)
    .describe('The building-block label, 1–200 characters. A domain event is phrased in past tense.'),
  bar: InterpretationBar.describe(
    'How strictly the naming bar was held: "strict" when the label is well-formed as given, "lenient" when the human\'s wording was kept despite awkward phrasing.',
  ),
  evidenceSpan: z
    .string()
    .min(1)
    .optional()
    .describe('Required when bar is "lenient": the verbatim substring of the contribution the label came from.'),
})

const flagPhase = z.object({
  track: z.literal('flag-phase'),
  questionText: z
    .string()
    .min(1)
    .describe('A question asking the expert to break the named phase into concrete events. The phase itself is NOT proposed as a building block.'),
})

const attributeToOtherFormat = z.object({
  track: z.literal('attribute-to-other-format'),
  format: z
    .string()
    .min(1)
    .describe('The deeper EventStorming format the content belongs to, e.g. "command", "policy", "read model", "aggregate".'),
  note: z.string().min(1).describe('A one-line notice naming the deeper format; no building block is produced.'),
})

const answerQuestion = z.object({
  track: z.literal('answer-question'),
  questionId: z
    .string()
    .min(1)
    .describe('The id of an OPEN question in this session that the contribution answers. Use only an id present in the open-questions list.'),
})

export const FacilitationTrack = z.discriminatedUnion('track', [
  proposeBuildingBlock,
  flagPhase,
  attributeToOtherFormat,
  answerQuestion,
])
export type FacilitationTrack = z.infer<typeof FacilitationTrack>

const NextMove = z.object({
  move: z
    .enum(['ask', 'acknowledge'])
    .describe('"ask" to pose a follow-up question, "acknowledge" to simply record the contribution and wait.'),
  questionText: z
    .string()
    .min(1)
    .max(400)
    .optional()
    .describe('Required when move is "ask": the follow-up question to put to the expert.'),
})

export const FacilitationTurnSchema = z.object({
  interpretation: z
    .array(FacilitationTrack)
    .max(12)
    .describe('0–12 independent strands read from the one contribution. Never more than 12.'),
  nextMove: NextMove,
})
export type FacilitationTurn = z.infer<typeof FacilitationTurnSchema>

/**
 * The `askOpening` output — the scope question plus a first-draft scope statement
 * the expert reviews with the F05 accept/edit/reject card.
 */
export const OpeningQuestionSchema = z.object({
  questionText: z.string().min(1).describe('The scope question to put to the expert.'),
  scopeStatement: z
    .string()
    .min(1)
    .max(10_000)
    .describe('A first-draft one-sentence statement of the business being mapped, for the expert to accept or edit.'),
})
export type OpeningQuestion = z.infer<typeof OpeningQuestionSchema>
