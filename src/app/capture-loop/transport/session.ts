import { postJson } from '../client.ts'

export const startSession = (workshopId: string): Promise<unknown> =>
  postJson(`/api/workshops/${workshopId}/sessions`)

export const submitContribution = (sessionId: string, text: string): Promise<unknown> =>
  postJson(`/api/sessions/${sessionId}/contributions`, { text })

export const setScope = (workshopId: string, statement: string): Promise<unknown> =>
  postJson(`/api/workshops/${workshopId}/scope`, { statement })
