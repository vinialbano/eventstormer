import { describe, expect, it } from 'vitest'
import type { FacilitationContext } from '../../domain/read-models/facilitation.ts'
import { buildInstructions, buildTurnInput } from './prompt.ts'

describe('buildInstructions — the system prompt (ADR-005)', () => {
  const instructions = buildInstructions().toLowerCase()

  it('states the role, the asymmetric bar, the Big-Picture legend, the phase rule, and the move menu', () => {
    expect(instructions).toContain('facilitator')
    expect(instructions).toContain('asymmetric bar')
    expect(instructions).toContain('lenient')
    expect(instructions).toContain('strict')
    expect(instructions).toContain('domain-event')
    expect(instructions).toContain('actor')
    expect(instructions).toContain('system')
    expect(instructions).toContain('phase rule')
    expect(instructions).toContain('flag-phase')
    expect(instructions).toContain('nextmove')
  })

  it('states the output contract including the 12-strand ceiling and the id/v/author exclusion', () => {
    expect(instructions).toContain('{ interpretation, nextmove }')
    expect(instructions).toContain('12')
    expect(instructions).toContain('do not emit v, author, or ids')
  })

  it('names the three model-change strands with when-to-use guidance', () => {
    expect(instructions).toContain('propose-relation')
    expect(instructions).toContain('implies an order, a cause, a placement')
    expect(instructions).toContain('propose-pivotal')
    expect(instructions).toContain('spine worth navigating')
    expect(instructions).toContain('propose-reword')
    expect(instructions).toContain('only when the model already has structure')
  })

  it('draws its few-shot examples from library lending, never the restaurant/kitchen eval domain', () => {
    expect(instructions).toContain('library lending')
    expect(instructions).toContain('book returned')
    expect(instructions).not.toContain('restaurant')
    expect(instructions).not.toContain('kitchen')
    expect(instructions).not.toContain('waiter')
  })
})

describe('buildTurnInput — per-turn assembly', () => {
  const context: FacilitationContext = {
    recentTranscript: ['Dana: a member joined', 'facilitator: what happens next?'],
    openQuestions: ['What happens after a member joins?'],
    scopeStatement: 'Library lending across branches.',
    priorSummaries: [
      {
        blocksAdded: 4,
        questionsAsked: 2,
        questionsAnswered: 1,
        questionsUnresolved: 1,
        contributionCount: 6,
        recentTurns: [],
      },
    ],
    buildingBlocks: [
      {
        kind: 'domain-event',
        label: 'Book borrowed',
        placement: 'timeline',
        pivotal: true,
        followedBy: ['Book returned'],
        causes: ['Late fee assessed'],
      },
      { kind: 'domain-event', label: 'Book returned', placement: 'timeline', pivotal: false },
      { kind: 'actor', label: 'Member' },
    ],
    timelineEventCount: 2,
  }
  const assembled = buildTurnInput(context, { speaker: 'Dana', body: 'A member borrowed a book.' })

  it('contains the scope, the block list, the prior summaries, the open questions, the transcript, and the new segment', () => {
    expect(assembled).toContain('Library lending across branches.')
    expect(assembled).toContain('domain-event: Book returned')
    expect(assembled).toContain('actor: Member')
    expect(assembled).toContain('4 blocks added')
    expect(assembled).toContain('What happens after a member joins?')
    expect(assembled).toContain('Dana: a member joined')
    expect(assembled).toContain('Dana: A member borrowed a book.')
  })

  it('orders scope → blocks → prior sessions → new contribution', () => {
    const scopeAt = assembled.indexOf('Library lending across branches.')
    const blocksAt = assembled.indexOf('domain-event: Book returned')
    const priorAt = assembled.indexOf('4 blocks added')
    const segmentAt = assembled.indexOf('Dana: A member borrowed a book.')
    expect(scopeAt).toBeLessThan(blocksAt)
    expect(blocksAt).toBeLessThan(priorAt)
    expect(priorAt).toBeLessThan(segmentAt)
  })

  it('renders a "(not set yet)" scope and "(none)" lists when the context is empty', () => {
    const empty = buildTurnInput(
      {
        recentTranscript: [],
        openQuestions: [],
        priorSummaries: [],
        buildingBlocks: [],
        timelineEventCount: 0,
      },
      { speaker: 'Dana', body: 'hello' },
    )
    expect(empty).toContain('(not set yet)')
    expect(empty).toContain('(none)')
    expect(empty).toContain('0 events on the timeline')
  })

  it('renders each placed block with its placement, pivotal marker, and follows/causedBy links', () => {
    expect(assembled).toContain(
      'domain-event: Book borrowed (on timeline; pivotal; then: Book returned; causes: Late fee assessed)',
    )
    expect(assembled).toContain('domain-event: Book returned (on timeline)')
    expect(assembled).toContain('2 events on the timeline')
  })
})
