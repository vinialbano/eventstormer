import { err, ok, type Result } from '~/plumbing/result.ts'
import { Operation } from '../schema/index.ts'
import type { BoardWriteModel, Rejection } from './model.ts'

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
export const decide = (wm: BoardWriteModel, op: Operation): Result<Operation[], Rejection> => {
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
      return wm.has(operation.id)
        ? err({ kind: 'duplicate-id', classification: 'systemic', id: operation.id })
        : ok([operation])

    case 'reword': {
      if (!wm.has(operation.target)) {
        return err({ kind: 'unknown-target', classification: 'systemic', target: operation.target })
      }
      if (operation.label.trim().length === 0) {
        return err({ kind: 'empty-label', classification: 'systemic', target: operation.target })
      }
      return ok([operation])
    }

    case 'withdraw':
      return wm.has(operation.target)
        ? ok([operation])
        : err({ kind: 'unknown-target', classification: 'systemic', target: operation.target })

    case 'reinstate': {
      const block = wm.get(operation.target)
      if (!block) {
        return err({ kind: 'unknown-target', classification: 'systemic', target: operation.target })
      }
      if (!block.withdrawn) {
        return err({ kind: 'not-withdrawn', classification: 'systemic', target: operation.target })
      }
      return ok([operation])
    }

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
