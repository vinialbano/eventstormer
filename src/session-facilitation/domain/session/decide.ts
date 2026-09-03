import { err, ok, type Result } from '~/plumbing/result.ts'
import type { SessionEvent } from '../schema/events.ts'
import type { SessionCommand, SessionRejection, SessionWriteModel } from './model.ts'

const CONTRIBUTION_MAX = 10_000

type CommandOf<Type extends SessionCommand['type']> = Extract<SessionCommand, { type: Type }>
type Decision = Result<SessionEvent[], SessionRejection>

const decideStart = (
  writeModel: SessionWriteModel,
  command: CommandOf<'Start Session'>,
): Decision => {
  if (writeModel.started) return err({ kind: 'already-started', classification: 'systemic' })
  return ok([
    { v: 1, type: 'Session Started', sessionId: command.sessionId, workshopId: command.workshopId, at: command.at },
  ])
}

const decideMakeContribution = (
  writeModel: SessionWriteModel,
  command: CommandOf<'Make Contribution'>,
): Decision => {
  if (writeModel.closed) return err({ kind: 'session-closed', classification: 'systemic' })
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

const decideAskQuestion = (
  writeModel: SessionWriteModel,
  command: CommandOf<'Ask Question'>,
): Decision => {
  if (writeModel.closed) return err({ kind: 'session-closed', classification: 'systemic' })
  if (writeModel.questions.has(command.questionId)) return ok([])
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

const decideAnswerQuestion = (
  writeModel: SessionWriteModel,
  command: CommandOf<'Answer Question'>,
): Decision => {
  const status = writeModel.questions.get(command.questionId)
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

const decideRevealKnowledgeGap = (
  writeModel: SessionWriteModel,
  command: CommandOf<'Reveal Knowledge Gap'>,
): Decision => {
  const status = writeModel.questions.get(command.questionId)
  if (status === undefined || status === 'resolved') return ok([])
  return ok([
    {
      v: 1,
      type: 'Knowledge Gap Revealed',
      sessionId: command.sessionId,
      questionId: command.questionId,
      byContributionId: command.byContributionId,
      ...(command.detail === undefined ? {} : { detail: command.detail }),
      at: command.at,
    },
  ])
}

const decideConfirmCompletePerspective = (
  writeModel: SessionWriteModel,
  command: CommandOf<'Confirm Complete Perspective'>,
): Decision => {
  const status = writeModel.questions.get(command.questionId)
  if (status === undefined || status === 'resolved') return ok([])
  return ok([
    {
      v: 1,
      type: 'Complete Perspective Confirmed',
      sessionId: command.sessionId,
      questionId: command.questionId,
      byContributionId: command.byContributionId,
      at: command.at,
    },
  ])
}

/**
 * Once per `(questionId, personName)` — a second naming of the same person on the
 * same question is `ok([])`. Not gated on the question being open: naming the
 * first absent stakeholder resolves the question, and a second distinct name in
 * the same interpretation must still land.
 */
const decideNameAbsentStakeholder = (
  writeModel: SessionWriteModel,
  command: CommandOf<'Name Absent Stakeholder'>,
): Decision => {
  if (!writeModel.questions.has(command.questionId)) return ok([])
  if (writeModel.absentStakeholders.has(`${command.questionId}::${command.personName}`)) {
    return ok([])
  }
  return ok([
    {
      v: 1,
      type: 'Absent Stakeholder Named',
      sessionId: command.sessionId,
      questionId: command.questionId,
      byContributionId: command.byContributionId,
      personName: command.personName,
      at: command.at,
    },
  ])
}

const decideInterpret = (
  writeModel: SessionWriteModel,
  command: CommandOf<'Interpret Contribution'>,
): Decision => {
  if (writeModel.closed) return ok([])
  if (writeModel.interpreted.has(command.contributionId)) return ok([])
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

const decideFailInterpretation = (
  writeModel: SessionWriteModel,
  command: CommandOf<'Fail Interpretation'>,
): Decision => {
  if (writeModel.closed) return ok([])
  if (writeModel.interpreted.has(command.contributionId)) return ok([])
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

const decideAttribute = (command: CommandOf<'Attribute Contribution'>): Decision =>
  ok([
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

const decideClose = (writeModel: SessionWriteModel, command: CommandOf<'Close Session'>): Decision => {
  if (writeModel.closed) return ok([])
  const unresolvedQuestionIds = [...writeModel.questions]
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
  writeModel: SessionWriteModel,
  command: SessionCommand,
): Result<SessionEvent[], SessionRejection> => {
  switch (command.type) {
    case 'Start Session':
      return decideStart(writeModel, command)
    case 'Make Contribution':
      return decideMakeContribution(writeModel, command)
    case 'Ask Question':
      return decideAskQuestion(writeModel, command)
    case 'Answer Question':
      return decideAnswerQuestion(writeModel, command)
    case 'Interpret Contribution':
      return decideInterpret(writeModel, command)
    case 'Fail Interpretation':
      return decideFailInterpretation(writeModel, command)
    case 'Reveal Knowledge Gap':
      return decideRevealKnowledgeGap(writeModel, command)
    case 'Name Absent Stakeholder':
      return decideNameAbsentStakeholder(writeModel, command)
    case 'Confirm Complete Perspective':
      return decideConfirmCompletePerspective(writeModel, command)
    case 'Attribute Contribution':
      return decideAttribute(command)
    case 'Close Session':
      return decideClose(writeModel, command)
  }
}
