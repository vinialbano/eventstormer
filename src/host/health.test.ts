import { describe, expect, it } from 'vitest'
import { testClient } from 'hono/testing'
import { healthRoutes } from './health.ts'

describe('healthRoutes', () => {
  // Full mount + payload contract: `createRoutes — the mounted /api surface` in routes.test.ts.
  it('chains GET /health so testClient infers the handler', async () => {
    const response = await testClient(healthRoutes).health.$get()
    expect(response.status).toBe(200)
  })
})
