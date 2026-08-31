import type { ProposalEvent } from '../schema/events.ts'
import type { ProposalWriteModel } from './model.ts'

/** The `Proposal` write-model fold — pure, returns a new model. */
export const evolve = (wm: ProposalWriteModel, event: ProposalEvent): ProposalWriteModel => {
  switch (event.type) {
    case 'Building Block Proposed':
      return { born: true, disposition: 'PROPOSED', held: false }
    case 'Proposal Edited':
      return { ...wm, disposition: 'EDITED' }
    case 'Proposal Accepted':
      return { ...wm, disposition: 'ACCEPTED', buildingBlockId: event.buildingBlockId }
    case 'Proposal Rejected':
      return { ...wm, disposition: 'REJECTED' }
    case 'Proposal Held':
      return { ...wm, held: true }
    case 'Proposal Unheld':
      return { ...wm, held: false }
    case 'Operation Applied':
      return { ...wm, disposition: 'APPLIED' }
    case 'Operation Rejected':
      return { ...wm, disposition: 'APPLY_FAILED' }
    case 'Proposal Lapsed':
      return { ...wm, disposition: 'LAPSED' }
  }
}
