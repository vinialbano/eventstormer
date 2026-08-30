import { postJson } from '../client.ts'

/**
 * Every capture-screen write is a plain POST (ADR-007). No response carries
 * model state back — the caller refetches the cold-loadable stores afterwards
 * (server-confirmed, no optimistic updates).
 */

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

export const submitContribution = (sessionId: string, text: string): Promise<unknown> =>
  postJson(`/api/sessions/${sessionId}/contributions`, { text })

export const setScope = (workshopId: string, statement: string): Promise<unknown> =>
  postJson(`/api/workshops/${workshopId}/scope`, { statement })
