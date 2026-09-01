import type { Operation } from '../schema/index.ts'
import type { BoardSnapshot, BuildingBlockKind } from './model.ts'

const CAPTURE_BLOCK_KIND: Record<
  'capture-domain-event' | 'identify-actor' | 'identify-system',
  BuildingBlockKind
> = {
  'capture-domain-event': 'domain-event',
  'identify-actor': 'actor',
  'identify-system': 'system',
}

/**
 * The read-model fold — pure, returns a new snapshot, never mutates its
 * argument. Folds capture (adds a backlog block with its label and provenance),
 * reword (new label, same id, no dedup), withdraw / reinstate (flip `withdrawn`).
 * Every operation advances `position` by one, whatever its kind.
 *
 * A reinstated block is naked — shaped exactly like a freshly captured one
 * (AT-17); in Slice 0 there are no relations to restore, so it is just
 * `withdrawn: false`.
 */
export const project = (snapshot: BoardSnapshot, op: Operation): BoardSnapshot => {
  const blocks = new Map(snapshot.blocks)
  const position = snapshot.position + 1

  if (
    op.kind === 'capture-domain-event' ||
    op.kind === 'identify-actor' ||
    op.kind === 'identify-system'
  ) {
    blocks.set(op.id, {
      kind: CAPTURE_BLOCK_KIND[op.kind],
      label: op.label,
      withdrawn: false,
      placement: 'backlog',
      pivotal: false,
      provenance: op.author,
    })
  } else if (op.kind === 'reword') {
    const block = blocks.get(op.target)
    if (block) blocks.set(op.target, { ...block, label: op.label })
  } else if (op.kind === 'withdraw') {
    const block = blocks.get(op.target)
    if (block) blocks.set(op.target, { ...block, withdrawn: true })
  } else if (op.kind === 'reinstate') {
    const block = blocks.get(op.target)
    if (block) blocks.set(op.target, { ...block, withdrawn: false })
  }

  return { blocks, follows: snapshot.follows, causedBy: snapshot.causedBy, position }
}
