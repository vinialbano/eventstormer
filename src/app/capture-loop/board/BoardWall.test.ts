import { enableAutoUnmount, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { afterEach, describe, expect, it } from 'vitest'
import BoardWall from './BoardWall.vue'

enableAutoUnmount(afterEach)

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
    expect(stickies.map((sticky) => sticky.text())).toEqual(['Order placed', 'Order confirmed', 'Waiter'])
    expect(stickies.map((sticky) => sticky.attributes('aria-label'))).toEqual([
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

  it('renders a withdrawn sticky as struck-through graphite in the backlog, not as a dashed-ghost', () => {
    const wrapper = mount(BoardWall, {
      props: {
        blocks: [
          { id: 'b1', kind: 'domain-event', label: 'Order placed', withdrawn: true },
          { id: 'b2', kind: 'domain-event', label: 'Order confirmed', withdrawn: false },
        ],
      },
    })

    const stickies = wrapper.findAll('.sticky')
    expect(stickies).toHaveLength(2)
    expect(stickies[0]?.classes()).toContain('sticky--withdrawn')
    expect(stickies[0]?.classes()).not.toContain('sticky--reword')
    expect(stickies[0]?.attributes('data-withdrawn')).toBe('true')
    expect(stickies[1]?.attributes('data-withdrawn')).toBe('false')
    expect(wrapper.get('[role="list"]').attributes('data-empty')).toBe('false')
  })

  it('opens a dashed-ghost with the current label from the pencil or E, and Esc restores', async () => {
    const wrapper = mount(BoardWall, {
      attachTo: document.body,
      props: { blocks: [{ id: 'b1', kind: 'domain-event', label: 'Order confirmed', withdrawn: false }] },
    })
    const sticky = wrapper.get('.sticky')
    await sticky.trigger('focus')

    await wrapper.get('[aria-label="Reword"]').trigger('click')
    await nextTick()

    expect(sticky.classes()).toContain('sticky--reword')
    const field = wrapper.get('input')
    expect((field.element as HTMLInputElement).value).toBe('Order confirmed')

    await field.setValue('Order acknowledged')
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await nextTick()

    expect(wrapper.find('.sticky--reword').exists()).toBe(false)
    expect(wrapper.get('.sticky').text()).toContain('Order confirmed')
    expect(wrapper.find('input').exists()).toBe(false)
  })

  it('opens the dashed-ghost from Enter on a focused sticky', async () => {
    const wrapper = mount(BoardWall, {
      attachTo: document.body,
      props: { blocks: [{ id: 'b1', kind: 'domain-event', label: 'Order placed', withdrawn: false }] },
    })
    const sticky = wrapper.get('.sticky')
    await sticky.trigger('focus')
    sticky.element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    await nextTick()

    expect(wrapper.get('.sticky').classes()).toContain('sticky--reword')
    expect((wrapper.get('input').element as HTMLInputElement).value).toBe('Order placed')
  })

  it('does not start reword when E is typed in a text field', async () => {
    const wrapper = mount(BoardWall, {
      attachTo: document.body,
      props: { blocks: [{ id: 'b1', kind: 'domain-event', label: 'Order placed', withdrawn: false }] },
    })
    await wrapper.get('.sticky').trigger('focus')

    const field = document.createElement('input')
    document.body.appendChild(field)
    field.focus()
    const event = new KeyboardEvent('keydown', { key: 'e', bubbles: true, cancelable: true })
    field.dispatchEvent(event)
    await nextTick()

    expect(event.defaultPrevented).toBe(false)
    expect(wrapper.find('.sticky--reword').exists()).toBe(false)
    field.remove()
  })
})
