import { describe, expect, it } from 'vitest'
import type { ContributionId, QuestionId, SessionId, WorkshopId } from '~/plumbing/ids.ts'
import type { SessionEvent } from '../schema/events.ts'
import { emptySession } from './model.ts'
import { replay } from './replay.ts'

const at = '2026-08-30T12:00:00.000Z'
const s = 's_1' as SessionId
const w = 'w_1' as WorkshopId
const c = (v: string) => v as ContributionId
const q = (v: string) => v as QuestionId

describe('Session.evolve / replay', () => {
  it('Session Started flips started; Session Closed flips closed (terminal)', () => {
    const wm = replay([
      { v: 1, at, type: 'Session Started', sessionId: s, workshopId: w },
      { v: 1, at, type: 'Session Closed', sessionId: s, workshopId: w, unresolvedQuestionIds: [] },
    ])
    expect(wm.started).toBe(true)
    expect(wm.closed).toBe(true)
  })

  it('tracks the open-questions map through Asked → Answered', () => {
    const wm = replay([
      { v: 1, at, type: 'Session Started', sessionId: s, workshopId: w },
      { v: 1, at, type: 'Question Asked', sessionId: s, questionId: q('q_1'), kind: 'phase', text: 'a?' },
      { v: 1, at, type: 'Question Asked', sessionId: s, questionId: q('q_2'), kind: 'free', text: 'b?' },
      { v: 1, at, type: 'Question Answered', sessionId: s, questionId: q('q_1'), byContributionId: c('c_1') },
    ])
    expect(wm.questions.get(q('q_1'))).toBe('resolved')
    expect(wm.questions.get(q('q_2'))).toBe('open')
  })

  it('the interpret-once ledger holds both interpreted and failed contribution ids', () => {
    const wm = replay([
      { v: 1, at, type: 'Session Started', sessionId: s, workshopId: w },
      { v: 1, at, type: 'Contribution Interpreted', sessionId: s, contributionId: c('c_ok'), tracks: [] },
      { v: 1, at, type: 'Contribution Interpretation Failed', sessionId: s, contributionId: c('c_bad'), reason: 'x' },
    ])
    expect(wm.interpreted.has(c('c_ok'))).toBe(true)
    expect(wm.interpreted.has(c('c_bad'))).toBe(true)
  })

  it('evolve does not mutate its argument', () => {
    const base = emptySession()
    const started: SessionEvent = { v: 1, at, type: 'Session Started', sessionId: s, workshopId: w }
    replay([started])
    expect(base).toEqual(emptySession())
  })
})
