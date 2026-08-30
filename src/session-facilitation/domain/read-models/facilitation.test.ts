import { describe, expect, it } from 'vitest'
import type { SessionSummary } from './session-summary.ts'
import { facilitationAgenda, facilitationContext } from './facilitation.ts'

const summary: SessionSummary = {
  blocksAdded: 2,
  questionsAsked: 1,
  questionsAnswered: 1,
  questionsUnresolved: 0,
  contributionCount: 3,
  recentTurns: ['Dana: hello'],
}

describe('facilitationContext — assembly', () => {
  it('passes scope, prior summaries, questions and blocks through and trims the transcript to the last 20', () => {
    const transcript = Array.from({ length: 25 }, (_, i) => `line ${String(i)}`)
    const context = facilitationContext({
      recentTranscript: transcript,
      openQuestions: ['Is fulfilment a phase?'],
      scopeStatement: 'Library lending.',
      priorSummaries: [summary],
      buildingBlocks: [{ kind: 'domain-event', label: 'Loan recorded' }],
    })
    expect(context.recentTranscript).toHaveLength(20)
    expect(context.recentTranscript[0]).toBe('line 5')
    expect(context.recentTranscript.at(-1)).toBe('line 24')
    expect(context.scopeStatement).toBe('Library lending.')
    expect(context.openQuestions).toEqual(['Is fulfilment a phase?'])
    expect(context.priorSummaries).toEqual([summary])
    expect(context.buildingBlocks).toEqual([{ kind: 'domain-event', label: 'Loan recorded' }])
  })

  it('omits scopeStatement when none is supplied', () => {
    const context = facilitationContext({
      recentTranscript: [],
      openQuestions: [],
      priorSummaries: [],
      buildingBlocks: [],
    })
    expect(context).not.toHaveProperty('scopeStatement')
  })
})

describe('facilitationAgenda — derived, no stakeholder input', () => {
  it('is the open questions plus building blocks that read like un-expanded phase names', () => {
    expect(
      facilitationAgenda({
        openQuestions: ['Who reshelves it?'],
        buildingBlocks: [
          { kind: 'domain-event', label: 'Loan recorded' },
          { kind: 'domain-event', label: 'Fulfilment' },
          { kind: 'domain-event', label: 'Member borrowed a book' },
          { kind: 'domain-event', label: 'Reservations' },
        ],
      }),
    ).toEqual(['Who reshelves it?', 'Fulfilment', 'Reservations'])
  })
})
