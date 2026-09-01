import { Hono } from 'hono'
import type { WorkshopId } from '~/plumbing/ids.ts'
import { Operation } from '../../domain/schema/index.ts'
import { applyOperation } from '../../infrastructure/apply-operation.ts'
import { boardStream } from '../../infrastructure/board-stream.ts'
import type { EditModelDeps } from './deps.ts'

const F06_KINDS = new Set([
  'reword',
  'withdraw',
  'reinstate',
  'place',
  'unplace',
  'sequence',
  'unsequence',
  'insert-between',
  'link-cause',
  'unlink-cause',
  'mark-pivotal',
  'unmark-pivotal',
])
const MAX_LABEL_LENGTH = 10_000

interface Rejected {
  status: 400 | 422
  body: { error: string; classification?: 'systemic' }
}

const trimLabel = (raw: Record<string, unknown>): Record<string, unknown> =>
  typeof raw.label === 'string' ? { ...raw, label: raw.label.trim() } : raw

const rejectLabel = (label: string): Rejected | undefined => {
  if (label.length === 0) {
    return { status: 422, body: { error: 'empty-label', classification: 'systemic' } }
  }
  if (label.length > MAX_LABEL_LENGTH) {
    return { status: 400, body: { error: 'label-too-long' } }
  }
  return undefined
}

const parseBody = (raw: unknown): { operation: Operation } | Rejected => {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { status: 400, body: { error: 'invalid-body' } }
  }
  const trimmed = trimLabel(raw as Record<string, unknown>)
  if (typeof trimmed.label === 'string') {
    const rejected = rejectLabel(trimmed.label)
    if (rejected !== undefined) return rejected
  }
  const parsed = Operation.safeParse(trimmed)
  if (!parsed.success) return { status: 400, body: { error: 'invalid-body' } }
  if (!F06_KINDS.has(parsed.data.kind)) {
    return { status: 422, body: { error: 'not-implemented-in-slice', classification: 'systemic' } }
  }
  return { operation: parsed.data }
}

/**
 * `POST /workshops/:id/board/operations` — reword, withdraw, reinstate, place,
 * sequence, insert-between, cause links, and pivotal marks. Hot-spot kinds
 * are 422; an empty board stream is 404. Label is trimmed before the
 * operation is parsed so a blank label is 422, not a schema 400.
 */
export const editModelRoutes = (deps: EditModelDeps) =>
  new Hono().post('/workshops/:id/board/operations', async (context) => {
    const parsed = parseBody(await context.req.json().catch(() => null))
    if ('status' in parsed) return context.json(parsed.body, parsed.status)

    const workshopId = context.req.param('id') as WorkshopId
    if (deps.store.read(boardStream(workshopId)).length === 0) {
      return context.json({ error: 'workshop not found' as const }, 404)
    }

    const applied = applyOperation(deps, workshopId, parsed.operation)
    if (!applied.ok) {
      return context.json(
        'path' in applied.error
          ? {
              error: applied.error.kind,
              classification: 'systemic' as const,
              path: applied.error.path,
            }
          : { error: applied.error.kind, classification: 'systemic' as const },
        422,
      )
    }
    return context.json({ position: applied.value.nextPosition })
  })
