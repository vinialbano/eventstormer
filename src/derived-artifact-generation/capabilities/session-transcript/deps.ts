import type { Clock } from '~/plumbing/clock.ts'
import type { EventStore } from '~/plumbing/event-store/port.ts'
import type { SessionIndexDb } from '~/session-facilitation/api.ts'

/** What the session-transcript query slice needs from the composition root. */
export interface SessionTranscriptDeps {
  store: EventStore
  db: SessionIndexDb
  clock: Clock
}
