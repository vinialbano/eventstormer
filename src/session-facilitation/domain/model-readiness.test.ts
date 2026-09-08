import { describe, expect, it } from 'vitest'
import {
  hasModelStructure,
  PIVOTAL_MIN_PLACED_EVENTS,
  pivotalProposable,
  type ReadinessSnapshot,
} from './model-readiness.ts'

const block = (over: Partial<ReadinessSnapshot['blocks'][number]> = {}): ReadinessSnapshot['blocks'][number] => ({
  kind: 'domain-event',
  withdrawn: false,
  placement: 'timeline',
  pivotal: false,
  ...over,
})

const snapshot = (over: Partial<ReadinessSnapshot> = {}): ReadinessSnapshot => ({
  follows: [],
  causedBy: [],
  blocks: [],
  ...over,
})

describe('hasModelStructure', () => {
  it('is true when the board has at least one follows edge', () => {
    expect(hasModelStructure(snapshot({ follows: [{}], blocks: [block(), block()] }))).toBe(true)
  })

  it('is true when the board has at least one causedBy edge', () => {
    expect(hasModelStructure(snapshot({ causedBy: [{}] }))).toBe(true)
  })

  it('is true when a non-withdrawn block is pivotal', () => {
    expect(hasModelStructure(snapshot({ blocks: [block({ pivotal: true })] }))).toBe(true)
  })

  it('is false for bare captures — no edge, no pivotal mark', () => {
    expect(hasModelStructure(snapshot({ blocks: [block(), block({ kind: 'actor' })] }))).toBe(false)
  })

  it('ignores a pivotal mark on a withdrawn block', () => {
    expect(hasModelStructure(snapshot({ blocks: [block({ pivotal: true, withdrawn: true })] }))).toBe(false)
  })
})

describe('pivotalProposable', () => {
  const placed = (count: number): ReadinessSnapshot =>
    snapshot({ blocks: Array.from({ length: count }, () => block()) })

  it('is false with 4 placed domain events', () => {
    expect(pivotalProposable(placed(PIVOTAL_MIN_PLACED_EVENTS - 1))).toBe(false)
  })

  it('is true with 5 placed domain events', () => {
    expect(pivotalProposable(placed(PIVOTAL_MIN_PLACED_EVENTS))).toBe(true)
  })

  it('counts only non-withdrawn timeline domain events', () => {
    expect(
      pivotalProposable(
        snapshot({
          blocks: [
            ...Array.from({ length: 4 }, () => block()),
            block({ placement: 'backlog' }),
            block({ withdrawn: true }),
            block({ kind: 'actor' }),
          ],
        }),
      ),
    ).toBe(false)
  })
})
