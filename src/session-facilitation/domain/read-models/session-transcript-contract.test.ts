import { describe, expect, it } from 'vitest'
import { SessionTranscript } from './session-transcript-contract.ts'

const valid = {
  format: 'big-picture',
  scope: 'Library lending',
  position: 12,
  turns: [
    {
      kind: 'contribution',
      speaker: 'Dana',
      text: 'A member borrowed a book.',
      at: '2026-08-30T12:00:00.000Z',
      proposals: [
        { summary: 'Loan recorded', disposition: 'applied', resultingBuildingBlockId: 'bb_1' },
        { summary: 'reword: A → B', disposition: 'lapsed', resultingBuildingBlockId: null },
      ],
    },
    { kind: 'notice', speaker: 'facilitator', text: 'held', at: '2026-08-30T12:00:00.000Z', proposals: [] },
  ],
  contributorCounts: [{ speaker: 'Dana', accepted: 1, edited: 0, rejected: 1 }],
}

describe('SessionTranscript contract', () => {
  it('accepts a well-formed document', () => {
    expect(SessionTranscript.parse(valid)).toEqual(valid)
  })

  it('rejects an unknown disposition', () => {
    const bad = {
      ...valid,
      turns: [
        {
          kind: 'contribution',
          speaker: 'Dana',
          text: 'x',
          at: '2026-08-30T12:00:00.000Z',
          proposals: [{ summary: 's', disposition: 'withdrawn', resultingBuildingBlockId: null }],
        },
      ],
    }
    expect(SessionTranscript.safeParse(bad).success).toBe(false)
  })

  it('rejects a non-big-picture format', () => {
    expect(SessionTranscript.safeParse({ ...valid, format: 'process' }).success).toBe(false)
  })

  it('rejects a negative position', () => {
    expect(SessionTranscript.safeParse({ ...valid, position: -1 }).success).toBe(false)
  })

  it('rejects a contributor count that is not an integer', () => {
    const bad = {
      ...valid,
      contributorCounts: [{ speaker: 'Dana', accepted: 1, edited: 1.5, rejected: 0 }],
    }
    expect(SessionTranscript.safeParse(bad).success).toBe(false)
  })
})
