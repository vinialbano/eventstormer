import { readBoardSnapshot } from '../../domain-model-capture/api.ts'
import type { EventStore } from '~/plumbing/event-store/port.ts'
import type { ProposalId, SessionId, WorkshopId } from '~/plumbing/ids.ts'
import { err, ok, type Result } from '~/plumbing/result.ts'
import {
  artifactSource,
  type ArtifactSource,
  type BoardBlockView,
} from '../domain/read-models/artifact-source.ts'
import { sessionProposalIds } from '../domain/read-models/session-summary.ts'
import { ProposalEvent, SessionEvent, WorkshopEvent } from '../domain/schema/events.ts'
import { sessionIdsFor, type SessionIndexDb } from './session-index.ts'
import { proposalStream, sessionStream, workshopStream } from './streams.ts'

interface ReadArtifactSourceDeps {
  store: EventStore
  db: SessionIndexDb
}

interface ArtifactSourceError { kind: 'workshop-not-found' }

const parseWorkshop = (store: EventStore, workshopId: WorkshopId): WorkshopEvent[] =>
  store.read(workshopStream(workshopId)).map((row) => WorkshopEvent.parse(row.operation))

const parseSession = (store: EventStore, sessionId: SessionId): SessionEvent[] =>
  store.read(sessionStream(sessionId)).map((row) => SessionEvent.parse(row.operation))

const parseProposal = (store: EventStore, proposalId: ProposalId): ProposalEvent[] =>
  store.read(proposalStream(proposalId)).map((row) => ProposalEvent.parse(row.operation))

/**
 * The composite version stamp's session half — the total number of
 * session-record events across every session the workshop has held (mirrors how
 * `readArtifactSource` enumerates the session streams). `readSessionTranscript`
 * stamps one session's stream length; a derived workshop-wide artifact sums them.
 */
export const readSessionRecordPosition = (
  deps: { store: EventStore; db: SessionIndexDb },
  workshopId: WorkshopId,
): number => {
  const { open, closed } = sessionIdsFor(deps.db, workshopId)
  const sessionIds = open === undefined ? closed : [...closed, open]
  return sessionIds.reduce(
    (total, sessionId) => total + deps.store.read(sessionStream(sessionId)).length,
    0,
  )
}

/**
 * Load workshop, session, and proposal streams and fold them into quoted
 * evidence plus coverage inputs. An empty workshop stream is not-found;
 * a started workshop with no contributions is a known-empty source.
 */
export const readArtifactSource = (
  deps: ReadArtifactSourceDeps,
  workshopId: WorkshopId,
): Result<ArtifactSource, ArtifactSourceError> => {
  const workshopEvents = parseWorkshop(deps.store, workshopId)
  if (workshopEvents.length === 0) return err({ kind: 'workshop-not-found' })

  const { open, closed } = sessionIdsFor(deps.db, workshopId)
  const sessionIds = open === undefined ? closed : [...closed, open]

  const sessions = sessionIds.map((sessionId) => {
    const events = parseSession(deps.store, sessionId)
    const proposals = sessionProposalIds(events).map((proposalId) => parseProposal(deps.store, proposalId))
    return { events, proposals }
  })

  const boardBlocks: BoardBlockView[] = readBoardSnapshot(deps, workshopId).blocks.map((block) => ({
    id: block.id,
    kind: block.kind,
    label: block.label,
    withdrawn: block.withdrawn,
    resolved: block.resolved,
    modelAffecting: block.modelAffecting,
  }))

  return ok(artifactSource({ workshopEvents, boardBlocks, sessions }))
}
