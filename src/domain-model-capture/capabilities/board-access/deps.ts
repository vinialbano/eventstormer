import type { Clock } from '~/plumbing/clock.ts'
import type { EventStore } from '~/plumbing/event-store/port.ts'
import type { WorkshopId } from '~/plumbing/ids.ts'

/** What `board-access` needs from the composition root. */
export interface BoardAccessDeps {
  store: EventStore
  clock: Clock
}

export const boardStream = (workshopId: WorkshopId) => ({
  context: 'domain-model-capture',
  aggregate: 'board',
  id: workshopId,
})
