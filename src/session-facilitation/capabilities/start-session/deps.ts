import type { Clock } from '~/plumbing/clock.ts'
import type { EventStore } from '~/plumbing/event-store/port.ts'
import type { SessionIndexDb } from '../../infrastructure/session-index.ts'

/** What `start-session` needs — the event store, the `session_index` DB handle, and the clock. */
export interface StartSessionDeps {
  store: EventStore
  db: SessionIndexDb
  clock: Clock
}
