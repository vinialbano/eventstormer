import type { BuildingBlockId, ContributionId, ProposalId, SessionId } from '~/plumbing/ids.ts'
import type { InterpretedBlockKind, InterpretationBar } from '../schema/interpreted-track.ts'

/**
 * The `Proposal` disposition machine:
 *
 *   PROPOSED ⇄ EDITED → ACCEPTED → APPLIED | APPLY_FAILED
 *   REJECTED / LAPSED terminal
 *   APPLY_FAILED is re-editable and re-acceptable (acceptance is not terminal)
 *
 * `held` is a reversible marker orthogonal to the disposition — never a
 * state, never persisted as a boolean event field.
 */
export type Disposition =
  | 'PROPOSED'
  | 'EDITED'
  | 'ACCEPTED'
  | 'APPLIED'
  | 'APPLY_FAILED'
  | 'REJECTED'
  | 'LAPSED'

export const TERMINAL: ReadonlySet<Disposition> = new Set<Disposition>(['APPLIED', 'REJECTED', 'LAPSED'])

/** Where `Edit` / `Accept` / `Reject` / `Hold` are legal. */
export const REVIEWABLE: ReadonlySet<Disposition> = new Set<Disposition>([
  'PROPOSED',
  'EDITED',
  'APPLY_FAILED',
])

export interface ProposalWriteModel {
  born: boolean
  disposition: Disposition
  held: boolean
  /** The current kind of a hot-spot proposal: the birth value, overridden by the
   * last `Proposal Kind Set`. `true` (model-affecting) for a plain capture. */
  modelAffecting: boolean
  buildingBlockId?: BuildingBlockId
}

export const emptyProposal = (): ProposalWriteModel => ({
  born: false,
  disposition: 'PROPOSED',
  held: false,
  modelAffecting: true,
})

export type ProposalRejection =
  | { kind: 'not-born'; classification: 'systemic' }
  | { kind: 'label-too-long'; classification: 'systemic' }
  | { kind: 'bad-transition'; classification: 'systemic'; from: Disposition; command: string }

export type ProposalCommand =
  | {
      type: 'Propose Building Block'
      proposalId: ProposalId
      sessionId: SessionId
      contributionId: ContributionId
      blockKind: InterpretedBlockKind
      label: string
      bar: InterpretationBar
      evidenceSpan?: string
      at: string
    }
  | { type: 'Edit Proposal'; proposalId: ProposalId; label: string; at: string }
  | { type: 'Set Proposal Kind'; proposalId: ProposalId; modelAffecting: boolean; at: string }
  | {
      type: 'Accept Proposal'
      proposalId: ProposalId
      accepter: string
      buildingBlockId: BuildingBlockId
      at: string
    }
  | { type: 'Reject Proposal'; proposalId: ProposalId; at: string }
  | { type: 'Hold Proposal'; proposalId: ProposalId; at: string }
  | { type: 'Unhold Proposal'; proposalId: ProposalId; at: string }
  | {
      type: 'Record Operation Applied'
      proposalId: ProposalId
      resultingBuildingBlockId: BuildingBlockId
      at: string
    }
  | { type: 'Record Operation Rejected'; proposalId: ProposalId; reason: string; at: string }
  | {
      type: 'Lapse Proposal'
      proposalId: ProposalId
      cause: 'undisposed' | 'apply-failed'
      at: string
    }
