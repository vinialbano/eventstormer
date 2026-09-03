import { getJson, postJson } from '../client.ts'
import type { ResolutionCard } from '../types.ts'

export const fetchResolutions = async (
  sessionId: string,
): Promise<{ resolutions: ResolutionCard[] }> => {
  const body = await getJson<{ resolutions?: ResolutionCard[] }>(
    `/api/sessions/${sessionId}/resolutions`,
  )
  return { resolutions: body.resolutions ?? [] }
}

/**
 * `POST /resolutions/:id/accept` — the synchronous resolve chain: the hot spot
 * becomes resolved and the reference is recorded, or the resolution lapses on a
 * board rejection.
 */
export const acceptResolution = (resolutionId: string): Promise<unknown> =>
  postJson(`/api/resolutions/${resolutionId}/accept`)

export const editResolution = (resolutionId: string, reference: string): Promise<unknown> =>
  postJson(`/api/resolutions/${resolutionId}/edit`, { reference })

export const rejectResolution = (resolutionId: string): Promise<unknown> =>
  postJson(`/api/resolutions/${resolutionId}/reject`)
