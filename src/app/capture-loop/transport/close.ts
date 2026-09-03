import { postJson } from '../client.ts'

export interface StakeholderCheckInput {
  complete: boolean
  absentNames: string[]
}

export type ChosenProblemInput =
  | { problemHotSpotId: string }
  | { skipReason: 'none-chosen' | 'no-impediments-yet' }

export interface CloseReport {
  ok: true
  hotSpotCount: number
  /** True iff the model carries no hot spots at close — a signal to interpret. */
  noHotSpotsIsASignal: boolean
}

/**
 * The three close-ceremony writes. The session stays OPEN across the first two —
 * only `closeSession` freezes it, so it is the sole caller-visible point of no
 * return. Each is a plain POST; the composable sequences them and refetches the
 * board + session afterwards.
 */
export const recordStakeholderCheck = (
  workshopId: string,
  input: StakeholderCheckInput,
): Promise<unknown> => postJson(`/api/workshops/${workshopId}/stakeholder-check`, input)

export const recordChosenProblem = (
  workshopId: string,
  input: ChosenProblemInput,
): Promise<unknown> => postJson(`/api/workshops/${workshopId}/chosen-problem`, input)

export const closeSession = (sessionId: string): Promise<CloseReport> =>
  postJson<CloseReport>(`/api/sessions/${sessionId}/close`)
