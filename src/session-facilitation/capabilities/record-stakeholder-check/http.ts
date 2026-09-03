import { Hono } from 'hono'
import { z } from 'zod'
import type { WorkshopId } from '~/plumbing/ids.ts'
import { WorkshopEvent } from '../../domain/schema/events.ts'
import { decide } from '../../domain/workshop/decide.ts'
import { replay } from '../../domain/workshop/replay.ts'
import { storedOps, workshopStream } from '../../infrastructure/streams.ts'
import type { RecordStakeholderCheckDeps } from './deps.ts'

const Body = z.object({
  complete: z.boolean(),
  absentNames: z.array(z.string().trim().min(1)).default([]),
})

/**
 * `POST /workshops/:id/stakeholder-check` — the close-ceremony stakeholder
 * answer. `Workshop.decide(Record Stakeholder Check)` is once-only: a re-post
 * emits nothing and still returns 200. `absentNames` ride on the event only —
 * the hot-spot reconciliation pass turns them into one hot spot per person.
 */
export const recordStakeholderCheckRoutes = (deps: RecordStakeholderCheckDeps) =>
  new Hono().post('/workshops/:id/stakeholder-check', async (context) => {
    const workshopId = context.req.param('id') as WorkshopId
    const body = Body.safeParse(await context.req.json().catch(() => null))
    if (!body.success) return context.json({ error: 'invalid-body' as const }, 400)

    const rows = deps.store.read(workshopStream(workshopId))
    const writeModel = replay(rows.map((row) => WorkshopEvent.parse(row.operation)))

    const decided = decide(writeModel, {
      type: 'Record Stakeholder Check',
      workshopId,
      complete: body.data.complete,
      absentNames: body.data.absentNames,
      at: deps.clock(),
    })
    if (!decided.ok) return context.json({ error: decided.error.kind }, 400)
    if (decided.value.length > 0) {
      deps.store.append(workshopStream(workshopId), rows.length - 1, storedOps(decided.value))
    }
    return context.json({ ok: true as const }, 200)
  })
