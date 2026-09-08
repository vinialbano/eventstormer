import type { Clock } from '~/plumbing/clock.ts'
import type { EventStore } from '~/plumbing/event-store/port.ts'
import type { SessionIndexDb } from '~/session-facilitation/api.ts'

/** What the model-export query slice needs from the composition root. */
export interface ModelExportDeps {
  store: EventStore
  db: SessionIndexDb
  clock: Clock
}
