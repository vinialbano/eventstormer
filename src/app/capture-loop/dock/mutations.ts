/**
 * Back-compat shim — re-exports capture-loop transport until #68 removes this file.
 * New code should import from `../transport/*` directly.
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
