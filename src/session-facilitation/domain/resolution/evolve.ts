import type { ResolutionEvent } from '../schema/events.ts'
import type { ResolutionWriteModel } from './model.ts'

/** The `Resolution` write-model fold — pure, returns a new model. */
export const evolve = (
  writeModel: ResolutionWriteModel,
  event: ResolutionEvent,
): ResolutionWriteModel => {
  switch (event.type) {
    case 'Resolution Proposed':
      return {
        born: true,
        disposition: 'PROPOSED',
        hotSpotId: event.hotSpotId,
        reference: event.reference,
      }
    case 'Resolution Edited':
      return { ...writeModel, disposition: 'EDITED', reference: event.reference }
    case 'Resolution Accepted':
      return { ...writeModel, disposition: 'ACCEPTED' }
    case 'Resolution Rejected':
      return { ...writeModel, disposition: 'REJECTED' }
    case 'Resolution Lapsed':
      return { ...writeModel, disposition: 'LAPSED' }
    case 'Hot Spot Resolved':
      return { ...writeModel, disposition: 'APPLIED' }
    case 'Hot Spot Resolution Rejected':
      return { ...writeModel, disposition: 'LAPSED' }
  }
}
