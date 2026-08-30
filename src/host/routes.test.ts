import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { loadConfig } from './config.ts'
import { createRoutes } from './routes.ts'

let dir: string

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'eventstormer-routes-'))
})
afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

const app = () =>
  createRoutes(
    loadConfig({ FACILITATOR_MODE: 'scripted', EVENTSTORMER_DB: join(dir, 'e.db'), DATA_DIR: dir }),
  )

describe('createRoutes — the mounted /api surface (S1-27, S1-29)', () => {
  it('serves health under /api', async () => {
    const res = await app().request('/api/health')
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ status: 'ok', opSchemaVersion: 1 })
  })

  it('mounts the session-facilitation write capabilities: POST /api/workshops creates a workshop', async () => {
    const res = await app().request('/api/workshops', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ creatorName: 'Dana' }),
    })
    expect(res.status).toBe(201)
    const body = (await res.json()) as { workshopId: string; url: string }
    expect(body.url).toBe(`/workshops/${body.workshopId}`)
  })
})
