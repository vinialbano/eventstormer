import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import type { HotSpotCallout } from '../../types.ts'
import HotSpotBadge from './HotSpotBadge.vue'

// Suite: HotSpotBadge
// Invariant: A callout pinned to a target sticky shows its reference only when resolved,
//   is keyboard-reachable, and is announced with a kind + label name.
// Boundary IN: HotSpotBadge render with literal callout props at an anchor.
// Boundary OUT: anchor geometry (layout.test.ts), the wall legend (HotSpotPanel.test.ts).

const callout = (over: Partial<HotSpotCallout> = {}): HotSpotCallout => ({
  hotSpotId: 'h1',
  label: 'Refund path unclear',
  modelAffecting: true,
  resolved: false,
  reference: null,
  ...over,
})

describe('HotSpotBadge', () => {
  it('renders a resolved callout with its reference and a resolved accessible name', () => {
    const wrapper = mount(HotSpotBadge, {
      props: {
        x: 100,
        y: 40,
        callouts: [callout({ resolved: true, reference: 'we added a retry step' })],
      },
    })
    const pin = wrapper.get('.hsb__pin')
    expect(pin.get('.hsb__ref').text()).toBe('we added a retry step')
    expect(pin.attributes('aria-label')).toBe(
      'Resolved hot spot: Refund path unclear — we added a retry step',
    )
  })

  it('renders an open callout with no reference and an open accessible name', () => {
    const wrapper = mount(HotSpotBadge, {
      props: { x: 100, y: 40, callouts: [callout()] },
    })
    const pin = wrapper.get('.hsb__pin')
    expect(pin.find('.hsb__ref').exists()).toBe(false)
    expect(pin.attributes('aria-label')).toBe('Open hot spot: Refund path unclear')
  })

  it('makes every callout keyboard-reachable', () => {
    const wrapper = mount(HotSpotBadge, {
      props: {
        x: 0,
        y: 0,
        callouts: [callout({ hotSpotId: 'h1' }), callout({ hotSpotId: 'h2', label: 'Second' })],
      },
    })
    const pins = wrapper.findAll('.hsb__pin')
    expect(pins).toHaveLength(2)
    expect(pins.every((pin) => pin.attributes('tabindex') === '0')).toBe(true)
  })

  it('positions the badge at the supplied anchor', () => {
    const wrapper = mount(HotSpotBadge, {
      props: { x: 172, y: 86, callouts: [callout()] },
    })
    expect(wrapper.get('.hsb').attributes('style')).toContain('left: 172px')
    expect(wrapper.get('.hsb').attributes('style')).toContain('top: 86px')
  })
})
