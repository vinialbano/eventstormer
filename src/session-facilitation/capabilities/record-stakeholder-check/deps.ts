import type { Clock } from '~/plumbing/clock.ts'
import type { EventStore } from '~/plumbing/event-store/port.ts'

/** What `record-stakeholder-check` needs — the event store and the clock. */
export interface RecordStakeholderCheckDeps {
  store: EventStore
  clock: Clock
}
