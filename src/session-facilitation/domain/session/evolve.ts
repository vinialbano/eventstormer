import type { SessionEvent } from '../schema/events.ts'
import type { SessionWriteModel } from './model.ts'

/** The `Session` write-model fold — pure, returns a new model. */
export const evolve = (wm: SessionWriteModel, e: SessionEvent): SessionWriteModel => {
  const next: SessionWriteModel = {
    ...wm,
    questions: new Map(wm.questions),
    interpreted: new Set(wm.interpreted),
  }

  switch (e.type) {
    case 'Session Started':
      next.started = true
      return next
    case 'Contribution Interpreted':
      next.interpreted.add(e.contributionId)
      return next
    case 'Contribution Interpretation Failed':
      next.interpreted.add(e.contributionId)
      return next
    case 'Question Asked':
      next.questions.set(e.questionId, 'open')
      return next
    case 'Question Answered':
      next.questions.set(e.questionId, 'resolved')
      return next
    case 'Session Closed':
      next.closed = true
      return next
    case 'Contribution Made':
    case 'Contribution Attributed To Another Format':
      return next
  }
}
