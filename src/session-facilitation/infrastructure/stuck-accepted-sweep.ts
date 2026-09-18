import type { Clock } from '~/plumbing/clock.ts'
import type { EventStore } from '~/plumbing/event-store/port.ts'
import type { SessionId } from '~/plumbing/ids.ts'
import { acceptProposal } from '../capabilities/review-proposal/accept.ts'
import { acceptResolution } from '../capabilities/review-resolution/accept.ts'
import { sessionProposalIds } from '../domain/read-models/session-summary.ts'
import { sessionResolutionIds } from '../domain/read-models/resolutions-view.ts'
import { replay as replayProposal } from '../domain/proposal/replay.ts'
import { replay as replayResolution } from '../domain/resolution/replay.ts'
import { ProposalEvent, ResolutionEvent, SessionEvent } from '../domain/schema/events.ts'
import { proposalStream, resolutionStream, sessionStream } from './streams.ts'

export interface StuckAcceptedSweepDeps {
  store: EventStore
  clock: Clock
}

/**
 * Re-drive any `Proposal` / `Resolution` left `ACCEPTED` with no later
 * apply-outcome event — the crash window between the board append and the
 * outcome append, closed by a reconciliation pass instead of only a human
 * re-accept. Calls `acceptProposal` / `acceptResolution` unchanged, so the
 * re-drive is the same idempotent chain a human re-clicking "accept" already
 * runs today.
 *
 * Runs from `reconcilePendingDerivations`'s open-sessions-only loop and
 * inherits that bound for free — this function is never called for a closed
 * session by that caller. If the session closes between the loop's read and
 * this call landing, `acceptProposal` / `acceptResolution`'s own
 * `session-closed` guard fires and appends nothing: the stream is left
 * `ACCEPTED` for a session that will never reopen. That is a documented
 * accepted gap, not a bug — there is no later open-session pass to re-drive it.
 */
export const sweepStuckAccepted = (deps: StuckAcceptedSweepDeps, sessionId: SessionId): void => {
  const sessionEvents = deps.store
    .read(sessionStream(sessionId))
    .map((row) => SessionEvent.parse(row.operation))

  for (const proposalId of sessionProposalIds(sessionEvents)) {
    const events = deps.store
      .read(proposalStream(proposalId))
      .map((row) => ProposalEvent.parse(row.operation))
    if (replayProposal(events).disposition !== 'ACCEPTED') continue

    console.info(`stuck-accepted-sweep: re-driving proposal ${proposalId}`)
    acceptProposal(deps, proposalId)

    const after = deps.store
      .read(proposalStream(proposalId))
      .map((row) => ProposalEvent.parse(row.operation))
    if (replayProposal(after).disposition === 'ACCEPTED') {
      console.warn(`stuck-accepted-sweep: proposal ${proposalId} still ACCEPTED after re-drive`)
    }
  }

  for (const resolutionId of sessionResolutionIds(sessionEvents)) {
    const events = deps.store
      .read(resolutionStream(resolutionId))
      .map((row) => ResolutionEvent.parse(row.operation))
    if (replayResolution(events).disposition !== 'ACCEPTED') continue

    console.info(`stuck-accepted-sweep: re-driving resolution ${resolutionId}`)
    acceptResolution(deps, resolutionId)

    const after = deps.store
      .read(resolutionStream(resolutionId))
      .map((row) => ResolutionEvent.parse(row.operation))
    if (replayResolution(after).disposition === 'ACCEPTED') {
      console.warn(`stuck-accepted-sweep: resolution ${resolutionId} still ACCEPTED after re-drive`)
    }
  }
}
