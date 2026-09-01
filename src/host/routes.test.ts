import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { applyOperation, Operation } from '../domain-model-capture/api.ts'
import type { WorkshopId } from '../plumbing/ids.ts'
import { loadConfig } from './config.ts'
import { createRoutes } from './routes.ts'

let directory: string

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'eventstormer-routes-'))
})
afterEach(() => {
  rmSync(directory, { recursive: true, force: true })
})

const wired = () => {
  const config = loadConfig({
    FACILITATOR_MODE: 'scripted',
    EVENTSTORMER_DB: join(directory, 'e.db'),
    DATA_DIR: directory,
  })
  return { config, app: createRoutes(config) }
}

const createWorkshop = async (app: ReturnType<typeof createRoutes>): Promise<WorkshopId> => {
  const response = await app.request('/api/workshops', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ creatorName: 'Dana' }),
  })
  const { workshopId } = (await response.json()) as { workshopId: string }
  return workshopId as WorkshopId
}

describe('createRoutes — the mounted /api surface', () => {
  it('serves health under /api', async () => {
    const response = await wired().app.request('/api/health')
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ status: 'ok', opSchemaVersion: 1 })
  })

  it('mounts the session-facilitation write capabilities: POST /api/workshops creates a workshop', async () => {
    const response = await wired().app.request('/api/workshops', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ creatorName: 'Dana' }),
    })
    expect(response.status).toBe(201)
    const body = (await response.json()) as { workshopId: string; url: string }
    expect(body.url).toBe(`/workshops/${body.workshopId}`)
  })

  it('serves POST /api/workshops/:id/board/operations through the capture api', async () => {
    const { config, app } = wired()
    const workshopId = await createWorkshop(app)
    applyOperation(
      { store: config.store, clock: config.clock },
      workshopId,
      Operation.parse({
        author: { accepter: { name: 'Dana' } },
        kind: 'capture-domain-event',
        id: 'b_1',
        label: 'Loan recorded',
      }),
    )

    const response = await app.request(`/api/workshops/${workshopId}/board/operations`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        v: 1,
        kind: 'reword',
        target: 'b_1',
        label: 'Loan was recorded',
        author: { accepter: { name: 'Dana' } },
      }),
    })
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ position: 1 })
  })

  it('serves both artifact GETs: empty board is 200 and references list the building-blocks site', async () => {
    const { config, app } = wired()
    const workshopId = await createWorkshop(app)

    const empty = await app.request(`/api/workshops/${workshopId}/readable-account`)
    expect(empty.status).toBe(200)
    const emptyBody = (await empty.json()) as { position: number; markdown: string }
    expect(emptyBody.position).toBe(-1)
    expect(emptyBody.markdown).toContain('# Readable account')
    expect(emptyBody.markdown).toContain('Narrators: 0')

    applyOperation(
      { store: config.store, clock: config.clock },
      workshopId,
      Operation.parse({
        author: { accepter: { name: 'Dana' } },
        kind: 'capture-domain-event',
        id: 'b_1',
        label: 'Loan recorded',
      }),
    )

    const account = await app.request(`/api/workshops/${workshopId}/readable-account`)
    expect(account.status).toBe(200)
    const accountBody = (await account.json()) as { markdown: string }
    expect(accountBody.markdown).toContain('- Event: Loan recorded')

    const references = await app.request(`/api/workshops/${workshopId}/board/blocks/b_1/references`)
    expect(references.status).toBe(200)
    await expect(references.json()).resolves.toEqual([
      { kind: 'readable-account', path: 'building-blocks' },
    ])
  })
})
