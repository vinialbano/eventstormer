import type { CaptureZoneEvent, RefetchTarget } from './zone-events.ts'

export const REFETCH_BY_ZONE_EVENT: Readonly<
  Record<CaptureZoneEvent, readonly RefetchTarget[]>
> = {
  mutated: ['session', 'proposals'],
  'board-dirty': ['board', 'account'],
} as const

export const refetchTargetsFor = (event: CaptureZoneEvent): readonly RefetchTarget[] =>
  REFETCH_BY_ZONE_EVENT[event]
