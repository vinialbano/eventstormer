import { Hono } from 'hono'
import { z } from 'zod'
import { newBuildingBlockId } from '~/plumbing/ids.ts'
import type { BuildingBlockId, WorkshopId } from '~/plumbing/ids.ts'
import { Author, Operation } from '../../domain/schema/index.ts'
import type { Rejection } from '../../domain/board/model.ts'
import { replayWriteModel } from '../../domain/board/replay.ts'
import { applyOperation } from '../../infrastructure/apply-operation.ts'
import { boardStream } from '../../infrastructure/board-stream.ts'
import type { FlagHotSpotDeps } from './deps.ts'

const FlagBody = z.object({
  label: z.string().trim().min(1),
  modelAffecting: z.boolean().optional(),
  annotatesTargetId: z.string().min(1).optional(),
  author: Author,
})

const ReopenBody = z.object({ author: Author })

const log = (deps: FlagHotSpotDeps, workshopId: WorkshopId): Operation[] =>
  deps.store.read(boardStream(workshopId)).map((row) => Operation.parse(row.operation))

/**
 * Why the annotate target is checked here rather than left to `applyOperation`:
 * `raise-hot-spot` runs first, so a rejection on a following `annotate` would
 * leave the hot spot on the log — but a flag that names a bad target must leave
 * the log unchanged (F08). The check reuses the same write-model guards `decide`
 * applies; `decide` stays the authority for the operation that is written.
 */
const annotateTargetRejection = (
  operations: Operation[],
  targetId: BuildingBlockId,
): Rejection['kind'] | undefined => {
  const block = replayWriteModel(operations).blocks.get(targetId)
  if (block === undefined) return 'unknown-target'
  if (block.withdrawn) return 'withdrawn-target'
  if (block.kind === 'hot-spot') return 'kind-permission'
  return undefined
}

/**
 * `POST /workshops/:id/board/hot-spots` — the person flags a hot spot directly,
 * with no review step. Mints the `BuildingBlockId`, applies `raise-hot-spot`,
 * then `annotate` when `annotatesTargetId` is a live non-hot-spot block. A named
 * target that is unknown / withdrawn / another hot spot is rejected 422 and
 * nothing is written.
 *
 * `POST /workshops/:id/board/hot-spots/:blockId/reopen` — returns a resolved hot
 * spot to open (`reopen`).
 */
export const flagHotSpotRoutes = (deps: FlagHotSpotDeps) =>
  new Hono()
    .post('/workshops/:id/board/hot-spots', async (context) => {
      const body = FlagBody.safeParse(await context.req.json().catch(() => null))
      if (!body.success) return context.json({ error: 'invalid-body' as const }, 400)

      const workshopId = context.req.param('id') as WorkshopId
      const operations = log(deps, workshopId)
      if (operations.length === 0) {
        return context.json({ error: 'workshop not found' as const }, 404)
      }

      const targetId = body.data.annotatesTargetId as BuildingBlockId | undefined
      if (targetId !== undefined) {
        const rejected = annotateTargetRejection(operations, targetId)
        if (rejected !== undefined) {
          return context.json({ error: rejected, classification: 'systemic' as const }, 422)
        }
      }

      const hotSpotId = newBuildingBlockId()
      const raised = applyOperation(
        deps,
        workshopId,
        Operation.parse({
          kind: 'raise-hot-spot',
          id: hotSpotId,
          label: body.data.label,
          ...(body.data.modelAffecting === undefined
            ? {}
            : { modelAffecting: body.data.modelAffecting }),
          author: body.data.author,
        }),
      )
      if (!raised.ok) {
        return context.json({ error: raised.error.kind, classification: 'systemic' as const }, 422)
      }

      if (targetId !== undefined) {
        applyOperation(
          deps,
          workshopId,
          Operation.parse({
            kind: 'annotate',
            hotSpot: hotSpotId,
            target: targetId,
            author: body.data.author,
          }),
        )
      }

      return context.json({ hotSpotId, annotates: targetId ?? null }, 200)
    })
    .post('/workshops/:id/board/hot-spots/:blockId/reopen', async (context) => {
      const body = ReopenBody.safeParse(await context.req.json().catch(() => null))
      if (!body.success) return context.json({ error: 'invalid-body' as const }, 400)

      const workshopId = context.req.param('id') as WorkshopId
      const blockId = context.req.param('blockId') as BuildingBlockId
      if (log(deps, workshopId).length === 0) {
        return context.json({ error: 'workshop not found' as const }, 404)
      }

      const reopened = applyOperation(
        deps,
        workshopId,
        Operation.parse({ kind: 'reopen', target: blockId, author: body.data.author }),
      )
      if (!reopened.ok) {
        return context.json({ error: reopened.error.kind, classification: 'systemic' as const }, 422)
      }
      return context.json({ hotSpotId: blockId, resolved: false as const }, 200)
    })
