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

interface BoardAuthor {
  v: 1
  author: { accepter: { name: string } }
}

export type BoardEdit = BoardAuthor &
  (
    | { kind: 'reword'; target: string; label: string }
    | { kind: 'withdraw'; target: string }
    | { kind: 'reinstate'; target: string }
    | { kind: 'place'; target: string }
    | { kind: 'unplace'; target: string }
    | { kind: 'sequence'; predecessor: string; successor: string }
    | { kind: 'unsequence'; predecessor: string; successor: string }
    | { kind: 'insert-between'; predecessor: string; inserted: string; successor: string }
    | { kind: 'link-cause'; cause: string; effect: string }
    | { kind: 'unlink-cause'; cause: string; effect: string }
    | { kind: 'mark-pivotal'; target: string }
    | { kind: 'unmark-pivotal'; target: string }
  )

export const postBoardOperation = (workshopId: string, operation: BoardEdit): Promise<unknown> =>
  postJson(`/api/workshops/${workshopId}/board/operations`, operation)
