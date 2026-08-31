import { Hono } from 'hono'
import { z } from 'zod'
import { readBuildingBlocks } from '../../../domain-model-capture/api.ts'
import type { WorkshopId } from '~/plumbing/ids.ts'
import { WorkshopEvent } from '../../domain/schema/events.ts'
import { decide } from '../../domain/workshop/decide.ts'
import { replay } from '../../domain/workshop/replay.ts'
import { storedOps, workshopStream } from '../../infrastructure/streams.ts'
import type { SetScopeDeps } from './deps.ts'

const Body = z.object({ statement: z.string() })

/**
 * `POST /workshops/:id/scope` — accept/edit the proposed scope (F05 card).
 *
 * The revision window is a **handler precondition**, not a `decide` argument:
 * a true invariant never delegates its data to another context, so scope is
 * revisable only while the model has zero applied building blocks.
 * `readBuildingBlocks().length > 0` → 409 (systemic), scope
 * unchanged. `Workshop.decide(Set Scope)` only validates the statement and is
 * repeatable.
 */
export const setScopeRoutes = (deps: SetScopeDeps) =>
  new Hono().post('/workshops/:id/scope', async (c) => {
    const workshopId = c.req.param('id') as WorkshopId
    const body = Body.safeParse(await c.req.json().catch(() => null))
    if (!body.success) return c.json({ error: 'invalid-body' as const }, 400)

    if (readBuildingBlocks(deps, workshopId).length > 0) {
      return c.json({ error: 'scope-locked' as const }, 409)
    }

    const rows = deps.store.read(workshopStream(workshopId))
    const wm = replay(rows.map((r) => WorkshopEvent.parse(r.operation)))

    const decided = decide(wm, {
      type: 'Set Scope',
      workshopId,
      statement: body.data.statement,
      at: deps.clock(),
    })
    if (!decided.ok) return c.json({ error: decided.error.kind }, 400)

    deps.store.append(workshopStream(workshopId), rows.length - 1, storedOps(decided.value))
    return c.json({ ok: true as const }, 200)
  })
