import { describe, expect, it } from 'vitest'
import { testClient } from 'hono/testing'
import { healthRoutes } from './health.ts'

describe('health', () => {
  it('reports the op schema version this build replays', async () => {
    // testClient only type-checks because the routes above are chained.
    const res = await testClient(healthRoutes).health.$get()

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ status: 'ok', opSchemaVersion: 1 })
  })
})
