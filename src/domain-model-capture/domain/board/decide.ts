import type { BuildingBlockId } from '~/plumbing/ids.ts'
import { err, ok, type Result } from '~/plumbing/result.ts'
import { Operation } from '../schema/index.ts'
import type { Author, BoardWriteModel, Rejection, WriteBlock } from './model.ts'

type OpOf<Kind extends Operation['kind']> = Extract<Operation, { kind: Kind }>
type Decision = Result<Operation[], Rejection>

const unknownTarget = (target: string): Decision =>
  err({ kind: 'unknown-target', classification: 'systemic', target })

const withdrawnTarget = (target: string): Decision =>
  err({ kind: 'withdrawn-target', classification: 'systemic', target })

const lookupActive = (
  writeModel: BoardWriteModel,
  target: BuildingBlockId,
): Result<WriteBlock, Rejection> => {
  const block = writeModel.blocks.get(target)
  if (!block) return err({ kind: 'unknown-target', classification: 'systemic', target })
  if (block.withdrawn) return err({ kind: 'withdrawn-target', classification: 'systemic', target })
  return ok(block)
}

const requireDomainEvent = (
  writeModel: BoardWriteModel,
  target: BuildingBlockId,
  operation: string,
  reason: string,
): Result<WriteBlock, Rejection> => {
  const block = lookupActive(writeModel, target)
  if (!block.ok) return block
  if (block.value.kind !== 'domain-event') {
    return err({
      kind: 'kind-permission',
      classification: 'systemic',
      operation,
      reason,
    })
  }
  return block
}

const requireActiveEvent = (
  writeModel: BoardWriteModel,
  target: BuildingBlockId,
  operation: string,
): Result<WriteBlock, Rejection> =>
  requireDomainEvent(
    writeModel,
    target,
    operation,
    'only a domain event may be placed or unplaced',
  )

const pathFromTo = (
  follows: Map<BuildingBlockId, Set<BuildingBlockId>>,
  from: BuildingBlockId,
  to: BuildingBlockId,
): BuildingBlockId[] | undefined => {
  if (from === to) return [from]
  const pending: BuildingBlockId[][] = [[from]]
  const seen = new Set<BuildingBlockId>([from])
  while (pending.length > 0) {
    const path = pending.shift()
    if (!path) break
    const last = path.at(-1)
    if (!last) break
    for (const next of follows.get(last) ?? []) {
      if (seen.has(next)) continue
      const extended = [...path, next]
      if (next === to) return extended
      seen.add(next)
      pending.push(extended)
    }
  }
  return undefined
}

const cyclePathIfAdded = (
  follows: Map<BuildingBlockId, Set<BuildingBlockId>>,
  predecessor: BuildingBlockId,
  successor: BuildingBlockId,
): BuildingBlockId[] | undefined => {
  const existing = pathFromTo(follows, successor, predecessor)
  if (!existing) return undefined
  return [predecessor, ...existing]
}

const incidentUnsequences = (
  writeModel: BoardWriteModel,
  target: BuildingBlockId,
  author: Author,
  schemaVersion: OpOf<'unsequence'>['v'],
): OpOf<'unsequence'>[] => {
  const collected: OpOf<'unsequence'>[] = []
  for (const [predecessor, successors] of writeModel.follows) {
    if (predecessor === target) {
      for (const successor of successors) {
        collected.push({
          kind: 'unsequence',
          predecessor,
          successor,
          author,
          v: schemaVersion,
        })
      }
      continue
    }
    if (successors.has(target)) {
      collected.push({
        kind: 'unsequence',
        predecessor,
        successor: target,
        author,
        v: schemaVersion,
      })
    }
  }
  return collected.toSorted((left, right) => {
    const byPredecessor = left.predecessor.localeCompare(right.predecessor)
    return byPredecessor === 0 ? left.successor.localeCompare(right.successor) : byPredecessor
  })
}

const decideReword = (writeModel: BoardWriteModel, operation: OpOf<'reword'>): Decision => {
  const block = writeModel.blocks.get(operation.target)
  if (!block) return unknownTarget(operation.target)
  if (block.withdrawn) return withdrawnTarget(operation.target)
  if (operation.label.trim().length === 0) {
    return err({ kind: 'empty-label', classification: 'systemic', target: operation.target })
  }
  return ok([operation])
}

const decideWithdraw = (writeModel: BoardWriteModel, operation: OpOf<'withdraw'>): Decision => {
  const block = writeModel.blocks.get(operation.target)
  if (!block) return unknownTarget(operation.target)
  if (block.withdrawn) {
    return err({ kind: 'already-withdrawn', classification: 'systemic', target: operation.target })
  }
  return ok([operation])
}

const decideReinstate = (writeModel: BoardWriteModel, operation: OpOf<'reinstate'>): Decision => {
  const block = writeModel.blocks.get(operation.target)
  if (!block) return unknownTarget(operation.target)
  if (!block.withdrawn) {
    return err({ kind: 'not-withdrawn', classification: 'systemic', target: operation.target })
  }
  return ok([operation])
}

const decidePlace = (writeModel: BoardWriteModel, operation: OpOf<'place'>): Decision => {
  const required = requireActiveEvent(writeModel, operation.target, operation.kind)
  if (!required.ok) return required
  return ok([operation])
}

const decideUnplace = (writeModel: BoardWriteModel, operation: OpOf<'unplace'>): Decision => {
  const required = requireActiveEvent(writeModel, operation.target, operation.kind)
  if (!required.ok) return required
  return ok([
    ...incidentUnsequences(writeModel, operation.target, operation.author, operation.v),
    operation,
  ])
}

const decideSequence = (writeModel: BoardWriteModel, operation: OpOf<'sequence'>): Decision => {
  const predecessor = requireDomainEvent(
    writeModel,
    operation.predecessor,
    operation.kind,
    'only domain events may be sequenced',
  )
  if (!predecessor.ok) return predecessor
  const successor = requireDomainEvent(
    writeModel,
    operation.successor,
    operation.kind,
    'only domain events may be sequenced',
  )
  if (!successor.ok) return successor
  if (writeModel.follows.get(operation.predecessor)?.has(operation.successor) === true) {
    return err({ kind: 'already-related', classification: 'systemic' })
  }
  const path = cyclePathIfAdded(writeModel.follows, operation.predecessor, operation.successor)
  if (path) return err({ kind: 'cycle', classification: 'systemic', path })
  return ok([operation])
}

const decideUnsequence = (writeModel: BoardWriteModel, operation: OpOf<'unsequence'>): Decision => {
  const predecessor = requireDomainEvent(
    writeModel,
    operation.predecessor,
    operation.kind,
    'only domain events may be sequenced',
  )
  if (!predecessor.ok) return predecessor
  const successor = requireDomainEvent(
    writeModel,
    operation.successor,
    operation.kind,
    'only domain events may be sequenced',
  )
  if (!successor.ok) return successor
  if (writeModel.follows.get(operation.predecessor)?.has(operation.successor) !== true) {
    return err({ kind: 'missing-edge', classification: 'systemic' })
  }
  return ok([operation])
}

const cloneFollows = (
  follows: Map<BuildingBlockId, Set<BuildingBlockId>>,
): Map<BuildingBlockId, Set<BuildingBlockId>> =>
  new Map([...follows].map(([id, related]) => [id, new Set(related)]))

const deleteFollowsEdge = (
  follows: Map<BuildingBlockId, Set<BuildingBlockId>>,
  predecessor: BuildingBlockId,
  successor: BuildingBlockId,
): void => {
  const successors = follows.get(predecessor)
  if (!successors) return
  successors.delete(successor)
  if (successors.size === 0) follows.delete(predecessor)
}

const addFollowsEdge = (
  follows: Map<BuildingBlockId, Set<BuildingBlockId>>,
  predecessor: BuildingBlockId,
  successor: BuildingBlockId,
): void => {
  const successors = follows.get(predecessor)
  if (successors) successors.add(successor)
  else follows.set(predecessor, new Set([successor]))
}

const insertBetweenCycle = (
  follows: Map<BuildingBlockId, Set<BuildingBlockId>>,
  predecessor: BuildingBlockId,
  inserted: BuildingBlockId,
  successor: BuildingBlockId,
): BuildingBlockId[] | undefined => {
  const reduced = cloneFollows(follows)
  deleteFollowsEdge(reduced, predecessor, successor)
  const viaInserted = cyclePathIfAdded(reduced, predecessor, inserted)
  if (viaInserted) return viaInserted
  addFollowsEdge(reduced, predecessor, inserted)
  return cyclePathIfAdded(reduced, inserted, successor)
}

const decideInsertBetween = (
  writeModel: BoardWriteModel,
  operation: OpOf<'insert-between'>,
): Decision => {
  const predecessor = requireDomainEvent(
    writeModel,
    operation.predecessor,
    operation.kind,
    'only domain events may be sequenced',
  )
  if (!predecessor.ok) return predecessor
  const inserted = requireDomainEvent(
    writeModel,
    operation.inserted,
    operation.kind,
    'only domain events may be sequenced',
  )
  if (!inserted.ok) return inserted
  const successor = requireDomainEvent(
    writeModel,
    operation.successor,
    operation.kind,
    'only domain events may be sequenced',
  )
  if (!successor.ok) return successor
  if (writeModel.follows.get(operation.predecessor)?.has(operation.successor) !== true) {
    return err({ kind: 'missing-edge', classification: 'systemic' })
  }
  const path = insertBetweenCycle(
    writeModel.follows,
    operation.predecessor,
    operation.inserted,
    operation.successor,
  )
  if (path) return err({ kind: 'cycle', classification: 'systemic', path })
  return ok([operation])
}

const isCauseKind = (kind: WriteBlock['kind']): boolean => kind === 'actor' || kind === 'system'

const decideLinkCause = (writeModel: BoardWriteModel, operation: OpOf<'link-cause'>): Decision => {
  const cause = lookupActive(writeModel, operation.cause)
  if (!cause.ok) return cause
  const effect = lookupActive(writeModel, operation.effect)
  if (!effect.ok) return effect
  if (!isCauseKind(cause.value.kind) || effect.value.kind !== 'domain-event') {
    return err({
      kind: 'kind-permission',
      classification: 'systemic',
      operation: operation.kind,
      reason: 'causedBy only links an actor or system to a domain event',
    })
  }
  if (writeModel.causedBy.get(operation.effect)?.has(operation.cause) === true) {
    return err({ kind: 'already-related', classification: 'systemic' })
  }
  return ok([operation])
}

const decideUnlinkCause = (
  writeModel: BoardWriteModel,
  operation: OpOf<'unlink-cause'>,
): Decision => {
  const cause = lookupActive(writeModel, operation.cause)
  if (!cause.ok) return cause
  const effect = lookupActive(writeModel, operation.effect)
  if (!effect.ok) return effect
  if (!isCauseKind(cause.value.kind) || effect.value.kind !== 'domain-event') {
    return err({
      kind: 'kind-permission',
      classification: 'systemic',
      operation: operation.kind,
      reason: 'causedBy only links an actor or system to a domain event',
    })
  }
  if (writeModel.causedBy.get(operation.effect)?.has(operation.cause) !== true) {
    return err({ kind: 'missing-edge', classification: 'systemic' })
  }
  return ok([operation])
}

const decideMarkPivotal = (
  writeModel: BoardWriteModel,
  operation: OpOf<'mark-pivotal'>,
): Decision => {
  const required = requireDomainEvent(
    writeModel,
    operation.target,
    operation.kind,
    'only a domain event may be marked pivotal',
  )
  if (!required.ok) return required
  return ok([operation])
}

const decideUnmarkPivotal = (
  writeModel: BoardWriteModel,
  operation: OpOf<'unmark-pivotal'>,
): Decision => {
  const required = requireDomainEvent(
    writeModel,
    operation.target,
    operation.kind,
    'only a domain event may be marked pivotal',
  )
  if (!required.ok) return required
  return ok([operation])
}

/**
 * The pure guard. Reads ONLY the slim write model — never
 * labels, placement, or provenance — and returns `ok(operations)` or
 * `err(rejection)`. No mutation, no I/O.
 *
 * On success it returns the parsed operation plus any cascade operations
 * (unplace severs incident follows first). The `switch` is exhaustive over
 * the frozen union — remaining kinds are rejected explicitly.
 */
export const decide = (writeModel: BoardWriteModel, op: Operation): Decision => {
  // Belt-and-suspenders re-parse: the append path parses before `decide`, but a
  // schema failure here is cheap to map and keeps `decide` self-contained.
  const parsed = Operation.safeParse(op)
  if (!parsed.success) {
    return err({ kind: 'schema', classification: 'systemic', issues: parsed.error.issues })
  }
  const operation = parsed.data

  switch (operation.kind) {
    case 'capture-domain-event':
    case 'identify-actor':
    case 'identify-system':
      return writeModel.blocks.has(operation.id)
        ? err({ kind: 'duplicate-id', classification: 'systemic', id: operation.id })
        : ok([operation])

    case 'reword':
      return decideReword(writeModel, operation)

    case 'withdraw':
      return decideWithdraw(writeModel, operation)

    case 'reinstate':
      return decideReinstate(writeModel, operation)

    case 'place':
      return decidePlace(writeModel, operation)

    case 'unplace':
      return decideUnplace(writeModel, operation)

    case 'sequence':
      return decideSequence(writeModel, operation)

    case 'unsequence':
      return decideUnsequence(writeModel, operation)

    case 'insert-between':
      return decideInsertBetween(writeModel, operation)

    case 'link-cause':
      return decideLinkCause(writeModel, operation)

    case 'unlink-cause':
      return decideUnlinkCause(writeModel, operation)

    case 'mark-pivotal':
      return decideMarkPivotal(writeModel, operation)

    case 'unmark-pivotal':
      return decideUnmarkPivotal(writeModel, operation)

    case 'raise-hot-spot':
    case 'annotate':
    case 'unannotate':
    case 'resolve':
    case 'reopen':
      return err({
        kind: 'not-implemented-in-slice',
        classification: 'systemic',
        operation: operation.kind,
      })
  }
}
