/**
 * EventStorming building-block kind → the short pill label shown on a proposal
 * card and its pending-drawer row. Shared so the two never drift.
 */
const KIND_LABEL: Record<string, string> = {
  'domain-event': 'EVENT',
  actor: 'ACTOR',
  system: 'SYSTEM',
}

export const kindLabel = (blockKind: string): string => KIND_LABEL[blockKind] ?? blockKind
