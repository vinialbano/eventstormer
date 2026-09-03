import type { Clock } from '~/plumbing/clock.ts'
import type { EventStore } from '~/plumbing/event-store/port.ts'
import type { ContributionId, SessionId } from '~/plumbing/ids.ts'
import type { Facilitator } from '../../infrastructure/facilitator/port.ts'
import type { TrackIdMint } from '../../infrastructure/facilitator/map.ts'
import type { DerivedTrackDb } from '../../infrastructure/derived-track.ts'
import type { HotSpotSweepDb } from '../../infrastructure/hot-spot-sweep.ts'
import type { SessionIndexDb } from '../../infrastructure/session-index.ts'

/**
 * The one-interpretation-in-flight-per-session guard. Owned by `host/`,
 * injected here so the tick functions can be driven directly in tests with a
 * fresh guard and no timers. `contributions()` feeds `sessionView`'s
 * `interpreting` sub-state.
 */
export interface InFlightGuard {
  sessions(): ReadonlySet<SessionId>
  contributions(): ReadonlySet<ContributionId>
  mark(sessionId: SessionId, contributionId: ContributionId): void
  clear(sessionId: SessionId): void
}

/** What the interpretation tick functions need from the composition root. */
export interface InterpretContributionDeps {
  store: EventStore
  db: SessionIndexDb & DerivedTrackDb & HotSpotSweepDb
  clock: Clock
  facilitator: Facilitator
  inFlight: InFlightGuard
  mint: TrackIdMint
}
