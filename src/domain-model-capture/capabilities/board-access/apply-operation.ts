import type { BuildingBlockId, WorkshopId } from '~/plumbing/ids.ts'
import { ok, type Result } from '~/plumbing/result.ts'
import { decide } from '../../domain/board/decide.ts'
import type { Rejection } from '../../domain/board/model.ts'
import { replayWriteModel } from '../../domain/board/replay.ts'
import { Operation, OP_SCHEMA_VERSION } from '../../domain/schema/index.ts'
import { type BoardAccessDeps, boardStream } from './deps.ts'

const MAX_RETRIES = 8

export interface ApplyResult {
  resultingBuildingBlockId: BuildingBlockId
  nextPosition: number
}

/**
 * The sole writer of a workshop's board stream. It takes **no**
 * `expectedPosition` — it reads the current position itself, `decide`s, appends,
 * and retries internally on `stale-position` (a transient two-accepts race).
 * Only a merits `Rejection` (`duplicate-id`, `unknown-target`, cycle) reaches the
 * caller.
 */
export const applyOperation = (
  deps: BoardAccessDeps,
  workshopId: WorkshopId,
  operation: Operation,
): Result<ApplyResult, Rejection> => {
  const stream = boardStream(workshopId)

  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    const rows = deps.store.read(stream)
    const log = rows.map((r) => Operation.parse(r.operation))
    const position = rows.length - 1

    const decided = decide(replayWriteModel(log), operation)
    if (!decided.ok) return decided

    const appended = deps.store.append(
      stream,
      position,
      decided.value.map((op) => ({
        at: deps.clock(),
        opVersion: OP_SCHEMA_VERSION,
        operation: op,
      })),
    )

    if (appended.ok) {
      const resultingBuildingBlockId = (operation as { id?: BuildingBlockId }).id
      if (resultingBuildingBlockId === undefined) {
        throw new Error(`applyOperation: ${operation.kind} produced no building block id`)
      }
      return ok({ resultingBuildingBlockId, nextPosition: appended.value.nextPosition })
    }
  }

  throw new Error('applyOperation: exceeded stale-position retry budget')
}
