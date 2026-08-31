import { err, ok, type Result } from '~/plumbing/result.ts'
import type { SessionEvent } from '../schema/events.ts'
import type { SessionCommand, SessionRejection, SessionWriteModel } from './model.ts'

const CONTRIBUTION_MAX = 10_000

/**
 * The pure guard for `Session`. G/W/T through the operation; no mutation, no I/O.
 *
 * Idempotency lives here, not in the caller:
 * - `Interpret Contribution` / `Fail Interpretation` — a second call for a
 *   `contributionId` already in the ledger returns `ok([])`; so does a call on a
 *   CLOSED session (a model call that returns after the session closed writes
 *   nothing and derives no proposal — a lapse sweep would never reach it).
 * - `Ask Question` — a known `questionId` returns `ok([])`.
 * - `Close Session` — a second close returns `ok([])`.
 */
export const decide = (
  wm: SessionWriteModel,
  command: SessionCommand,
): Result<SessionEvent[], SessionRejection> => {
  switch (command.type) {
    case 'Start Session': {
      if (wm.started) return err({ kind: 'already-started', classification: 'systemic' })
      return ok([
        { v: 1, type: 'Session Started', sessionId: command.sessionId, workshopId: command.workshopId, at: command.at },
      ])
    }

    case 'Make Contribution': {
      if (wm.closed) return err({ kind: 'session-closed', classification: 'systemic' })
      const body = command.body.trim()
      if (body.length === 0) return err({ kind: 'empty-contribution', classification: 'systemic' })
      if (body.length > CONTRIBUTION_MAX) {
        return err({ kind: 'contribution-too-long', classification: 'systemic' })
      }
      return ok([
        {
          v: 1,
          type: 'Contribution Made',
          sessionId: command.sessionId,
          contributionId: command.contributionId,
          speaker: command.speaker,
          body,
          source: 'typed',
          at: command.at,
        },
      ])
    }

    case 'Ask Question': {
      if (wm.closed) return err({ kind: 'session-closed', classification: 'systemic' })
      if (wm.questions.has(command.questionId)) return ok([])
      return ok([
        {
          v: 1,
          type: 'Question Asked',
          sessionId: command.sessionId,
          questionId: command.questionId,
          kind: command.kind,
          text: command.text,
          ...(command.scopeStatement === undefined ? {} : { scopeStatement: command.scopeStatement }),
          at: command.at,
        },
      ])
    }

    case 'Answer Question': {
      const status = wm.questions.get(command.questionId)
      if (status === undefined) return err({ kind: 'unknown-question', classification: 'systemic' })
      if (status === 'resolved') {
        return err({ kind: 'question-already-resolved', classification: 'systemic' })
      }
      return ok([
        {
          v: 1,
          type: 'Question Answered',
          sessionId: command.sessionId,
          questionId: command.questionId,
          byContributionId: command.byContributionId,
          at: command.at,
        },
      ])
    }

    case 'Interpret Contribution': {
      if (wm.closed) return ok([])
      if (wm.interpreted.has(command.contributionId)) return ok([])
      return ok([
        {
          v: 1,
          type: 'Contribution Interpreted',
          sessionId: command.sessionId,
          contributionId: command.contributionId,
          tracks: command.tracks,
          ...(command.askQuestionId === undefined ? {} : { askQuestionId: command.askQuestionId }),
          ...(command.askQuestionText === undefined ? {} : { askQuestionText: command.askQuestionText }),
          at: command.at,
        },
      ])
    }

    case 'Fail Interpretation': {
      if (wm.closed) return ok([])
      if (wm.interpreted.has(command.contributionId)) return ok([])
      return ok([
        {
          v: 1,
          type: 'Contribution Interpretation Failed',
          sessionId: command.sessionId,
          contributionId: command.contributionId,
          reason: command.reason,
          at: command.at,
        },
      ])
    }

    case 'Attribute Contribution': {
      return ok([
        {
          v: 1,
          type: 'Contribution Attributed To Another Format',
          sessionId: command.sessionId,
          contributionId: command.contributionId,
          format: command.format,
          note: command.note,
          at: command.at,
        },
      ])
    }

    case 'Close Session': {
      if (wm.closed) return ok([])
      const unresolvedQuestionIds = [...wm.questions]
        .filter(([, status]) => status === 'open')
        .map(([id]) => id)
      return ok([
        {
          v: 1,
          type: 'Session Closed',
          sessionId: command.sessionId,
          workshopId: command.workshopId,
          unresolvedQuestionIds,
          at: command.at,
        },
      ])
    }
  }
}
