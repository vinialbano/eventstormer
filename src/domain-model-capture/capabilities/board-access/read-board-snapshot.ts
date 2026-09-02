import type { EventStore } from '~/plumbing/event-store/port.ts'
import type { BuildingBlockId, WorkshopId } from '~/plumbing/ids.ts'
import type { CausedByEdge, FollowsEdge, SnapshotBlock } from '../../domain/board/model.ts'
import { replay } from '../../domain/board/replay.ts'
import { Operation } from '../../domain/schema/index.ts'
import { boardStream } from '../../infrastructure/board-stream.ts'

export interface PublishedBoardSnapshot {
  position: number
  blocks: ({ id: BuildingBlockId } & SnapshotBlock)[]
  follows: FollowsEdge[]
  causedBy: CausedByEdge[]
}

/**
 * The board snapshot for derived artifacts — includes withdrawn blocks.
 * An empty log is `{ position: -1, blocks: [], follows: [], causedBy: [] }`,
 * not a missing workshop. Topology and per-block placement/pivotal travel
 * here; layout ranks do not.
 */
export const readBoardSnapshot = (
  deps: { store: EventStore },
  workshopId: WorkshopId,
): PublishedBoardSnapshot => {
  const log = deps.store.read(boardStream(workshopId)).map((row) => Operation.parse(row.operation))
  const snapshot = replay(log)
  return {
    position: snapshot.position,
    blocks: [...snapshot.blocks].map(([id, block]) => ({ id, ...block })),
    follows: [...snapshot.follows],
    causedBy: [...snapshot.causedBy],
  }
}
