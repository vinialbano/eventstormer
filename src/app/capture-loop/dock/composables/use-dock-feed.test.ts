import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import type { ProposalCard, SessionView } from '../../types.ts'
import { useDockFeed } from './use-dock-feed.ts'

const card = (over: Partial<ProposalCard> = {}): ProposalCard => ({
  proposalId: 'p1',
  contributionId: 'c1',
  blockKind: 'domain-event',
  label: 'Order placed',
  bar: 'strict',
  disposition: 'PROPOSED',
  held: false,
  overflow: false,
  ...over,
})

const view = (over: Partial<SessionView> = {}): SessionView => ({
  sessionId: 's1',
  sessionOpen: true,
  creatorName: 'Maria',
  scope: { status: 'set' },
  transcript: [],
  openQuestions: [],
  contributions: [],
  fullyDerived: true,
  ...over,
})

const dockFeed = (
  sessionView: SessionView | null,
  cards: ProposalCard[] = [],
  sessionId: string | null = 's1',
) => {
  const sessionReference = ref(sessionView)
  const cardsReference = ref(cards)
  const sessionIdReference = ref(sessionId)
  const feed = useDockFeed(sessionReference, cardsReference, sessionIdReference)
  return { sessionReference, cardsReference, sessionIdReference, ...feed }
}

// Suite: use-dock-feed
// Invariant: Feed items, scope-card visibility, and pending grouping match session + proposal state.
// Boundary IN: feed assembly, scope-card flags, parked/awaiting counts in the dock composable.
// Boundary OUT: DOM rendering (FacilitatorDock.test.ts), proposal actions (use-review-proposal.test.ts).

describe('useDockFeed', () => {
  it('welds proposal cards into a cluster after their contribution turn', () => {
    const { feed } = dockFeed(
      view({
        transcript: [
          { kind: 'question', speaker: 'facilitator', text: 'What happens first?', at: 't1' },
          {
            kind: 'contribution',
            speaker: 'Maria',
            text: 'A customer places an order.',
            at: 't2',
            contributionId: 'c1',
          },
        ],
        contributions: [{ contributionId: 'c1', status: 'interpreted' }],
      }),
      [card(), card({ proposalId: 'p2', label: 'Order confirmed' })],
    )

    expect(feed.value.map((item) => item.type)).toEqual(['turn', 'turn', 'cluster'])
    const cluster = feed.value[2]
    expect(cluster?.type).toBe('cluster')
    if (cluster?.type !== 'cluster') throw new Error('expected a cluster item')
    expect(cluster.cards).toHaveLength(2)
    expect(cluster.sourceText).toBe('A customer places an order.')
  })

  it('skips scope questions in the transcript feed', () => {
    const { feed } = dockFeed(
      view({
        scope: { status: 'proposed', proposedStatement: 'Restaurant service.' },
        transcript: [
          {
            kind: 'question',
            speaker: 'facilitator',
            text: 'What are we mapping?',
            at: 't0',
            questionKind: 'scope',
          },
          { kind: 'question', speaker: 'facilitator', text: 'What happens first?', at: 't1' },
        ],
      }),
    )

    expect(feed.value).toHaveLength(1)
    expect(feed.value[0]).toMatchObject({ type: 'turn', text: 'What happens first?' })
  })

  it('appends a rephrase notice when a contribution failed and nothing followed', () => {
    const { feed } = dockFeed(
      view({
        transcript: [
          { kind: 'contribution', speaker: 'Maria', text: 'zzz', at: 't1', contributionId: 'c1' },
        ],
        contributions: [{ contributionId: 'c1', status: 'failed' }],
      }),
    )

    expect(feed.value).toHaveLength(2)
    expect(feed.value[1]).toMatchObject({
      type: 'turn',
      kind: 'notice',
      text: "I couldn't make sense of that one — try rephrasing it.",
    })
  })

  it('appends a noted notice when a contribution derived with no proposals', () => {
    const { feed } = dockFeed(
      view({
        transcript: [
          {
            kind: 'contribution',
            speaker: 'Maria',
            text: 'Hmm, let me think.',
            at: 't1',
            contributionId: 'c1',
          },
        ],
        contributions: [{ contributionId: 'c1', status: 'derived' }],
      }),
    )

    expect(feed.value).toHaveLength(2)
    expect(feed.value[1]).toMatchObject({
      type: 'turn',
      kind: 'notice',
      text: 'Noted — nothing to capture from that one.',
    })
  })

  it('does not append a notice when the facilitator already answered with a question', () => {
    const { feed } = dockFeed(
      view({
        transcript: [
          { kind: 'contribution', speaker: 'Maria', text: 'zzz', at: 't1', contributionId: 'c1' },
          {
            kind: 'question',
            speaker: 'facilitator',
            text: 'Could you say that another way?',
            at: 't2',
            questionKind: 'free',
          },
        ],
        contributions: [{ contributionId: 'c1', status: 'failed' }],
      }),
    )

    expect(feed.value).toHaveLength(2)
    expect(feed.value.every((item) => item.type !== 'turn' || item.kind !== 'notice')).toBe(true)
  })

  it('does not append a noted notice when the next turn is a notice', () => {
    const { feed } = dockFeed(
      view({
        transcript: [
          {
            kind: 'contribution',
            speaker: 'Maria',
            text: 'A phase of work.',
            at: 't1',
            contributionId: 'c1',
          },
          { kind: 'notice', speaker: 'facilitator', text: 'Already handled.', at: 't2' },
        ],
        contributions: [{ contributionId: 'c1', status: 'derived' }],
      }),
    )

    expect(feed.value).toHaveLength(2)
    expect(feed.value[1]?.type).toBe('turn')
    if (feed.value[1]?.type === 'turn') {
      expect(feed.value[1].kind).toBe('notice')
      expect(feed.value[1].text).toBe('Already handled.')
    }
  })

  it('shows the scope card while scope is proposed and not dismissed', () => {
    const { showScopeCard, dismissScopeCard } = dockFeed(
      view({ scope: { status: 'proposed', proposedStatement: 'Restaurant service.' } }),
    )

    expect(showScopeCard.value).toBe(true)
    dismissScopeCard()
    expect(showScopeCard.value).toBe(false)
  })

  it('shows getting started when the session exists but scope is unset', () => {
    const started = dockFeed(view({ scope: { status: 'none' } }))
    expect(started.showGettingStarted.value).toBe(true)
    expect(started.showFirstPrompt.value).toBe(false)

    const noSession = dockFeed(view({ scope: { status: 'none' } }), [], null)
    expect(noSession.showGettingStarted.value).toBe(false)
  })

  it('shows the first prompt once scope is set', () => {
    const { showFirstPrompt, showGettingStarted, showScopeCard } = dockFeed(view({ scope: { status: 'set' } }))

    expect(showFirstPrompt.value).toBe(true)
    expect(showGettingStarted.value).toBe(false)
    expect(showScopeCard.value).toBe(false)
  })

  it('groups actionable cards into parked, awaiting, and pending counts', () => {
    const { parked, awaiting, pendingCount, anyHeld } = dockFeed(view(), [
      card({ proposalId: 'p1', disposition: 'PROPOSED' }),
      card({ proposalId: 'p2', disposition: 'EDITED', held: true }),
      card({ proposalId: 'p3', disposition: 'APPLY_FAILED' }),
      card({ proposalId: 'p4', disposition: 'APPLIED' }),
      card({ proposalId: 'p5', disposition: 'REJECTED' }),
    ])

    expect(pendingCount.value).toBe(3)
    expect(parked.value.map((item) => item.proposalId)).toEqual(['p2'])
    expect(awaiting.value.map((item) => item.proposalId)).toEqual(['p1', 'p3'])
    expect(anyHeld.value).toBe(true)
  })

  it('returns only non-held actionable cards from acceptableInCluster', () => {
    const { acceptableInCluster } = dockFeed(view(), [
      card({ proposalId: 'p1', disposition: 'PROPOSED' }),
      card({ proposalId: 'p2', disposition: 'PROPOSED', held: true }),
      card({ proposalId: 'p3', disposition: 'APPLIED' }),
      card({ proposalId: 'p4', disposition: 'EDITED' }),
    ])

    expect(acceptableInCluster([
      card({ proposalId: 'p1' }),
      card({ proposalId: 'p2', held: true }),
      card({ proposalId: 'p3', disposition: 'APPLIED' }),
      card({ proposalId: 'p4', disposition: 'EDITED' }),
    ]).map((item) => item.proposalId)).toEqual(['p1', 'p4'])
  })

  it('excludes overflow cards from cluster welding', () => {
    const { feed } = dockFeed(
      view({
        transcript: [
          {
            kind: 'contribution',
            speaker: 'Maria',
            text: 'A customer places an order.',
            at: 't1',
            contributionId: 'c1',
          },
        ],
        contributions: [{ contributionId: 'c1', status: 'derived' }],
      }),
      [card({ overflow: true })],
    )

    expect(feed.value.some((item) => item.type === 'cluster')).toBe(false)
    expect(feed.value).toHaveLength(2)
    expect(feed.value[1]).toMatchObject({
      type: 'turn',
      kind: 'notice',
      text: 'Noted — nothing to capture from that one.',
    })
  })
})
