import { testClient } from 'hono/testing'
import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it } from 'vitest'
import { applyOperation, Operation } from '~/domain-model-capture/api.ts'
import { createMemoryEventStore } from '~/plumbing/event-store/memory-store.ts'
import type { EventStore } from '~/plumbing/event-store/port.ts'
import type { WorkshopId } from '~/plumbing/ids.ts'
import {
  applySessionFacilitationMigrations,
  type SessionIndexDb,
  startWorkshopRoutes,
} from '~/session-facilitation/api.ts'
import type { SummaryDeps } from './deps.ts'
import { summaryRoutes } from './http.ts'

const clock = () => '2026-09-06T10:00:00.000Z'
const author = { accepter: { name: 'Dana' } }

const newDb = (): SessionIndexDb => {
  const raw = new DatabaseSync(':memory:')
  applySessionFacilitationMigrations(raw)
  return raw
}

const startWorkshop = async (deps: SummaryDeps): Promise<WorkshopId> => {
  const response = await testClient(
    startWorkshopRoutes({ store: deps.store, clock }),
  ).workshops.$post({ json: { creatorName: 'Dana' } })
  const { workshopId } = (await response.json()) as { workshopId: string }
  return workshopId as WorkshopId
}

const capture = (deps: SummaryDeps, workshopId: WorkshopId, id: string, label: string): void => {
  applyOperation(
    { store: deps.store, clock },
    workshopId,
    Operation.parse({ author, kind: 'capture-domain-event', id, label }),
  )
}

const getSummary = (deps: SummaryDeps, id: string) =>
  testClient(summaryRoutes(deps)).workshops[':id'].artifacts.summary.$get({ param: { id } })

const seeded = async (): Promise<{ deps: SummaryDeps; workshopId: WorkshopId }> => {
  const deps: SummaryDeps = { store: createMemoryEventStore(), db: newDb(), clock }
  const workshopId = await startWorkshop(deps)
  capture(deps, workshopId, 'e_1', 'Loan recorded')
  capture(deps, workshopId, 'e_2', 'Book returned')
  applyOperation(
    { store: deps.store, clock },
    workshopId,
    Operation.parse({ author, kind: 'mark-pivotal', target: 'e_1' }),
  )
  return { deps, workshopId }
}

describe('GET /workshops/:id/artifacts/summary', () => {
  it('returns the markdown summary with the composite stamp for a known workshop', async () => {
    const { deps, workshopId } = await seeded()

    const response = await getSummary(deps, workshopId)
    expect(response.status).toBe(200)
    const body = (await response.json()) as {
      boardPosition: number
      sessionRecordPosition: number
      markdown: string
    }
    expect(body.boardPosition).toBe(2)
    expect(body.sessionRecordPosition).toBe(0)
    expect(body.markdown).toContain('# Model summary')
    expect(body.markdown).toContain('Board position: 2')
    expect(body.markdown).toContain('Session-record position: 0')
    expect(body.markdown).toContain('Rendered at: 2026-09-06T10:00:00.000Z')
    for (const heading of ['## Format steps', '## Spine', '## Shape', '## Open problems', '## Coverage gaps']) {
      expect(body.markdown).toContain(heading)
    }
    expect(body.markdown).toContain('- Event: Loan recorded')
  })

  it('returns 404 workshop-not-found and writes nothing for an unknown workshop', async () => {
    const store = createMemoryEventStore()
    const deps: SummaryDeps = { store, db: newDb(), clock }

    const response = await getSummary(deps, 'nope')
    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({ error: 'workshop-not-found' })
    expect(store.read({ context: 'domain-model-capture', aggregate: 'board', id: 'nope' })).toEqual([])
  })

  it('returns 500 summary-render-failed with no partial body when a read throws mid-render', async () => {
    const { deps, workshopId } = await seeded()
    const failing: EventStore = {
      append: deps.store.append.bind(deps.store),
      read: (stream) => {
        if (stream.aggregate === 'board') throw new Error('read failed mid-render')
        return deps.store.read(stream)
      },
    }

    const response = await getSummary({ ...deps, store: failing }, workshopId)
    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ error: 'summary-render-failed' })
  })

  it('returns byte-identical bodies for two GETs with a fixed clock', async () => {
    const { deps, workshopId } = await seeded()

    const first = await getSummary(deps, workshopId)
    const second = await getSummary(deps, workshopId)
    expect(JSON.stringify(await first.json())).toBe(JSON.stringify(await second.json()))
  })

  it('produces no other artifact and materialises nothing between requests', async () => {
    const { deps, workshopId } = await seeded()
    const recording: EventStore = {
      append: () => {
        throw new Error('the summary must not write')
      },
      read: (stream) => deps.store.read(stream),
    }

    const before = deps.store.read({ context: 'domain-model-capture', aggregate: 'board', id: workshopId }).length
    const response = await getSummary({ ...deps, store: recording }, workshopId)
    const after = deps.store.read({ context: 'domain-model-capture', aggregate: 'board', id: workshopId }).length

    expect(response.status).toBe(200)
    expect(after).toBe(before)
  })
})
