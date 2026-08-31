import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { loadConfig } from './config.ts'
import { createRoutes } from './routes.ts'

let directory: string

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'eventstormer-routes-'))
})
afterEach(() => {
  rmSync(directory, { recursive: true, force: true })
})

const app = () =>
  createRoutes(
    loadConfig({ FACILITATOR_MODE: 'scripted', EVENTSTORMER_DB: join(directory, 'e.db'), DATA_DIR: directory }),
  )

describe('createRoutes — the mounted /api surface', () => {
  it('serves health under /api', async () => {
    const response = await app().request('/api/health')
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ status: 'ok', opSchemaVersion: 1 })
  })

  it('mounts the session-facilitation write capabilities: POST /api/workshops creates a workshop', async () => {
    const response = await app().request('/api/workshops', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ creatorName: 'Dana' }),
    })
    expect(response.status).toBe(201)
    const body = (await response.json()) as { workshopId: string; url: string }
    expect(body.url).toBe(`/workshops/${body.workshopId}`)
  })
})
