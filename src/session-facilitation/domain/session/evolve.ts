import type { SessionEvent } from '../schema/events.ts'
import type { SessionWriteModel } from './model.ts'

/** The `Session` write-model fold — pure, returns a new model. */
export const evolve = (writeModel: SessionWriteModel, event: SessionEvent): SessionWriteModel => {
  const next: SessionWriteModel = {
    ...writeModel,
    questions: new Map(writeModel.questions),
    interpreted: new Set(writeModel.interpreted),
  }

  switch (event.type) {
    case 'Session Started':
      next.started = true
      return next
    case 'Contribution Interpreted':
      next.interpreted.add(event.contributionId)
      return next
    case 'Contribution Interpretation Failed':
      next.interpreted.add(event.contributionId)
      return next
    case 'Question Asked':
      next.questions.set(event.questionId, 'open')
      return next
    case 'Question Answered':
    case 'Knowledge Gap Revealed':
    case 'Absent Stakeholder Named':
    case 'Complete Perspective Confirmed':
      next.questions.set(event.questionId, 'resolved')
      return next
    case 'Session Closed':
      next.closed = true
      return next
    case 'Contribution Made':
    case 'Contribution Attributed To Another Format':
      return next
  }
}
