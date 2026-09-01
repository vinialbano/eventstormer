import type { Clock } from '~/plumbing/clock.ts'
import type { EventStore } from '~/plumbing/event-store/port.ts'

/**
 * Store + clock for every board read or write in this context. Defined here so
 * `edit-model`, `board-access`, and `applyOperation` share one type without a
 * capability importing another, and without infrastructure importing a slice.
 */
export interface BoardIo {
  store: EventStore
  clock: Clock
}
