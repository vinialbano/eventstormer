import { err, ok, type Result } from '~/plumbing/result.ts'
import { Operation } from '../schema/index.ts'
import type { BoardWriteModel, Rejection } from './model.ts'

type OpOf<Kind extends Operation['kind']> = Extract<Operation, { kind: Kind }>
type Decision = Result<Operation[], Rejection>

const unknownTarget = (target: string): Decision =>
  err({ kind: 'unknown-target', classification: 'systemic', target })

const decideReword = (writeModel: BoardWriteModel, operation: OpOf<'reword'>): Decision => {
  const block = writeModel.get(operation.target)
  if (!block) return unknownTarget(operation.target)
  if (block.withdrawn) {
    return err({ kind: 'withdrawn-target', classification: 'systemic', target: operation.target })
  }
  if (operation.label.trim().length === 0) {
    return err({ kind: 'empty-label', classification: 'systemic', target: operation.target })
  }
  return ok([operation])
}

const decideWithdraw = (writeModel: BoardWriteModel, operation: OpOf<'withdraw'>): Decision => {
  const block = writeModel.get(operation.target)
  if (!block) return unknownTarget(operation.target)
  if (block.withdrawn) {
    return err({ kind: 'already-withdrawn', classification: 'systemic', target: operation.target })
  }
  return ok([operation])
}

const decideReinstate = (writeModel: BoardWriteModel, operation: OpOf<'reinstate'>): Decision => {
  const block = writeModel.get(operation.target)
  if (!block) return unknownTarget(operation.target)
  if (!block.withdrawn) {
    return err({ kind: 'not-withdrawn', classification: 'systemic', target: operation.target })
  }
  return ok([operation])
}

/**
 * The pure guard. Reads ONLY the slim write model — never
 * labels, placement, or provenance — and returns `ok(operations)` or
 * `err(rejection)`. No mutation, no I/O.
 *
 * On success it returns the parsed operation(s). Slice 0 emits exactly `[op]`;
 * later slices append cascade operations here (canvas Policies).
 *
 * The `switch` is exhaustive over the frozen union — the 14 not-yet-implemented
 * kinds are rejected explicitly, never silently ignored.
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
      return writeModel.has(operation.id)
        ? err({ kind: 'duplicate-id', classification: 'systemic', id: operation.id })
        : ok([operation])

    case 'reword':
      return decideReword(writeModel, operation)

    case 'withdraw':
      return decideWithdraw(writeModel, operation)

    case 'reinstate':
      return decideReinstate(writeModel, operation)

    case 'raise-hot-spot':
    case 'place':
    case 'unplace':
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
      return err({ kind: 'not-implemented-in-slice', classification: 'systemic', operation: operation.kind })
  }
}
