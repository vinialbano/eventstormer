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

const requireActiveEvent = (
  writeModel: BoardWriteModel,
  target: BuildingBlockId,
  operation: string,
): Result<WriteBlock, Rejection> => {
  const block = writeModel.blocks.get(target)
  if (!block) return err({ kind: 'unknown-target', classification: 'systemic', target })
  if (block.withdrawn) return err({ kind: 'withdrawn-target', classification: 'systemic', target })
  if (block.kind !== 'domain-event') {
    return err({
      kind: 'kind-permission',
      classification: 'systemic',
      operation,
      reason: 'only a domain event may be placed or unplaced',
    })
  }
  return ok(block)
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

    case 'raise-hot-spot':
    case 'sequence':
    case 'unsequence':
    case 'insert-between':
    case 'link-cause':
    case 'unlink-cause':
    case 'annotate':
    case 'unannotate':
    case 'mark-pivotal':
    case 'unmark-pivotal':
    case 'resolve':
    case 'reopen':
      return err({
        kind: 'not-implemented-in-slice',
        classification: 'systemic',
        operation: operation.kind,
      })
  }
}
