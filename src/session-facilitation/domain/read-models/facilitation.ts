import type { SessionSummary } from './session-summary.ts'

/**
 * `facilitationContext` — assembled fresh each interpretation tick, never
 * persisted (#66). A plain normalising assembly: recent transcript trimmed to
 * the last `RECENT_TRANSCRIPT` lines, everything else passed through.
 *
 * `facilitationAgenda` — derived, not stored: the open questions plus any
 * building block whose label reads like an un-expanded phase name (no
 * past-tense / gerund verb, ≤ 3 words). **No stakeholder-check input** — that is
 * F09 / Slice 4.
 */

const RECENT_TRANSCRIPT = 20

export interface FacilitationContextInput {
  recentTranscript: string[]
  openQuestions: string[]
  scopeStatement?: string
  priorSummaries: SessionSummary[]
  buildingBlocks: { kind: string; label: string }[]
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
})

const looksLikePhaseName = (label: string): boolean => {
  const words = label.trim().split(/\s+/)
  return words.length <= 3 && !words.some((w) => /(ed|ing)$/i.test(w))
}

export const facilitationAgenda = (input: {
  openQuestions: string[]
  buildingBlocks: { kind: string; label: string }[]
}): string[] => [
  ...input.openQuestions,
  ...input.buildingBlocks.filter((b) => looksLikePhaseName(b.label)).map((b) => b.label),
]
