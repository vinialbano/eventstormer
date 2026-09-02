import { getJson } from '../../../client.ts'

export interface ReferenceSite {
  kind: string
  path: string
}

export type FetchBlockReferences = (
  workshopId: string,
  blockId: string,
) => Promise<ReferenceSite[]>

export const fetchBlockReferences: FetchBlockReferences = (workshopId, blockId) =>
  getJson<ReferenceSite[]>(`/api/workshops/${workshopId}/board/blocks/${blockId}/references`)

export const referenceSiteLine = (site: ReferenceSite): string =>
  site.path === 'building-blocks' ? 'Readable account · Building blocks' : site.path
