import { err, ok, type Result } from '~/plumbing/result.ts'
import type { ResolutionEvent } from '../schema/events.ts'
import {
  OPEN,
  type ResolutionCommand,
  type ResolutionRejection,
  type ResolutionWriteModel,
  TERMINAL,
} from './model.ts'

type CommandOf<Type extends ResolutionCommand['type']> = Extract<ResolutionCommand, { type: Type }>
type Decision = Result<ResolutionEvent[], ResolutionRejection>

const badTransition = (
  writeModel: ResolutionWriteModel,
  command: string,
): Result<never, ResolutionRejection> =>
  err({
    kind: 'bad-transition',
    classification: 'systemic',
    from: writeModel.disposition,
    command,
  })

const decidePropose = (
  writeModel: ResolutionWriteModel,
  command: CommandOf<'Propose Resolution'>,
): Decision => {
  if (writeModel.born) return ok([])
  return ok([
    {
      v: 1,
      type: 'Resolution Proposed',
      resolutionId: command.resolutionId,
      sessionId: command.sessionId,
      contributionId: command.contributionId,
      hotSpotId: command.hotSpotId,
      reference: command.reference,
      at: command.at,
    },
  ])
}

const decideEdit = (
  writeModel: ResolutionWriteModel,
  command: CommandOf<'Edit Resolution'>,
): Decision => {
  if (!OPEN.has(writeModel.disposition)) return badTransition(writeModel, command.type)
  return ok([
    {
      v: 1,
      type: 'Resolution Edited',
      resolutionId: command.resolutionId,
      reference: command.reference,
      at: command.at,
    },
  ])
}

const decideAccept = (
  writeModel: ResolutionWriteModel,
  command: CommandOf<'Accept Resolution'>,
): Decision => {
  if (writeModel.disposition === 'ACCEPTED' || writeModel.disposition === 'APPLIED') return ok([])
  if (!OPEN.has(writeModel.disposition)) return badTransition(writeModel, command.type)
  return ok([
    {
      v: 1,
      type: 'Resolution Accepted',
      resolutionId: command.resolutionId,
      accepter: command.accepter,
      at: command.at,
    },
  ])
}

const decideReject = (
  writeModel: ResolutionWriteModel,
  command: CommandOf<'Reject Resolution'>,
): Decision => {
  if (writeModel.disposition === 'REJECTED') return ok([])
  if (!OPEN.has(writeModel.disposition)) return badTransition(writeModel, command.type)
  return ok([
    { v: 1, type: 'Resolution Rejected', resolutionId: command.resolutionId, at: command.at },
  ])
}

const decideRecordResolved = (
  writeModel: ResolutionWriteModel,
  command: CommandOf<'Record Hot Spot Resolved'>,
): Decision => {
  if (writeModel.disposition === 'APPLIED') return ok([])
  if (writeModel.disposition !== 'ACCEPTED') return badTransition(writeModel, command.type)
  return ok([
    { v: 1, type: 'Hot Spot Resolved', resolutionId: command.resolutionId, at: command.at },
  ])
}

const decideRecordRejected = (
  writeModel: ResolutionWriteModel,
  command: CommandOf<'Record Resolution Rejected'>,
): Decision => {
  if (writeModel.disposition === 'LAPSED') return ok([])
  if (writeModel.disposition !== 'ACCEPTED') return badTransition(writeModel, command.type)
  return ok([
    {
      v: 1,
      type: 'Hot Spot Resolution Rejected',
      resolutionId: command.resolutionId,
      reason: command.reason,
      at: command.at,
    },
  ])
}

const decideLapse = (
  writeModel: ResolutionWriteModel,
  command: CommandOf<'Lapse Resolution'>,
): Decision => {
  // Terminal or in-flight (`ACCEPTED`) — left to finish; nothing to lapse.
  if (TERMINAL.has(writeModel.disposition) || writeModel.disposition === 'ACCEPTED') return ok([])
  return ok([
    { v: 1, type: 'Resolution Lapsed', resolutionId: command.resolutionId, at: command.at },
  ])
}

/**
 * The pure guard for `Resolution`. G/W/T through the command. Idempotent no-ops
 * (`ok([])`) where a retry or reconcile is expected: a repeated birth, an accept
 * while `ACCEPTED`/`APPLIED`, a reject while `REJECTED`, a resolved/rejected
 * record after it landed, a lapse on a terminal or in-flight resolution.
 */
export const decide = (
  writeModel: ResolutionWriteModel,
  command: ResolutionCommand,
): Result<ResolutionEvent[], ResolutionRejection> => {
  if (command.type === 'Propose Resolution') return decidePropose(writeModel, command)
  if (!writeModel.born) return err({ kind: 'not-born', classification: 'systemic' })

  switch (command.type) {
    case 'Edit Resolution':
      return decideEdit(writeModel, command)
    case 'Accept Resolution':
      return decideAccept(writeModel, command)
    case 'Reject Resolution':
      return decideReject(writeModel, command)
    case 'Record Hot Spot Resolved':
      return decideRecordResolved(writeModel, command)
    case 'Record Resolution Rejected':
      return decideRecordRejected(writeModel, command)
    case 'Lapse Resolution':
      return decideLapse(writeModel, command)
  }
}
