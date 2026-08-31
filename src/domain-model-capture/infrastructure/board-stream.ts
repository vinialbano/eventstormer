import type { WorkshopId } from '~/plumbing/ids.ts'

export const boardStream = (workshopId: WorkshopId) => ({
  context: 'domain-model-capture',
  aggregate: 'board',
  id: workshopId,
})
