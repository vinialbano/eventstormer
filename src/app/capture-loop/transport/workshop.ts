import { postJson } from '../client.ts'

export const createWorkshop = (
  creatorName: string,
): Promise<{ workshopId: string; url: string }> =>
  postJson<{ workshopId: string; url: string }>('/api/workshops', { creatorName })
