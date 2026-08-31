import type { EventStore } from '~/plumbing/event-store/port.ts'
import type { SessionIndexDb } from '~/session-facilitation/api.ts'

/** What the readable-account query slice needs from the composition root. */
export interface ReadableAccountDeps {
  store: EventStore
  db: SessionIndexDb
}
