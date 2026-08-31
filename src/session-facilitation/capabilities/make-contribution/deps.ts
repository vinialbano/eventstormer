import type { Clock } from '~/plumbing/clock.ts'
import type { EventStore } from '~/plumbing/event-store/port.ts'
import type { ContributionId } from '~/plumbing/ids.ts'
import type { DerivedTrackDb } from '../../infrastructure/derived-track.ts'
import type { SessionIndexDb } from '../../infrastructure/session-index.ts'

/** What `make-contribution` needs — including the read side (`GET /workshops/:id/session`). */
export interface MakeContributionDeps {
  store: EventStore
  db: SessionIndexDb & DerivedTrackDb
  clock: Clock
  /** A live view of the in-flight interpretation set (injected by `host/`). A
   * plain accessor, not the guard object — capabilities never import a sibling. */
  inFlight?: () => ReadonlySet<ContributionId>
}
