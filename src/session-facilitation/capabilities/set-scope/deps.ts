import type { Clock } from '~/plumbing/clock.ts'
import type { EventStore } from '~/plumbing/event-store/port.ts'

/** What `set-scope` needs — the store and clock, shared with `board-access`'s `readBuildingBlocks`. */
export interface SetScopeDeps {
  store: EventStore
  clock: Clock
}
