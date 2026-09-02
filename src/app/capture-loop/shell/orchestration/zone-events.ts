export const CAPTURE_ZONE_EVENTS = ['mutated', 'board-dirty'] as const

export type CaptureZoneEvent = (typeof CAPTURE_ZONE_EVENTS)[number]

/** Read models that can be refetched (ADR-007 GET slices + account). */
export type RefetchTarget = 'session' | 'proposals' | 'board' | 'account'
