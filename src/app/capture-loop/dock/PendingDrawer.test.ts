import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import type { ProposalCard } from '../types.ts'
import PendingDrawer from './PendingDrawer.vue'

const card = (over: Partial<ProposalCard>): ProposalCard => ({
  proposalId: 'p',
  contributionId: 'c1',
  blockKind: 'domain-event',
  label: 'x',
  bar: 'strict',
  disposition: 'PROPOSED',
  held: false,
  overflow: false,
  ...over,
})

// Suite: PendingDrawer
// Invariant: The pending drawer lists parked and awaiting groups and emits jump / accept-all intents.
// Boundary IN: row grouping, accept-all-remaining visibility, empty state.
// Boundary OUT: accept-all transport (use-review-proposal.test.ts), dock open/jump wiring (FacilitatorDock.test.ts).

describe('PendingDrawer', () => {
  it('lists parked and awaiting groups with counts, and emits jump on a row click', async () => {
    const wrapper = mount(PendingDrawer, {
      props: {
        parked: [card({ proposalId: 'p1', label: 'Runner', held: true })],
        awaiting: [
          card({ proposalId: 'p2', label: 'Order confirmed' }),
          card({ proposalId: 'p3', label: 'Cooking started' }),
        ],
      },
    })

    expect(wrapper.get('h3').text()).toContain('Parked by you')
    expect(wrapper.findAll('h3')[1]?.text()).toContain('Awaiting review')
    expect(wrapper.findAll('.drawer__row')).toHaveLength(3)

    await wrapper.findAll('.drawer__row')[1]?.trigger('click')
    expect(wrapper.emitted('jump')).toEqual([['p2']])
  })

  it('lists a Resolutions group and emits jump-resolution on a row click', async () => {
    const wrapper = mount(PendingDrawer, {
      props: {
        parked: [],
        awaiting: [],
        resolutions: [
          {
            resolutionId: 'r1',
            hotSpotId: 'h1',
            reference: 'we added a retry step',
            disposition: 'PROPOSED' as const,
          },
        ],
      },
    })

    expect(wrapper.findAll('h3').some((heading) => heading.text().includes('Resolutions'))).toBe(true)
    expect(wrapper.find('.drawer__empty').exists()).toBe(false)
    await wrapper.get('.drawer__row').trigger('click')
    expect(wrapper.emitted('jump-resolution')).toEqual([['r1']])
  })

  it('offers Accept all remaining only when something is awaiting, and never a reject-all', () => {
    const withAwaiting = mount(PendingDrawer, { props: { parked: [], awaiting: [card({ proposalId: 'p2' })] } })
    expect(withAwaiting.get('.drawer__acceptall').text()).toBe('Accept all remaining')
    expect(withAwaiting.text().toLowerCase()).not.toContain('reject all')

    const nothingAwaiting = mount(PendingDrawer, {
      props: { parked: [card({ proposalId: 'p1', held: true })], awaiting: [] },
    })
    expect(nothingAwaiting.find('.drawer__acceptall').exists()).toBe(false)
  })

  it('emits accept-all when Accept all remaining is clicked', async () => {
    const wrapper = mount(PendingDrawer, {
      props: { parked: [], awaiting: [card({ proposalId: 'p2', label: 'Order confirmed' })] },
    })

    await wrapper.get('.drawer__acceptall').trigger('click')

    expect(wrapper.emitted('accept-all')).toEqual([[]])
  })

  it('shows an empty line when nothing is pending', () => {
    const wrapper = mount(PendingDrawer, { props: { parked: [], awaiting: [] } })
    expect(wrapper.get('.drawer__empty').text()).toBe('Nothing pending.')
  })
})
