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

type CommandOf<Type extends ProposalCommand['type']> = Extract<ProposalCommand, { type: Type }>
type Decision = Result<ProposalEvent[], ProposalRejection>

const badTransition = (
  writeModel: ProposalWriteModel,
  command: string,
): Result<never, ProposalRejection> =>
  err({ kind: 'bad-transition', classification: 'systemic', from: writeModel.disposition, command })

const decidePropose = (
  writeModel: ProposalWriteModel,
  command: CommandOf<'Propose Building Block'>,
): Decision => {
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

const decideEdit = (writeModel: ProposalWriteModel, command: CommandOf<'Edit Proposal'>): Decision => {
  if (!REVIEWABLE.has(writeModel.disposition)) return badTransition(writeModel, command.type)
  if (command.label.length > LABEL_MAX) {
    return err({ kind: 'label-too-long', classification: 'systemic' })
  }
  return ok([{ v: 1, type: 'Proposal Edited', proposalId: command.proposalId, label: command.label, at: command.at }])
}

const decideAccept = (
  writeModel: ProposalWriteModel,
  command: CommandOf<'Accept Proposal'>,
): Decision => {
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

const decideReject = (
  writeModel: ProposalWriteModel,
  command: CommandOf<'Reject Proposal'>,
): Decision => {
  if (writeModel.disposition === 'REJECTED') return ok([])
  if (!REVIEWABLE.has(writeModel.disposition)) return badTransition(writeModel, command.type)
  return ok([{ v: 1, type: 'Proposal Rejected', proposalId: command.proposalId, at: command.at }])
}

const decideHold = (writeModel: ProposalWriteModel, command: CommandOf<'Hold Proposal'>): Decision => {
  if (!REVIEWABLE.has(writeModel.disposition)) return badTransition(writeModel, command.type)
  if (writeModel.held) return ok([])
  return ok([{ v: 1, type: 'Proposal Held', proposalId: command.proposalId, at: command.at }])
}

const decideUnhold = (
  writeModel: ProposalWriteModel,
  command: CommandOf<'Unhold Proposal'>,
): Decision => {
  if (!REVIEWABLE.has(writeModel.disposition)) return badTransition(writeModel, command.type)
  if (!writeModel.held) return ok([])
  return ok([{ v: 1, type: 'Proposal Unheld', proposalId: command.proposalId, at: command.at }])
}

const decideRecordApplied = (
  writeModel: ProposalWriteModel,
  command: CommandOf<'Record Operation Applied'>,
): Decision => {
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

const decideRecordRejected = (
  writeModel: ProposalWriteModel,
  command: CommandOf<'Record Operation Rejected'>,
): Decision => {
  if (writeModel.disposition === 'APPLY_FAILED') return ok([])
  if (writeModel.disposition !== 'ACCEPTED') return badTransition(writeModel, command.type)
  return ok([
    { v: 1, type: 'Operation Rejected', proposalId: command.proposalId, reason: command.reason, at: command.at },
  ])
}

const decideLapse = (writeModel: ProposalWriteModel, command: CommandOf<'Lapse Proposal'>): Decision => {
  // Terminal or in-flight (`ACCEPTED`) — left to finish; nothing to lapse.
  if (TERMINAL.has(writeModel.disposition) || writeModel.disposition === 'ACCEPTED') return ok([])
  return ok([
    { v: 1, type: 'Proposal Lapsed', proposalId: command.proposalId, cause: command.cause, at: command.at },
  ])
}

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
  if (command.type === 'Propose Building Block') return decidePropose(writeModel, command)
  if (!writeModel.born) return err({ kind: 'not-born', classification: 'systemic' })

  switch (command.type) {
    case 'Edit Proposal':
      return decideEdit(writeModel, command)
    case 'Accept Proposal':
      return decideAccept(writeModel, command)
    case 'Reject Proposal':
      return decideReject(writeModel, command)
    case 'Hold Proposal':
      return decideHold(writeModel, command)
    case 'Unhold Proposal':
      return decideUnhold(writeModel, command)
    case 'Record Operation Applied':
      return decideRecordApplied(writeModel, command)
    case 'Record Operation Rejected':
      return decideRecordRejected(writeModel, command)
    case 'Lapse Proposal':
      return decideLapse(writeModel, command)
  }
}
