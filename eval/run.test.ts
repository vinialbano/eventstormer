import { describe, expect, it } from 'vitest'
import type { FacilitationTrack } from '~/session-facilitation/infrastructure/facilitator/turn-schema.ts'
import {
  F11_ASSERTIONS,
  loadFixtures,
  parseFixtureFile,
  priorBuildingBlocks,
  scoreFixture,
  uncoveredF11Assertions,
  type EvalFixture,
} from './run.ts'

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

  it('emits a phaseFlagged row scored by the flag-phase oracle', () => {
    const rows = scoreFixture(fixture({ expect: { phaseFlagged: true } }), [
      [{ track: 'flag-phase', questionText: 'break "service" into events?' }],
      [propose('domain-event', 'Food delivered')],
    ])
    expect(rows).toEqual([{ caseId: 'kind', assertion: 'phaseFlagged', passed: 1, runs: 5 }])
  })

  it('emits an attributesToFormat row matching the named deeper format', () => {
    const rows = scoreFixture(fixture({ expect: { attributesToFormat: 'policy' } }), [
      [{ track: 'attribute-to-other-format', format: 'policy', note: 'this is a policy' }],
      [{ track: 'attribute-to-other-format', format: 'command', note: 'a command' }],
    ])
    expect(rows).toEqual([{ caseId: 'kind', assertion: 'attributesToFormat', passed: 1, runs: 5 }])
  })

  it('emits both a kind and a relation row for an integration fixture', () => {
    const rows = scoreFixture(
      fixture({
        expect: {
          kind: 'domain-event',
          relation: { kind: 'sequence', labels: ['order placed', 'kitchen'] },
        },
      }),
      [
        [
          propose('domain-event', 'Order placed'),
          {
            track: 'propose-relation',
            relationKind: 'sequence',
            endpoints: ['Order placed', 'Kitchen started cooking'],
            rationale: 'one before the other',
          },
        ],
        [propose('actor', 'Server')],
      ],
    )
    expect(rows).toEqual([
      { caseId: 'kind', assertion: 'kind', passed: 1, runs: 5 },
      { caseId: 'kind', assertion: 'relation', passed: 1, runs: 5 },
    ])
  })

  it('emits pivotal and reword rows scored by their oracles', () => {
    const pivotalRows = scoreFixture(
      fixture({ expect: { pivotal: { kind: 'mark-pivotal', label: 'food delivered' } } }),
      [[{ track: 'propose-pivotal', pivotalKind: 'mark-pivotal', eventLabel: 'Food delivered to the table' }]],
    )
    expect(pivotalRows).toEqual([{ caseId: 'kind', assertion: 'pivotal', passed: 1, runs: 5 }])

    const rewordRows = scoreFixture(
      fixture({ expect: { reword: { from: 'order goes in', to: 'order placed' } } }),
      [[{ track: 'propose-reword', targetLabel: 'Order goes in', newLabel: 'Order placed' }]],
    )
    expect(rewordRows).toEqual([{ caseId: 'kind', assertion: 'reword', passed: 1, runs: 5 }])
  })

  it('scores a row for every F11 assertion when the fixture declares them all', () => {
    const rows = scoreFixture(
      fixture({
        expect: {
          kind: 'domain-event',
          pastTense: true,
          notFlagPhase: true,
          sharesContentWord: true,
          phaseFlagged: true,
          attributesToFormat: 'policy',
          relation: { kind: 'place', labels: ['order placed'] },
          pivotal: { kind: 'mark-pivotal', label: 'food delivered' },
          reword: { from: 'a', to: 'b' },
        },
      }),
      [],
    )
    expect(new Set(rows.map((row) => row.assertion))).toEqual(new Set(F11_ASSERTIONS))
  })
})

describe('parseFixtureFile', () => {
  const raw = (over: Record<string, unknown> = {}): string =>
    JSON.stringify({
      id: 'relation',
      scopeStatement: 'A restaurant kitchen.',
      contribution: { speaker: 'Sam', body: 'the order has to be in before the kitchen cooks' },
      expect: {},
      ...over,
    })

  it('accepts the new expect keys and priorBlocks', () => {
    const parsed = parseFixtureFile(
      'relation.json',
      raw({
        priorBlocks: ['Order placed', 'Kitchen started cooking'],
        expect: { relation: { kind: 'sequence', labels: ['order placed', 'kitchen'] } },
      }),
    )
    expect(parsed.priorBlocks).toEqual(['Order placed', 'Kitchen started cooking'])
    expect(parsed.expect.relation).toEqual({ kind: 'sequence', labels: ['order placed', 'kitchen'] })
  })

  it('throws with the file name when a fixture is malformed', () => {
    expect(() =>
      parseFixtureFile('relation.json', raw({ expect: { relation: { kind: 'nonsense', labels: ['x'] } } })),
    ).toThrow(/^relation\.json:/)
  })

  it('throws with the file name when priorBlocks holds a non-string', () => {
    expect(() => parseFixtureFile('bad.json', raw({ priorBlocks: [1] }))).toThrow(/^bad\.json:/)
  })
})

describe('priorBuildingBlocks', () => {
  it('folds priorBlocks into domain-event building blocks for the facilitation context', () => {
    const parsed = parseFixtureFile(
      'relation.json',
      JSON.stringify({
        id: 'relation',
        scopeStatement: 'A restaurant kitchen.',
        contribution: { speaker: 'Sam', body: 'the order has to be in first' },
        priorBlocks: ['Order placed', 'Kitchen started cooking'],
        expect: {},
      }),
    )
    expect(priorBuildingBlocks(parsed)).toEqual([
      { kind: 'domain-event', label: 'Order placed', placement: 'timeline' },
      { kind: 'domain-event', label: 'Kitchen started cooking', placement: 'timeline' },
    ])
  })

  it('carries priorPivotal marks and priorFollows edges into the building blocks', () => {
    const parsed = parseFixtureFile(
      'reword.json',
      JSON.stringify({
        id: 'reword',
        scopeStatement: 'A restaurant kitchen.',
        contribution: { speaker: 'Sam', body: 'call it order placed' },
        priorBlocks: ['Order goes in', 'Kitchen started cooking', 'Food delivered'],
        priorPivotal: ['Food delivered'],
        priorFollows: [['Order goes in', 'Kitchen started cooking']],
        expect: { reword: { from: 'order goes in', to: 'order placed' } },
      }),
    )
    expect(priorBuildingBlocks(parsed)).toEqual([
      { kind: 'domain-event', label: 'Order goes in', placement: 'timeline', followedBy: ['Kitchen started cooking'] },
      { kind: 'domain-event', label: 'Kitchen started cooking', placement: 'timeline' },
      { kind: 'domain-event', label: 'Food delivered', placement: 'timeline', pivotal: true },
    ])
  })

  it('throws with the file name when priorFollows is not a pair', () => {
    const bad = JSON.stringify({
      id: 'x',
      scopeStatement: 'A restaurant kitchen.',
      contribution: { speaker: 'Sam', body: 'x' },
      priorFollows: [['only-one']],
      expect: {},
    })
    expect(() => parseFixtureFile('bad.json', bad)).toThrow(/^bad\.json:/)
  })

  it('is empty when the fixture declares no priorBlocks', () => {
    expect(priorBuildingBlocks(fixture())).toEqual([])
  })
})

describe('uncoveredF11Assertions', () => {
  it('reports every F11 assertion missing from an empty fixture set', () => {
    expect(uncoveredF11Assertions([])).toEqual([...F11_ASSERTIONS])
  })

  it('is empty for the committed fixture set — every F11 assertion has at least one fixture', () => {
    expect(uncoveredF11Assertions(loadFixtures())).toEqual([])
  })

  it('is empty when the fixture set declares every F11 assertion', () => {
    const cover = (expect_: EvalFixture['expect']): EvalFixture => ({
      id: 'x',
      scopeStatement: 's',
      contribution: { speaker: 'a', body: 'b' },
      expect: expect_,
    })
    const fixtures = F11_ASSERTIONS.map((assertion) => cover({ [assertion]: true }))
    expect(uncoveredF11Assertions(fixtures)).toEqual([])
  })
})
