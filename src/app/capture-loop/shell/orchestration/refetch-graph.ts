import { CAPTURE_ZONE_EVENTS, type CaptureZoneEvent, type RefetchTarget } from './zone-events.ts'

export const REFETCH_BY_ZONE_EVENT: Readonly<
  Record<CaptureZoneEvent, readonly RefetchTarget[]>
> = {
  mutated: ['session', 'proposals'],
  'board-dirty': ['board', 'account'],
} as const

/** Every declared zone event has a refetch mapping. */
export const ZONE_EVENTS = CAPTURE_ZONE_EVENTS

export const refetchTargetsFor = (event: CaptureZoneEvent): readonly RefetchTarget[] =>
  REFETCH_BY_ZONE_EVENT[event]
