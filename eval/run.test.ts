import { describe, expect, it } from 'vitest'
import type { FacilitationTrack } from '~/session-facilitation/infrastructure/facilitator/turn-schema.ts'
import { scoreFixture, type EvalFixture } from './run.ts'

const fixture = (over: Partial<EvalFixture> = {}): EvalFixture => ({
  id: 'kind',
  scopeStatement: 'A library.',
  contribution: { speaker: 'Maria', body: 'A member borrows a book.' },
  expect: {},
  ...over,
})

const propose = (blockKind: 'domain-event' | 'actor' | 'system', label: string): FacilitationTrack => ({
  track: 'propose-building-block',
  blockKind,
  label,
  bar: 'strict',
})

describe('scoreFixture', () => {
  it('returns no rows when the fixture declares no expectations', () => {
    expect(scoreFixture(fixture(), [undefined, [propose('domain-event', 'Book borrowed')]])).toEqual([])
  })

  it('does not count undefined outcomes as passes', () => {
    const rows = scoreFixture(fixture({ expect: { kind: 'domain-event' } }), [
      undefined,
      undefined,
      [propose('actor', 'Member')],
      [propose('domain-event', 'Book borrowed')],
    ])
    expect(rows).toEqual([{ caseId: 'kind', assertion: 'kind', passed: 1, runs: 5 }])
  })

  it('scores each declared oracle independently on the same outcomes', () => {
    const rows = scoreFixture(
      fixture({
        expect: { kind: 'domain-event', pastTense: true, notFlagPhase: true },
      }),
      [
        [propose('domain-event', 'Book borrowed')],
        [propose('domain-event', 'Member registers')],
      ],
    )
    expect(rows).toEqual([
      { caseId: 'kind', assertion: 'kind', passed: 2, runs: 5 },
      { caseId: 'kind', assertion: 'pastTense', passed: 1, runs: 5 },
      { caseId: 'kind', assertion: 'notFlagPhase', passed: 2, runs: 5 },
    ])
  })
})
