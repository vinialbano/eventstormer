import { Hono } from 'hono'
import { z } from 'zod'
import { readBoardSnapshot } from '../../../domain-model-capture/api.ts'
import type { BuildingBlockId, WorkshopId } from '~/plumbing/ids.ts'
import { WorkshopEvent } from '../../domain/schema/events.ts'
import { decide } from '../../domain/workshop/decide.ts'
import type { WorkshopCommand } from '../../domain/workshop/model.ts'
import { replay } from '../../domain/workshop/replay.ts'
import { storedOps, workshopStream } from '../../infrastructure/streams.ts'
import type { ChooseProblemDeps } from './deps.ts'

const Body = z.union([
  z.object({ problemHotSpotId: z.string().min(1) }),
  z.object({ skipReason: z.enum(['none-chosen', 'no-impediments-yet']) }),
])

/**
 * `POST /workshops/:id/chosen-problem` — record the one problem most worth
 * attacking, or a skip with a reason. The candidates are exactly the hot spots
 * open right now: a synchronous query-back to `readBoardSnapshot` filters to
 * non-withdrawn, unresolved hot-spot blocks; an id outside that set is 409
 * `unknown-open-hot-spot` (a stale-client guard — the picker only offers open
 * ones). Both `Choose Problem` and `Skip Problem Choice` are once-only.
 */
export const chooseProblemRoutes = (deps: ChooseProblemDeps) =>
  new Hono().post('/workshops/:id/chosen-problem', async (context) => {
    const workshopId = context.req.param('id') as WorkshopId
    const body = Body.safeParse(await context.req.json().catch(() => null))
    if (!body.success) return context.json({ error: 'invalid-body' as const }, 400)

    const rows = deps.store.read(workshopStream(workshopId))
    const writeModel = replay(rows.map((row) => WorkshopEvent.parse(row.operation)))

    let command: WorkshopCommand
    if ('skipReason' in body.data) {
      command = { type: 'Skip Problem Choice', workshopId, reason: body.data.skipReason, at: deps.clock() }
    } else {
      const openHotSpotIds = readBoardSnapshot({ store: deps.store }, workshopId)
        .blocks.filter((block) => block.kind === 'hot-spot' && !block.withdrawn && block.resolved === false)
        .map((block) => block.id)
      if (!openHotSpotIds.includes(body.data.problemHotSpotId as BuildingBlockId)) {
        return context.json({ error: 'unknown-open-hot-spot' as const }, 409)
      }
      command = {
        type: 'Choose Problem',
        workshopId,
        problemHotSpotId: body.data.problemHotSpotId as BuildingBlockId,
        at: deps.clock(),
      }
    }

    const decided = decide(writeModel, command)
    if (!decided.ok) return context.json({ error: decided.error.kind }, 400)
    if (decided.value.length > 0) {
      deps.store.append(workshopStream(workshopId), rows.length - 1, storedOps(decided.value))
    }
    return context.json({ ok: true as const }, 200)
  })
