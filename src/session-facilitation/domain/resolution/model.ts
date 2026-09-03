import type { BuildingBlockId, ContributionId, ResolutionId, SessionId } from '~/plumbing/ids.ts'

/**
 * The `Resolution` disposition machine — one pending hot-spot resolution:
 *
 *   PROPOSED ⇄ EDITED → ACCEPTED → APPLIED | LAPSED
 *   REJECTED terminal from PROPOSED / EDITED
 *
 * There is no `APPLY_FAILED`: every apply bounce is terminal (`LAPSED`), with no
 * retry path. `Resolution` and `Proposal` are separate aggregates because their
 * outcomes diverge — a bounced proposal is re-acceptable, a bounced resolution
 * is done.
 */
export type ResolutionDisposition =
  | 'PROPOSED'
  | 'EDITED'
  | 'ACCEPTED'
  | 'APPLIED'
  | 'REJECTED'
  | 'LAPSED'

export const TERMINAL: ReadonlySet<ResolutionDisposition> = new Set<ResolutionDisposition>([
  'APPLIED',
  'REJECTED',
  'LAPSED',
])

/** Where `Edit` / `Accept` / `Reject` / `Lapse` are legal. */
export const OPEN: ReadonlySet<ResolutionDisposition> = new Set<ResolutionDisposition>([
  'PROPOSED',
  'EDITED',
])

export interface ResolutionWriteModel {
  born: boolean
  disposition: ResolutionDisposition
  hotSpotId?: BuildingBlockId
  reference?: string
}

export const emptyResolution = (): ResolutionWriteModel => ({
  born: false,
  disposition: 'PROPOSED',
})

export type ResolutionRejection =
  | { kind: 'not-born'; classification: 'systemic' }
  | {
      kind: 'bad-transition'
      classification: 'systemic'
      from: ResolutionDisposition
      command: string
    }

export type ResolutionCommand =
  | {
      type: 'Propose Resolution'
      resolutionId: ResolutionId
      sessionId: SessionId
      contributionId: ContributionId
      hotSpotId: BuildingBlockId
      reference: string
      at: string
    }
  | { type: 'Edit Resolution'; resolutionId: ResolutionId; reference: string; at: string }
  | { type: 'Accept Resolution'; resolutionId: ResolutionId; accepter: string; at: string }
  | { type: 'Reject Resolution'; resolutionId: ResolutionId; at: string }
  | { type: 'Record Hot Spot Resolved'; resolutionId: ResolutionId; at: string }
  | { type: 'Record Resolution Rejected'; resolutionId: ResolutionId; reason: string; at: string }
  | { type: 'Lapse Resolution'; resolutionId: ResolutionId; at: string }
