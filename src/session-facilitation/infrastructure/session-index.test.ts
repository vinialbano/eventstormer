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

const w = (s: string): WorkshopId => s as WorkshopId
const s = (v: string): SessionId => v as SessionId

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
    expect(reserve(db, w('w1'), s('s1'), 't0')).toEqual({ ok: true, value: undefined })
    expect(reserve(db, w('w1'), s('s2'), 't1')).toEqual({
      ok: false,
      error: { kind: 'session-already-open' },
    })
  })

  it('a different workshop can reserve its own slot concurrently', () => {
    reserve(db, w('w1'), s('s1'), 't0')
    expect(reserve(db, w('w2'), s('s2'), 't1')).toEqual({ ok: true, value: undefined })
  })

  it('close frees the slot — a new session then reserves', () => {
    reserve(db, w('w1'), s('s1'), 't0')
    close(db, s('s1'), 't5')
    expect(reserve(db, w('w1'), s('s2'), 't6')).toEqual({ ok: true, value: undefined })
  })

  it('close is idempotent', () => {
    reserve(db, w('w1'), s('s1'), 't0')
    close(db, s('s1'), 't5')
    expect(() => { close(db, s('s1'), 't9') }).not.toThrow()
  })
})

describe('sessionIdsFor — enumeration', () => {
  it('splits a workshop’s sessions into the one open and the closed list, oldest first', () => {
    reserve(db, w('w1'), s('s1'), 't0')
    close(db, s('s1'), 't1')
    reserve(db, w('w1'), s('s2'), 't2')
    close(db, s('s2'), 't3')
    reserve(db, w('w1'), s('s3'), 't4')

    expect(sessionIdsFor(db, w('w1'))).toEqual({ open: 's3', closed: ['s1', 's2'] })
  })

  it('reports no open session once every session is closed', () => {
    reserve(db, w('w1'), s('s1'), 't0')
    close(db, s('s1'), 't1')
    expect(sessionIdsFor(db, w('w1'))).toEqual({ closed: ['s1'] })
  })
})

const tempDirs: string[] = []
afterAll(() => {
  for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true })
})
const sqliteStore = (): EventStore => {
  const dir = mkdtempSync(join(tmpdir(), 'eventstormer-sessidx-'))
  tempDirs.push(dir)
  return createSqliteEventStore(join(dir, 'test.db'))
}

const stores: [string, () => EventStore][] = [
  ['in-memory store', () => createMemoryEventStore()],
  ['sqlite store', sqliteStore],
]

describe.each(stores)('staleOpenRow — crash between reserve and the aggregate append, %s', (_name, makeStore) => {
  it('returns the id of an open row whose session stream never got Session Started', () => {
    const store = makeStore()
    reserve(db, w('w1'), s('s1'), 't0')
    expect(staleOpenRow(db, store, w('w1'))).toBe('s1')
  })

  it('returns undefined once the session stream has Session Started', () => {
    const store = makeStore()
    reserve(db, w('w1'), s('s1'), 't0')
    store.append({ context: 'session-facilitation', aggregate: 'session', id: 's1' }, -1, [
      sessionStarted(s('s1'), w('w1')),
    ])
    expect(staleOpenRow(db, store, w('w1'))).toBeUndefined()
  })

  it('returns undefined when there is no open row', () => {
    const store = makeStore()
    expect(staleOpenRow(db, store, w('w1'))).toBeUndefined()
  })

  it('deleteRow clears a stale slot so a fresh reserve succeeds', () => {
    const store = makeStore()
    reserve(db, w('w1'), s('s1'), 't0')
    const stale = staleOpenRow(db, store, w('w1'))
    expect(stale).toBe('s1')
    deleteRow(db, s('s1'))
    expect(reserve(db, w('w1'), s('s2'), 't1')).toEqual({ ok: true, value: undefined })
  })
})
