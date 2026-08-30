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
  const o = parsed.data

  switch (o.kind) {
    case 'capture-domain-event':
    case 'identify-actor':
    case 'identify-system':
      return wm.has(o.id)
        ? err({ kind: 'duplicate-id', classification: 'systemic', id: o.id })
        : ok([o])

    case 'reword': {
      if (!wm.has(o.target)) {
        return err({ kind: 'unknown-target', classification: 'systemic', target: o.target })
      }
      if (o.label.trim().length === 0) {
        return err({ kind: 'empty-label', classification: 'systemic', target: o.target })
      }
      return ok([o])
    }

    case 'withdraw':
      return wm.has(o.target)
        ? ok([o])
        : err({ kind: 'unknown-target', classification: 'systemic', target: o.target })

    case 'reinstate': {
      const block = wm.get(o.target)
      if (!block) {
        return err({ kind: 'unknown-target', classification: 'systemic', target: o.target })
      }
      if (!block.withdrawn) {
        return err({ kind: 'not-withdrawn', classification: 'systemic', target: o.target })
      }
      return ok([o])
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
      return err({ kind: 'not-implemented-in-slice', classification: 'systemic', operation: o.kind })
  }
}
