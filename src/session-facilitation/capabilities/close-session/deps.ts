import type { Clock } from '~/plumbing/clock.ts'
import type { EventStore } from '~/plumbing/event-store/port.ts'
import type { HotSpotSweepDb } from '../../infrastructure/hot-spot-sweep.ts'
import type { SessionIndexDb } from '../../infrastructure/session-index.ts'

/**
 * What `close-session` needs — the event store, the `session_index` +
 * `hot_spot_sweep` handles, the clock. `finishClose` runs the hot-spot close
 * sweep, so the DB handle carries both marker tables.
 */
export interface CloseSessionDeps {
  store: EventStore
  db: SessionIndexDb & HotSpotSweepDb
  clock: Clock
}
