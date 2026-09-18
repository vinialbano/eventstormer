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
  resolutions: [],
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

  it('accepts a non-empty resolutions array, including the superseded disposition', () => {
    const withResolutions = {
      ...valid,
      resolutions: [
        {
          resolutionId: 'r_1',
          hotSpotId: 'b_1',
          reference: 'added a retry with backoff',
          disposition: 'applied',
        },
        {
          resolutionId: 'r_2',
          hotSpotId: 'b_2',
          reference: 'switched to exponential backoff',
          disposition: 'superseded',
          supersededByReference: 'switched to exponential backoff with jitter',
        },
      ],
    }
    expect(SessionTranscript.parse(withResolutions)).toEqual(withResolutions)
  })

  it('accepts an empty resolutions array', () => {
    expect(SessionTranscript.parse({ ...valid, resolutions: [] }).resolutions).toEqual([])
  })

  it('rejects an unknown resolution disposition', () => {
    const bad = {
      ...valid,
      resolutions: [
        { resolutionId: 'r_1', hotSpotId: 'b_1', reference: 'x', disposition: 'withdrawn' },
      ],
    }
    expect(SessionTranscript.safeParse(bad).success).toBe(false)
  })
})
