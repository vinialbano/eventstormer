import { Hono } from 'hono'
import { z } from 'zod'
import { newContributionId } from '~/plumbing/ids.ts'
import type { SessionId, WorkshopId } from '~/plumbing/ids.ts'
import { readDerivedTrackKeys } from '../../infrastructure/derived-track.ts'
import { sessionIdsFor } from '../../infrastructure/session-index.ts'
import { sessionView } from '../../domain/read-models/session-view.ts'
import { SessionEvent, WorkshopEvent } from '../../domain/schema/events.ts'
import { decide } from '../../domain/session/decide.ts'
import { replay as replaySession } from '../../domain/session/replay.ts'
import { replay as replayWorkshop } from '../../domain/workshop/replay.ts'
import { sessionStream, storedOps, workshopStream } from '../../infrastructure/streams.ts'
import type { MakeContributionDeps } from './deps.ts'

const Body = z.object({ text: z.string() })

const readSession = (deps: MakeContributionDeps, id: SessionId): SessionEvent[] =>
  deps.store.read(sessionStream(id)).map((r) => SessionEvent.parse(r.operation))

const readWorkshop = (deps: MakeContributionDeps, id: WorkshopId): WorkshopEvent[] =>
  deps.store.read(workshopStream(id)).map((r) => WorkshopEvent.parse(r.operation))

const workshopIdOf = (events: SessionEvent[]): WorkshopId | undefined =>
  events.find((e) => e.type === 'Session Started')?.workshopId

/**
 * `POST /sessions/:id/contributions` — capture the expert's words.
 * Trim; a whitespace-only body is a no-op (no segment, no facilitator call, 204).
 * `Session.decide(Make Contribution)` rejects a closed session (409). The speaker
 * is the workshop's `creatorName` and `source` is always `typed`. Always `202` —
 * interpretation is async.
 *
 * `GET /workshops/:id/session` — the `sessionView` read model behind the poll.
 */
export const makeContributionRoutes = (deps: MakeContributionDeps) =>
  new Hono()
    .post('/sessions/:id/contributions', async (c) => {
      const sessionId = c.req.param('id') as SessionId
      const body = Body.safeParse(await c.req.json().catch(() => null))
      if (!body.success) return c.json({ error: 'invalid-body' as const }, 400)

      const text = body.data.text.trim()
      if (text.length === 0) return c.body(null, 204)

      const events = readSession(deps, sessionId)
      if (events.length === 0) return c.json({ error: 'unknown-session' as const }, 404)

      const workshopId = workshopIdOf(events)
      const speaker =
        (workshopId === undefined ? undefined : replayWorkshop(readWorkshop(deps, workshopId)).creatorName) ??
        'unknown'

      const contributionId = newContributionId()
      const decided = decide(replaySession(events), {
        type: 'Make Contribution',
        sessionId,
        contributionId,
        speaker,
        body: text,
        at: deps.clock(),
      })
      if (!decided.ok) {
        const status = decided.error.kind === 'session-closed' ? 409 : 400
        return c.json({ error: decided.error.kind }, status)
      }

      deps.store.append(sessionStream(sessionId), events.length - 1, storedOps(decided.value))
      return c.json({ contributionId }, 202)
    })
    .get('/workshops/:id/session', (c) => {
      const workshopId = c.req.param('id') as WorkshopId
      const workshopEvents = readWorkshop(deps, workshopId)
      // 404 is reserved for an unknown workshop. A known workshop with no
      // session yet is a normal state the capture screen shows a "start
      // session" affordance for — not an error.
      if (workshopEvents.length === 0) return c.json({ error: 'unknown-workshop' as const }, 404)

      const scopeIsSet = workshopEvents.some((e) => e.type === 'Scope Set')
      const creatorName = replayWorkshop(workshopEvents).creatorName
      const { open, closed } = sessionIdsFor(deps.db, workshopId)
      const sessionId = open ?? closed.at(-1)

      const base = { sessionOpen: open !== undefined, creatorName }
      if (sessionId === undefined) {
        return c.json({
          ...base,
          sessionId: null,
          scope: { status: scopeIsSet ? ('set' as const) : ('none' as const) },
          transcript: [],
          openQuestions: [],
          contributions: [],
          fullyDerived: true,
        })
      }

      const view = sessionView(readSession(deps, sessionId), {
        scopeIsSet,
        ...(deps.inFlight === undefined ? {} : { inFlight: deps.inFlight() }),
        derivedTracks: readDerivedTrackKeys(deps.db),
      })
      return c.json({ ...view, ...base, sessionId })
    })
