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
})

/**
 * The write-model fold — pure, returns a new struct, never mutates its
 * argument. Capture / withdraw / reinstate update `blocks`; `reword` and
 * operations this fold does not handle leave it unchanged.
 */
export const evolve = (writeModel: BoardWriteModel, op: Operation): BoardWriteModel => {
  const next = cloneWriteModel(writeModel)

  if (op.kind === 'capture-domain-event') {
    next.blocks.set(op.id, { kind: 'domain-event', withdrawn: false })
  } else if (op.kind === 'identify-actor') {
    next.blocks.set(op.id, { kind: 'actor', withdrawn: false })
  } else if (op.kind === 'identify-system') {
    next.blocks.set(op.id, { kind: 'system', withdrawn: false })
  } else if (op.kind === 'withdraw') {
    const block = next.blocks.get(op.target)
    if (block) next.blocks.set(op.target, { ...block, withdrawn: true })
  } else if (op.kind === 'reinstate') {
    const block = next.blocks.get(op.target)
    if (block) next.blocks.set(op.target, { ...block, withdrawn: false })
  }

  return next
}
