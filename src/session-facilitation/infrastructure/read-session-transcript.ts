import { readBoardSnapshot } from '../../domain-model-capture/api.ts'
import type { EventStore } from '~/plumbing/event-store/port.ts'
import type { ProposalId, SessionId, WorkshopId } from '~/plumbing/ids.ts'
import { err, ok, type Result } from '~/plumbing/result.ts'
import { sessionProposalIds } from '../domain/read-models/session-summary.ts'
import { sessionTranscript } from '../domain/read-models/session-transcript.ts'
import type { SessionTranscript } from '../domain/read-models/session-transcript-contract.ts'
import { ProposalEvent, SessionEvent, WorkshopEvent } from '../domain/schema/events.ts'
import { sessionIdsFor, type SessionIndexDb } from './session-index.ts'
import { proposalStream, sessionStream, workshopStream } from './streams.ts'

interface ReadSessionTranscriptDeps {
  store: EventStore
  db: SessionIndexDb
}

interface TranscriptError {
  kind: 'workshop-not-found' | 'session-not-found'
}

/**
 * Load the workshop, the one named session, and every `Proposal` stream it
 * spawned, then fold them into the versioned `SessionTranscript`. An empty
 * workshop stream is `workshop-not-found`; a session id the workshop's
 * `session_index` does not list is `session-not-found`.
 */
export const readSessionTranscript = (
  deps: ReadSessionTranscriptDeps,
  workshopId: WorkshopId,
  sessionId: SessionId,
): Result<SessionTranscript, TranscriptError> => {
  const workshopEvents = deps.store
    .read(workshopStream(workshopId))
    .map((row) => WorkshopEvent.parse(row.operation))
  if (workshopEvents.length === 0) return err({ kind: 'workshop-not-found' })

  const { open, closed } = sessionIdsFor(deps.db, workshopId)
  const known = open === undefined ? closed : [...closed, open]
  if (!known.includes(sessionId)) return err({ kind: 'session-not-found' })

  const sessionEvents = deps.store
    .read(sessionStream(sessionId))
    .map((row) => SessionEvent.parse(row.operation))
  const streams = sessionProposalIds(sessionEvents).map((proposalId: ProposalId) => ({
    proposalId,
    events: deps.store.read(proposalStream(proposalId)).map((row) => ProposalEvent.parse(row.operation)),
  }))

  const lastScope = workshopEvents.findLast(
    (event): event is Extract<WorkshopEvent, { type: 'Scope Set' }> => event.type === 'Scope Set',
  )
  const scope = lastScope?.statement ?? null
  const labels = new Map(readBoardSnapshot(deps, workshopId).blocks.map((block) => [block.id, block.label]))

  return ok(
    sessionTranscript(sessionEvents, streams, {
      scope,
      resolveLabel: (id) => labels.get(id),
    }),
  )
}
