import type { ProposalId, QuestionId } from '~/plumbing/ids.ts'
import { QuestionId as QuestionIdSchema } from '../../domain/schema/ids.ts'
import type { InterpretedTrack } from '../../domain/schema/interpreted-track.ts'
import type { FacilitationTurn } from './turn-schema.ts'

/**
 * The anticorruption seam. The model speaks `FacilitationTurn`; the rest of the
 * context speaks the stored `InterpretedTrack` union. `mapTurn` translates one to
 * the other and mints the per-track ids the model never sees — a `proposalId`
 * per proposed block, a `questionId` per flagged phase, and (when the turn's
 * `nextMove` is `ask`) one `askQuestionId` for the follow-up question.
 *
 * `mint` is injected so a test gets stable ids.
 */
export interface TrackIdMint {
  proposalId: () => ProposalId
  questionId: () => QuestionId
}

export interface MappedTurn {
  tracks: InterpretedTrack[]
  askQuestionId?: QuestionId
}

export const mapTurn = (turn: FacilitationTurn, mint: TrackIdMint): MappedTurn => {
  const tracks: InterpretedTrack[] = turn.interpretation.map((t): InterpretedTrack => {
    switch (t.track) {
      case 'propose-building-block':
        return {
          track: 'propose-building-block',
          proposalId: mint.proposalId(),
          blockKind: t.blockKind,
          label: t.label,
          bar: t.bar,
          ...(t.evidenceSpan === undefined ? {} : { evidenceSpan: t.evidenceSpan }),
        }
      case 'flag-phase':
        return {
          track: 'flag-phase',
          questionId: mint.questionId(),
          questionText: t.questionText,
        }
      case 'attribute-to-other-format':
        return { track: 'attribute-to-other-format', format: t.format, note: t.note }
      case 'answer-question':
        return { track: 'answer-question', questionId: QuestionIdSchema.parse(t.questionId) }
    }
  })

  return turn.nextMove.move === 'ask'
    ? { tracks, askQuestionId: mint.questionId() }
    : { tracks }
}
