import { getJson, HttpError, postJson } from '../client.ts'
import type { BoardSnapshot } from '../types.ts'

export { HttpError }

export interface ReferenceSite {
  kind: string
  path: string
}

export type FetchBlockReferences = (
  workshopId: string,
  blockId: string,
) => Promise<ReferenceSite[]>

export type BoardEdit = {
  v: 1
  author: { accepter: { name: string } }
} & (
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

export const fetchBoard = (workshopId: string): Promise<BoardSnapshot> =>
  getJson<BoardSnapshot>(`/api/workshops/${workshopId}/board`)

export const fetchBlockReferences = (
  workshopId: string,
  blockId: string,
): Promise<ReferenceSite[]> =>
  getJson<ReferenceSite[]>(`/api/workshops/${workshopId}/board/blocks/${blockId}/references`)

export const postBoardOperation = (workshopId: string, operation: BoardEdit): Promise<unknown> =>
  postJson(`/api/workshops/${workshopId}/board/operations`, operation)

export const referenceSiteLine = (site: ReferenceSite): string =>
  site.path === 'building-blocks' ? 'Readable account · Building blocks' : site.path
