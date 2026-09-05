import type { SessionSummary } from './session-summary.ts'

/**
 * `facilitationContext` — assembled fresh each interpretation tick, never
 * persisted. A plain normalising assembly: recent transcript trimmed to
 * the last `RECENT_TRANSCRIPT` lines, everything else passed through.
 *
 * `facilitationAgenda` — derived, not stored: the open questions plus any
 * building block whose label reads like an un-expanded phase name (no
 * past-tense / gerund verb, ≤ 3 words). **No stakeholder-check input** — that is
 * F09; it is not assembled here.
 */

const RECENT_TRANSCRIPT = 20

/**
 * A board block as the facilitator context carries it. `placement` / `pivotal` /
 * `followedBy` / `causes` are present once the board has topology — they let the
 * model reference an existing endpoint pair when it proposes a relation.
 */
export interface FacilitationBlock {
  kind: string
  label: string
  placement?: 'backlog' | 'timeline'
  pivotal?: boolean
  /** Successor labels: events this one is directly followed by. */
  followedBy?: string[]
  /** Effect labels: events this one is a recorded cause of. */
  causes?: string[]
}

export interface FacilitationContextInput {
  recentTranscript: string[]
  openQuestions: string[]
  scopeStatement?: string
  priorSummaries: SessionSummary[]
  buildingBlocks: FacilitationBlock[]
  /** Count of events placed on the timeline — the "N events on the timeline" line. */
  timelineEventCount: number
}

export type FacilitationContext = Omit<FacilitationContextInput, 'recentTranscript'> & {
  recentTranscript: string[]
}

export const facilitationContext = (input: FacilitationContextInput): FacilitationContext => ({
  recentTranscript: input.recentTranscript.slice(-RECENT_TRANSCRIPT),
  openQuestions: input.openQuestions,
  ...(input.scopeStatement === undefined ? {} : { scopeStatement: input.scopeStatement }),
  priorSummaries: input.priorSummaries,
  buildingBlocks: input.buildingBlocks,
  timelineEventCount: input.timelineEventCount,
})

const looksLikePhaseName = (label: string): boolean => {
  const words = label.trim().split(/\s+/)
  return words.length <= 3 && !words.some((word) => /(ed|ing)$/i.test(word))
}

export const facilitationAgenda = (input: {
  openQuestions: string[]
  buildingBlocks: { kind: string; label: string }[]
}): string[] => [
  ...input.openQuestions,
  ...input.buildingBlocks.filter((block) => looksLikePhaseName(block.label)).map((block) => block.label),
]
