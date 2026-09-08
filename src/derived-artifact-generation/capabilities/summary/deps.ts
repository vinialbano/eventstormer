import type { Clock } from '~/plumbing/clock.ts'
import type { EventStore } from '~/plumbing/event-store/port.ts'
import type { SessionIndexDb } from '~/session-facilitation/api.ts'

/** What the summary query slice needs from the composition root. */
export interface SummaryDeps {
  store: EventStore
  db: SessionIndexDb
  clock: Clock
}
