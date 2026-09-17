/**
 * EventStorming building-block kind — and model-change intent kind — → the short
 * pill label shown on a proposal card and its pending-drawer row. Shared so the
 * two never drift.
 */
const KIND_LABEL: Record<string, string> = {
  'domain-event': 'EVENT',
  actor: 'ACTOR',
  system: 'SYSTEM',
  relation: 'RELATION',
  pivotal: 'PIVOTAL',
  reword: 'REWORD',
}

export const kindLabel = (blockKind: string): string => KIND_LABEL[blockKind] ?? blockKind
