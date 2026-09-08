import { Hono } from 'hono'
import type { SessionId, WorkshopId } from '~/plumbing/ids.ts'
import { readSessionTranscript } from '~/session-facilitation/api.ts'
import { renderTranscript } from '../../domain/render-transcript.ts'
import type { SessionTranscriptDeps } from './deps.ts'

/**
 * `GET /workshops/:id/sessions/:sessionId/artifacts/transcript` — the F19
 * verbatim session-transcript export. An unknown workshop is 404
 * `workshop-not-found`; a session id the workshop does not list is 404
 * `session-not-found`; a read failing mid-render is 500 with no partial body.
 * The renderer does zero derivation — every disposition and count is decided
 * in the versioned `SessionTranscript` contract that session-facilitation owns.
 */
export const sessionTranscriptRoutes = (deps: SessionTranscriptDeps) =>
  new Hono().get('/workshops/:id/sessions/:sessionId/artifacts/transcript', (context) => {
    try {
      const result = readSessionTranscript(
        { store: deps.store, db: deps.db },
        context.req.param('id') as WorkshopId,
        context.req.param('sessionId') as SessionId,
      )
      if (!result.ok) return context.json({ error: result.error.kind }, 404)
      const rendered = renderTranscript(result.value, deps.clock())
      return context.json({ position: rendered.position, markdown: rendered.markdown })
    } catch {
      return context.json({ error: 'transcript-render-failed' as const }, 500)
    }
  })
