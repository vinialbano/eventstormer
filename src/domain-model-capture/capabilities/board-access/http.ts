import { Hono } from 'hono'
import type { WorkshopId } from '~/plumbing/ids.ts'
import { replay } from '../../domain/board/replay.ts'
import { Operation } from '../../domain/schema/index.ts'
import { type BoardAccessDeps, boardStream } from './deps.ts'

/**
 * `GET /workshops/:id/board` — the full board snapshot for the client `board`
 * store, rebuilt from the operation log (F01 / S1-07). A `Map` is not JSON, so
 * `blocks` is serialised as an array carrying each block's id.
 *
 * Chained router (Hono RPC / `testClient` type inference depends on it).
 */
export const boardAccessRoutes = (deps: BoardAccessDeps) =>
  new Hono().get('/workshops/:id/board', (c) => {
    const workshopId = c.req.param('id') as WorkshopId
    const rows = deps.store.read(boardStream(workshopId))
    if (rows.length === 0) return c.json({ error: 'workshop not found' as const }, 404)

    const snapshot = replay(rows.map((r) => Operation.parse(r.operation)))
    return c.json({
      position: snapshot.position,
      blocks: [...snapshot.blocks].map(([id, block]) => ({ id, ...block })),
    })
  })
