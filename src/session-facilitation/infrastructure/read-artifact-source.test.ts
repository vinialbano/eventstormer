import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it } from 'vitest'
import { applyOperation, Operation } from '../../domain-model-capture/api.ts'
import { createMemoryEventStore } from '~/plumbing/event-store/memory-store.ts'
import { newBuildingBlockId } from '~/plumbing/ids.ts'
import type { ContributionId, ProposalId, SessionId, WorkshopId } from '~/plumbing/ids.ts'
import { isErr, isOk } from '~/plumbing/result.ts'
import type { ProposalEvent, SessionEvent, WorkshopEvent } from '../domain/schema/events.ts'
import { applySessionFacilitationMigrations } from './migrations.ts'
import { readArtifactSource } from './read-artifact-source.ts'
import { reserve, type SessionIndexDb } from './session-index.ts'
import { proposalStream, sessionStream, storedOps, workshopStream } from './streams.ts'

const at = '2026-08-30T12:00:00.000Z'
const workshopId = 'w_1' as WorkshopId
const sessionId = 's_1' as SessionId

const workshopStarted: WorkshopEvent = {
  v: 1,
  at,
  type: 'Workshop Started',
  workshopId,
  format: 'big-picture',
  creatorName: 'Dana',
}

const sessionEvents: SessionEvent[] = [
  { v: 1, at, type: 'Session Started', sessionId, workshopId },
  {
    v: 1,
    at,
    type: 'Contribution Made',
    sessionId,
    contributionId: 'c_1' as ContributionId,
    speaker: 'Dana',
    body: 'A member borrowed a book.',
    source: 'typed',
  },
  {
    v: 1,
    at,
    type: 'Contribution Interpreted',
    sessionId,
    contributionId: 'c_1' as ContributionId,
    tracks: [
      {
        track: 'propose-building-block',
        proposalId: 'p_1' as ProposalId,
        blockKind: 'domain-event',
        label: 'Loan recorded',
        bar: 'lenient',
        evidenceSpan: 'borrowed a book',
      },
    ],
  },
]

const proposed: ProposalEvent = {
  v: 1,
  at,
  type: 'Building Block Proposed',
  proposalId: 'p_1' as ProposalId,
  sessionId,
  contributionId: 'c_1' as ContributionId,
  blockKind: 'domain-event',
  label: 'Loan recorded',
  bar: 'lenient',
  evidenceSpan: 'borrowed a book',
}

const dbWithMigrations = (): SessionIndexDb => {
  const raw = new DatabaseSync(':memory:')
  applySessionFacilitationMigrations(raw)
  return raw
}

describe('readArtifactSource', () => {
  it('distinguishes an unknown workshop from a known workshop with no contributions', () => {
    const store = createMemoryEventStore()
    const db = dbWithMigrations()

    const unknown = readArtifactSource({ store, db }, workshopId)
    expect(isErr(unknown)).toBe(true)
    if (isErr(unknown)) expect(unknown.error).toEqual({ kind: 'workshop-not-found' })

    store.append(workshopStream(workshopId), -1, storedOps([workshopStarted]))

    const knownEmpty = readArtifactSource({ store, db }, workshopId)
    expect(isOk(knownEmpty)).toBe(true)
    if (isOk(knownEmpty)) {
      expect(knownEmpty.value).toEqual({
        format: 'big-picture',
        scope: null,
        narratorCount: 0,
        quotes: [],
        stakeholderCheck: { run: false },
        chosenProblem: { notRun: true },
        openModelAffectingHotSpots: [],
      })
    }
  })

  it('pins quotes to stored contribution bodies then Building Block Proposed evidence spans', () => {
    const store = createMemoryEventStore()
    const db = dbWithMigrations()
    reserve(db, workshopId, sessionId, at)

    store.append(workshopStream(workshopId), -1, storedOps([workshopStarted]))
    store.append(sessionStream(sessionId), -1, storedOps(sessionEvents))
    store.append(proposalStream('p_1' as ProposalId), -1, storedOps([proposed]))

    const result = readArtifactSource({ store, db }, workshopId)
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value.quotes).toEqual([
        { id: 'c_1', text: 'A member borrowed a book.' },
        { id: 'span:p_1', text: 'borrowed a book' },
      ])
      expect(result.value.narratorCount).toBe(1)
    }
  })

  it('threads the workshop stakeholder check and the open model-affecting hot spots off the real board', () => {
    const store = createMemoryEventStore()
    const db = dbWithMigrations()
    const author = { accepter: { name: 'Dana' } }

    store.append(workshopStream(workshopId), -1, storedOps([workshopStarted]))
    const checkRecorded: WorkshopEvent = {
      v: 1,
      at,
      type: 'Stakeholder Check Recorded',
      workshopId,
      complete: true,
      absentNames: [],
    }
    store.append(workshopStream(workshopId), 0, storedOps([checkRecorded]))

    const openId = newBuildingBlockId()
    const resolvedId = newBuildingBlockId()
    const infoId = newBuildingBlockId()
    applyOperation({ store, clock: () => at }, workshopId, Operation.parse({ kind: 'raise-hot-spot', id: openId, label: 'still open', author }))
    applyOperation({ store, clock: () => at }, workshopId, Operation.parse({ kind: 'raise-hot-spot', id: infoId, label: 'just informational', modelAffecting: false, author }))
    applyOperation({ store, clock: () => at }, workshopId, Operation.parse({ kind: 'raise-hot-spot', id: resolvedId, label: 'sorted', author }))
    applyOperation({ store, clock: () => at }, workshopId, Operation.parse({ kind: 'resolve', target: resolvedId, reference: 'added a retry', author }))

    const result = readArtifactSource({ store, db }, workshopId)
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value.stakeholderCheck).toEqual({ run: true, complete: true, absentNames: [] })
      expect(result.value.openModelAffectingHotSpots).toEqual([{ id: openId, label: 'still open' }])
    }
  })
})
