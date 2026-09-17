import { describe, expect, it } from 'vitest'
import type { InterpretedRelationKind } from '../../domain/schema/interpreted-track.ts'
import type { FacilitationTrack } from './turn-schema.ts'
import {
  attributesToFormat,
  contentWords,
  flagsPhase,
  hasFlagPhase,
  isPastTenseLabel,
  proposedKinds,
  proposesPivotal,
  proposesRelation,
  proposesReword,
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
  it('is true when a word ends in ed — ticket fired', () => {
    expect(isPastTenseLabel('ticket fired')).toBe(true)
  })

  it('is true when the past-tense verb is not the last word — Ticket sent to the kitchen line', () => {
    expect(isPastTenseLabel('Ticket sent to the kitchen line')).toBe(true)
  })

  it('is true for a known irregular past — Order taken', () => {
    expect(isPastTenseLabel('Order taken')).toBe(true)
  })

  it('is false when no word is a past-tense verb — order in progress', () => {
    expect(isPastTenseLabel('order in progress')).toBe(false)
  })

  it('is false for an irregular past outside the known set — Model rebuilt', () => {
    expect(isPastTenseLabel('Model rebuilt')).toBe(false)
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

const relation = (
  relationKind: InterpretedRelationKind,
  endpoints: string[],
): FacilitationTrack => ({ track: 'propose-relation', relationKind, endpoints, rationale: 'because' })

const pivotal = (
  pivotalKind: 'mark-pivotal' | 'unmark-pivotal',
  eventLabel: string,
): FacilitationTrack => ({ track: 'propose-pivotal', pivotalKind, eventLabel })

const reword = (targetLabel: string, newLabel: string): FacilitationTrack => ({
  track: 'propose-reword',
  targetLabel,
  newLabel,
})

describe('flagsPhase', () => {
  it('is true when a flag-phase track is present', () => {
    expect(flagsPhase([{ track: 'answer-question' }, { track: 'flag-phase' }])).toBe(true)
  })

  it('is false when no flag-phase track is present', () => {
    expect(flagsPhase([{ track: 'propose-building-block' }])).toBe(false)
  })
})

describe('attributesToFormat', () => {
  it('is true when a track attributes the content to the named format (case-insensitive substring)', () => {
    const tracks: FacilitationTrack[] = [
      { track: 'attribute-to-other-format', format: 'Policy', note: 'this is a policy' },
    ]
    expect(attributesToFormat(tracks, 'policy')).toBe(true)
  })

  it('is false when no attribute-to-other-format track names that format', () => {
    const tracks: FacilitationTrack[] = [
      { track: 'attribute-to-other-format', format: 'command', note: 'a command' },
    ]
    expect(attributesToFormat(tracks, 'policy')).toBe(false)
  })
})

describe('proposesRelation', () => {
  it('is true for a matching kind whose endpoints resolve to the expected labels in order', () => {
    const tracks = [relation('sequence', ['Order placed', 'Kitchen started cooking'])]
    expect(proposesRelation(tracks, { kind: 'sequence', labels: ['order placed', 'kitchen'] })).toBe(true)
  })

  it('is false when the relationKind differs', () => {
    const tracks = [relation('link-cause', ['Order placed', 'Kitchen started cooking'])]
    expect(proposesRelation(tracks, { kind: 'sequence', labels: ['order placed', 'kitchen'] })).toBe(false)
  })

  it('is false when the endpoints are in the wrong order', () => {
    const tracks = [relation('sequence', ['Kitchen started cooking', 'Order placed'])]
    expect(proposesRelation(tracks, { kind: 'sequence', labels: ['order placed', 'kitchen'] })).toBe(false)
  })

  it('is false when the endpoint count does not match the kind arity', () => {
    const tracks = [relation('sequence', ['Order placed'])]
    expect(proposesRelation(tracks, { kind: 'sequence', labels: ['order placed', 'kitchen'] })).toBe(false)
  })
})

describe('proposesPivotal', () => {
  it('is true for a matching pivotalKind on the named event', () => {
    expect(
      proposesPivotal([pivotal('mark-pivotal', 'Food delivered to the table')], {
        kind: 'mark-pivotal',
        label: 'food delivered',
      }),
    ).toBe(true)
  })

  it('is false when the pivotalKind differs', () => {
    expect(
      proposesPivotal([pivotal('unmark-pivotal', 'Food delivered to the table')], {
        kind: 'mark-pivotal',
        label: 'food delivered',
      }),
    ).toBe(false)
  })
})

describe('proposesReword', () => {
  it('is true when a reword track goes from a from-matching label to a to-matching one', () => {
    expect(
      proposesReword([reword('Order goes in', 'Order placed')], {
        from: 'order goes in',
        to: 'order placed',
      }),
    ).toBe(true)
  })

  it('is false when the new label does not match', () => {
    expect(
      proposesReword([reword('Order goes in', 'Ticket fired')], {
        from: 'order goes in',
        to: 'order placed',
      }),
    ).toBe(false)
  })
})
