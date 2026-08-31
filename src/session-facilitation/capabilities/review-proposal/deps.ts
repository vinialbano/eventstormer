import type { Clock } from '~/plumbing/clock.ts'
import type { EventStore } from '~/plumbing/event-store/port.ts'

/** What `review-proposal` needs — the event store and the clock. The accept
 * chain additionally reaches `domain-model-capture` through its `api.ts`. */
export interface ReviewProposalDeps {
  store: EventStore
  clock: Clock
}
