import { Hono } from 'hono'
import { z } from 'zod'
import type { ResolutionId, SessionId } from '~/plumbing/ids.ts'
import { resolutionsView, sessionResolutionIds } from '../../domain/read-models/resolutions-view.ts'
import { decide } from '../../domain/resolution/decide.ts'
import type { ResolutionCommand } from '../../domain/resolution/model.ts'
import { replay } from '../../domain/resolution/replay.ts'
import { ResolutionEvent, SessionEvent } from '../../domain/schema/events.ts'
import { resolutionStream, sessionStream, storedOps } from '../../infrastructure/streams.ts'
import type { ReviewResolutionDeps } from './deps.ts'

const EditBody = z.object({ reference: z.string().min(1) })

const readResolution = (deps: ReviewResolutionDeps, id: ResolutionId): ResolutionEvent[] =>
  deps.store.read(resolutionStream(id)).map((row) => ResolutionEvent.parse(row.operation))

type Reviewed = Extract<ResolutionCommand, { type: 'Edit Resolution' | 'Reject Resolution' }>

const act = (deps: ReviewResolutionDeps, id: ResolutionId, command: Reviewed) => {
  const rows = deps.store.read(resolutionStream(id))
  if (rows.length === 0) return { status: 404 as const, error: 'unknown-resolution' as const }

  const decided = decide(replay(rows.map((row) => ResolutionEvent.parse(row.operation))), command)
  if (!decided.ok) {
    return { status: decided.error.kind === 'not-born' ? (404 as const) : (409 as const), error: decided.error.kind }
  }

  if (decided.value.length > 0) {
    deps.store.append(resolutionStream(id), rows.length - 1, storedOps(decided.value))
  }
  return { status: 200 as const, error: undefined }
}

/**
 * `POST /resolutions/:id/{edit,reject}` — one `Resolution.decide` each, appended
 * only when `decide` emits (an idempotent no-op skips the append). Edit after a
 * terminal disposition is 409.
 *
 * `GET /sessions/:id/resolutions` — this session's proposed + terminal
 * resolutions with disposition, reference, and the apply-bounce reason.
 */
export const reviewResolutionRoutes = (deps: ReviewResolutionDeps) =>
  new Hono()
    .post('/resolutions/:id/edit', async (context) => {
      const id = context.req.param('id') as ResolutionId
      const body = EditBody.safeParse(await context.req.json().catch(() => null))
      if (!body.success) return context.json({ error: 'invalid-body' as const }, 400)
      const outcome = act(deps, id, {
        type: 'Edit Resolution',
        resolutionId: id,
        reference: body.data.reference,
        at: deps.clock(),
      })
      return outcome.error === undefined
        ? context.json({ ok: true as const }, 200)
        : context.json({ error: outcome.error }, outcome.status)
    })
    .post('/resolutions/:id/reject', (context) => {
      const id = context.req.param('id') as ResolutionId
      const outcome = act(deps, id, { type: 'Reject Resolution', resolutionId: id, at: deps.clock() })
      return outcome.error === undefined
        ? context.json({ ok: true as const }, 200)
        : context.json({ error: outcome.error }, outcome.status)
    })
    .get('/sessions/:id/resolutions', (context) => {
      const sessionId = context.req.param('id') as SessionId
      const sessionEvents = deps.store
        .read(sessionStream(sessionId))
        .map((row) => SessionEvent.parse(row.operation))
      const streams = sessionResolutionIds(sessionEvents).map((resolutionId) => ({
        resolutionId,
        events: readResolution(deps, resolutionId),
      }))
      return context.json({ resolutions: resolutionsView(sessionEvents, streams) })
    })
