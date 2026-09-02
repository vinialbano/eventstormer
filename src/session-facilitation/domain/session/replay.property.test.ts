import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import type { ContributionId, QuestionId, SessionId, WorkshopId } from '~/plumbing/ids.ts'
import type { SessionEvent } from '../schema/events.ts'
import { evolve } from './evolve.ts'
import { replay } from './replay.ts'

const at = '2026-08-30T12:00:00.000Z'
const sessionId = 's_1' as SessionId
const workshopId = 'w_1' as WorkshopId
const toContributionId = (value: string) => value as ContributionId
const toQuestionId = (value: string) => value as QuestionId

/** A pool of valid session events for incremental-replay property tests. */
const POOL: SessionEvent[] = [
  { v: 1, at, type: 'Session Started', sessionId, workshopId },
  {
    v: 1,
    at,
    type: 'Contribution Made',
    sessionId,
    contributionId: toContributionId('c_1'),
    speaker: 'Dana',
    body: 'A member borrowed a book.',
    source: 'typed',
  },
  {
    v: 1,
    at,
    type: 'Question Asked',
    sessionId,
    questionId: toQuestionId('q_phase'),
    kind: 'phase',
    text: 'What happened next?',
  },
  {
    v: 1,
    at,
    type: 'Question Asked',
    sessionId,
    questionId: toQuestionId('q_scope'),
    kind: 'scope',
    text: 'Does this scope fit?',
    scopeStatement: 'Library lending across branches.',
  },
  {
    v: 1,
    at,
    type: 'Question Answered',
    sessionId,
    questionId: toQuestionId('q_phase'),
    byContributionId: toContributionId('c_1'),
  },
  {
    v: 1,
    at,
    type: 'Contribution Interpreted',
    sessionId,
    contributionId: toContributionId('c_ok'),
    tracks: [],
  },
  {
    v: 1,
    at,
    type: 'Contribution Interpretation Failed',
    sessionId,
    contributionId: toContributionId('c_bad'),
    reason: 'provider-down',
  },
  {
    v: 1,
    at,
    type: 'Contribution Attributed To Another Format',
    sessionId,
    contributionId: toContributionId('c_attr'),
    format: 'process-modelling',
    note: 'Better suited to a flow.',
  },
  {
    v: 1,
    at,
    type: 'Session Closed',
    sessionId,
    workshopId,
    unresolvedQuestionIds: [toQuestionId('q_scope')],
  },
]

describe('Session replay — property', () => {
  // Consistency property only — not an independent oracle. Both sides share `evolve`.
  it('replay(log ++ [event]) deep-equals evolve(replay(log), event)', () => {
    fc.assert(
      fc.property(fc.array(fc.constantFrom(...POOL)), fc.constantFrom(...POOL), (log, next) => {
        expect(replay([...log, next])).toEqual(evolve(replay(log), next))
      }),
    )
  })
})
