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

interface TranscriptTurn {
  kind: 'contribution' | 'question' | 'notice'
  speaker: string
  text: string
  at: string
  /** Present on `contribution` turns — proposal cards weld to the turn that produced them. */
  contributionId?: string
  /** Present on `question` turns — the `scope` question renders as an F05 card. */
  questionKind?: 'scope' | 'phase' | 'free'
}

interface OpenQuestion {
  questionId: string
  kind: 'scope' | 'phase' | 'free'
  text: string
}

export interface SessionView {
  /** The session the view is for, and whether it is still open — the read
   * model folds only the Session stream and knows neither. */
  sessionId: string | null
  sessionOpen: boolean
  creatorName: string
  scope: { status: 'none' | 'proposed' | 'set'; proposedStatement?: string }
  transcript: TranscriptTurn[]
  openQuestions: OpenQuestion[]
  contributions: { contributionId: string; status: InterpretationStatus }[]
  /** True once every contribution is `derived` / `failed` — the poll-stop signal. */
  fullyDerived: boolean
}

type BlockKind = 'domain-event' | 'actor' | 'system'
type InterpretationBar = 'lenient' | 'strict'

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

interface BoardBlock {
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
