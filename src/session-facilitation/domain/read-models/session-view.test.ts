import { describe, expect, it } from 'vitest'
import type { ContributionId, QuestionId, SessionId, WorkshopId } from '~/plumbing/ids.ts'
import type { SessionEvent } from '../schema/events.ts'
import type { InterpretedTrack } from '../schema/interpreted-track.ts'
import { sessionView } from './session-view.ts'

const at = '2026-08-30T12:00:00.000Z'
const s = 's_1' as SessionId
const w = 'w_1' as WorkshopId
const c = (v: string) => v as ContributionId
const q = (v: string) => v as QuestionId

const proposeTrack: InterpretedTrack = {
  track: 'propose-building-block',
  proposalId: 'p_1' as never,
  blockKind: 'domain-event',
  label: 'Loan recorded',
  bar: 'strict',
}

const base: SessionEvent[] = [
  { v: 1, at, type: 'Session Started', sessionId: s, workshopId: w },
  {
    v: 1,
    at,
    type: 'Question Asked',
    sessionId: s,
    questionId: q('q_scope'),
    kind: 'scope',
    text: 'What business are you mapping?',
    scopeStatement: 'Library lending across branches.',
  },
  {
    v: 1,
    at,
    type: 'Contribution Made',
    sessionId: s,
    contributionId: c('c_1'),
    speaker: 'Dana',
    body: 'A member borrowed a book.',
    source: 'typed',
  },
]

describe('sessionView — scope status', () => {
  it('is "proposed" with the proposed statement once the scope question is asked', () => {
    expect(sessionView(base).scope).toEqual({
      status: 'proposed',
      proposedStatement: 'Library lending across branches.',
    })
  })

  it('is "set" when the caller reports Workshop.scope is set', () => {
    expect(sessionView(base, { scopeIsSet: true }).scope).toEqual({ status: 'set' })
  })

  it('is "none" before any scope question', () => {
    expect(sessionView(base.slice(0, 1)).scope).toEqual({ status: 'none' })
  })
})

describe('sessionView — transcript interleaving', () => {
  it('interleaves questions and contributions in stream order', () => {
    expect(sessionView(base).transcript).toEqual([
      { kind: 'question', speaker: 'facilitator', text: 'What business are you mapping?', at, questionKind: 'scope' },
      { kind: 'contribution', speaker: 'Dana', text: 'A member borrowed a book.', at, contributionId: 'c_1' },
    ])
  })
})

describe('sessionView — open questions', () => {
  it('drops a question once it is answered', () => {
    const events: SessionEvent[] = [
      ...base,
      { v: 1, at, type: 'Question Asked', sessionId: s, questionId: q('q_phase'), kind: 'phase', text: 'phase?' },
      { v: 1, at, type: 'Question Answered', sessionId: s, questionId: q('q_scope'), byContributionId: c('c_1') },
    ]
    expect(sessionView(events).openQuestions).toEqual([
      { questionId: 'q_phase', kind: 'phase', text: 'phase?' },
    ])
  })
})

describe('sessionView — per-contribution interpretation status + fullyDerived', () => {
  const interpreted: SessionEvent[] = [
    ...base,
    { v: 1, at, type: 'Contribution Interpreted', sessionId: s, contributionId: c('c_1'), tracks: [proposeTrack] },
  ]

  it('a made-but-not-interpreted contribution is "pending"', () => {
    const view = sessionView(base)
    expect(view.contributions).toEqual([{ contributionId: 'c_1', status: 'pending' }])
    expect(view.fullyDerived).toBe(false)
  })

  it('an in-flight contribution is "interpreting"', () => {
    expect(sessionView(base, { inFlight: new Set([c('c_1')]) }).contributions).toEqual([
      { contributionId: 'c_1', status: 'interpreting' },
    ])
  })

  it('an interpreted contribution with an unmarked track is "interpreted", not "derived"', () => {
    const view = sessionView(interpreted)
    expect(view.contributions).toEqual([{ contributionId: 'c_1', status: 'interpreted' }])
    expect(view.fullyDerived).toBe(false)
  })

  it('an interpreted contribution whose every track has a derived_track row is "derived"', () => {
    const view = sessionView(interpreted, { derivedTracks: new Set(['c_1::0']) })
    expect(view.contributions).toEqual([{ contributionId: 'c_1', status: 'derived' }])
    expect(view.fullyDerived).toBe(true)
  })

  it('a failed interpretation is "failed" and counts as fully derived', () => {
    const failed: SessionEvent[] = [
      ...base,
      { v: 1, at, type: 'Contribution Interpretation Failed', sessionId: s, contributionId: c('c_1'), reason: 'x' },
    ]
    const view = sessionView(failed)
    expect(view.contributions).toEqual([{ contributionId: 'c_1', status: 'failed' }])
    expect(view.fullyDerived).toBe(true)
  })
})
