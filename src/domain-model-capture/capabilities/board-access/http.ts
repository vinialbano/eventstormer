import { Hono } from 'hono'
import type { WorkshopId } from '~/plumbing/ids.ts'
import type { BoardAccessDeps } from './deps.ts'
import { readBoardSnapshot } from './read-board-snapshot.ts'

/**
 * `GET /workshops/:id/board` — the full board snapshot for the client `board`
 * store, rebuilt from the operation log (F01). A `Map` is not JSON, so
 * `blocks` is serialised as an array carrying each block's id. Topology
 * (`follows`, `causedBy`) and per-block `placement` / `pivotal` travel with
 * the body; ranks do not.
 *
 * Chained router (Hono RPC / `testClient` type inference depends on it).
 */
export const boardAccessRoutes = (deps: BoardAccessDeps) =>
  new Hono().get('/workshops/:id/board', (context) => {
    const workshopId = context.req.param('id') as WorkshopId
    const snapshot = readBoardSnapshot({ store: deps.store }, workshopId)
    if (snapshot.position === -1) return context.json({ error: 'workshop not found' as const }, 404)
    return context.json(snapshot)
  })
