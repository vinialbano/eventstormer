import type { ProposalEvent } from '../schema/events.ts'
import { evolve } from './evolve.ts'
import { emptyProposal, type ProposalWriteModel } from './model.ts'

/** Rebuild the `Proposal` write model by folding its stream from empty. */
export const replay = (events: ProposalEvent[]): ProposalWriteModel =>
  events.reduce(evolve, emptyProposal())
