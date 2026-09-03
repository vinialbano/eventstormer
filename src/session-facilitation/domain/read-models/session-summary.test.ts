import { describe, expect, it } from 'vitest'
import type { ContributionId, QuestionId, SessionId, WorkshopId } from '~/plumbing/ids.ts'
import type { SessionEvent } from '../schema/events.ts'
import type { InterpretedTrack } from '../schema/interpreted-track.ts'
import { priorSessionHistory, sessionProposalIds, sessionSummary } from './session-summary.ts'

const at = '2026-08-30T12:00:00.000Z'
const sessionId = 's_1' as SessionId
const workshopId = 'w_1' as WorkshopId
const toContributionId = (value: string) => value as ContributionId
const toQuestionId = (value: string) => value as QuestionId

const madeC = (id: string, speaker: string, body: string): SessionEvent => ({
  v: 1,
  at,
  type: 'Contribution Made',
  sessionId,
  contributionId: toContributionId(id),
  speaker,
  body,
  source: 'typed',
})

const proposeTrack = (proposalId: string): InterpretedTrack => ({
  track: 'propose-building-block',
  proposalId: proposalId as never,
  blockKind: 'domain-event',
  label: 'Loan recorded',
  bar: 'strict',
})

describe('sessionProposalIds', () => {
  it('folds every propose-building-block proposalId, in order, ignoring other tracks', () => {
    const events: SessionEvent[] = [
      { v: 1, at, type: 'Session Started', sessionId, workshopId },
      {
        v: 1,
        at,
        type: 'Contribution Interpreted',
        sessionId,
        contributionId: toContributionId('c_1'),
        tracks: [
          proposeTrack('p_1'),
          { track: 'flag-phase', questionId: toQuestionId('q_1'), questionText: 'phase?' },
          proposeTrack('p_2'),
        ],
      },
      {
        v: 1,
        at,
        type: 'Contribution Interpreted',
        sessionId,
        contributionId: toContributionId('c_2'),
        tracks: [proposeTrack('p_3')],
      },
    ]
    expect(sessionProposalIds(events)).toEqual(['p_1', 'p_2', 'p_3'])
  })
})

describe('sessionSummary — read-time projection over a canned stream', () => {
  const events: SessionEvent[] = [
    { v: 1, at, type: 'Session Started', sessionId, workshopId },
    { v: 1, at, type: 'Question Asked', sessionId, questionId: toQuestionId('q_1'), kind: 'phase', text: 'Is fulfilment a phase?' },
    madeC('c_1', 'Dana', 'A member borrowed a book.'),
    { v: 1, at, type: 'Question Answered', sessionId, questionId: toQuestionId('q_1'), byContributionId: toContributionId('c_1') },
    madeC('c_2', 'Dana', 'The book was returned.'),
    { v: 1, at, type: 'Question Asked', sessionId, questionId: toQuestionId('q_2'), kind: 'free', text: 'Who reshelves it?' },
    { v: 1, at, type: 'Session Closed', sessionId, workshopId, unresolvedQuestionIds: [toQuestionId('q_2')] },
  ]

  it('matches the hand-written expected struct', () => {
    expect(sessionSummary(events, 3)).toEqual({
      blocksAdded: 3,
      questionsAsked: 2,
      questionsAnswered: 1,
      questionsUnresolved: 1,
      contributionCount: 2,
      recentTurns: [
        'facilitator: Is fulfilment a phase?',
        'Dana: A member borrowed a book.',
        'Dana: The book was returned.',
        'facilitator: Who reshelves it?',
      ],
    })
  })

  it('is a stable projection over the terminal stream — re-reading after close yields the same result', () => {
    const first = sessionSummary(events, 3)
    const second = sessionSummary(events, 3)
    expect(second).toEqual(first)
  })

  it('caps recentTurns at the last 8 lines', () => {
    const many: SessionEvent[] = Array.from({ length: 12 }, (_, index) =>
      madeC(`c_${String(index)}`, 'Dana', `line ${String(index)}`),
    )
    expect(sessionSummary(many, 0).recentTurns).toEqual([
      'Dana: line 4',
      'Dana: line 5',
      'Dana: line 6',
      'Dana: line 7',
      'Dana: line 8',
      'Dana: line 9',
      'Dana: line 10',
      'Dana: line 11',
    ])
  })
})

describe('priorSessionHistory', () => {
  it('composes one summary per closed session, order preserved', () => {
    const one: SessionEvent[] = [madeC('c_1', 'Dana', 'first')]
    const two: SessionEvent[] = [madeC('c_2', 'Dana', 'second'), madeC('c_3', 'Dana', 'third')]
    const history = priorSessionHistory([
      { events: one, blocksAdded: 1 },
      { events: two, blocksAdded: 2 },
    ])
    expect(history.map((entry) => [entry.contributionCount, entry.blocksAdded])).toEqual([
      [1, 1],
      [2, 2],
    ])
  })
})
