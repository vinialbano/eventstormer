import { postJson } from '../client.ts'

export interface FlagHotSpotInput {
  label: string
  modelAffecting?: boolean
  /** The building block the hot spot annotates, when flagged on a selected block. */
  annotatesTargetId?: string
  author: { accepter: { name: string } }
}

/**
 * `POST /workshops/:id/board/hot-spots` — flag a hot spot directly, with no
 * review step. A named target that is unknown / withdrawn / another hot spot is
 * rejected 422 and nothing is written.
 */
export const flagHotSpot = (workshopId: string, input: FlagHotSpotInput): Promise<unknown> =>
  postJson(`/api/workshops/${workshopId}/board/hot-spots`, input)
