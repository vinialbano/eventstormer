import { Hono } from 'hono'
import { OP_SCHEMA_VERSION } from '../../domain/schema-version.ts'

/**
 * Routes MUST stay chained — `new Hono().get(...).post(...)`. Breaking the chain
 * into separate `app.get(...)` statements silently drops the type information
 * that Hono RPC and `testClient` infer from, and nothing fails until a caller
 * loses its types. This slice is the worked example; copy its shape.
 */
export const healthRoutes = new Hono().get('/health', (c) =>
  c.json({
    status: 'ok' as const,
    opSchemaVersion: OP_SCHEMA_VERSION,
  }),
)
