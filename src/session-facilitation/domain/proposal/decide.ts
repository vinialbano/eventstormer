import { err, ok, type Result } from '~/plumbing/result.ts'
import type { ProposalEvent } from '../schema/events.ts'
import {
  type ProposalCommand,
  type ProposalRejection,
  type ProposalWriteModel,
  REVIEWABLE,
  TERMINAL,
} from './model.ts'

const LABEL_MAX = 200

const badTransition = (
  wm: ProposalWriteModel,
  command: string,
): Result<never, ProposalRejection> =>
  err({ kind: 'bad-transition', classification: 'systemic', from: wm.disposition, command })

/**
 * The pure guard for `Proposal`. G/W/T through the operation. Idempotent
 * no-ops (`ok([])`) rather than rejections where a retry / reconcile is
 * expected: a repeated birth, an accept while `ACCEPTED`/`APPLIED`, a lapse on a
 * terminal or in-flight proposal.
 */
export const decide = (
  wm: ProposalWriteModel,
  cmd: ProposalCommand,
): Result<ProposalEvent[], ProposalRejection> => {
  if (cmd.type === 'Propose Building Block') {
    if (wm.born) return ok([])
    return ok([
      {
        v: 1,
        type: 'Building Block Proposed',
        proposalId: cmd.proposalId,
        sessionId: cmd.sessionId,
        contributionId: cmd.contributionId,
        blockKind: cmd.blockKind,
        label: cmd.label,
        bar: cmd.bar,
        ...(cmd.evidenceSpan === undefined ? {} : { evidenceSpan: cmd.evidenceSpan }),
        at: cmd.at,
      },
    ])
  }

  if (!wm.born) return err({ kind: 'not-born', classification: 'systemic' })

  switch (cmd.type) {
    case 'Edit Proposal': {
      if (!REVIEWABLE.has(wm.disposition)) return badTransition(wm, cmd.type)
      if (cmd.label.length > LABEL_MAX) {
        return err({ kind: 'label-too-long', classification: 'systemic' })
      }
      return ok([{ v: 1, type: 'Proposal Edited', proposalId: cmd.proposalId, label: cmd.label, at: cmd.at }])
    }

    case 'Accept Proposal': {
      if (wm.disposition === 'ACCEPTED' || wm.disposition === 'APPLIED') return ok([])
      if (!REVIEWABLE.has(wm.disposition)) return badTransition(wm, cmd.type)
      return ok([
        {
          v: 1,
          type: 'Proposal Accepted',
          proposalId: cmd.proposalId,
          accepter: cmd.accepter,
          buildingBlockId: cmd.buildingBlockId,
          at: cmd.at,
        },
      ])
    }

    case 'Reject Proposal': {
      if (wm.disposition === 'REJECTED') return ok([])
      if (!REVIEWABLE.has(wm.disposition)) return badTransition(wm, cmd.type)
      return ok([{ v: 1, type: 'Proposal Rejected', proposalId: cmd.proposalId, at: cmd.at }])
    }

    case 'Hold Proposal': {
      if (!REVIEWABLE.has(wm.disposition)) return badTransition(wm, cmd.type)
      if (wm.held) return ok([])
      return ok([{ v: 1, type: 'Proposal Held', proposalId: cmd.proposalId, at: cmd.at }])
    }

    case 'Unhold Proposal': {
      if (!REVIEWABLE.has(wm.disposition)) return badTransition(wm, cmd.type)
      if (!wm.held) return ok([])
      return ok([{ v: 1, type: 'Proposal Unheld', proposalId: cmd.proposalId, at: cmd.at }])
    }

    case 'Record Operation Applied': {
      if (wm.disposition === 'APPLIED') return ok([])
      if (wm.disposition !== 'ACCEPTED') return badTransition(wm, cmd.type)
      return ok([
        {
          v: 1,
          type: 'Operation Applied',
          proposalId: cmd.proposalId,
          resultingBuildingBlockId: cmd.resultingBuildingBlockId,
          at: cmd.at,
        },
      ])
    }

    case 'Record Operation Rejected': {
      if (wm.disposition === 'APPLY_FAILED') return ok([])
      if (wm.disposition !== 'ACCEPTED') return badTransition(wm, cmd.type)
      return ok([
        { v: 1, type: 'Operation Rejected', proposalId: cmd.proposalId, reason: cmd.reason, at: cmd.at },
      ])
    }

    case 'Lapse Proposal': {
      // Terminal or in-flight (`ACCEPTED`) — left to finish; nothing to lapse.
      if (TERMINAL.has(wm.disposition) || wm.disposition === 'ACCEPTED') return ok([])
      return ok([
        { v: 1, type: 'Proposal Lapsed', proposalId: cmd.proposalId, cause: cmd.cause, at: cmd.at },
      ])
    }
  }
}
