import { Hono } from 'hono'
import { newSessionId } from '~/plumbing/ids.ts'
import type { WorkshopId } from '~/plumbing/ids.ts'
import { decide } from '../../domain/session/decide.ts'
import { emptySession } from '../../domain/session/model.ts'
import { deleteRow, reserve, staleOpenRow } from '../../infrastructure/session-index.ts'
import { sessionStream, storedOps } from '../../infrastructure/streams.ts'
import type { StartSessionDeps } from './deps.ts'

/**
 * `POST /workshops/:id/sessions` — open the one session for a workshop.
 *
 * 1. recover a stale slot — a `session_index` row `open` but whose session
 *    stream never got `Session Started` (a crash between reserve and append):
 *    delete it (S1-67).
 * 2. `reserve` — the partial unique index `UNIQUE(workshop_id) WHERE status='open'`
 *    is the one-open-session guard; a genuine concurrent open loses the INSERT →
 *    409 (S1-04).
 * 3. `Session.decide(Start Session)` → append `Session Started`.
 */
export const startSessionRoutes = (deps: StartSessionDeps) =>
  new Hono().post('/workshops/:id/sessions', (c) => {
    const workshopId = c.req.param('id') as WorkshopId

    const stale = staleOpenRow(deps.db, deps.store, workshopId)
    if (stale !== undefined) deleteRow(deps.db, stale)

    const sessionId = newSessionId()
    const reserved = reserve(deps.db, workshopId, sessionId, deps.clock())
    if (!reserved.ok) return c.json({ error: 'session-already-open' as const }, 409)

    const decided = decide(emptySession(), {
      type: 'Start Session',
      sessionId,
      workshopId,
      at: deps.clock(),
    })
    if (!decided.ok) {
      deleteRow(deps.db, sessionId)
      return c.json({ error: decided.error.kind }, 400)
    }

    deps.store.append(sessionStream(sessionId), -1, storedOps(decided.value))
    return c.json({ sessionId }, 202)
  })
