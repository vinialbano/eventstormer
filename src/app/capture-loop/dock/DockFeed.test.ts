import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import type { ProposalCard } from '../types.ts'
import DockFeed from './DockFeed.vue'
import type { FeedItem } from './composables/use-dock-feed.ts'

// Suite: DockFeed
// Invariant: The live cluster renders every proposal card kind — building block and model change.
// Boundary IN: cluster rendering of a model-change card, its pill + summary.
// Boundary OUT: feed assembly (use-dock-feed.test.ts), review wiring (FacilitatorDock.test.ts).

const card = (over: Partial<ProposalCard>): ProposalCard => ({
  proposalId: 'p1',
  contributionId: 'c1',
  disposition: 'PROPOSED',
  held: false,
  overflow: false,
  ...over,
})

const props = (feed: FeedItem[]) => ({
  showGettingStarted: false,
  showScopeCard: false,
  showFirstPrompt: false,
  scopeState: { status: 'set' as const },
  feed,
  blockLabels: {} as Record<string, string>,
  accepter: 'Maria',
  pulsingId: null,
  acceptableInCluster: (cards: ProposalCard[]) => cards,
})

describe('DockFeed', () => {
  it('renders a model-change card in the live cluster with its intent pill and summary', () => {
    const relation = card({
      intent: { kind: 'relation', summary: 'sequence: Order placed → Order cooked' },
    })
    const feed: FeedItem[] = [
      { type: 'cluster', key: 'c1', cards: [relation], sourceText: 'The order is cooked after it is placed.' },
    ]

    const wrapper = mount(DockFeed, { props: props(feed) })

    expect(wrapper.get('.pc__pill').text()).toBe('RELATION')
    expect(wrapper.get('.pc__label').text()).toBe('sequence: Order placed → Order cooked')
    expect(wrapper.get('.pc--active').attributes('aria-label')).toBe(
      'Proposal: sequence: Order placed → Order cooked',
    )
  })

  it('forwards edit-intent from a reword card with the proposal id', async () => {
    const reword = card({
      intent: { kind: 'reword', summary: 'reword: Order goes in → Order placed', newLabel: 'Order placed' },
    })
    const feed: FeedItem[] = [{ type: 'cluster', key: 'c1', cards: [reword], sourceText: 'Call it order placed.' }]

    const wrapper = mount(DockFeed, { props: props(feed) })

    const named = (name: string) => wrapper.findAll('button').find((button) => button.text() === name)
    await named('Not this')?.trigger('click')
    await named('Edit')?.trigger('click')
    await wrapper.get('input').setValue('Order submitted')
    await wrapper.get('input').trigger('keydown.enter')

    expect(wrapper.emitted('edit-intent')).toEqual([['p1', { newLabel: 'Order submitted' }]])
  })
})
