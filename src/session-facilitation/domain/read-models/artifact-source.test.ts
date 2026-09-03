import { describe, expect, it } from 'vitest'
import type { BuildingBlockId, ContributionId, ProposalId, SessionId, WorkshopId } from '~/plumbing/ids.ts'
import type { ProposalEvent, SessionEvent, WorkshopEvent } from '../schema/events.ts'
import { artifactSource, type BoardBlockView } from './artifact-source.ts'

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
      boardBlocks: [],
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
      boardBlocks: [],
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
      boardBlocks: [],
      sessions: [
        {
          events: [made('c_1', 'Dana', 'A member borrowed a book.'), made('c_2', 'Dana', 'Again.'), made('c_3', 'Alex', 'The book was returned.')],
          proposals: [],
        },
      ],
    })
    expect(withSpeakers.narratorCount).toBe(2)

    const empty = artifactSource({ workshopEvents: [started], boardBlocks: [], sessions: [] })
    expect(empty.narratorCount).toBe(0)
    expect(empty.quotes).toEqual([])
    expect(empty.scope).toBeNull()
    expect(empty.format).toBe('big-picture')
  })

  it('takes the later statement when Scope Set is applied twice', () => {
    const source = artifactSource({
      workshopEvents: [started, scopeSet('lending books'), scopeSet('returning books')],
      boardBlocks: [],
      sessions: [],
    })
    expect(source.scope).toBe('returning books')
  })
})

const stakeholderCheckRecorded = (complete: boolean, absentNames: string[]): WorkshopEvent => ({
  v: 1,
  at,
  type: 'Stakeholder Check Recorded',
  workshopId,
  complete,
  absentNames,
})

const hotSpotBlock = (
  id: string,
  overrides: {
    withdrawn?: boolean
    resolved?: boolean
    modelAffecting?: boolean | undefined
    label?: string
  } = {},
): BoardBlockView => ({
  id,
  kind: 'hot-spot',
  label: overrides.label ?? `Hot spot ${id}`,
  withdrawn: overrides.withdrawn ?? false,
  resolved: overrides.resolved ?? false,
  modelAffecting: overrides.modelAffecting,
})

describe('artifactSource — close-ceremony fields', () => {
  it('reports the stakeholder check as not run when the workshop has no such event', () => {
    const source = artifactSource({ workshopEvents: [started], boardBlocks: [], sessions: [] })
    expect(source.stakeholderCheck).toEqual({ run: false })
    expect(source.chosenProblem).toEqual({ notRun: true })
    expect(source.openModelAffectingHotSpots).toEqual([])
  })

  it('distinguishes "run, nobody absent" from "not run"', () => {
    const source = artifactSource({
      workshopEvents: [started, stakeholderCheckRecorded(true, [])],
      boardBlocks: [],
      sessions: [],
    })
    expect(source.stakeholderCheck).toEqual({ run: true, complete: true, absentNames: [] })
  })

  it('carries every absent name from an incomplete check', () => {
    const source = artifactSource({
      workshopEvents: [started, stakeholderCheckRecorded(false, ['ops lead', 'the auditor'])],
      boardBlocks: [],
      sessions: [],
    })
    expect(source.stakeholderCheck).toEqual({
      run: true,
      complete: false,
      absentNames: ['ops lead', 'the auditor'],
    })
  })

  it('reports a chosen problem with its board label and qualification', () => {
    const source = artifactSource({
      workshopEvents: [
        started,
        {
          v: 1,
          at,
          type: 'Problem Chosen',
          workshopId,
          problemHotSpotId: 'b_1' as BuildingBlockId,
          qualification: 'provisional',
        },
      ],
      boardBlocks: [hotSpotBlock('b_1', { label: 'Payments keep timing out' })],
      sessions: [],
    })
    expect(source.chosenProblem).toEqual({
      chosen: true,
      hotSpotId: 'b_1',
      label: 'Payments keep timing out',
      qualification: 'provisional',
    })
  })

  it('reports a skipped problem choice with its reason', () => {
    const source = artifactSource({
      workshopEvents: [
        started,
        { v: 1, at, type: 'Problem Choice Skipped', workshopId, reason: 'no-impediments-yet' },
      ],
      boardBlocks: [],
      sessions: [],
    })
    expect(source.chosenProblem).toEqual({ skipped: true, reason: 'no-impediments-yet' })
  })

  it('lists open model-affecting hot spots, excluding informational, resolved and withdrawn ones', () => {
    const source = artifactSource({
      workshopEvents: [started],
      boardBlocks: [
        hotSpotBlock('b_open', { label: 'still open' }),
        hotSpotBlock('b_default_open', { label: 'default kind', modelAffecting: undefined }),
        hotSpotBlock('b_info', { modelAffecting: false }),
        hotSpotBlock('b_resolved', { resolved: true }),
        hotSpotBlock('b_withdrawn', { withdrawn: true }),
        { id: 'e_1', kind: 'domain-event', label: 'not a hot spot', withdrawn: false },
      ],
      sessions: [],
    })
    expect(source.openModelAffectingHotSpots).toEqual([
      { id: 'b_open', label: 'still open' },
      { id: 'b_default_open', label: 'default kind' },
    ])
  })
})
