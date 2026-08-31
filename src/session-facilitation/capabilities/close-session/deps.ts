import type { Clock } from '~/plumbing/clock.ts'
import type { EventStore } from '~/plumbing/event-store/port.ts'
import type { SessionIndexDb } from '../../infrastructure/session-index.ts'

/** What `close-session` needs — the event store, the `session_index` handle, the clock. */
export interface CloseSessionDeps {
  store: EventStore
  db: SessionIndexDb
  clock: Clock
}
