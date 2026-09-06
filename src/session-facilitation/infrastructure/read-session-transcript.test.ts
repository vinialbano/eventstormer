import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it } from 'vitest'
import { createMemoryEventStore } from '~/plumbing/event-store/memory-store.ts'
import type { ContributionId, SessionId, WorkshopId } from '~/plumbing/ids.ts'
import { isErr, isOk } from '~/plumbing/result.ts'
import type { SessionEvent, WorkshopEvent } from '../domain/schema/events.ts'
import { SessionTranscript } from '../domain/read-models/session-transcript-contract.ts'
import { applySessionFacilitationMigrations } from './migrations.ts'
import { readSessionTranscript } from './read-session-transcript.ts'
import { reserve, type SessionIndexDb } from './session-index.ts'
import { sessionStream, storedOps, workshopStream } from './streams.ts'

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
]

const dbWithMigrations = (): SessionIndexDb => {
  const raw = new DatabaseSync(':memory:')
  applySessionFacilitationMigrations(raw)
  return raw
}

describe('readSessionTranscript', () => {
  it('returns workshop-not-found for an empty workshop stream', () => {
    const store = createMemoryEventStore()
    const db = dbWithMigrations()

    const result = readSessionTranscript({ store, db }, workshopId, sessionId)
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error).toEqual({ kind: 'workshop-not-found' })
  })

  it('returns session-not-found when the workshop has no session with that id', () => {
    const store = createMemoryEventStore()
    const db = dbWithMigrations()
    store.append(workshopStream(workshopId), -1, storedOps([workshopStarted]))

    const result = readSessionTranscript({ store, db }, workshopId, 's_absent' as SessionId)
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error).toEqual({ kind: 'session-not-found' })
  })

  it('folds a known session into a contract-valid transcript stamped with the record position', () => {
    const store = createMemoryEventStore()
    const db = dbWithMigrations()
    reserve(db, workshopId, sessionId, at)
    store.append(workshopStream(workshopId), -1, storedOps([workshopStarted]))
    store.append(sessionStream(sessionId), -1, storedOps(sessionEvents))

    const result = readSessionTranscript({ store, db }, workshopId, sessionId)
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(() => SessionTranscript.parse(result.value)).not.toThrow()
      expect(result.value.position).toBe(sessionEvents.length)
      expect(result.value.turns.map((turn) => turn.kind)).toEqual(['contribution'])
    }
  })
})
