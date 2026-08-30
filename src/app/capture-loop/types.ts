/**
 * Read-model shapes the capture screen consumes over HTTP. The SPA talks to
 * capabilities through `fetch` only (ADR-007) and never imports server code, so
 * the shapes `GET /workshops/:id/session`, `GET /sessions/:id/proposals`, and
 * `GET /workshops/:id/board` return are mirrored here by hand. A drift shows up
 * as a failing store test, not a silent type hole.
 */

export type InterpretationStatus =
  | 'pending'
  | 'interpreting'
  | 'interpreted'
  | 'derived'
  | 'failed'

export interface TranscriptTurn {
  kind: 'contribution' | 'question' | 'notice'
  speaker: string
  text: string
  at: string
  /** Present on `contribution` turns — proposal cards weld to the turn that produced them. */
  contributionId?: string
  /** Present on `question` turns — the `scope` question renders as an F05 card. */
  questionKind?: 'scope' | 'phase' | 'free'
}

export interface OpenQuestion {
  questionId: string
  kind: 'scope' | 'phase' | 'free'
  text: string
}

export interface SessionView {
  scope: { status: 'none' | 'proposed' | 'set'; proposedStatement?: string }
  transcript: TranscriptTurn[]
  openQuestions: OpenQuestion[]
  contributions: { contributionId: string; status: InterpretationStatus }[]
  /** True once every contribution is `derived` / `failed` — the poll-stop signal. */
  fullyDerived: boolean
}

export type BlockKind = 'domain-event' | 'actor' | 'system'
export type InterpretationBar = 'lenient' | 'strict'

export type Disposition =
  | 'PROPOSED'
  | 'EDITED'
  | 'ACCEPTED'
  | 'APPLIED'
  | 'APPLY_FAILED'
  | 'REJECTED'
  | 'LAPSED'

export interface ProposalCard {
  proposalId: string
  contributionId: string
  blockKind: BlockKind
  label: string
  bar: InterpretationBar
  disposition: Disposition
  held: boolean
  overflow: boolean
  applyFailedReason?: string
  buildingBlockId?: string
}

export interface BoardBlock {
  id: string
  kind: string
  label: string
  withdrawn: boolean
  placement: 'backlog'
}

export interface BoardSnapshot {
  position: number
  blocks: BoardBlock[]
}
