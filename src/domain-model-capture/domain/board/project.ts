import type { BuildingBlockId } from '~/plumbing/ids.ts'
import type { Operation } from '../schema/index.ts'
import type { BoardSnapshot, BuildingBlockKind, CausedByEdge, FollowsEdge, SnapshotBlock } from './model.ts'

const CAPTURE_BLOCK_KIND: Record<
  'capture-domain-event' | 'identify-actor' | 'identify-system',
  BuildingBlockKind
> = {
  'capture-domain-event': 'domain-event',
  'identify-actor': 'actor',
  'identify-system': 'system',
}

const patchBlock = (
  blocks: Map<BuildingBlockId, SnapshotBlock>,
  id: BuildingBlockId,
  patch: Partial<SnapshotBlock>,
): void => {
  const block = blocks.get(id)
  if (block) blocks.set(id, { ...block, ...patch })
}

const addFollows = (
  follows: FollowsEdge[],
  predecessor: BuildingBlockId,
  successor: BuildingBlockId,
): FollowsEdge[] =>
  follows.some((edge) => edge.predecessor === predecessor && edge.successor === successor)
    ? follows
    : [...follows, { predecessor, successor }]

const removeFollows = (
  follows: FollowsEdge[],
  predecessor: BuildingBlockId,
  successor: BuildingBlockId,
): FollowsEdge[] =>
  follows.filter((edge) => !(edge.predecessor === predecessor && edge.successor === successor))

const addCausedBy = (
  causedBy: CausedByEdge[],
  cause: BuildingBlockId,
  effect: BuildingBlockId,
): CausedByEdge[] =>
  causedBy.some((edge) => edge.cause === cause && edge.effect === effect)
    ? causedBy
    : [...causedBy, { cause, effect }]

const removeCausedBy = (
  causedBy: CausedByEdge[],
  cause: BuildingBlockId,
  effect: BuildingBlockId,
): CausedByEdge[] =>
  causedBy.filter((edge) => !(edge.cause === cause && edge.effect === effect))

const dropIncidentFollows = (follows: FollowsEdge[], id: BuildingBlockId): FollowsEdge[] =>
  follows.filter((edge) => edge.predecessor !== id && edge.successor !== id)

const dropIncidentCausedBy = (causedBy: CausedByEdge[], id: BuildingBlockId): CausedByEdge[] =>
  causedBy.filter((edge) => edge.cause !== id && edge.effect !== id)

const isLive = (blocks: Map<BuildingBlockId, SnapshotBlock>, id: BuildingBlockId): boolean =>
  blocks.get(id)?.withdrawn !== true

const countHotSpots = (blocks: Map<BuildingBlockId, SnapshotBlock>): number => {
  let count = 0
  for (const block of blocks.values()) {
    if (block.kind === 'hot-spot' && !block.withdrawn) count += 1
  }
  return count
}

const publishFollows = (
  follows: FollowsEdge[],
  blocks: Map<BuildingBlockId, SnapshotBlock>,
): FollowsEdge[] =>
  follows.filter((edge) => isLive(blocks, edge.predecessor) && isLive(blocks, edge.successor))

const publishCausedBy = (
  causedBy: CausedByEdge[],
  blocks: Map<BuildingBlockId, SnapshotBlock>,
): CausedByEdge[] =>
  causedBy.filter((edge) => isLive(blocks, edge.cause) && isLive(blocks, edge.effect))

/**
 * The read-model fold — pure, returns a new snapshot, never mutates its
 * argument. Capture adds a backlog block with its label and provenance; reword
 * writes a new label on the same id; withdraw / reinstate flip `withdrawn`.
 * Place, sequence, and insert-between put participating events on the timeline;
 * unplace returns an event to the backlog and drops its follows edges.
 * Mark / unmark pivotal flip that flag. Relation ops publish matching
 * `follows` / `causedBy` arrays, omitting withdrawn endpoints. Reinstate
 * returns a naked backlog block (`pivotal: false`). Every operation advances
 * `position` by one, whatever its kind.
 */
export const project = (snapshot: BoardSnapshot, op: Operation): BoardSnapshot => {
  const blocks = new Map(snapshot.blocks)
  let follows = [...snapshot.follows]
  let causedBy = [...snapshot.causedBy]
  const position = snapshot.position + 1

  switch (op.kind) {
    case 'capture-domain-event':
    case 'identify-actor':
    case 'identify-system':
      blocks.set(op.id, {
        kind: CAPTURE_BLOCK_KIND[op.kind],
        label: op.label,
        withdrawn: false,
        placement: 'backlog',
        pivotal: false,
        provenance: op.author,
      })
      break
    case 'reword':
      patchBlock(blocks, op.target, { label: op.label })
      break
    case 'withdraw':
      patchBlock(blocks, op.target, { withdrawn: true })
      follows = dropIncidentFollows(follows, op.target)
      causedBy = dropIncidentCausedBy(causedBy, op.target)
      break
    case 'reinstate': {
      const naked =
        blocks.get(op.target)?.kind === 'hot-spot'
          ? { annotates: null, resolved: false, reference: null }
          : {}
      patchBlock(blocks, op.target, {
        withdrawn: false,
        placement: 'backlog',
        pivotal: false,
        ...naked,
      })
      break
    }
    case 'place':
      patchBlock(blocks, op.target, { placement: 'timeline' })
      break
    case 'unplace':
      patchBlock(blocks, op.target, { placement: 'backlog' })
      follows = dropIncidentFollows(follows, op.target)
      break
    case 'sequence':
      follows = addFollows(follows, op.predecessor, op.successor)
      patchBlock(blocks, op.predecessor, { placement: 'timeline' })
      patchBlock(blocks, op.successor, { placement: 'timeline' })
      break
    case 'unsequence':
      follows = removeFollows(follows, op.predecessor, op.successor)
      break
    case 'insert-between':
      follows = removeFollows(follows, op.predecessor, op.successor)
      follows = addFollows(follows, op.predecessor, op.inserted)
      follows = addFollows(follows, op.inserted, op.successor)
      patchBlock(blocks, op.predecessor, { placement: 'timeline' })
      patchBlock(blocks, op.inserted, { placement: 'timeline' })
      patchBlock(blocks, op.successor, { placement: 'timeline' })
      break
    case 'link-cause':
      causedBy = addCausedBy(causedBy, op.cause, op.effect)
      break
    case 'unlink-cause':
      causedBy = removeCausedBy(causedBy, op.cause, op.effect)
      break
    case 'mark-pivotal':
      patchBlock(blocks, op.target, { pivotal: true })
      break
    case 'unmark-pivotal':
      patchBlock(blocks, op.target, { pivotal: false })
      break
    case 'raise-hot-spot':
      blocks.set(op.id, {
        kind: 'hot-spot',
        label: op.label,
        withdrawn: false,
        placement: 'backlog',
        pivotal: false,
        provenance: op.author,
        modelAffecting: op.modelAffecting,
        annotates: null,
        resolved: false,
        reference: null,
      })
      break
    case 'annotate':
      patchBlock(blocks, op.hotSpot, { annotates: op.target })
      break
    case 'unannotate':
      patchBlock(blocks, op.hotSpot, { annotates: null })
      break
    case 'resolve':
      patchBlock(blocks, op.target, { resolved: true, reference: op.reference })
      break
    case 'reopen':
      patchBlock(blocks, op.target, { resolved: false })
      break
  }

  return {
    blocks,
    follows: publishFollows(follows, blocks),
    causedBy: publishCausedBy(causedBy, blocks),
    hotSpotCount: countHotSpots(blocks),
    position,
  }
}
