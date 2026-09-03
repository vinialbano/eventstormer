import type { ContributionId, QuestionId, SessionId, WorkshopId } from '~/plumbing/ids.ts'
import type { InterpretedTrack } from '../schema/interpreted-track.ts'

/**
 * The `Session` write model. `OPEN → CLOSED` (terminal). Holds the open-questions
 * map and the interpret-once ledger (a `contributionId` lands in it whether
 * interpretation succeeded or failed — so it is never retried forever).
 */
export interface SessionWriteModel {
  started: boolean
  closed: boolean
  questions: Map<QuestionId, 'open' | 'resolved'>
  /** The ids of every `Question Asked {kind:'scope'}`. The scope question is
   * answered by `Scope Set` on the `Workshop`, not by a `Session` event, so it is
   * excluded from the close sweep's unresolved-question set. */
  scopeQuestions: Set<QuestionId>
  interpreted: Set<ContributionId>
  /** `${questionId}::${personName}` for every absent stakeholder already named —
   * `Name Absent Stakeholder` is once per pair. */
  absentStakeholders: Set<string>
}

export const emptySession = (): SessionWriteModel => ({
  started: false,
  closed: false,
  questions: new Map(),
  scopeQuestions: new Set(),
  interpreted: new Set(),
  absentStakeholders: new Set(),
})

/** Why a `Session` command was rejected — every reason is *systemic*. */
export type SessionRejection =
  | { kind: 'not-started'; classification: 'systemic' }
  | { kind: 'already-started'; classification: 'systemic' }
  | { kind: 'session-closed'; classification: 'systemic' }
  | { kind: 'empty-contribution'; classification: 'systemic' }
  | { kind: 'contribution-too-long'; classification: 'systemic' }
  | { kind: 'unknown-question'; classification: 'systemic' }
  | { kind: 'question-already-resolved'; classification: 'systemic' }

export type SessionCommand =
  | { type: 'Start Session'; sessionId: SessionId; workshopId: WorkshopId; at: string }
  | {
      type: 'Make Contribution'
      sessionId: SessionId
      contributionId: ContributionId
      speaker: string
      body: string
      at: string
    }
  | {
      type: 'Ask Question'
      sessionId: SessionId
      questionId: QuestionId
      kind: 'scope' | 'phase' | 'free' | 'stakeholder'
      text: string
      scopeStatement?: string
      at: string
    }
  | {
      type: 'Answer Question'
      sessionId: SessionId
      questionId: QuestionId
      byContributionId: ContributionId
      at: string
    }
  | {
      type: 'Interpret Contribution'
      sessionId: SessionId
      contributionId: ContributionId
      tracks: InterpretedTrack[]
      askQuestionId?: QuestionId
      askQuestionText?: string
      at: string
    }
  | {
      type: 'Fail Interpretation'
      sessionId: SessionId
      contributionId: ContributionId
      reason: string
      at: string
    }
  | {
      type: 'Attribute Contribution'
      sessionId: SessionId
      contributionId: ContributionId
      format: string
      note: string
      at: string
    }
  | {
      type: 'Reveal Knowledge Gap'
      sessionId: SessionId
      questionId: QuestionId
      byContributionId: ContributionId
      detail?: string
      at: string
    }
  | {
      type: 'Name Absent Stakeholder'
      sessionId: SessionId
      questionId: QuestionId
      byContributionId: ContributionId
      personName: string
      at: string
    }
  | {
      type: 'Confirm Complete Perspective'
      sessionId: SessionId
      questionId: QuestionId
      byContributionId: ContributionId
      at: string
    }
  | { type: 'Close Session'; sessionId: SessionId; workshopId: WorkshopId; at: string }
