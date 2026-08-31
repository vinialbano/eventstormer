import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import type { SessionId, WorkshopId } from '~/plumbing/ids.ts'
import { createMemoryEventStore } from '~/plumbing/event-store/memory-store.ts'
import { createSqliteEventStore } from '~/plumbing/event-store/sqlite-adapter.ts'
import type { EventStore } from '~/plumbing/event-store/port.ts'
import { applySessionFacilitationMigrations } from './migrations.ts'
import {
  close,
  deleteRow,
  reserve,
  sessionIdsFor,
  staleOpenRow,
  type SessionIndexDb,
} from './session-index.ts'

const toWorkshopId = (value: string): WorkshopId => value as WorkshopId
const toSessionId = (value: string): SessionId => value as SessionId

const sessionStarted = (id: SessionId, workshopId: WorkshopId) => ({
  at: '2026-08-30T12:00:00.000Z',
  opVersion: 1,
  operation: { v: 1, type: 'Session Started', sessionId: id, workshopId, at: '2026-08-30T12:00:00.000Z' },
})

let db: SessionIndexDb

beforeEach(() => {
  const raw = new DatabaseSync(':memory:')
  applySessionFacilitationMigrations(raw)
  db = raw
})

describe('reserve / close — the one-open-session slot', () => {
  it('reserves the slot once; a second reserve for the same workshop is rejected', () => {
    expect(reserve(db, toWorkshopId('w1'), toSessionId('s1'), 't0')).toEqual({ ok: true, value: undefined })
    expect(reserve(db, toWorkshopId('w1'), toSessionId('s2'), 't1')).toEqual({
      ok: false,
      error: { kind: 'session-already-open' },
    })
  })

  it('a different workshop can reserve its own slot concurrently', () => {
    reserve(db, toWorkshopId('w1'), toSessionId('s1'), 't0')
    expect(reserve(db, toWorkshopId('w2'), toSessionId('s2'), 't1')).toEqual({ ok: true, value: undefined })
  })

  it('close frees the slot — a new session then reserves', () => {
    reserve(db, toWorkshopId('w1'), toSessionId('s1'), 't0')
    close(db, toSessionId('s1'), 't5')
    expect(reserve(db, toWorkshopId('w1'), toSessionId('s2'), 't6')).toEqual({ ok: true, value: undefined })
  })

  it('close is idempotent', () => {
    reserve(db, toWorkshopId('w1'), toSessionId('s1'), 't0')
    close(db, toSessionId('s1'), 't5')
    expect(() => { close(db, toSessionId('s1'), 't9') }).not.toThrow()
  })
})

describe('sessionIdsFor — enumeration', () => {
  it('splits a workshop’s sessions into the one open and the closed list, oldest first', () => {
    reserve(db, toWorkshopId('w1'), toSessionId('s1'), 't0')
    close(db, toSessionId('s1'), 't1')
    reserve(db, toWorkshopId('w1'), toSessionId('s2'), 't2')
    close(db, toSessionId('s2'), 't3')
    reserve(db, toWorkshopId('w1'), toSessionId('s3'), 't4')

    expect(sessionIdsFor(db, toWorkshopId('w1'))).toEqual({ open: 's3', closed: ['s1', 's2'] })
  })

  it('reports no open session once every session is closed', () => {
    reserve(db, toWorkshopId('w1'), toSessionId('s1'), 't0')
    close(db, toSessionId('s1'), 't1')
    expect(sessionIdsFor(db, toWorkshopId('w1'))).toEqual({ closed: ['s1'] })
  })
})

const temporaryDirectories: string[] = []
afterAll(() => {
  for (const directory of temporaryDirectories) rmSync(directory, { recursive: true, force: true })
})
const sqliteStore = (): EventStore => {
  const directory = mkdtempSync(join(tmpdir(), 'eventstormer-sessidx-'))
  temporaryDirectories.push(directory)
  return createSqliteEventStore(join(directory, 'test.db'))
}

const stores: [string, () => EventStore][] = [
  ['in-memory store', () => createMemoryEventStore()],
  ['sqlite store', sqliteStore],
]

describe.each(stores)('staleOpenRow — crash between reserve and the aggregate append, %s', (_name, makeStore) => {
  it('returns the id of an open row whose session stream never got Session Started', () => {
    const store = makeStore()
    reserve(db, toWorkshopId('w1'), toSessionId('s1'), 't0')
    expect(staleOpenRow(db, store, toWorkshopId('w1'))).toBe('s1')
  })

  it('returns undefined once the session stream has Session Started', () => {
    const store = makeStore()
    reserve(db, toWorkshopId('w1'), toSessionId('s1'), 't0')
    store.append({ context: 'session-facilitation', aggregate: 'session', id: 's1' }, -1, [
      sessionStarted(toSessionId('s1'), toWorkshopId('w1')),
    ])
    expect(staleOpenRow(db, store, toWorkshopId('w1'))).toBeUndefined()
  })

  it('returns undefined when there is no open row', () => {
    const store = makeStore()
    expect(staleOpenRow(db, store, toWorkshopId('w1'))).toBeUndefined()
  })

  it('deleteRow clears a stale slot so a fresh reserve succeeds', () => {
    const store = makeStore()
    reserve(db, toWorkshopId('w1'), toSessionId('s1'), 't0')
    const stale = staleOpenRow(db, store, toWorkshopId('w1'))
    expect(stale).toBe('s1')
    deleteRow(db, toSessionId('s1'))
    expect(reserve(db, toWorkshopId('w1'), toSessionId('s2'), 't1')).toEqual({ ok: true, value: undefined })
  })
})
