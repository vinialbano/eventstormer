import type { Clock } from '~/plumbing/clock.ts'
import type { EventStore } from '~/plumbing/event-store/port.ts'

/** What `start-workshop` needs from the composition root. */
export interface StartWorkshopDeps {
  store: EventStore
  clock: Clock
}
