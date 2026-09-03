import type { ProposalEvent } from '../schema/events.ts'
import type { ProposalWriteModel } from './model.ts'

/** The `Proposal` write-model fold — pure, returns a new model. */
export const evolve = (writeModel: ProposalWriteModel, event: ProposalEvent): ProposalWriteModel => {
  switch (event.type) {
    case 'Building Block Proposed':
      return {
        born: true,
        disposition: 'PROPOSED',
        held: false,
        modelAffecting: event.modelAffecting ?? true,
      }
    case 'Proposal Edited':
      return { ...writeModel, disposition: 'EDITED' }
    case 'Proposal Kind Set':
      return { ...writeModel, modelAffecting: event.modelAffecting }
    case 'Proposal Accepted':
      return { ...writeModel, disposition: 'ACCEPTED', buildingBlockId: event.buildingBlockId }
    case 'Proposal Rejected':
      return { ...writeModel, disposition: 'REJECTED' }
    case 'Proposal Held':
      return { ...writeModel, held: true }
    case 'Proposal Unheld':
      return { ...writeModel, held: false }
    case 'Operation Applied':
      return { ...writeModel, disposition: 'APPLIED' }
    case 'Operation Rejected':
      return { ...writeModel, disposition: 'APPLY_FAILED' }
    case 'Proposal Lapsed':
      return { ...writeModel, disposition: 'LAPSED' }
  }
}
