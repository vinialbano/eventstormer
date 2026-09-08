import { byId } from './graph.ts'
import { quoteLine } from './render-readable-account.ts'

/**
 * `renderTranscript` — the F19 verbatim session-transcript artifact. **Pure
 * formatting**: every disposition, count, and resulting-block id is already
 * decided in the `SessionTranscript` read contract that `session-facilitation`
 * owns; this function does zero derivation, it only lays the contract out as
 * Markdown. Turns are reproduced in order, verbatim; a held-back track is a
 * `notice` turn that contributes to no count. The Contributions table is one
 * row per contributor (`speaker` ascending) with a "counts only, no judgement"
 * line. No language model, no external-toolchain claim.
 *
 * The input shape is declared locally — this `domain/` module imports
 * `plumbing/` only — and the capability seam binds the real `SessionTranscript`.
 */

interface TranscriptProposal {
  summary: string
  disposition: 'proposed' | 'edited' | 'accepted' | 'rejected' | 'applied' | 'apply-failed' | 'lapsed'
  resultingBuildingBlockId: string | null
}

interface TranscriptTurn {
  kind: 'contribution' | 'question' | 'notice'
  speaker: string
  text: string
  at: string
  proposals: TranscriptProposal[]
}

interface ContributorCount {
  speaker: string
  accepted: number
  edited: number
  rejected: number
}

interface Transcript {
  format: 'big-picture'
  scope: string | null
  position: number
  turns: TranscriptTurn[]
  contributorCounts: ContributorCount[]
}

const proposalLine = (proposal: TranscriptProposal): string => {
  const resulting =
    proposal.resultingBuildingBlockId === null
      ? ''
      : ` — resulting block ${proposal.resultingBuildingBlockId}`
  return `- Proposal: ${proposal.summary} — ${proposal.disposition}${resulting}`
}

const turnBlock = (turn: TranscriptTurn): string =>
  [
    `### ${turn.speaker} — ${turn.kind} (${turn.at})`,
    quoteLine(turn.text),
    ...turn.proposals.map(proposalLine),
  ].join('\n')

const contributionsTable = (counts: ContributorCount[]): string => {
  const header = [
    '## Contributions',
    'Counts only — no judgement is made about them.',
    '',
    '| Contributor | Accepted | Edited | Rejected |',
    '| --- | --- | --- | --- |',
  ]
  if (counts.length === 0) return [...header, '| _(no contributors)_ | | | |'].join('\n')
  const rows = [...counts]
    .toSorted((left, right) => byId(left.speaker, right.speaker))
    .map(
      (row) =>
        `| ${row.speaker} | ${String(row.accepted)} | ${String(row.edited)} | ${String(row.rejected)} |`,
    )
  return [...header, ...rows].join('\n')
}

export const renderTranscript = (
  transcript: Transcript,
  renderedAt: string,
): { markdown: string; position: number } => {
  const scope = transcript.scope ?? '(not set)'
  const turns =
    transcript.turns.length === 0
      ? '- (no turns recorded)'
      : transcript.turns.map(turnBlock).join('\n\n')
  const markdown = `# Session transcript
Format: Big Picture
Scope: ${scope}
Session-record position: ${String(transcript.position)}
Rendered at: ${renderedAt}

## Turns

${turns}

${contributionsTable(transcript.contributorCounts)}
`
  return { markdown, position: transcript.position }
}
