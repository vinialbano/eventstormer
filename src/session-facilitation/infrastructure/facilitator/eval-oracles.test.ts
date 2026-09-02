import { describe, expect, it } from 'vitest'
import {
  contentWords,
  hasFlagPhase,
  isPastTenseLabel,
  proposedKinds,
  sharesContentWord,
} from './eval-oracles.ts'

describe('contentWords', () => {
  it('lowercases tokens and drops tokens of length 2 or less', () => {
    expect(contentWords('The ticket fired to the kitchen.')).toEqual([
      'the',
      'ticket',
      'fired',
      'the',
      'kitchen',
    ])
  })
})

describe('sharesContentWord', () => {
  it('is true when the label and segment share a content word', () => {
    expect(sharesContentWord('ticket fired', 'The ticket fired to the kitchen.')).toBe(true)
  })

  it('is false when the label and segment share no content word', () => {
    expect(sharesContentWord('ticket fired', 'The chef plated the dish.')).toBe(false)
  })

  it('is false when neither side yields a content word', () => {
    expect(sharesContentWord('', 'no shared tokens here')).toBe(false)
    expect(sharesContentWord('a b', 'x y')).toBe(false)
  })
})

describe('isPastTenseLabel', () => {
  it('is true when the last word ends in ed — ticket fired', () => {
    expect(isPastTenseLabel('ticket fired')).toBe(true)
  })

  it('is false for an irregular past that does not end in ed — built', () => {
    expect(isPastTenseLabel('built')).toBe(false)
  })

  it('is false for empty or whitespace-only labels', () => {
    expect(isPastTenseLabel('')).toBe(false)
    expect(isPastTenseLabel('   ')).toBe(false)
  })

  it('treats -ed suffix adjectives as past tense — known false positives red, seed', () => {
    expect(isPastTenseLabel('red')).toBe(true)
    expect(isPastTenseLabel('seed')).toBe(true)
  })
})

describe('hasFlagPhase', () => {
  it('is true when a flag-phase track is present', () => {
    expect(hasFlagPhase([{ track: 'propose-building-block' }, { track: 'flag-phase' }])).toBe(true)
  })

  it('is false when no flag-phase track is present', () => {
    expect(hasFlagPhase([{ track: 'propose-building-block' }])).toBe(false)
  })
})

describe('proposedKinds', () => {
  it('extracts blockKind from canned propose tracks and skips tracks without one', () => {
    expect(
      proposedKinds([
        { track: 'propose-building-block', blockKind: 'domain-event' },
        { track: 'flag-phase' },
        { track: 'propose-building-block', blockKind: 'actor' },
      ]),
    ).toEqual(['domain-event', 'actor'])
  })
})
