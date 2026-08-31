import { describe, expect, it } from 'vitest'
import type { ContributionId, QuestionId, SessionId, WorkshopId } from '~/plumbing/ids.ts'
import { isErr, isOk } from '~/plumbing/result.ts'
import type { SessionEvent } from '../schema/events.ts'
import type { InterpretedTrack } from '../schema/interpreted-track.ts'
import { decide } from './decide.ts'
import { replay } from './replay.ts'

const at = '2026-08-30T12:00:00.000Z'
const sessionId = 's_1' as SessionId
const workshopId = 'w_1' as WorkshopId
const toContributionId = (value: string) => value as ContributionId
const toQuestionId = (value: string) => value as QuestionId

const startedStream: SessionEvent[] = [
  { v: 1, at, type: 'Session Started', sessionId: sessionId, workshopId: workshopId },
]

const track: InterpretedTrack = {
  track: 'propose-building-block',
  proposalId: 'p_1' as never,
  blockKind: 'domain-event',
  label: 'Loan recorded',
  bar: 'strict',
}

describe('Session.decide — Make Contribution', () => {
  it('emits Contribution Made carrying session id, speaker, source "typed" and the timestamp', () => {
    const result = decide(replay(startedStream), {
      type: 'Make Contribution',
      sessionId: sessionId,
      contributionId: toContributionId('c_1'),
      speaker: 'Dana',
      body: 'A member borrowed a book.',
      at,
    })
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value).toEqual([
        {
          v: 1,
          at,
          type: 'Contribution Made',
          sessionId: sessionId,
          contributionId: 'c_1',
          speaker: 'Dana',
          body: 'A member borrowed a book.',
          source: 'typed',
        },
      ])
    }
  })

  it('rejects a contribution on a CLOSED session', () => {
    const closed = replay([
      ...startedStream,
      { v: 1, at, type: 'Session Closed', sessionId: sessionId, workshopId: workshopId, unresolvedQuestionIds: [] },
    ])
    const result = decide(closed, {
      type: 'Make Contribution',
      sessionId: sessionId,
      contributionId: toContributionId('c_2'),
      speaker: 'Dana',
      body: 'too late',
      at,
    })
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.kind).toBe('session-closed')
  })

  it('rejects an empty / whitespace-only body', () => {
    const result = decide(replay(startedStream), {
      type: 'Make Contribution',
      sessionId: sessionId,
      contributionId: toContributionId('c_3'),
      speaker: 'Dana',
      body: '   ',
      at,
    })
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.kind).toBe('empty-contribution')
  })

  it('rejects a body longer than 10 000 characters', () => {
    const result = decide(replay(startedStream), {
      type: 'Make Contribution',
      sessionId: sessionId,
      contributionId: toContributionId('c_4'),
      speaker: 'Dana',
      body: 'x'.repeat(10_001),
      at,
    })
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.kind).toBe('contribution-too-long')
  })
})

describe('Session.decide — Interpret / Fail (interpret-once ledger)', () => {
  it('emits Contribution Interpreted the first time, ok([]) the second', () => {
    const first = decide(replay(startedStream), {
      type: 'Interpret Contribution',
      sessionId: sessionId,
      contributionId: toContributionId('c_1'),
      tracks: [track],
      at,
    })
    expect(isOk(first) && first.value).toHaveLength(1)

    const seen = replay([
      ...startedStream,
      { v: 1, at, type: 'Contribution Interpreted', sessionId: sessionId, contributionId: toContributionId('c_1'), tracks: [track] },
    ])
    const second = decide(seen, {
      type: 'Interpret Contribution',
      sessionId: sessionId,
      contributionId: toContributionId('c_1'),
      tracks: [track],
      at,
    })
    expect(isOk(second)).toBe(true)
    if (isOk(second)) expect(second.value).toEqual([])
  })

  it('a failed interpretation ledgers the contribution — a later Interpret is ok([])', () => {
    const failed = replay([
      ...startedStream,
      { v: 1, at, type: 'Contribution Interpretation Failed', sessionId: sessionId, contributionId: toContributionId('c_1'), reason: 'schema-invalid' },
    ])
    const result = decide(failed, {
      type: 'Interpret Contribution',
      sessionId: sessionId,
      contributionId: toContributionId('c_1'),
      tracks: [track],
      at,
    })
    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value).toEqual([])
  })

  it('Interpret Contribution on a CLOSED session is ok([]) — a late model call writes nothing', () => {
    const closed = replay([
      ...startedStream,
      { v: 1, at, type: 'Session Closed', sessionId: sessionId, workshopId: workshopId, unresolvedQuestionIds: [] },
    ])
    const result = decide(closed, {
      type: 'Interpret Contribution',
      sessionId: sessionId,
      contributionId: toContributionId('c_1'),
      tracks: [track],
      at,
    })
    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value).toEqual([])
  })

  it('Fail Interpretation on a CLOSED session is ok([])', () => {
    const closed = replay([
      ...startedStream,
      { v: 1, at, type: 'Session Closed', sessionId: sessionId, workshopId: workshopId, unresolvedQuestionIds: [] },
    ])
    const result = decide(closed, {
      type: 'Fail Interpretation',
      sessionId: sessionId,
      contributionId: toContributionId('c_1'),
      reason: 'schema-invalid',
      at,
    })
    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value).toEqual([])
  })

  it('Fail Interpretation emits Contribution Interpretation Failed with the reason', () => {
    const result = decide(replay(startedStream), {
      type: 'Fail Interpretation',
      sessionId: sessionId,
      contributionId: toContributionId('c_9'),
      reason: 'schema-invalid after one retry',
      at,
    })
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value).toEqual([
        {
          v: 1,
          at,
          type: 'Contribution Interpretation Failed',
          sessionId: sessionId,
          contributionId: 'c_9',
          reason: 'schema-invalid after one retry',
        },
      ])
    }
  })
})

describe('Session.decide — Answer Question', () => {
  const asked = replay([
    ...startedStream,
    { v: 1, at, type: 'Question Asked', sessionId: sessionId, questionId: toQuestionId('q_1'), kind: 'phase', text: 'phase?' },
  ])

  it('resolves an open question', () => {
    const result = decide(asked, {
      type: 'Answer Question',
      sessionId: sessionId,
      questionId: toQuestionId('q_1'),
      byContributionId: toContributionId('c_1'),
      at,
    })
    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value[0]).toMatchObject({ type: 'Question Answered', questionId: 'q_1' })
  })

  it('rejects an unknown questionId', () => {
    const result = decide(asked, {
      type: 'Answer Question',
      sessionId: sessionId,
      questionId: toQuestionId('q_unknown'),
      byContributionId: toContributionId('c_1'),
      at,
    })
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.kind).toBe('unknown-question')
  })

  it('rejects an already-resolved questionId', () => {
    const resolved = replay([
      ...startedStream,
      { v: 1, at, type: 'Question Asked', sessionId: sessionId, questionId: toQuestionId('q_1'), kind: 'phase', text: 'phase?' },
      { v: 1, at, type: 'Question Answered', sessionId: sessionId, questionId: toQuestionId('q_1'), byContributionId: toContributionId('c_1') },
    ])
    const result = decide(resolved, {
      type: 'Answer Question',
      sessionId: sessionId,
      questionId: toQuestionId('q_1'),
      byContributionId: toContributionId('c_2'),
      at,
    })
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.kind).toBe('question-already-resolved')
  })
})

describe('Session.decide — Ask Question idempotency', () => {
  it('a known questionId returns ok([])', () => {
    const asked = replay([
      ...startedStream,
      { v: 1, at, type: 'Question Asked', sessionId: sessionId, questionId: toQuestionId('q_1'), kind: 'phase', text: 'phase?' },
    ])
    const result = decide(asked, {
      type: 'Ask Question',
      sessionId: sessionId,
      questionId: toQuestionId('q_1'),
      kind: 'phase',
      text: 'phase?',
      at,
    })
    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value).toEqual([])
  })

  it('a scope question carries its scopeStatement', () => {
    const result = decide(replay(startedStream), {
      type: 'Ask Question',
      sessionId: sessionId,
      questionId: toQuestionId('q_s'),
      kind: 'scope',
      text: 'What business are you mapping?',
      scopeStatement: 'Library lending across branches.',
      at,
    })
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value[0]).toMatchObject({
        type: 'Question Asked',
        kind: 'scope',
        scopeStatement: 'Library lending across branches.',
      })
    }
  })
})

describe('Session.decide — Close Session', () => {
  it('emits Session Closed carrying only the unresolved open questions and no summary struct', () => {
    const stream = replay([
      ...startedStream,
      { v: 1, at, type: 'Question Asked', sessionId: sessionId, questionId: toQuestionId('q_open'), kind: 'phase', text: 'p?' },
      { v: 1, at, type: 'Question Asked', sessionId: sessionId, questionId: toQuestionId('q_done'), kind: 'free', text: 'f?' },
      { v: 1, at, type: 'Question Answered', sessionId: sessionId, questionId: toQuestionId('q_done'), byContributionId: toContributionId('c_1') },
    ])
    const result = decide(stream, { type: 'Close Session', sessionId: sessionId, workshopId: workshopId, at })
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value).toEqual([
        {
          v: 1,
          at,
          type: 'Session Closed',
          sessionId: sessionId,
          workshopId: workshopId,
          unresolvedQuestionIds: ['q_open'],
        },
      ])
    }
  })

  it('a second Close Session returns ok([]) — idempotent', () => {
    const closed = replay([
      ...startedStream,
      { v: 1, at, type: 'Session Closed', sessionId: sessionId, workshopId: workshopId, unresolvedQuestionIds: [] },
    ])
    const result = decide(closed, { type: 'Close Session', sessionId: sessionId, workshopId: workshopId, at })
    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value).toEqual([])
  })
})
