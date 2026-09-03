import type { Clock } from '~/plumbing/clock.ts'
import type { EventStore } from '~/plumbing/event-store/port.ts'

/** What `review-resolution` needs — the event store and the clock. The accept
 * chain additionally reaches `domain-model-capture` through its `api.ts`. */
export interface ReviewResolutionDeps {
  store: EventStore
  clock: Clock
}
