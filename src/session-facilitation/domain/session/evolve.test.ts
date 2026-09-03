import { describe, expect, it } from 'vitest'
import type { ContributionId, QuestionId, SessionId, WorkshopId } from '~/plumbing/ids.ts'
import type { SessionEvent } from '../schema/events.ts'
import { emptySession } from './model.ts'
import { replay } from './replay.ts'

const at = '2026-08-30T12:00:00.000Z'
const sessionId = 's_1' as SessionId
const workshopId = 'w_1' as WorkshopId
const toContributionId = (value: string) => value as ContributionId
const toQuestionId = (value: string) => value as QuestionId

describe('Session.evolve / replay', () => {
  it('Session Started flips started; Session Closed flips closed (terminal)', () => {
    const writeModel = replay([
      { v: 1, at, type: 'Session Started', sessionId, workshopId },
      { v: 1, at, type: 'Session Closed', sessionId, workshopId, unresolvedQuestionIds: [] },
    ])
    expect(writeModel.started).toBe(true)
    expect(writeModel.closed).toBe(true)
  })

  it('tracks the open-questions map through Asked → Answered', () => {
    const writeModel = replay([
      { v: 1, at, type: 'Session Started', sessionId, workshopId },
      { v: 1, at, type: 'Question Asked', sessionId, questionId: toQuestionId('q_1'), kind: 'phase', text: 'a?' },
      { v: 1, at, type: 'Question Asked', sessionId, questionId: toQuestionId('q_2'), kind: 'free', text: 'b?' },
      { v: 1, at, type: 'Question Answered', sessionId, questionId: toQuestionId('q_1'), byContributionId: toContributionId('c_1') },
    ])
    expect(writeModel.questions.get(toQuestionId('q_1'))).toBe('resolved')
    expect(writeModel.questions.get(toQuestionId('q_2'))).toBe('open')
  })

  it('the interpret-once ledger holds both interpreted and failed contribution ids', () => {
    const writeModel = replay([
      { v: 1, at, type: 'Session Started', sessionId, workshopId },
      { v: 1, at, type: 'Contribution Interpreted', sessionId, contributionId: toContributionId('c_ok'), tracks: [] },
      { v: 1, at, type: 'Contribution Interpretation Failed', sessionId, contributionId: toContributionId('c_bad'), reason: 'x' },
    ])
    expect(writeModel.interpreted.has(toContributionId('c_ok'))).toBe(true)
    expect(writeModel.interpreted.has(toContributionId('c_bad'))).toBe(true)
  })

  it('evolve does not mutate its argument', () => {
    const base = emptySession()
    const started: SessionEvent = { v: 1, at, type: 'Session Started', sessionId, workshopId }
    replay([started])
    expect(base).toEqual(emptySession())
  })
})

describe('Session.evolve — question-track judgments', () => {
  const base: SessionEvent[] = [
    { v: 1, at, type: 'Session Started', sessionId, workshopId },
    { v: 1, at, type: 'Question Asked', sessionId, questionId: toQuestionId('q_1'), kind: 'phase', text: 'q?' },
  ]

  it('Absent Stakeholder Named resolves the question and records the (question, person) pair', () => {
    const writeModel = replay([
      ...base,
      { v: 1, at, type: 'Absent Stakeholder Named', sessionId, questionId: toQuestionId('q_1'), byContributionId: toContributionId('c_1'), personName: 'ops lead' },
    ])
    expect(writeModel.questions.get(toQuestionId('q_1'))).toBe('resolved')
    expect(writeModel.absentStakeholders.has('q_1::ops lead')).toBe(true)
    expect(writeModel.absentStakeholders.has('q_1::finance partner')).toBe(false)
  })

  it('Knowledge Gap Revealed and Complete Perspective Confirmed each resolve the question', () => {
    expect(
      replay([...base, { v: 1, at, type: 'Knowledge Gap Revealed', sessionId, questionId: toQuestionId('q_1'), byContributionId: toContributionId('c_1') }]).questions.get(toQuestionId('q_1')),
    ).toBe('resolved')
    expect(
      replay([...base, { v: 1, at, type: 'Complete Perspective Confirmed', sessionId, questionId: toQuestionId('q_1'), byContributionId: toContributionId('c_1') }]).questions.get(toQuestionId('q_1')),
    ).toBe('resolved')
  })

  it('emptySession starts with an empty absentStakeholders set', () => {
    expect(emptySession().absentStakeholders).toEqual(new Set())
  })
})
