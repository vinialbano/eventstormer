import { getJson } from '../client.ts'
import type { ModelArtifact, SummaryArtifact, TranscriptArtifact } from '../types.ts'

/**
 * Transport for the three derived-artifact routes (Slice 5). Each is a pure
 * synchronous read on the server — re-requesting is byte-identical bar
 * `renderedAt`, so the artifacts store re-fetches on every applied operation,
 * the same signal the readable account uses.
 */

export const fetchModelArtifact = (workshopId: string): Promise<ModelArtifact> =>
  getJson<ModelArtifact>(`/api/workshops/${workshopId}/artifacts/model`)

export const fetchSummaryArtifact = (workshopId: string): Promise<SummaryArtifact> =>
  getJson<SummaryArtifact>(`/api/workshops/${workshopId}/artifacts/summary`)

export const fetchTranscriptArtifact = (
  workshopId: string,
  sessionId: string,
): Promise<TranscriptArtifact> =>
  getJson<TranscriptArtifact>(
    `/api/workshops/${workshopId}/sessions/${sessionId}/artifacts/transcript`,
  )
