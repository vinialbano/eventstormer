import type { ProposalCard } from '../../../types.ts'
import {
  acceptProposal,
  editProposal,
  holdProposal,
  rejectProposal,
  unholdProposal,
} from '../../../transport/proposals.ts'
import { setScope } from '../../../transport/session.ts'

interface DockEmit {
  mutated: () => void
  boardDirty: () => void
}

/** Proposal review actions — accept, reject, edit, hold, cluster accept, and scope F05 card. */
export const useReviewProposal = (
  workshopId: () => string,
  scopeProposedStatement: () => string | undefined,
  emit: DockEmit,
) => {
  const run = async (work: Promise<unknown>, boardDirty = false): Promise<void> => {
    await work
    if (boardDirty) emit.boardDirty()
    emit.mutated()
  }

  const onAccept = (id: string): Promise<void> => run(acceptProposal(id), true)
  const onReject = (id: string): Promise<void> => run(rejectProposal(id))
  const onHold = (id: string): Promise<void> => run(holdProposal(id))
  const onUnhold = (id: string): Promise<void> => run(unholdProposal(id))
  const onEdit = (id: string, label: string): Promise<void> => run(editProposal(id, label))

  const acceptEvery = async (cards: ProposalCard[]): Promise<void> => {
    for (const card of cards) await acceptProposal(card.proposalId)
    emit.boardDirty()
    emit.mutated()
  }

  const onAcceptAllCluster = (_cards: ProposalCard[], acceptable: ProposalCard[]): Promise<void> =>
    acceptEvery(acceptable)

  const onAcceptAllRemaining = (awaiting: ProposalCard[]): Promise<void> => acceptEvery(awaiting)

  const onScopeAccept = (): Promise<void> => {
    const statement = scopeProposedStatement()
    return statement === undefined ? Promise.resolve() : run(setScope(workshopId(), statement))
  }
  const onScopeEdit = (statement: string): Promise<void> => run(setScope(workshopId(), statement))

  return {
    onAccept,
    onReject,
    onHold,
    onUnhold,
    onEdit,
    onAcceptAllCluster,
    onAcceptAllRemaining,
    onScopeAccept,
    onScopeEdit,
  }
}
