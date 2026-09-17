import { getJson, postJson } from '../client.ts'
import type { ProposalCard } from '../types.ts'

export const fetchProposals = (sessionId: string): Promise<{ proposals: ProposalCard[] }> =>
  getJson<{ proposals: ProposalCard[] }>(`/api/sessions/${sessionId}/proposals`)

export const acceptProposal = (proposalId: string): Promise<unknown> =>
  postJson(`/api/proposals/${proposalId}/accept`)

export const editProposal = (proposalId: string, label: string): Promise<unknown> =>
  postJson(`/api/proposals/${proposalId}/edit`, { label })

/** A model-change proposal edit — a new reword label, or a relation endpoint swap
 * (`field` + the new block's current `label`, which the server resolves to an id).
 * The intent kind is fixed at birth and is never sent. */
export const editModelChangeProposal = (
  proposalId: string,
  changed: { newLabel?: string; field?: string; label?: string },
): Promise<unknown> => postJson(`/api/proposals/${proposalId}/edit`, changed)

export const rejectProposal = (proposalId: string): Promise<unknown> =>
  postJson(`/api/proposals/${proposalId}/reject`)

export const holdProposal = (proposalId: string): Promise<unknown> =>
  postJson(`/api/proposals/${proposalId}/hold`)

export const unholdProposal = (proposalId: string): Promise<unknown> =>
  postJson(`/api/proposals/${proposalId}/unhold`)
