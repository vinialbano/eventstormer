/**
 * Re-exports capture-loop transport for callers that still import from `dock/mutations`.
 * Prefer `../transport/*` directly.
 */
export {
  acceptProposal,
  editProposal,
  holdProposal,
  rejectProposal,
  unholdProposal,
} from '../transport/proposals.ts'
export { postBoardOperation, type BoardEdit } from '../transport/board.ts'
export { setScope, submitContribution } from '../transport/session.ts'
