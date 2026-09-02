import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ProposalCard } from '../../../types.ts'
import * as proposalsTransport from '../../../transport/proposals.ts'
import * as sessionTransport from '../../../transport/session.ts'
import { useReviewProposal } from './use-review-proposal.ts'

afterEach(() => {
  vi.restoreAllMocks()
})

const card = (over: Partial<ProposalCard> = {}): ProposalCard => ({
  proposalId: 'p1',
  contributionId: 'c1',
  blockKind: 'domain-event',
  label: 'Order placed',
  bar: 'strict',
  disposition: 'PROPOSED',
  held: false,
  overflow: false,
  ...over,
})

const review = (over: { workshopId?: string; scopeStatement?: string | undefined } = {}) => {
  const mutated = vi.fn<() => void>()
  const boardDirty = vi.fn<() => void>()
  const hooks = useReviewProposal(
    () => over.workshopId ?? 'w1',
    () => over.scopeStatement,
    { mutated: () => { mutated() }, boardDirty: () => { boardDirty() } },
  )
  return { emit: { mutated, boardDirty }, hooks }
}

// Suite: use-review-proposal
// Invariant: Proposal review actions call transport once and emit the correct dock refetch signals.
// Boundary IN: accept/reject/edit/hold/unhold, cluster accept-all, and scope accept in the composable.
// Boundary OUT: HTTP client (transport unit tests), card button wiring (ProposalCard.test.ts), dock shell (FacilitatorDock.test.ts).

describe('useReviewProposal', () => {
  it('onAccept emits board-dirty and mutated after acceptProposal resolves', async () => {
    vi.spyOn(proposalsTransport, 'acceptProposal').mockResolvedValue({})
    const { emit, hooks } = review()

    await hooks.onAccept('p1')

    expect(proposalsTransport.acceptProposal).toHaveBeenCalledWith('p1')
    expect(emit.boardDirty).toHaveBeenCalledTimes(1)
    expect(emit.mutated).toHaveBeenCalledTimes(1)
  })

  it('onReject emits mutated only after rejectProposal resolves', async () => {
    vi.spyOn(proposalsTransport, 'rejectProposal').mockResolvedValue({})
    const { emit, hooks } = review()

    await hooks.onReject('p1')

    expect(proposalsTransport.rejectProposal).toHaveBeenCalledWith('p1')
    expect(emit.boardDirty).not.toHaveBeenCalled()
    expect(emit.mutated).toHaveBeenCalledTimes(1)
  })

  it('onHold and onUnhold call transport and emit mutated only', async () => {
    vi.spyOn(proposalsTransport, 'holdProposal').mockResolvedValue({})
    vi.spyOn(proposalsTransport, 'unholdProposal').mockResolvedValue({})
    const { emit, hooks } = review()

    await hooks.onHold('p1')
    await hooks.onUnhold('p2')

    expect(proposalsTransport.holdProposal).toHaveBeenCalledWith('p1')
    expect(proposalsTransport.unholdProposal).toHaveBeenCalledWith('p2')
    expect(emit.boardDirty).not.toHaveBeenCalled()
    expect(emit.mutated).toHaveBeenCalledTimes(2)
  })

  it('onEdit posts the trimmed label and emits mutated only', async () => {
    vi.spyOn(proposalsTransport, 'editProposal').mockResolvedValue({})
    const { emit, hooks } = review()

    await hooks.onEdit('p1', 'Invoice sent')

    expect(proposalsTransport.editProposal).toHaveBeenCalledWith('p1', 'Invoice sent')
    expect(emit.boardDirty).not.toHaveBeenCalled()
    expect(emit.mutated).toHaveBeenCalledTimes(1)
  })

  it('onAcceptAllCluster accepts only acceptable cards and emits board-dirty once', async () => {
    const accept = vi.spyOn(proposalsTransport, 'acceptProposal').mockResolvedValue({})
    const { emit, hooks } = review()
    const cluster = [
      card({ proposalId: 'p1' }),
      card({ proposalId: 'p2', held: true }),
      card({ proposalId: 'p3', disposition: 'APPLIED' }),
      card({ proposalId: 'p4', disposition: 'EDITED' }),
    ]

    const acceptable = [cluster[0], cluster[3]].filter((item): item is ProposalCard => item !== undefined)
    await hooks.onAcceptAllCluster(cluster, acceptable)

    expect(accept.mock.calls.map((call) => call[0])).toEqual(['p1', 'p4'])
    expect(emit.boardDirty).toHaveBeenCalledTimes(1)
    expect(emit.mutated).toHaveBeenCalledTimes(1)
  })

  it('onAcceptAllRemaining accepts every awaiting card', async () => {
    const accept = vi.spyOn(proposalsTransport, 'acceptProposal').mockResolvedValue({})
    const { emit, hooks } = review()
    const awaiting = [card({ proposalId: 'p1' }), card({ proposalId: 'p2', label: 'B' })]

    await hooks.onAcceptAllRemaining(awaiting)

    expect(accept.mock.calls.map((call) => call[0])).toEqual(['p1', 'p2'])
    expect(emit.boardDirty).toHaveBeenCalledTimes(1)
    expect(emit.mutated).toHaveBeenCalledTimes(1)
  })

  it('onScopeAccept does nothing when the proposed statement is undefined', async () => {
    const setScope = vi.spyOn(sessionTransport, 'setScope')
    const { emit, hooks } = review({ scopeStatement: undefined })

    await hooks.onScopeAccept()

    expect(setScope).not.toHaveBeenCalled()
    expect(emit.boardDirty).not.toHaveBeenCalled()
    expect(emit.mutated).not.toHaveBeenCalled()
  })

  it('onScopeAccept posts scope and emits mutated when a statement exists', async () => {
    vi.spyOn(sessionTransport, 'setScope').mockResolvedValue({})
    const { emit, hooks } = review({ scopeStatement: 'Restaurant service, from seating to payment.' })

    await hooks.onScopeAccept()

    expect(sessionTransport.setScope).toHaveBeenCalledWith(
      'w1',
      'Restaurant service, from seating to payment.',
    )
    expect(emit.boardDirty).not.toHaveBeenCalled()
    expect(emit.mutated).toHaveBeenCalledTimes(1)
  })

  it('onScopeEdit posts scope and emits mutated', async () => {
    vi.spyOn(sessionTransport, 'setScope').mockResolvedValue({})
    const { emit, hooks } = review()

    await hooks.onScopeEdit('Edited scope statement.')

    expect(sessionTransport.setScope).toHaveBeenCalledWith('w1', 'Edited scope statement.')
    expect(emit.boardDirty).not.toHaveBeenCalled()
    expect(emit.mutated).toHaveBeenCalledTimes(1)
  })

  it('does not emit when acceptProposal rejects', async () => {
    vi.spyOn(proposalsTransport, 'acceptProposal').mockRejectedValue(new Error('network'))
    const { emit, hooks } = review()

    await expect(hooks.onAccept('p1')).rejects.toThrow('network')

    expect(emit.boardDirty).not.toHaveBeenCalled()
    expect(emit.mutated).not.toHaveBeenCalled()
  })

  it('does not emit when rejectProposal rejects', async () => {
    vi.spyOn(proposalsTransport, 'rejectProposal').mockRejectedValue(new Error('network'))
    const { emit, hooks } = review()

    await expect(hooks.onReject('p1')).rejects.toThrow('network')

    expect(emit.boardDirty).not.toHaveBeenCalled()
    expect(emit.mutated).not.toHaveBeenCalled()
  })
})
