import type { ProposalId, QuestionId, ResolutionId } from '~/plumbing/ids.ts'
import {
  BuildingBlockId as BuildingBlockIdSchema,
  QuestionId as QuestionIdSchema,
} from '../../domain/schema/ids.ts'
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
  resolutionId: () => ResolutionId
}

export interface MappedTurn {
  tracks: InterpretedTrack[]
  askQuestionId?: QuestionId
}

export const mapTurn = (turn: FacilitationTurn, mint: TrackIdMint): MappedTurn => {
  const tracks: InterpretedTrack[] = turn.interpretation.map((track): InterpretedTrack => {
    switch (track.track) {
      case 'propose-building-block':
        return {
          track: 'propose-building-block',
          proposalId: mint.proposalId(),
          blockKind: track.blockKind,
          label: track.label,
          bar: track.bar,
          ...(track.evidenceSpan === undefined ? {} : { evidenceSpan: track.evidenceSpan }),
        }
      case 'flag-phase':
        return {
          track: 'flag-phase',
          questionId: mint.questionId(),
          questionText: track.questionText,
        }
      case 'attribute-to-other-format':
        return { track: 'attribute-to-other-format', format: track.format, note: track.note }
      case 'answer-question':
        return { track: 'answer-question', questionId: QuestionIdSchema.parse(track.questionId) }
      case 'propose-resolution':
        return {
          track: 'propose-resolution',
          resolutionId: mint.resolutionId(),
          hotSpotId: BuildingBlockIdSchema.parse(track.hotSpotId),
          reference: track.reference,
        }
    }
  })

  return turn.nextMove.move === 'ask'
    ? { tracks, askQuestionId: mint.questionId() }
    : { tracks }
}
