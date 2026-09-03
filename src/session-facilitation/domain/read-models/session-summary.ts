import type { ProposalId } from '~/plumbing/ids.ts'
import type { SessionEvent } from '../schema/events.ts'

/**
 * Read-time projections over a `Session` stream — no summary is ever frozen
 * into an event. `blocksAdded` is supplied by the caller: it is the
 * count of `Operation Applied` events across this session's `Proposal` streams
 * (operations carry no `sessionId`, so the count comes from the facilitation
 * side).
 */

export interface SessionSummary {
  blocksAdded: number
  questionsAsked: number
  questionsAnswered: number
  questionsUnresolved: number
  contributionCount: number
  /** The last 8 transcript lines, oldest first. */
  recentTurns: string[]
}

const RECENT_TURNS = 8

/** Every `proposalId` this session proposed — a fold over `Contribution Interpreted` tracks. */
export const sessionProposalIds = (events: SessionEvent[]): ProposalId[] => {
  const ids: ProposalId[] = []
  for (const event of events) {
    if (event.type !== 'Contribution Interpreted') continue
    for (const track of event.tracks) {
      if (track.track === 'propose-building-block') ids.push(track.proposalId)
    }
  }
  return ids
}

export const sessionSummary = (events: SessionEvent[], blocksAdded: number): SessionSummary => {
  let questionsAsked = 0
  let questionsAnswered = 0
  let contributionCount = 0
  const openQuestions = new Set<string>()
  const turns: string[] = []

  for (const event of events) {
    switch (event.type) {
      case 'Contribution Made':
        contributionCount += 1
        turns.push(`${event.speaker}: ${event.body}`)
        break
      case 'Question Asked':
        questionsAsked += 1
        openQuestions.add(event.questionId)
        turns.push(`facilitator: ${event.text}`)
        break
      case 'Question Answered':
        questionsAnswered += 1
        openQuestions.delete(event.questionId)
        break
      case 'Knowledge Gap Revealed':
      case 'Absent Stakeholder Named':
      case 'Complete Perspective Confirmed':
        openQuestions.delete(event.questionId)
        break
      case 'Session Started':
      case 'Contribution Interpreted':
      case 'Contribution Interpretation Failed':
      case 'Contribution Attributed To Another Format':
      case 'Session Closed':
        break
    }
  }

  return {
    blocksAdded,
    questionsAsked,
    questionsAnswered,
    questionsUnresolved: openQuestions.size,
    contributionCount,
    recentTurns: turns.slice(-RECENT_TURNS),
  }
}

/**
 * Compose a `sessionSummary` per closed session, order preserved (the caller
 * passes them oldest-first, via `session_index` `ORDER BY started_at`).
 */
export const priorSessionHistory = (
  closed: { events: SessionEvent[]; blocksAdded: number }[],
): SessionSummary[] => closed.map((closedSession) => sessionSummary(closedSession.events, closedSession.blocksAdded))
