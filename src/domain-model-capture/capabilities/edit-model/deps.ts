import type { Clock } from '~/plumbing/clock.ts'
import type { EventStore } from '~/plumbing/event-store/port.ts'

/** What `edit-model` needs from the composition root. */
export interface EditModelDeps {
  store: EventStore
  clock: Clock
}
