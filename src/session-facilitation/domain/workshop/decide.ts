import { err, ok, type Result } from '~/plumbing/result.ts'
import type { WorkshopEvent } from '../schema/events.ts'
import type { WorkshopCommand, WorkshopRejection, WorkshopWriteModel } from './model.ts'

const NAME_MAX = 80
const STATEMENT_MAX = 10_000

/**
 * The pure guard for `Workshop`. Reads only the slim write model; returns
 * `ok(events)` or `err(rejection)`. No mutation, no I/O.
 *
 * `Set Scope` validates the statement only and is **repeatable** — the
 * first-building-block lock is a `set-scope` handler precondition, never here.
 */
export const decide = (
  writeModel: WorkshopWriteModel,
  command: WorkshopCommand,
): Result<WorkshopEvent[], WorkshopRejection> => {
  switch (command.type) {
    case 'Start Workshop': {
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

    case 'Set Scope': {
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
  }
}
