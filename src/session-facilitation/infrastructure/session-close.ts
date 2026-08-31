import type { Clock } from '~/plumbing/clock.ts'
import type { EventStore } from '~/plumbing/event-store/port.ts'
import type { SessionId } from '~/plumbing/ids.ts'
import { sessionProposalIds } from '../domain/read-models/session-summary.ts'
import { decide as decideProposal } from '../domain/proposal/decide.ts'
import { replay as replayProposal } from '../domain/proposal/replay.ts'
import { ProposalEvent, SessionEvent } from '../domain/schema/events.ts'
import { close as closeIndexRow, type SessionIndexDb } from './session-index.ts'
import { proposalStream, sessionStream, storedOps } from './streams.ts'

/**
 * The idempotent, self-healing tail of `Close Session` (design "close"): once
 * `Session Closed` is on the stream, flip the `session_index` row to `closed`
 * and lapse every non-terminal `Proposal` of the session — `PROPOSED` / `EDITED`
 * / held → `undisposed`, `APPLY_FAILED` → `apply-failed`, `ACCEPTED` in-flight
 * left to finish (the decider no-ops it). Every step is idempotent, so both the
 * `close-session` handler and `reconcilePendingDerivations` call this — a crash
 * mid-close is repaired on the next tick.
 */
export interface SessionCloseDeps {
  store: EventStore
  db: SessionIndexDb
  clock: Clock
}

export const finishClose = (deps: SessionCloseDeps, sessionId: SessionId): void => {
  const events = deps.store.read(sessionStream(sessionId)).map((row) => SessionEvent.parse(row.operation))
  const closed = events.find((event) => event.type === 'Session Closed')
  if (closed === undefined) return

  closeIndexRow(deps.db, sessionId, closed.at)

  for (const proposalId of sessionProposalIds(events)) {
    const rows = deps.store.read(proposalStream(proposalId))
    const writeModel = replayProposal(rows.map((row) => ProposalEvent.parse(row.operation)))
    if (!writeModel.born) continue

    const cause = writeModel.disposition === 'APPLY_FAILED' ? 'apply-failed' : 'undisposed'
    const decided = decideProposal(writeModel, {
      type: 'Lapse Proposal',
      proposalId,
      cause,
      at: closed.at,
    })
    if (decided.ok && decided.value.length > 0) {
      deps.store.append(proposalStream(proposalId), rows.length - 1, storedOps(decided.value))
    }
  }
}
