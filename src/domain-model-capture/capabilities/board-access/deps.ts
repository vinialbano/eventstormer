import type { Clock } from '~/plumbing/clock.ts'
import type { EventStore } from '~/plumbing/event-store/port.ts'

/** What `board-access` needs from the composition root. */
export interface BoardAccessDeps {
  store: EventStore
  clock: Clock
}
