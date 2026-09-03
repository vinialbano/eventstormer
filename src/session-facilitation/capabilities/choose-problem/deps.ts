import type { Clock } from '~/plumbing/clock.ts'
import type { EventStore } from '~/plumbing/event-store/port.ts'

/** What `choose-problem` needs — the event store and the clock. The handler
 * reads the board through `domain-model-capture`'s `api.ts` to check the chosen
 * hot spot is still open. */
export interface ChooseProblemDeps {
  store: EventStore
  clock: Clock
}
