import type { WorkshopId } from '~/plumbing/ids.ts'
import type { StoredOperationInput } from '~/plumbing/event-store/port.ts'

/**
 * The `session-facilitation` event-stream keys (ADR-003 namespacing) and the
 * one place the stored-op schema version is stamped. Shared by every capability
 * handler — capabilities never import one another (AD-024).
 */

const SF_EVENT_VERSION = 1

export const workshopStream = (id: WorkshopId) => ({
  context: 'session-facilitation',
  aggregate: 'workshop',
  id,
})

/** Map decided events to the store's input shape, stamping the schema version. */
export const storedOps = (events: { at: string }[]): StoredOperationInput[] =>
  events.map((operation) => ({ at: operation.at, opVersion: SF_EVENT_VERSION, operation }))
