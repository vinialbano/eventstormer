import { getJson, postJson } from '../client.ts'
import type { ProposalCard } from '../types.ts'

export const fetchProposals = (sessionId: string): Promise<{ proposals: ProposalCard[] }> =>
  getJson<{ proposals: ProposalCard[] }>(`/api/sessions/${sessionId}/proposals`)

export const acceptProposal = (proposalId: string): Promise<unknown> =>
  postJson(`/api/proposals/${proposalId}/accept`)

export const editProposal = (proposalId: string, label: string): Promise<unknown> =>
  postJson(`/api/proposals/${proposalId}/edit`, { label })

export const rejectProposal = (proposalId: string): Promise<unknown> =>
  postJson(`/api/proposals/${proposalId}/reject`)

export const holdProposal = (proposalId: string): Promise<unknown> =>
  postJson(`/api/proposals/${proposalId}/hold`)

export const unholdProposal = (proposalId: string): Promise<unknown> =>
  postJson(`/api/proposals/${proposalId}/unhold`)
