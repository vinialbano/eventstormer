import { describe, expect, it } from 'vitest'
import type { BuildingBlockId, ProposalId, QuestionId, ResolutionId } from '~/plumbing/ids.ts'
import type { FacilitationTurn } from './turn-schema.ts'
import { mapTurn, type TrackIdMint } from './map.ts'

/** A deterministic mint — `p_1`, `p_2`, … / `q_1`, `q_2`, … in call order. */
const countingMint = (): TrackIdMint => {
  let proposalCounter = 0
  let questionCounter = 0
  let resolutionCounter = 0
  return {
    proposalId: () => `p_${String((proposalCounter += 1))}` as ProposalId,
    questionId: () => `q_${String((questionCounter += 1))}` as QuestionId,
    resolutionId: () => `r_${String((resolutionCounter += 1))}` as ResolutionId,
  }
}

describe('mapTurn — FacilitationTurn → InterpretedTrack[] with minted ids', () => {
  it('maps a multi-track turn to the expected InterpretedTrack[] with stable minted ids', () => {
    const turn: FacilitationTurn = {
      interpretation: [
        { track: 'propose-building-block', blockKind: 'domain-event', label: 'Loan recorded', bar: 'strict' },
        {
          track: 'propose-building-block',
          blockKind: 'actor',
          label: 'Member',
          bar: 'lenient',
          evidenceSpan: 'a member',
        },
        { track: 'flag-phase', questionText: 'Can you break "Fulfilment" into concrete events?' },
        { track: 'attribute-to-other-format', format: 'command', note: '"Borrow a book" is a command.' },
        { track: 'answer-question', questionId: 'q_scope' },
      ],
      nextMove: { move: 'acknowledge' },
    }

    expect(mapTurn(turn, countingMint())).toEqual({
      tracks: [
        {
          track: 'propose-building-block',
          proposalId: 'p_1',
          blockKind: 'domain-event',
          label: 'Loan recorded',
          bar: 'strict',
        },
        {
          track: 'propose-building-block',
          proposalId: 'p_2',
          blockKind: 'actor',
          label: 'Member',
          bar: 'lenient',
          evidenceSpan: 'a member',
        },
        {
          track: 'flag-phase',
          questionId: 'q_1',
          questionText: 'Can you break "Fulfilment" into concrete events?',
        },
        { track: 'attribute-to-other-format', format: 'command', note: '"Borrow a book" is a command.' },
        { track: 'answer-question', questionId: 'q_scope' },
      ],
    })
  })

  it('mints one askQuestionId when nextMove.move is "ask", after the per-track question ids', () => {
    const turn: FacilitationTurn = {
      interpretation: [{ track: 'flag-phase', questionText: 'Break down "Onboarding"?' }],
      nextMove: { move: 'ask', questionText: 'What happens right after a member joins?' },
    }

    const result = mapTurn(turn, countingMint())
    expect(result.askQuestionId).toBe('q_2')
    expect(result.tracks).toEqual([
      { track: 'flag-phase', questionId: 'q_1', questionText: 'Break down "Onboarding"?' },
    ])
  })

  it('maps a propose-resolution track, minting a resolutionId and carrying hotSpotId + reference', () => {
    const turn: FacilitationTurn = {
      interpretation: [
        { track: 'propose-resolution', hotSpotId: 'h_1', reference: 'added a retry with backoff' },
      ],
      nextMove: { move: 'acknowledge' },
    }
    expect(mapTurn(turn, countingMint())).toEqual({
      tracks: [
        {
          track: 'propose-resolution',
          resolutionId: 'r_1',
          hotSpotId: 'h_1',
          reference: 'added a retry with backoff',
        },
      ],
    })
  })

  it('resolves a hot spot annotatesTargetId label to a live block id, carrying modelAffecting', () => {
    const turn: FacilitationTurn = {
      interpretation: [
        {
          track: 'propose-building-block',
          blockKind: 'hot-spot',
          label: 'Refund policy is disputed',
          bar: 'strict',
          modelAffecting: false,
          annotatesTargetId: 'Refund issued',
        },
      ],
      nextMove: { move: 'acknowledge' },
    }
    const resolve = (label: string) =>
      label === 'Refund issued' ? ('b_refund' as BuildingBlockId) : undefined

    expect(mapTurn(turn, countingMint(), resolve)).toEqual({
      tracks: [
        {
          track: 'propose-building-block',
          proposalId: 'p_1',
          blockKind: 'hot-spot',
          label: 'Refund policy is disputed',
          bar: 'strict',
          modelAffecting: false,
          annotatesTargetId: 'b_refund',
        },
      ],
    })
  })

  it('drops an unresolvable annotatesTargetId label, leaving the hot spot unannotated', () => {
    const turn: FacilitationTurn = {
      interpretation: [
        {
          track: 'propose-building-block',
          blockKind: 'hot-spot',
          label: 'Something unknown',
          bar: 'strict',
          annotatesTargetId: 'No such block',
        },
      ],
      nextMove: { move: 'acknowledge' },
    }

    expect(mapTurn(turn, countingMint(), () => undefined)).toEqual({
      tracks: [
        {
          track: 'propose-building-block',
          proposalId: 'p_1',
          blockKind: 'hot-spot',
          label: 'Something unknown',
          bar: 'strict',
        },
      ],
    })
  })

  it('omits askQuestionId when nextMove.move is "acknowledge"', () => {
    const turn: FacilitationTurn = { interpretation: [], nextMove: { move: 'acknowledge' } }
    expect(mapTurn(turn, countingMint())).toEqual({ tracks: [] })
  })
})
