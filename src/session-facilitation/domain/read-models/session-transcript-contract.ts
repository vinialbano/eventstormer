import { z } from 'zod'

/**
 * `SessionTranscript` — the explicit, versioned read contract behind the F19
 * verbatim session-transcript artifact. `session-facilitation` owns every
 * derivation here (disposition, resulting block, contributor counts); the
 * `derived-artifact-generation` renderer does **zero** derivation over it, so a
 * future change to the internal `Proposal` machine cannot silently ripple into a
 * DAG golden fixture without this schema changing too.
 */

const TranscriptProposal = z.object({
  summary: z.string(),
  disposition: z.enum([
    'proposed',
    'edited',
    'accepted',
    'rejected',
    'applied',
    'apply-failed',
    'lapsed',
  ]),
  resultingBuildingBlockId: z.string().nullable(),
})

const TranscriptTurn = z.object({
  kind: z.enum(['contribution', 'question', 'notice']),
  speaker: z.string(),
  text: z.string(),
  at: z.iso.datetime(),
  proposals: z.array(TranscriptProposal),
})

const ContributorCount = z.object({
  speaker: z.string(),
  accepted: z.number().int().nonnegative(),
  edited: z.number().int().nonnegative(),
  rejected: z.number().int().nonnegative(),
})

export const SessionTranscript = z.object({
  format: z.literal('big-picture'),
  scope: z.string().nullable(),
  /** The session-record length at render time — the stamp. */
  position: z.number().int().nonnegative(),
  turns: z.array(TranscriptTurn),
  /** One row per contributor, `speaker` ascending. */
  contributorCounts: z.array(ContributorCount),
})
export type SessionTranscript = z.infer<typeof SessionTranscript>
