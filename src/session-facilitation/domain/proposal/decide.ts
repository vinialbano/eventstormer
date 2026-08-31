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
  writeModel: ProposalWriteModel,
  command: string,
): Result<never, ProposalRejection> =>
  err({ kind: 'bad-transition', classification: 'systemic', from: writeModel.disposition, command })

/**
 * The pure guard for `Proposal`. G/W/T through the operation. Idempotent
 * no-ops (`ok([])`) rather than rejections where a retry / reconcile is
 * expected: a repeated birth, an accept while `ACCEPTED`/`APPLIED`, a lapse on a
 * terminal or in-flight proposal.
 */
export const decide = (
  writeModel: ProposalWriteModel,
  command: ProposalCommand,
): Result<ProposalEvent[], ProposalRejection> => {
  if (command.type === 'Propose Building Block') {
    if (writeModel.born) return ok([])
    return ok([
      {
        v: 1,
        type: 'Building Block Proposed',
        proposalId: command.proposalId,
        sessionId: command.sessionId,
        contributionId: command.contributionId,
        blockKind: command.blockKind,
        label: command.label,
        bar: command.bar,
        ...(command.evidenceSpan === undefined ? {} : { evidenceSpan: command.evidenceSpan }),
        at: command.at,
      },
    ])
  }

  if (!writeModel.born) return err({ kind: 'not-born', classification: 'systemic' })

  switch (command.type) {
    case 'Edit Proposal': {
      if (!REVIEWABLE.has(writeModel.disposition)) return badTransition(writeModel, command.type)
      if (command.label.length > LABEL_MAX) {
        return err({ kind: 'label-too-long', classification: 'systemic' })
      }
      return ok([{ v: 1, type: 'Proposal Edited', proposalId: command.proposalId, label: command.label, at: command.at }])
    }

    case 'Accept Proposal': {
      if (writeModel.disposition === 'ACCEPTED' || writeModel.disposition === 'APPLIED') return ok([])
      if (!REVIEWABLE.has(writeModel.disposition)) return badTransition(writeModel, command.type)
      return ok([
        {
          v: 1,
          type: 'Proposal Accepted',
          proposalId: command.proposalId,
          accepter: command.accepter,
          buildingBlockId: command.buildingBlockId,
          at: command.at,
        },
      ])
    }

    case 'Reject Proposal': {
      if (writeModel.disposition === 'REJECTED') return ok([])
      if (!REVIEWABLE.has(writeModel.disposition)) return badTransition(writeModel, command.type)
      return ok([{ v: 1, type: 'Proposal Rejected', proposalId: command.proposalId, at: command.at }])
    }

    case 'Hold Proposal': {
      if (!REVIEWABLE.has(writeModel.disposition)) return badTransition(writeModel, command.type)
      if (writeModel.held) return ok([])
      return ok([{ v: 1, type: 'Proposal Held', proposalId: command.proposalId, at: command.at }])
    }

    case 'Unhold Proposal': {
      if (!REVIEWABLE.has(writeModel.disposition)) return badTransition(writeModel, command.type)
      if (!writeModel.held) return ok([])
      return ok([{ v: 1, type: 'Proposal Unheld', proposalId: command.proposalId, at: command.at }])
    }

    case 'Record Operation Applied': {
      if (writeModel.disposition === 'APPLIED') return ok([])
      if (writeModel.disposition !== 'ACCEPTED') return badTransition(writeModel, command.type)
      return ok([
        {
          v: 1,
          type: 'Operation Applied',
          proposalId: command.proposalId,
          resultingBuildingBlockId: command.resultingBuildingBlockId,
          at: command.at,
        },
      ])
    }

    case 'Record Operation Rejected': {
      if (writeModel.disposition === 'APPLY_FAILED') return ok([])
      if (writeModel.disposition !== 'ACCEPTED') return badTransition(writeModel, command.type)
      return ok([
        { v: 1, type: 'Operation Rejected', proposalId: command.proposalId, reason: command.reason, at: command.at },
      ])
    }

    case 'Lapse Proposal': {
      // Terminal or in-flight (`ACCEPTED`) — left to finish; nothing to lapse.
      if (TERMINAL.has(writeModel.disposition) || writeModel.disposition === 'ACCEPTED') return ok([])
      return ok([
        { v: 1, type: 'Proposal Lapsed', proposalId: command.proposalId, cause: command.cause, at: command.at },
      ])
    }
  }
}
