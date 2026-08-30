import { Hono } from 'hono'
import { z } from 'zod'
import { newWorkshopId } from '~/plumbing/ids.ts'
import { decide } from '../../domain/workshop/decide.ts'
import { emptyWorkshop } from '../../domain/workshop/model.ts'
import { storedOps, workshopStream } from '../../infrastructure/streams.ts'
import type { StartWorkshopDeps } from './deps.ts'

const Body = z.object({ creatorName: z.string() })

/**
 * `POST /workshops` — start a Big Picture `Workshop` (AD-009 thin handler:
 * parse → `decide` → `append`). The workshop id is a nanoid slug; the resumable
 * URL is `/workshops/:id`.
 */
export const startWorkshopRoutes = (deps: StartWorkshopDeps) =>
  new Hono().post('/workshops', async (c) => {
    const body = Body.safeParse(await c.req.json().catch(() => null))
    if (!body.success) return c.json({ error: 'invalid-body' as const }, 400)

    const workshopId = newWorkshopId()
    const decided = decide(emptyWorkshop(), {
      type: 'Start Workshop',
      workshopId,
      creatorName: body.data.creatorName,
      at: deps.clock(),
    })
    if (!decided.ok) return c.json({ error: decided.error.kind }, 400)

    deps.store.append(workshopStream(workshopId), -1, storedOps(decided.value))
    return c.json({ workshopId, url: `/workshops/${workshopId}` }, 201)
  })
