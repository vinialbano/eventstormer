import { DatabaseSync } from 'node:sqlite'
import { beforeEach, describe, expect, it } from 'vitest'
import { createMemoryEventStore } from '~/plumbing/event-store/memory-store.ts'
import type { EventStore } from '~/plumbing/event-store/port.ts'
import type { SessionId, WorkshopId } from '~/plumbing/ids.ts'
import { applySessionFacilitationMigrations } from '../../infrastructure/migrations.ts'
import { close, reserve, sessionIdsFor, type SessionIndexDb } from '../../infrastructure/session-index.ts'
import { sessionStream } from '../../infrastructure/streams.ts'
import { startSessionRoutes } from './http.ts'

const at = '2026-08-30T12:00:00.000Z'
const clock = () => at
const workshopId = 'w_1' as WorkshopId

let db: SessionIndexDb
let store: EventStore

beforeEach(() => {
  const raw = new DatabaseSync(':memory:')
  applySessionFacilitationMigrations(raw)
  db = raw
  store = createMemoryEventStore()
})

const startSession = async (): Promise<Response> =>
  startSessionRoutes({ store, db, clock }).request(`/workshops/${workshopId}/sessions`, { method: 'POST' })

describe('POST /workshops/:id/sessions', () => {
  it('starts a session — 202 with the session id, a Session Started event, and an open index row', async () => {
    const response = await startSession()
    expect(response.status).toBe(202)
    const { sessionId } = (await response.json()) as { sessionId: string }

    expect(sessionIdsFor(db, workshopId)).toEqual({ open: sessionId, closed: [] })
    expect(store.read(sessionStream(sessionId as SessionId)).map((row) => (row.operation as { type: string }).type)).toEqual([
      'Session Started',
    ])
  })

  it('rejects a second start while a session is genuinely open with 409', async () => {
    await startSession()
    const response = await startSession()
    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toEqual({ error: 'session-already-open' })
  })

  it('starts a new session once the open one is closed', async () => {
    const first = (await (await startSession()).json()) as { sessionId: string }
    close(db, first.sessionId as SessionId, at)

    const response = await startSession()
    expect(response.status).toBe(202)
    const second = (await response.json()) as { sessionId: string }
    expect(second.sessionId).not.toBe(first.sessionId)
    expect(sessionIdsFor(db, workshopId)).toEqual({ open: second.sessionId, closed: [first.sessionId] })
  })

  it('recovers a stale open row (reserved but never Session Started) and starts successfully', async () => {
    reserve(db, workshopId, 'stale_1' as SessionId, at)
    expect(sessionIdsFor(db, workshopId)).toEqual({ open: 'stale_1', closed: [] })

    const response = await startSession()
    expect(response.status).toBe(202)
    const { sessionId } = (await response.json()) as { sessionId: string }
    expect(sessionId).not.toBe('stale_1')
    expect(sessionIdsFor(db, workshopId)).toEqual({ open: sessionId, closed: [] })
  })
})
