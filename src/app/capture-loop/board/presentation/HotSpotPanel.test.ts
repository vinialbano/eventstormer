import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import type { HotSpotCallout, HotSpotView } from '../../types.ts'
import HotSpotPanel from './HotSpotPanel.vue'

// Suite: HotSpotPanel
// Invariant: The wall legend shows the running count, names each annotated hot spot's target,
//   and shows a reference only for a resolved hot spot.
// Boundary IN: HotSpotPanel render with literal HotSpotView + blockLabels props.
// Boundary OUT: anchor geometry (layout.test.ts), on-sticky badge (HotSpotBadge.test.ts).

const callout = (over: Partial<HotSpotCallout> = {}): HotSpotCallout => ({
  hotSpotId: 'h1',
  label: 'Refund path unclear',
  modelAffecting: true,
  resolved: false,
  reference: null,
  ...over,
})

const view = (over: Partial<HotSpotView> = {}): HotSpotView => ({
  annotated: new Map(),
  unannotated: [],
  count: 0,
  ...over,
})

describe('HotSpotPanel', () => {
  it('renders the running count from the view', () => {
    const wrapper = mount(HotSpotPanel, {
      props: { hotSpots: view({ count: 3 }), blockLabels: {} },
    })
    expect(wrapper.get('[role="status"]').text()).toBe('Hot spots 3')
  })

  it('shows a resolved hot spot with its reference and the target it marks', () => {
    const wrapper = mount(HotSpotPanel, {
      props: {
        hotSpots: view({
          annotated: new Map([['eA', [callout({ resolved: true, reference: 'we added a retry step' })]]]),
          count: 1,
        }),
        blockLabels: { eA: 'Payment captured' },
      },
    })
    const row = wrapper.get('.hsp__row')
    expect(row.text()).toContain('on Payment captured')
    expect(row.text()).toContain('Resolved — we added a retry step')
  })

  it('shows an open annotated hot spot without any reference text', () => {
    const wrapper = mount(HotSpotPanel, {
      props: {
        hotSpots: view({
          annotated: new Map([['eA', [callout({ resolved: false, reference: null })]]]),
          count: 1,
        }),
        blockLabels: { eA: 'Payment captured' },
      },
    })
    const row = wrapper.get('.hsp__row')
    expect(row.text()).not.toContain('Resolved')
    expect(row.find('.hsp__resolved').exists()).toBe(false)
  })

  it('lists an unannotated hot spot as a plain row, not an error', () => {
    const wrapper = mount(HotSpotPanel, {
      props: {
        hotSpots: view({ unannotated: [callout({ label: 'Who owns dunning?' })], count: 1 }),
        blockLabels: {},
      },
    })
    const row = wrapper.get('.hsp__row')
    expect(row.text()).toContain('Who owns dunning?')
    expect(row.text()).not.toContain('on ')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })
})
