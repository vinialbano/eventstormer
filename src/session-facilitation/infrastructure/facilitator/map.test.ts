import { describe, expect, it } from 'vitest'
import type { BuildingBlockId, ProposalId, QuestionId, ResolutionId } from '~/plumbing/ids.ts'
import type { FacilitationTurn } from './turn-schema.ts'
import { type BoardState, mapTurn, type TrackIdMint } from './map.ts'

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

  it('resolves a propose-resolution hotSpotId label to a live block id, else keeps it verbatim', () => {
    const turn: FacilitationTurn = {
      interpretation: [
        { track: 'propose-resolution', hotSpotId: 'Concern: Book borrowed', reference: 'fixed with a retry' },
      ],
      nextMove: { move: 'acknowledge' },
    }
    const resolve = (label: string): BuildingBlockId | undefined =>
      label === 'Concern: Book borrowed' ? ('hs_live' as BuildingBlockId) : undefined
    expect(mapTurn(turn, countingMint(), resolve).tracks[0]).toMatchObject({
      track: 'propose-resolution',
      hotSpotId: 'hs_live',
    })
    expect(mapTurn(turn, countingMint()).tracks[0]).toMatchObject({ hotSpotId: 'Concern: Book borrowed' })
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

const ACK = { move: 'acknowledge' as const }
const board = (over: Partial<BoardState> = {}): BoardState => ({
  placedEventCount: 0,
  hasStructure: false,
  isPlacedDomainEvent: () => false,
  ...over,
})
const resolver =
  (map: Record<string, BuildingBlockId>) =>
  (label: string): BuildingBlockId | undefined =>
    map[label]

describe('mapTurn — propose-relation', () => {
  const ids = resolver({ A: 'bb_a' as BuildingBlockId, B: 'bb_b' as BuildingBlockId, C: 'bb_c' as BuildingBlockId })

  it('emits named endpoint fields matching the relationKind', () => {
    const turn: FacilitationTurn = {
      interpretation: [{ track: 'propose-relation', relationKind: 'sequence', endpoints: ['A', 'B'], rationale: 'x' }],
      nextMove: ACK,
    }
    expect(mapTurn(turn, countingMint(), ids, board()).tracks).toEqual([
      { track: 'propose-relation', proposalId: 'p_1', relationKind: 'sequence', predecessor: 'bb_a', successor: 'bb_b' },
    ])
  })

  it('maps insert-between to predecessor/inserted/successor in endpoint order', () => {
    const turn: FacilitationTurn = {
      interpretation: [
        { track: 'propose-relation', relationKind: 'insert-between', endpoints: ['A', 'C', 'B'], rationale: 'x' },
      ],
      nextMove: ACK,
    }
    expect(mapTurn(turn, countingMint(), ids, board()).tracks).toEqual([
      {
        track: 'propose-relation',
        proposalId: 'p_1',
        relationKind: 'insert-between',
        predecessor: 'bb_a',
        inserted: 'bb_c',
        successor: 'bb_b',
      },
    ])
  })

  it('drops the track when an endpoint label does not resolve', () => {
    const turn: FacilitationTurn = {
      interpretation: [{ track: 'propose-relation', relationKind: 'sequence', endpoints: ['A', 'Z'], rationale: 'x' }],
      nextMove: ACK,
    }
    expect(mapTurn(turn, countingMint(), ids, board()).tracks).toEqual([])
  })

  it('drops the track when the arity is wrong for the relationKind', () => {
    const turn: FacilitationTurn = {
      interpretation: [{ track: 'propose-relation', relationKind: 'sequence', endpoints: ['A'], rationale: 'x' }],
      nextMove: ACK,
    }
    expect(mapTurn(turn, countingMint(), ids, board()).tracks).toEqual([])
  })

  it('drops the track when two endpoints resolve to the same block', () => {
    const turn: FacilitationTurn = {
      interpretation: [{ track: 'propose-relation', relationKind: 'sequence', endpoints: ['A', 'A'], rationale: 'x' }],
      nextMove: ACK,
    }
    expect(mapTurn(turn, countingMint(), ids, board()).tracks).toEqual([])
  })
})

describe('mapTurn — propose-pivotal', () => {
  const ids = resolver({ 'Loan recorded': 'bb_a' as BuildingBlockId })
  const track = { track: 'propose-pivotal' as const, pivotalKind: 'mark-pivotal' as const, eventLabel: 'Loan recorded' }

  it('releases with a target + proposalId when the event is placed and the board has enough events', () => {
    const state = board({ placedEventCount: 5, isPlacedDomainEvent: (id) => id === 'bb_a' })
    expect(mapTurn({ interpretation: [track], nextMove: ACK }, countingMint(), ids, state).tracks).toEqual([
      {
        track: 'propose-pivotal',
        proposalId: 'p_1',
        pivotalKind: 'mark-pivotal',
        target: 'bb_a',
        heldBack: false,
        eventLabel: 'Loan recorded',
      },
    ])
  })

  it('holds the track back (no proposalId/target) below the placed-event threshold', () => {
    const state = board({ placedEventCount: 4, isPlacedDomainEvent: (id) => id === 'bb_a' })
    expect(mapTurn({ interpretation: [track], nextMove: ACK }, countingMint(), ids, state).tracks).toEqual([
      { track: 'propose-pivotal', pivotalKind: 'mark-pivotal', heldBack: true, eventLabel: 'Loan recorded' },
    ])
  })

  it('drops the track when the label is not a placed domain event', () => {
    const state = board({ placedEventCount: 9, isPlacedDomainEvent: () => false })
    expect(mapTurn({ interpretation: [track], nextMove: ACK }, countingMint(), ids, state).tracks).toEqual([])
  })
})

describe('mapTurn — propose-reword', () => {
  const ids = resolver({ 'Loan recorded': 'bb_a' as BuildingBlockId })
  const track = {
    track: 'propose-reword' as const,
    targetLabel: 'Loan recorded',
    newLabel: 'Loan booked',
  }

  it('holds the reword back on a structureless board', () => {
    expect(
      mapTurn({ interpretation: [track], nextMove: ACK }, countingMint(), ids, board({ hasStructure: false })).tracks,
    ).toEqual([{ track: 'propose-reword', newLabel: 'Loan booked', heldBack: true, targetLabel: 'Loan recorded' }])
  })

  it('releases the reword once the board has structure', () => {
    expect(
      mapTurn({ interpretation: [track], nextMove: ACK }, countingMint(), ids, board({ hasStructure: true })).tracks,
    ).toEqual([
      {
        track: 'propose-reword',
        proposalId: 'p_1',
        target: 'bb_a',
        newLabel: 'Loan booked',
        heldBack: false,
        targetLabel: 'Loan recorded',
      },
    ])
  })

  it('does not hold a reword whose target was proposed earlier in the same turn', () => {
    const turn: FacilitationTurn = {
      interpretation: [
        { track: 'propose-building-block', blockKind: 'domain-event', label: 'Loan recorded', bar: 'strict' },
        { track: 'propose-reword', targetLabel: 'Loan recorded', newLabel: 'Loan booked' },
      ],
      nextMove: ACK,
    }
    const mapped = mapTurn(turn, countingMint(), resolver({}), board({ hasStructure: false }))
    expect(mapped.tracks.some((entry) => entry.track === 'propose-reword' && entry.heldBack)).toBe(false)
  })
})
