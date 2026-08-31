import { describe, expect, it } from 'vitest'
import type { ContributionId, ProposalId, SessionId, WorkshopId } from '~/plumbing/ids.ts'
import type { ProposalEvent, SessionEvent, WorkshopEvent } from '../schema/events.ts'
import { artifactSource } from './artifact-source.ts'

const at = '2026-08-30T12:00:00.000Z'
const workshopId = 'w_1' as WorkshopId
const sessionId = 's_1' as SessionId

const started: WorkshopEvent = {
  v: 1,
  at,
  type: 'Workshop Started',
  workshopId,
  format: 'big-picture',
  creatorName: 'Dana',
}

const scopeSet = (statement: string): WorkshopEvent => ({
  v: 1,
  at,
  type: 'Scope Set',
  workshopId,
  statement,
})

const made = (id: string, speaker: string, body: string): SessionEvent => ({
  v: 1,
  at,
  type: 'Contribution Made',
  sessionId,
  contributionId: id as ContributionId,
  speaker,
  body,
  source: 'typed',
})

const proposed = (proposalId: string, evidenceSpan?: string): ProposalEvent => ({
  v: 1,
  at,
  type: 'Building Block Proposed',
  proposalId: proposalId as ProposalId,
  sessionId,
  contributionId: 'c_1' as ContributionId,
  blockKind: 'domain-event',
  label: 'Loan recorded',
  bar: 'lenient',
  ...(evidenceSpan === undefined ? {} : { evidenceSpan }),
})

describe('artifactSource', () => {
  it('pins quotes to contribution bodies then evidence spans, in that order', () => {
    const source = artifactSource({
      workshopEvents: [started],
      sessions: [
        {
          events: [made('c_1', 'Dana', 'A member borrowed a book.'), made('c_2', 'Alex', 'The book was returned.')],
          proposals: [[proposed('p_1', 'borrowed a book')], [proposed('p_2', 'book was returned')]],
        },
      ],
    })

    expect(source.quotes).toEqual([
      { id: 'c_1', text: 'A member borrowed a book.' },
      { id: 'c_2', text: 'The book was returned.' },
      { id: 'span:p_1', text: 'borrowed a book' },
      { id: 'span:p_2', text: 'book was returned' },
    ])
  })

  it('omits a proposal that has no stored evidence span', () => {
    const source = artifactSource({
      workshopEvents: [started],
      sessions: [
        {
          events: [made('c_1', 'Dana', 'A member borrowed a book.')],
          proposals: [[proposed('p_1')], [proposed('p_2', 'borrowed a book')]],
        },
      ],
    })

    expect(source.quotes).toEqual([
      { id: 'c_1', text: 'A member borrowed a book.' },
      { id: 'span:p_2', text: 'borrowed a book' },
    ])
  })

  it('counts distinct speakers on Contribution Made, and zero when there are none', () => {
    const withSpeakers = artifactSource({
      workshopEvents: [started],
      sessions: [
        {
          events: [made('c_1', 'Dana', 'A member borrowed a book.'), made('c_2', 'Dana', 'Again.'), made('c_3', 'Alex', 'The book was returned.')],
          proposals: [],
        },
      ],
    })
    expect(withSpeakers.narratorCount).toBe(2)

    const empty = artifactSource({ workshopEvents: [started], sessions: [] })
    expect(empty.narratorCount).toBe(0)
    expect(empty.quotes).toEqual([])
    expect(empty.scope).toBeNull()
    expect(empty.format).toBe('big-picture')
  })

  it('takes the later statement when Scope Set is applied twice', () => {
    const source = artifactSource({
      workshopEvents: [started, scopeSet('lending books'), scopeSet('returning books')],
      sessions: [],
    })
    expect(source.scope).toBe('returning books')
  })
})
