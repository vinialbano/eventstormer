import { err, ok, type Result } from '~/plumbing/result.ts'
import type { WorkshopEvent } from '../schema/events.ts'
import type { WorkshopCommand, WorkshopRejection, WorkshopWriteModel } from './model.ts'

const NAME_MAX = 80
const STATEMENT_MAX = 10_000

type Decision = Result<WorkshopEvent[], WorkshopRejection>

const decideStartWorkshop = (
  writeModel: WorkshopWriteModel,
  command: Extract<WorkshopCommand, { type: 'Start Workshop' }>,
): Decision => {
  if (writeModel.started) return err({ kind: 'already-started', classification: 'systemic' })
  if (command.creatorName.trim().length === 0) {
    return err({ kind: 'blank-name', classification: 'systemic' })
  }
  if (command.creatorName.length > NAME_MAX) {
    return err({ kind: 'name-too-long', classification: 'systemic' })
  }
  return ok([
    {
      v: 1,
      type: 'Workshop Started',
      workshopId: command.workshopId,
      format: 'big-picture',
      creatorName: command.creatorName,
      at: command.at,
    },
  ])
}

const decideSetScope = (
  writeModel: WorkshopWriteModel,
  command: Extract<WorkshopCommand, { type: 'Set Scope' }>,
): Decision => {
  if (!writeModel.started) return err({ kind: 'not-started', classification: 'systemic' })
  if (command.statement.trim().length === 0) {
    return err({ kind: 'blank-statement', classification: 'systemic' })
  }
  if (command.statement.length > STATEMENT_MAX) {
    return err({ kind: 'statement-too-long', classification: 'systemic' })
  }
  return ok([
    { v: 1, type: 'Scope Set', workshopId: command.workshopId, statement: command.statement, at: command.at },
  ])
}

const decideRecordStakeholderCheck = (
  writeModel: WorkshopWriteModel,
  command: Extract<WorkshopCommand, { type: 'Record Stakeholder Check' }>,
): Decision => {
  if (!writeModel.started) return err({ kind: 'not-started', classification: 'systemic' })
  if (writeModel.stakeholderCheckRun) return ok([])
  return ok([
    {
      v: 1,
      type: 'Stakeholder Check Recorded',
      workshopId: command.workshopId,
      complete: command.complete,
      absentNames: command.absentNames,
      at: command.at,
    },
  ])
}

const decideChooseProblem = (
  writeModel: WorkshopWriteModel,
  command: Extract<WorkshopCommand, { type: 'Choose Problem' }>,
): Decision => {
  if (!writeModel.started) return err({ kind: 'not-started', classification: 'systemic' })
  if (writeModel.problemDecided) return ok([])
  return ok([
    {
      v: 1,
      type: 'Problem Chosen',
      workshopId: command.workshopId,
      problemHotSpotId: command.problemHotSpotId,
      qualification: writeModel.stakeholderComplete === true ? 'firm' : 'provisional',
      at: command.at,
    },
  ])
}

const decideSkipProblemChoice = (
  writeModel: WorkshopWriteModel,
  command: Extract<WorkshopCommand, { type: 'Skip Problem Choice' }>,
): Decision => {
  if (!writeModel.started) return err({ kind: 'not-started', classification: 'systemic' })
  if (writeModel.problemDecided) return ok([])
  return ok([
    {
      v: 1,
      type: 'Problem Choice Skipped',
      workshopId: command.workshopId,
      reason: command.reason,
      at: command.at,
    },
  ])
}

/**
 * The pure guard for `Workshop`. Reads only the slim write model; returns
 * `ok(events)` or `err(rejection)`. No mutation, no I/O. A dispatch switch — each
 * command's rules live in its own helper.
 *
 * `Set Scope` validates the statement only and is **repeatable** — the
 * first-building-block lock is a `set-scope` handler precondition, never here.
 * `Record Stakeholder Check`, `Choose Problem`, and `Skip Problem Choice` are
 * each once-only: a repeat after the fact is a silent `ok([])`, not a rejection.
 */
export const decide = (writeModel: WorkshopWriteModel, command: WorkshopCommand): Decision => {
  switch (command.type) {
    case 'Start Workshop':
      return decideStartWorkshop(writeModel, command)
    case 'Set Scope':
      return decideSetScope(writeModel, command)
    case 'Record Stakeholder Check':
      return decideRecordStakeholderCheck(writeModel, command)
    case 'Choose Problem':
      return decideChooseProblem(writeModel, command)
    case 'Skip Problem Choice':
      return decideSkipProblemChoice(writeModel, command)
  }
}
