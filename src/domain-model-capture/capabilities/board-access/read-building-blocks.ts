import type { BuildingBlockId, WorkshopId } from '~/plumbing/ids.ts'
import type { BuildingBlockKind } from '../../domain/board/model.ts'
import { replay } from '../../domain/board/replay.ts'
import { Operation } from '../../domain/schema/index.ts'
import { type BoardAccessDeps, boardStream } from './deps.ts'

export interface BuildingBlockRow {
  id: BuildingBlockId
  kind: BuildingBlockKind
  label: string
}

/**
 * The minimal building-block list the facilitator prompt and the scope-lock
 * precondition (`.length === 0`) consume — the derived fact, not the internal
 * `BoardSnapshot` (data-boundaries).
 */
export const readBuildingBlocks = (
  deps: BoardAccessDeps,
  workshopId: WorkshopId,
): BuildingBlockRow[] => {
  const log = deps.store.read(boardStream(workshopId)).map((row) => Operation.parse(row.operation))
  const snapshot = replay(log)
  return [...snapshot.blocks].map(([id, block]) => ({ id, kind: block.kind, label: block.label }))
}
