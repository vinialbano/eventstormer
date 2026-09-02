import { postJson } from '../client.ts'

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
