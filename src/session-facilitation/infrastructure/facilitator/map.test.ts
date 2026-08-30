import { describe, expect, it } from 'vitest'
import type { ProposalId, QuestionId } from '~/plumbing/ids.ts'
import type { FacilitationTurn } from './turn-schema.ts'
import { mapTurn, type TrackIdMint } from './map.ts'

/** A deterministic mint — `p_1`, `p_2`, … / `q_1`, `q_2`, … in call order. */
const countingMint = (): TrackIdMint => {
  let p = 0
  let q = 0
  return {
    proposalId: () => `p_${String((p += 1))}` as ProposalId,
    questionId: () => `q_${String((q += 1))}` as QuestionId,
  }
}

describe('mapTurn — FacilitationTurn → InterpretedTrack[] with minted ids (S1-19, S1-40)', () => {
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

  it('omits askQuestionId when nextMove.move is "acknowledge"', () => {
    const turn: FacilitationTurn = { interpretation: [], nextMove: { move: 'acknowledge' } }
    expect(mapTurn(turn, countingMint())).toEqual({ tracks: [] })
  })
})
