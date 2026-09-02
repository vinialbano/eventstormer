import type { BuildingBlockId } from '~/plumbing/ids.ts'
import type { Operation } from '../schema/index.ts'
import type { BoardWriteModel } from './model.ts'

const cloneAdjacency = (
  adjacency: Map<BuildingBlockId, Set<BuildingBlockId>>,
): Map<BuildingBlockId, Set<BuildingBlockId>> =>
  new Map([...adjacency].map(([id, related]) => [id, new Set(related)]))

const cloneWriteModel = (writeModel: BoardWriteModel): BoardWriteModel => ({
  blocks: new Map(writeModel.blocks),
  follows: cloneAdjacency(writeModel.follows),
  causedBy: cloneAdjacency(writeModel.causedBy),
  annotates: new Map(writeModel.annotates),
  hotSpotResolved: new Map(writeModel.hotSpotResolved),
})

const addEdge = (
  adjacency: Map<BuildingBlockId, Set<BuildingBlockId>>,
  from: BuildingBlockId,
  to: BuildingBlockId,
): void => {
  const existing = adjacency.get(from)
  if (existing) existing.add(to)
  else adjacency.set(from, new Set([to]))
}

const removeEdge = (
  adjacency: Map<BuildingBlockId, Set<BuildingBlockId>>,
  from: BuildingBlockId,
  to: BuildingBlockId,
): void => {
  const existing = adjacency.get(from)
  if (!existing) return
  existing.delete(to)
  if (existing.size === 0) adjacency.delete(from)
}

const dropIncident = (writeModel: BoardWriteModel, id: BuildingBlockId): void => {
  for (const [predecessor, successors] of [...writeModel.follows]) {
    if (predecessor === id) {
      writeModel.follows.delete(predecessor)
      continue
    }
    successors.delete(id)
    if (successors.size === 0) writeModel.follows.delete(predecessor)
  }
  for (const [effect, causes] of [...writeModel.causedBy]) {
    if (effect === id) {
      writeModel.causedBy.delete(effect)
      continue
    }
    causes.delete(id)
    if (causes.size === 0) writeModel.causedBy.delete(effect)
  }
}

/**
 * The write-model fold — pure, returns a new struct, never mutates its
 * argument. Capture / withdraw / reinstate update `blocks`; relation ops update
 * `follows` / `causedBy`; withdraw also drops every incident edge. Placement
 * and pivotal live on the snapshot fold, not here.
 */
export const evolve = (writeModel: BoardWriteModel, op: Operation): BoardWriteModel => {
  const next = cloneWriteModel(writeModel)

  switch (op.kind) {
    case 'capture-domain-event':
      next.blocks.set(op.id, { kind: 'domain-event', withdrawn: false })
      break
    case 'identify-actor':
      next.blocks.set(op.id, { kind: 'actor', withdrawn: false })
      break
    case 'identify-system':
      next.blocks.set(op.id, { kind: 'system', withdrawn: false })
      break
    case 'withdraw': {
      const block = next.blocks.get(op.target)
      if (block) next.blocks.set(op.target, { ...block, withdrawn: true })
      dropIncident(next, op.target)
      break
    }
    case 'reinstate': {
      const block = next.blocks.get(op.target)
      if (block) next.blocks.set(op.target, { ...block, withdrawn: false })
      break
    }
    case 'sequence':
      addEdge(next.follows, op.predecessor, op.successor)
      break
    case 'unsequence':
      removeEdge(next.follows, op.predecessor, op.successor)
      break
    case 'insert-between':
      removeEdge(next.follows, op.predecessor, op.successor)
      addEdge(next.follows, op.predecessor, op.inserted)
      addEdge(next.follows, op.inserted, op.successor)
      break
    case 'link-cause':
      addEdge(next.causedBy, op.effect, op.cause)
      break
    case 'unlink-cause':
      removeEdge(next.causedBy, op.effect, op.cause)
      break
    case 'reword':
    case 'raise-hot-spot':
    case 'place':
    case 'unplace':
    case 'annotate':
    case 'unannotate':
    case 'mark-pivotal':
    case 'unmark-pivotal':
    case 'resolve':
    case 'reopen':
      break
  }

  return next
}
