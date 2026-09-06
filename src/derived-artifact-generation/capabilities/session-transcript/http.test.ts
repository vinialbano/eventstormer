import { testClient } from 'hono/testing'
import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it } from 'vitest'
import { createMemoryEventStore } from '~/plumbing/event-store/memory-store.ts'
import type { EventStore } from '~/plumbing/event-store/port.ts'
import type { WorkshopId } from '~/plumbing/ids.ts'
import {
  applySessionFacilitationMigrations,
  type SessionIndexDb,
  startSessionRoutes,
  startWorkshopRoutes,
} from '~/session-facilitation/api.ts'
import type { SessionTranscriptDeps } from './deps.ts'
import { sessionTranscriptRoutes } from './http.ts'

const clock = () => '2026-09-06T10:00:00.000Z'

const newDb = (): SessionIndexDb => {
  const raw = new DatabaseSync(':memory:')
  applySessionFacilitationMigrations(raw)
  return raw
}

const startWorkshop = async (deps: SessionTranscriptDeps): Promise<WorkshopId> => {
  const response = await testClient(
    startWorkshopRoutes({ store: deps.store, clock }),
  ).workshops.$post({ json: { creatorName: 'Dana' } })
  const { workshopId } = (await response.json()) as { workshopId: string }
  return workshopId as WorkshopId
}

const startSession = async (deps: SessionTranscriptDeps, workshopId: WorkshopId): Promise<string> => {
  const response = await testClient(startSessionRoutes(deps)).workshops[':id'].sessions.$post({
    param: { id: workshopId },
  })
  const { sessionId } = (await response.json()) as { sessionId: string }
  return sessionId
}

const getTranscript = (deps: SessionTranscriptDeps, id: string, sessionId: string) =>
  testClient(sessionTranscriptRoutes(deps)).workshops[':id'].sessions[':sessionId'].artifacts.transcript.$get(
    { param: { id, sessionId } },
  )

const seeded = async (): Promise<{
  deps: SessionTranscriptDeps
  workshopId: WorkshopId
  sessionId: string
}> => {
  const deps: SessionTranscriptDeps = { store: createMemoryEventStore(), db: newDb(), clock }
  const workshopId = await startWorkshop(deps)
  const sessionId = await startSession(deps, workshopId)
  return { deps, workshopId, sessionId }
}

describe('GET /workshops/:id/sessions/:sessionId/artifacts/transcript', () => {
  it('returns the rendered transcript with the record position for a known session', async () => {
    const { deps, workshopId, sessionId } = await seeded()

    const response = await getTranscript(deps, workshopId, sessionId)
    expect(response.status).toBe(200)
    const body = (await response.json()) as { position: number; markdown: string }
    expect(body.position).toBe(1)
    expect(body.markdown).toContain('# Session transcript')
    expect(body.markdown).toContain('Format: Big Picture')
    expect(body.markdown).toContain('Session-record position: 1')
    expect(body.markdown).toContain('Rendered at: 2026-09-06T10:00:00.000Z')
    expect(body.markdown).toContain('Counts only — no judgement is made about them.')
  })

  it('returns 404 workshop-not-found for an unknown workshop and produces no file', async () => {
    const deps: SessionTranscriptDeps = { store: createMemoryEventStore(), db: newDb(), clock }

    const response = await getTranscript(deps, 'nope', 's_nope')
    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({ error: 'workshop-not-found' })
  })

  it('returns 404 session-not-found when the workshop has no session with that id', async () => {
    const deps: SessionTranscriptDeps = { store: createMemoryEventStore(), db: newDb(), clock }
    const workshopId = await startWorkshop(deps)

    const response = await getTranscript(deps, workshopId, 's_absent')
    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({ error: 'session-not-found' })
  })

  it('returns 500 transcript-render-failed with no partial body when a read throws mid-render', async () => {
    const { deps, workshopId, sessionId } = await seeded()
    const failing: EventStore = {
      append: deps.store.append.bind(deps.store),
      read: (stream) => {
        if (stream.aggregate === 'session') throw new Error('read failed mid-render')
        return deps.store.read(stream)
      },
    }

    const response = await getTranscript({ ...deps, store: failing }, workshopId, sessionId)
    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ error: 'transcript-render-failed' })
  })

  it('returns byte-identical bodies for two GETs with a fixed clock', async () => {
    const { deps, workshopId, sessionId } = await seeded()

    const first = await getTranscript(deps, workshopId, sessionId)
    const second = await getTranscript(deps, workshopId, sessionId)
    expect(JSON.stringify(await first.json())).toBe(JSON.stringify(await second.json()))
  })

  it('produces no other artifact and materialises nothing between requests', async () => {
    const { deps, workshopId, sessionId } = await seeded()
    const recording: EventStore = {
      append: () => {
        throw new Error('the transcript must not write')
      },
      read: (stream) => deps.store.read(stream),
    }

    const before = deps.store.read({ context: 'session-facilitation', aggregate: 'session', id: sessionId }).length
    const response = await getTranscript({ ...deps, store: recording }, workshopId, sessionId)
    const after = deps.store.read({ context: 'session-facilitation', aggregate: 'session', id: sessionId }).length

    expect(response.status).toBe(200)
    expect(after).toBe(before)
  })
})
