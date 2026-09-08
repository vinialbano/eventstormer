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
import { deserialise } from '../../domain/deserialise.ts'
import { ModelJson } from '../../domain/model-json.ts'
import type { ModelExportDeps } from './deps.ts'
import { modelExportRoutes } from './http.ts'

const clock = () => '2026-09-05T10:00:00.000Z'
const author = { accepter: { name: 'Dana' } }

const newDb = (): SessionIndexDb => {
  const raw = new DatabaseSync(':memory:')
  applySessionFacilitationMigrations(raw)
  return raw
}

const startWorkshop = async (deps: ModelExportDeps): Promise<WorkshopId> => {
  const response = await testClient(startWorkshopRoutes({ store: deps.store, clock })).workshops.$post(
    { json: { creatorName: 'Dana' } },
  )
  const { workshopId } = (await response.json()) as { workshopId: string }
  return workshopId as WorkshopId
}

const capture = (deps: ModelExportDeps, workshopId: WorkshopId, id: string, label: string): void => {
  applyOperation(
    { store: deps.store, clock },
    workshopId,
    Operation.parse({ author, kind: 'capture-domain-event', id, label }),
  )
}

const getModel = (deps: ModelExportDeps, id: string) =>
  testClient(modelExportRoutes(deps)).workshops[':id'].artifacts.model.$get({ param: { id } })

const seeded = async (): Promise<{ deps: ModelExportDeps; workshopId: WorkshopId }> => {
  const deps: ModelExportDeps = { store: createMemoryEventStore(), db: newDb(), clock }
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

describe('GET /workshops/:id/artifacts/model', () => {
  it('returns the model json with the composite stamp for a known workshop', async () => {
    const { deps, workshopId } = await seeded()

    const response = await getModel(deps, workshopId)
    expect(response.status).toBe(200)
    const body = await response.json()

    expect(ModelJson.safeParse(body).success).toBe(true)
    const document = body as ModelJson
    expect(document.format).toBe('eventstormer.model')
    expect(document.formatVersion).toBe(1)
    expect(document.renderedAt).toBe('2026-09-05T10:00:00.000Z')
    expect(document.boardPosition).toBe(2)
    expect(document.sessionRecordPosition).toBe(0)
    expect(document.buildingBlocks.map((block) => block.id)).toEqual(['e_1', 'e_2'])
    expect(document.buildingBlocks.find((block) => block.id === 'e_1')?.pivotal).toBe(true)

    const rebuilt = deserialise(document)
    expect(rebuilt.ok).toBe(true)
  })

  it('returns 404 with the workshop-not-found shape and writes nothing for an unknown workshop', async () => {
    const store = createMemoryEventStore()
    const deps: ModelExportDeps = { store, db: newDb(), clock }

    const response = await getModel(deps, 'nope')
    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({ error: 'workshop-not-found' })
    expect(store.read({ context: 'domain-model-capture', aggregate: 'board', id: 'nope' })).toEqual([])
  })

  it('returns 500 with no partial body when a read throws mid-render', async () => {
    const { deps, workshopId } = await seeded()
    const failing: EventStore = {
      append: deps.store.append.bind(deps.store),
      read: (stream) => {
        if (stream.aggregate === 'board') throw new Error('read failed mid-render')
        return deps.store.read(stream)
      },
    }

    const response = await getModel({ ...deps, store: failing }, workshopId)
    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ error: 'model-render-failed' })
  })

  it('returns byte-identical bodies for two GETs with a fixed clock', async () => {
    const { deps, workshopId } = await seeded()

    const first = await getModel(deps, workshopId)
    const second = await getModel(deps, workshopId)
    expect(JSON.stringify(await first.json())).toBe(JSON.stringify(await second.json()))
  })

  it('produces no summary or transcript and materialises nothing between requests', async () => {
    const { deps, workshopId } = await seeded()
    const streamsRead = new Set<string>()
    const recording: EventStore = {
      append: () => {
        throw new Error('the model export must not write')
      },
      read: (stream) => {
        streamsRead.add(stream.aggregate)
        return deps.store.read(stream)
      },
    }

    const before = deps.store.read({ context: 'domain-model-capture', aggregate: 'board', id: workshopId }).length
    const response = await getModel({ ...deps, store: recording }, workshopId)
    expect(response.status).toBe(200)
    const after = deps.store.read({ context: 'domain-model-capture', aggregate: 'board', id: workshopId }).length

    expect(after).toBe(before)
    expect(streamsRead).toContain('workshop')
    expect(streamsRead).toContain('board')
  })
})
