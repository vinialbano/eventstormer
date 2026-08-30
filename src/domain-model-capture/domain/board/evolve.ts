import type { Operation } from '../schema/index.ts'
import type { BoardWriteModel } from './model.ts'

/**
 * The write-model fold — pure, returns a new map, never mutates its
 * argument. Slice 0's write model only tracks `{ kind, withdrawn }`, so only
 * capture / withdraw / reinstate change it; `reword` and the 14 not-yet-handled
 * operations leave it untouched. Slices 3–4 fold `follows` / `causedBy` here.
 */
export const evolve = (wm: BoardWriteModel, op: Operation): BoardWriteModel => {
  const next: BoardWriteModel = new Map(wm)

  if (op.kind === 'capture-domain-event') {
    next.set(op.id, { kind: 'domain-event', withdrawn: false })
  } else if (op.kind === 'identify-actor') {
    next.set(op.id, { kind: 'actor', withdrawn: false })
  } else if (op.kind === 'identify-system') {
    next.set(op.id, { kind: 'system', withdrawn: false })
  } else if (op.kind === 'withdraw') {
    const block = next.get(op.target)
    if (block) next.set(op.target, { ...block, withdrawn: true })
  } else if (op.kind === 'reinstate') {
    const block = next.get(op.target)
    if (block) next.set(op.target, { ...block, withdrawn: false })
  }

  return next
}
