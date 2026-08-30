import { err, ok, type Result } from '~/plumbing/result.ts'
import type { SessionEvent } from '../schema/events.ts'
import type { SessionCommand, SessionRejection, SessionWriteModel } from './model.ts'

const CONTRIBUTION_MAX = 10_000

/**
 * The pure guard for `Session`. G/W/T through the operation; no mutation, no I/O.
 *
 * Idempotency lives here, not in the caller:
 * - `Interpret Contribution` / `Fail Interpretation` — a second call for a
 *   `contributionId` already in the ledger returns `ok([])`.
 * - `Ask Question` — a known `questionId` returns `ok([])`.
 * - `Close Session` — a second close returns `ok([])`.
 */
export const decide = (
  wm: SessionWriteModel,
  cmd: SessionCommand,
): Result<SessionEvent[], SessionRejection> => {
  switch (cmd.type) {
    case 'Start Session': {
      if (wm.started) return err({ kind: 'already-started', classification: 'systemic' })
      return ok([
        { v: 1, type: 'Session Started', sessionId: cmd.sessionId, workshopId: cmd.workshopId, at: cmd.at },
      ])
    }

    case 'Make Contribution': {
      if (wm.closed) return err({ kind: 'session-closed', classification: 'systemic' })
      const body = cmd.body.trim()
      if (body.length === 0) return err({ kind: 'empty-contribution', classification: 'systemic' })
      if (body.length > CONTRIBUTION_MAX) {
        return err({ kind: 'contribution-too-long', classification: 'systemic' })
      }
      return ok([
        {
          v: 1,
          type: 'Contribution Made',
          sessionId: cmd.sessionId,
          contributionId: cmd.contributionId,
          speaker: cmd.speaker,
          body,
          source: 'typed',
          at: cmd.at,
        },
      ])
    }

    case 'Ask Question': {
      if (wm.closed) return err({ kind: 'session-closed', classification: 'systemic' })
      if (wm.questions.has(cmd.questionId)) return ok([])
      return ok([
        {
          v: 1,
          type: 'Question Asked',
          sessionId: cmd.sessionId,
          questionId: cmd.questionId,
          kind: cmd.kind,
          text: cmd.text,
          ...(cmd.scopeStatement === undefined ? {} : { scopeStatement: cmd.scopeStatement }),
          at: cmd.at,
        },
      ])
    }

    case 'Answer Question': {
      const status = wm.questions.get(cmd.questionId)
      if (status === undefined) return err({ kind: 'unknown-question', classification: 'systemic' })
      if (status === 'resolved') {
        return err({ kind: 'question-already-resolved', classification: 'systemic' })
      }
      return ok([
        {
          v: 1,
          type: 'Question Answered',
          sessionId: cmd.sessionId,
          questionId: cmd.questionId,
          byContributionId: cmd.byContributionId,
          at: cmd.at,
        },
      ])
    }

    case 'Interpret Contribution': {
      if (wm.interpreted.has(cmd.contributionId)) return ok([])
      return ok([
        {
          v: 1,
          type: 'Contribution Interpreted',
          sessionId: cmd.sessionId,
          contributionId: cmd.contributionId,
          tracks: cmd.tracks,
          ...(cmd.askQuestionId === undefined ? {} : { askQuestionId: cmd.askQuestionId }),
          at: cmd.at,
        },
      ])
    }

    case 'Fail Interpretation': {
      if (wm.interpreted.has(cmd.contributionId)) return ok([])
      return ok([
        {
          v: 1,
          type: 'Contribution Interpretation Failed',
          sessionId: cmd.sessionId,
          contributionId: cmd.contributionId,
          reason: cmd.reason,
          at: cmd.at,
        },
      ])
    }

    case 'Attribute Contribution': {
      return ok([
        {
          v: 1,
          type: 'Contribution Attributed To Another Format',
          sessionId: cmd.sessionId,
          contributionId: cmd.contributionId,
          format: cmd.format,
          note: cmd.note,
          at: cmd.at,
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
          sessionId: cmd.sessionId,
          workshopId: cmd.workshopId,
          unresolvedQuestionIds,
          at: cmd.at,
        },
      ])
    }
  }
}
