import type { BuildingBlockId, ProposalId, QuestionId, ResolutionId } from '~/plumbing/ids.ts'
import { PIVOTAL_MIN_PLACED_EVENTS } from '../../domain/model-readiness.ts'
import {
  BuildingBlockId as BuildingBlockIdSchema,
  QuestionId as QuestionIdSchema,
} from '../../domain/schema/ids.ts'
import {
  type InterpretedTrack,
  RELATION_FIELDS,
  type RelationField,
} from '../../domain/schema/interpreted-track.ts'
import type { FacilitationTurn } from './turn-schema.ts'

/**
 * The anticorruption seam. The model speaks `FacilitationTurn`; the rest of the
 * context speaks the stored `InterpretedTrack` union. `mapTurn` translates one to
 * the other and mints the per-track ids the model never sees — a `proposalId`
 * per proposed block, a `questionId` per flagged phase, and (when the turn's
 * `nextMove` is `ask`) one `askQuestionId` for the follow-up question.
 *
 * `mint` is injected so a test gets stable ids. `resolveBlockId` turns the label
 * the model names for a hot spot's target into a live `BuildingBlockId` — an
 * unresolvable `annotatesTargetId` label is dropped, leaving the hot spot
 * unannotated; an unresolvable `propose-resolution` `hotSpotId` is kept verbatim
 * (the model is told to pass an id there, and a bad one bounces at accept).
 *
 * `boardState` carries the F04 / F07 readiness inputs, read from one
 * `readBoardSnapshot` taken **after** the model call returns. A `propose-relation`
 * track is dropped when an endpoint label does not resolve, the arity is wrong
 * for `relationKind`, or two endpoints are equal. A `propose-pivotal` track is
 * `heldBack` unless its target is a placed domain event and the board has enough
 * placed events. A `propose-reword` track is `heldBack` unless the model has
 * structure or its target was proposed earlier in the same turn.
 */
export interface TrackIdMint {
  proposalId: () => ProposalId
  questionId: () => QuestionId
  resolutionId: () => ResolutionId
}

export interface BoardState {
  placedEventCount: number
  hasStructure: boolean
  isPlacedDomainEvent: (id: BuildingBlockId) => boolean
}

const EMPTY_BOARD: BoardState = {
  placedEventCount: 0,
  hasStructure: false,
  isPlacedDomainEvent: () => false,
}

export interface MappedTurn {
  tracks: InterpretedTrack[]
  askQuestionId?: QuestionId
}

const relationTrack = (
  track: Extract<FacilitationTurn['interpretation'][number], { track: 'propose-relation' }>,
  proposalId: ProposalId,
  resolveBlockId: (label: string) => BuildingBlockId | undefined,
): InterpretedTrack[] => {
  const fields = RELATION_FIELDS[track.relationKind]
  if (track.endpoints.length !== fields.length) return []
  const ids = track.endpoints.map((label) => resolveBlockId(label))
  if (ids.some((id) => id === undefined)) return []
  const resolved = ids as BuildingBlockId[]
  if (new Set(resolved).size !== resolved.length) return []
  const named: Partial<Record<RelationField, BuildingBlockId>> = {}
  for (const [index, field] of fields.entries()) {
    const id = resolved[index]
    if (id === undefined) return []
    named[field] = id
  }
  return [{ track: 'propose-relation', proposalId, relationKind: track.relationKind, ...named }]
}

const pivotalTrack = (
  track: Extract<FacilitationTurn['interpretation'][number], { track: 'propose-pivotal' }>,
  mint: TrackIdMint,
  resolveBlockId: (label: string) => BuildingBlockId | undefined,
  boardState: BoardState,
): InterpretedTrack[] => {
  const target = resolveBlockId(track.eventLabel)
  if (target === undefined || !boardState.isPlacedDomainEvent(target)) return []
  if (boardState.placedEventCount < PIVOTAL_MIN_PLACED_EVENTS) {
    return [
      {
        track: 'propose-pivotal',
        pivotalKind: track.pivotalKind,
        heldBack: true,
        eventLabel: track.eventLabel,
      },
    ]
  }
  return [
    {
      track: 'propose-pivotal',
      proposalId: mint.proposalId(),
      pivotalKind: track.pivotalKind,
      target,
      heldBack: false,
      eventLabel: track.eventLabel,
    },
  ]
}

const rewordTrack = (
  track: Extract<FacilitationTurn['interpretation'][number], { track: 'propose-reword' }>,
  mint: TrackIdMint,
  resolveBlockId: (label: string) => BuildingBlockId | undefined,
  boardState: BoardState,
  proposedThisTurn: ReadonlySet<string>,
): InterpretedTrack[] => {
  const heldBack = !boardState.hasStructure && !proposedThisTurn.has(track.targetLabel)
  if (heldBack) {
    return [
      {
        track: 'propose-reword',
        newLabel: track.newLabel,
        heldBack: true,
        targetLabel: track.targetLabel,
      },
    ]
  }
  const target = resolveBlockId(track.targetLabel)
  // SPEC_DEVIATION: a same-turn reword target has no BuildingBlockId yet (ids are
  // minted at accept), and a released strand needs one. When the target cannot be
  // resolved on the board the strand is dropped — never surfaced as a "held until
  // structure" notice, which would misdescribe a block the person is still
  // authoring. A later contribution's reword resolves normally once accepted.
  if (target === undefined) return []
  return [
    {
      track: 'propose-reword',
      proposalId: mint.proposalId(),
      target,
      newLabel: track.newLabel,
      heldBack: false,
      targetLabel: track.targetLabel,
    },
  ]
}

export const mapTurn = (
  turn: FacilitationTurn,
  mint: TrackIdMint,
  resolveBlockId: (label: string) => BuildingBlockId | undefined = () => undefined,
  boardState: BoardState = EMPTY_BOARD,
): MappedTurn => {
  const labelsProposedThisTurn = new Set<string>()

  const tracks: InterpretedTrack[] = turn.interpretation.flatMap((track): InterpretedTrack[] => {
    switch (track.track) {
      case 'propose-relation':
        return relationTrack(track, mint.proposalId(), resolveBlockId)
      case 'propose-pivotal':
        return pivotalTrack(track, mint, resolveBlockId, boardState)
      case 'propose-reword':
        return rewordTrack(track, mint, resolveBlockId, boardState, labelsProposedThisTurn)
      case 'propose-building-block': {
        labelsProposedThisTurn.add(track.label)
        const annotatesTargetId =
          track.annotatesTargetId === undefined ? undefined : resolveBlockId(track.annotatesTargetId)
        return [
          {
            track: 'propose-building-block',
            proposalId: mint.proposalId(),
            blockKind: track.blockKind,
            label: track.label,
            bar: track.bar,
            ...(track.evidenceSpan === undefined ? {} : { evidenceSpan: track.evidenceSpan }),
            ...(track.modelAffecting === undefined ? {} : { modelAffecting: track.modelAffecting }),
            ...(annotatesTargetId === undefined ? {} : { annotatesTargetId }),
          },
        ]
      }
      case 'flag-phase':
        return [
          {
            track: 'flag-phase',
            questionId: mint.questionId(),
            questionText: track.questionText,
          },
        ]
      case 'attribute-to-other-format':
        return [{ track: 'attribute-to-other-format', format: track.format, note: track.note }]
      case 'answer-question':
        return [{ track: 'answer-question', questionId: QuestionIdSchema.parse(track.questionId) }]
      case 'reveal-knowledge-gap':
        return [
          {
            track: 'reveal-knowledge-gap',
            questionId: QuestionIdSchema.parse(track.questionId),
            ...(track.detail === undefined ? {} : { detail: track.detail }),
          },
        ]
      case 'name-absent-stakeholder':
        return [
          {
            track: 'name-absent-stakeholder',
            questionId: QuestionIdSchema.parse(track.questionId),
            personName: track.personName,
          },
        ]
      case 'confirm-complete-perspective':
        return [
          {
            track: 'confirm-complete-perspective',
            questionId: QuestionIdSchema.parse(track.questionId),
          },
        ]
      case 'propose-resolution':
        return [
          {
            track: 'propose-resolution',
            resolutionId: mint.resolutionId(),
            hotSpotId: resolveBlockId(track.hotSpotId) ?? BuildingBlockIdSchema.parse(track.hotSpotId),
            reference: track.reference,
          },
        ]
    }
  })

  return turn.nextMove.move === 'ask'
    ? { tracks, askQuestionId: mint.questionId() }
    : { tracks }
}
