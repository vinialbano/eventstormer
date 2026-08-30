import { describe, expect, it } from 'vitest'
import { estimateCost } from './model-pricing.ts'

describe('estimateCost — tokens × the owned price table (ADR-008)', () => {
  it('claude-sonnet-5: $2/1M input + $10/1M output', () => {
    expect(estimateCost('claude-sonnet-5', { inputTokens: 1_000_000, outputTokens: 1_000_000 })).toBe(
      12,
    )
  })

  it('claude-sonnet-5: adds cache-read tokens at $0.20/1M', () => {
    expect(
      estimateCost('claude-sonnet-5', {
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
        cacheReadTokens: 1_000_000,
      }),
    ).toBeCloseTo(12.2, 10)
  })

  it('claude-haiku-4-5: $1/1M input + $5/1M output', () => {
    expect(
      estimateCost('claude-haiku-4-5', { inputTokens: 500_000, outputTokens: 200_000 }),
    ).toBeCloseTo(1.5, 10)
  })

  it('a realistic single turn matches the hand-computed literal', () => {
    // 3500 * 2/1e6 + 850 * 10/1e6 + 12000 * 0.2/1e6 = 0.007 + 0.0085 + 0.0024
    expect(
      estimateCost('claude-sonnet-5', {
        inputTokens: 3500,
        outputTokens: 850,
        cacheReadTokens: 12_000,
      }),
    ).toBeCloseTo(0.0179, 10)
  })
})
