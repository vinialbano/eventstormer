import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import BoardWall from './BoardWall.vue'

describe('BoardWall', () => {
  it('renders one backlog sticky per applied block, labelled by kind + text', () => {
    const wrapper = mount(BoardWall, {
      props: {
        blocks: [
          { id: 'b1', kind: 'domain-event', label: 'Order placed' },
          { id: 'b2', kind: 'domain-event', label: 'Order confirmed' },
          { id: 'b3', kind: 'actor', label: 'Waiter' },
        ],
      },
    })

    const stickies = wrapper.findAll('.sticky')
    expect(stickies).toHaveLength(3)
    expect(stickies.map((s) => s.text())).toEqual(['Order placed', 'Order confirmed', 'Waiter'])
    expect(stickies.map((s) => s.attributes('aria-label'))).toEqual([
      'event: Order placed',
      'event: Order confirmed',
      'actor: Waiter',
    ])
    expect(wrapper.get('[role="list"]').attributes('data-empty')).toBe('false')
  })

  it('renders the empty framed wall with no stickies when the board is empty', () => {
    const wrapper = mount(BoardWall, { props: { blocks: [] } })

    expect(wrapper.findAll('.sticky')).toHaveLength(0)
    expect(wrapper.get('[role="list"]').attributes('data-empty')).toBe('true')
    // frame + time arrow still drawn
    expect(wrapper.find('.wall__ink rect').exists()).toBe(true)
    expect(wrapper.text()).toContain('backlog')
    expect(wrapper.text()).toContain('time')
  })

  it('never renders a pending-proposal ghost on the wall', () => {
    const wrapper = mount(BoardWall, {
      props: { blocks: [{ id: 'b1', kind: 'domain-event', label: 'Order placed' }] },
    })
    expect(wrapper.find('.sticky--ghost').exists()).toBe(false)
    expect(wrapper.find('[data-ghost]').exists()).toBe(false)
  })
})
