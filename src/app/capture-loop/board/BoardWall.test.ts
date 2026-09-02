import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TimelineLayout } from '~/domain-model-capture/domain/timeline/compute-timeline-layout.ts'
import * as boardTransport from '../transport/board.ts'
import { mountRewordPortalHost, unmountRewordPortalHost } from '../test-support/reword-portal-host.ts'
import BoardWall from './BoardWall.vue'
import RewordConfirm from './interactions/reword-block/RewordConfirm.vue'

const posted = () => vi.mocked(boardTransport.postBoardOperation)

const backlogItems = (wrapper: ReturnType<typeof mount>) =>
  wrapper.get('[aria-label="Backlog"]').findAll('li')

const stickyByLabel = (wrapper: ReturnType<typeof mount>, ariaLabel: string) =>
  wrapper.get(`[aria-label="Backlog"] [aria-label="${ariaLabel}"]`)

const stubMatchMedia = (matches: boolean): void => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({
      matches,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  )
}

enableAutoUnmount(afterEach)
beforeEach(() => {
  mountRewordPortalHost()
  stubMatchMedia(false)
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  unmountRewordPortalHost()
})

// Suite: BoardWall
// Invariant: Wall renders stickies, withdrawn visibility, reword ghost wiring, and withdraw/reinstate smokes.
// Boundary IN: Presentation composition, fresh-sticky hook, focus-to-reword UI paths.
// Boundary OUT: POST wire shapes (transport/board.test.ts), reword confirm flow (use-reword-block.test.ts), keyboard dispatch (use-board-keyboard.test.ts).

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

    const stickies = backlogItems(wrapper)
    expect(stickies).toHaveLength(3)
    expect(stickies.map((sticky) => sticky.text())).toEqual(['Order placed', 'Order confirmed', 'Waiter'])
    expect(stickies.map((sticky) => sticky.attributes('aria-label'))).toEqual([
      'event: Order placed',
      'event: Order confirmed',
      'actor: Waiter',
    ])
    expect(wrapper.get('[role="list"]').attributes('data-empty')).toBe('false')
  })

  it('names whose words a sticky is when a speaker is present', () => {
    const wrapper = mount(BoardWall, {
      props: {
        blocks: [{ id: 'b1', kind: 'domain-event', label: 'Order placed', speaker: 'Maria' }],
      },
    })
    expect(stickyByLabel(wrapper, 'event: Order placed, added by Maria').text()).toContain('Maria')
    expect(stickyByLabel(wrapper, 'event: Order placed, added by Maria').attributes('aria-label')).toBe(
      'event: Order placed, added by Maria',
    )
  })

  it('renders the empty framed wall with no stickies when the board is empty', () => {
    const wrapper = mount(BoardWall, { props: { blocks: [] } })

    expect(backlogItems(wrapper)).toHaveLength(0)
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
    expect(wrapper.find('[data-ghost]').exists()).toBe(false)
  })

  it('renders a withdrawn sticky as struck-through graphite in the backlog, not as a dashed-ghost', () => {
    const wrapper = mount(BoardWall, {
      props: {
        blocks: [
          { id: 'b1', kind: 'domain-event', label: 'Order placed', withdrawn: true },
          { id: 'b2', kind: 'domain-event', label: 'Order confirmed', withdrawn: false },
        ],
        showWithdrawn: true,
      },
    })

    const withdrawn = stickyByLabel(wrapper, 'event: Order placed')
    const live = stickyByLabel(wrapper, 'event: Order confirmed')
    expect(backlogItems(wrapper)).toHaveLength(2)
    expect(withdrawn.classes()).toContain('sticky--withdrawn')
    expect(withdrawn.classes()).not.toContain('sticky--reword')
    expect(withdrawn.attributes('data-withdrawn')).toBe('true')
    expect(live.attributes('data-withdrawn')).toBe('false')
    expect(wrapper.get('[role="list"]').attributes('data-empty')).toBe('false')
  })

  it('opens a dashed-ghost with the current label from the pencil or E, and Esc restores', async () => {
    const wrapper = mount(BoardWall, {
      attachTo: document.body,
      props: { blocks: [{ id: 'b1', kind: 'domain-event', label: 'Order confirmed', withdrawn: false }] },
    })
    const sticky = stickyByLabel(wrapper, 'event: Order confirmed')
    await sticky.trigger('focus')

    await wrapper.get('[aria-label="Reword"]').trigger('click')
    await nextTick()

    expect(sticky.find('input[type="text"]').exists()).toBe(true)
    const field = wrapper.get('input[type="text"]')
    expect((field.element as HTMLInputElement).value).toBe('Order confirmed')

    await field.setValue('Order acknowledged')
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await nextTick()

    expect(wrapper.find('input[type="text"]').exists()).toBe(false)
    expect(stickyByLabel(wrapper, 'event: Order confirmed').text()).toContain('Order confirmed')
  })

  it('adds sticky--fresh when a block arrives after mount and skips it with reduced motion', async () => {
    const wrapper = mount(BoardWall, {
      props: { blocks: [{ id: 'b1', kind: 'domain-event', label: 'Order placed', withdrawn: false }] },
    })
    await nextTick()
    expect(stickyByLabel(wrapper, 'event: Order placed').classes()).not.toContain('sticky--fresh')

    await wrapper.setProps({
      blocks: [
        { id: 'b1', kind: 'domain-event', label: 'Order placed', withdrawn: false },
        { id: 'b2', kind: 'domain-event', label: 'Order confirmed', withdrawn: false },
      ],
    })
    await nextTick()

    const fresh = stickyByLabel(wrapper, 'event: Order confirmed')
    expect(fresh.classes()).toContain('sticky--fresh')

    wrapper.unmount()
    vi.unstubAllGlobals()
    stubMatchMedia(true)

    const reduced = mount(BoardWall, {
      props: { blocks: [{ id: 'b1', kind: 'domain-event', label: 'Order placed', withdrawn: false }] },
    })
    await nextTick()
    await reduced.setProps({
      blocks: [
        { id: 'b1', kind: 'domain-event', label: 'Order placed', withdrawn: false },
        { id: 'b2', kind: 'domain-event', label: 'Order confirmed', withdrawn: false },
      ],
    })
    await nextTick()
    expect(stickyByLabel(reduced, 'event: Order confirmed').classes()).not.toContain('sticky--fresh')
  })

  it('opens the confirm popover when Enter is pressed inside the dashed-ghost field', async () => {
    const wrapper = mount(BoardWall, {
      attachTo: document.body,
      props: { blocks: [{ id: 'b1', kind: 'domain-event', label: 'Order placed', withdrawn: false }] },
    })
    await stickyByLabel(wrapper, 'event: Order placed').trigger('focus')
    await wrapper.get('[aria-label="Reword"]').trigger('click')
    await nextTick()

    const field = wrapper.get('input[type="text"]')
    await field.setValue('Order acknowledged')
    field.element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    await nextTick()

    expect(wrapper.getComponent(RewordConfirm).props('open')).toBe(true)
    expect(wrapper.find('input[type="text"]').exists()).toBe(true)
  })

  it('opens the dashed-ghost from Enter on a focused sticky', async () => {
    const wrapper = mount(BoardWall, {
      attachTo: document.body,
      props: { blocks: [{ id: 'b1', kind: 'domain-event', label: 'Order placed', withdrawn: false }] },
    })
    const sticky = stickyByLabel(wrapper, 'event: Order placed')
    await sticky.trigger('focus')
    sticky.element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    await nextTick()

    expect(wrapper.find('input[type="text"]').exists()).toBe(true)
    expect((wrapper.get('input[type="text"]').element as HTMLInputElement).value).toBe('Order placed')
  })

  it('does not start reword when E is typed in a text field', async () => {
    const wrapper = mount(BoardWall, {
      attachTo: document.body,
      props: { blocks: [{ id: 'b1', kind: 'domain-event', label: 'Order placed', withdrawn: false }] },
    })
    await stickyByLabel(wrapper, 'event: Order placed').trigger('focus')

    const field = document.createElement('input')
    document.body.appendChild(field)
    field.focus()
    const event = new KeyboardEvent('keydown', { key: 'e', bubbles: true, cancelable: true })
    field.dispatchEvent(event)
    await nextTick()

    expect(event.defaultPrevented).toBe(false)
    expect(wrapper.find('input[type="text"]').exists()).toBe(false)
    field.remove()
  })

  it('confirms withdraw posts withdraw kind and emits board-dirty', async () => {
    vi.spyOn(boardTransport, 'postBoardOperation').mockResolvedValue({ position: 2 })

    const wrapper = mount(BoardWall, {
      attachTo: document.body,
      props: {
        blocks: [{ id: 'b1', kind: 'domain-event', label: 'Order confirmed', withdrawn: false }],
        workshopId: 'w1',
        accepter: 'Maria',
        revision: 1,
      },
    })
    await stickyByLabel(wrapper, 'event: Order confirmed').trigger('focus')
    await wrapper.get('[aria-label="Withdraw"]').trigger('click')
    await flushPromises()
    expect(posted()).not.toHaveBeenCalled()

    await wrapper.get('[aria-label="Confirm withdraw"]').trigger('click')
    await flushPromises()

    expect(posted()).toHaveBeenCalledWith(
      'w1',
      expect.objectContaining({ kind: 'withdraw', target: 'b1' }),
    )
    expect(wrapper.emitted('board-dirty')).toHaveLength(1)
  })

  it('shows Reinstate on a ghost, not pencil or Withdraw, and reinstates', async () => {
    vi.spyOn(boardTransport, 'postBoardOperation').mockResolvedValue({ position: 3 })

    const wrapper = mount(BoardWall, {
      attachTo: document.body,
      props: {
        blocks: [{ id: 'b1', kind: 'domain-event', label: 'Order confirmed', withdrawn: true }],
        workshopId: 'w1',
        accepter: 'Maria',
        revision: 2,
        showWithdrawn: true,
      },
    })
    await stickyByLabel(wrapper, 'event: Order confirmed').trigger('focus')

    expect(wrapper.find('[aria-label="Reword"]').exists()).toBe(false)
    expect(wrapper.find('[aria-label="Withdraw"]').exists()).toBe(false)
    await wrapper.get('[aria-label="Reinstate"]').trigger('click')
    await flushPromises()

    expect(posted()).toHaveBeenCalledWith(
      'w1',
      expect.objectContaining({ kind: 'reinstate', target: 'b1' }),
    )
    expect(wrapper.emitted('board-dirty')).toHaveLength(1)
  })

  it('does not open dashed-ghost from E or Enter on a focused ghost', async () => {
    const wrapper = mount(BoardWall, {
      attachTo: document.body,
      props: {
        blocks: [{ id: 'b1', kind: 'domain-event', label: 'Order confirmed', withdrawn: true }],
        showWithdrawn: true,
      },
    })
    const sticky = stickyByLabel(wrapper, 'event: Order confirmed')
    await sticky.trigger('focus')
    sticky.element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    sticky.element.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', bubbles: true }))
    await nextTick()

    expect(wrapper.find('input[type="text"]').exists()).toBe(false)
  })

  it('keeps an unattached actor in the backlog while an attached cause leaves it', () => {
    const wrapper = mount(BoardWall, {
      props: {
        blocks: [
          { id: 'eA', kind: 'domain-event', label: 'Loan recorded', placement: 'timeline', pivotal: true },
          { id: 'eB', kind: 'domain-event', label: 'Book returned', placement: 'timeline' },
          { id: 'eC', kind: 'domain-event', label: 'Still loose', placement: 'backlog' },
          { id: 'a1', kind: 'actor', label: 'Clerk', placement: 'backlog' },
          { id: 'a2', kind: 'actor', label: 'Waiter', placement: 'backlog' },
        ],
        timeline: {
          tracks: [{ eventIds: ['eA', 'eB'], ranks: { eA: 0, eB: 1 } }],
          edges: [{ predecessor: 'eA', successor: 'eB' }],
          attachments: { eA: ['a1'] },
          pivotal: ['eA'],
        } as unknown as TimelineLayout,
      },
    })

    const backlog = wrapper.get('[aria-label="Backlog"]')
    expect(backlog.get('[aria-label="event: Still loose"]').text()).toContain('Still loose')
    expect(backlog.get('[aria-label="actor: Waiter"]').text()).toContain('Waiter')
    expect(backlog.find('[aria-label="actor: Clerk"]').exists()).toBe(false)
    const nodes = wrapper.findComponent({ name: 'VueFlow' }).props('nodes') as {
      id: string
      data: { pivotal: boolean }
    }[]
    expect(nodes.map((node) => node.id).toSorted()).toEqual(['eA', 'eB'])
    expect(nodes.find((node) => node.id === 'eA')?.data.pivotal).toBe(true)
  })

  it('hides withdrawn stickies by default and reveals ghosts when Show withdrawn is on', async () => {
    const wrapper = mount(BoardWall, {
      props: {
        blocks: [
          { id: 'b1', kind: 'domain-event', label: 'Order placed', withdrawn: true },
          { id: 'b2', kind: 'domain-event', label: 'Order confirmed', withdrawn: false },
        ],
      },
    })

    expect(backlogItems(wrapper)).toHaveLength(1)
    expect(stickyByLabel(wrapper, 'event: Order confirmed').text()).toContain('Order confirmed')
    expect(wrapper.find('[data-withdrawn="true"]').exists()).toBe(false)

    await wrapper.get('[aria-label="Show withdrawn"]').setValue(true)
    expect(wrapper.emitted('update:showWithdrawn')).toEqual([[true]])

    await wrapper.setProps({ showWithdrawn: true })
    const ghost = wrapper.get('[data-withdrawn="true"]')
    expect(ghost.classes()).toContain('sticky--withdrawn')
    expect(ghost.attributes('aria-label')).toBe('event: Order placed')
  })

  it('reveals a withdrawn timeline event as a ghost at last placement', () => {
    const wrapper = mount(BoardWall, {
      props: {
        showWithdrawn: true,
        blocks: [
          {
            id: 'eA',
            kind: 'domain-event',
            label: 'Loan recorded',
            withdrawn: true,
            placement: 'timeline',
          },
        ],
        timeline: {
          tracks: [{ eventIds: ['eA'], ranks: { eA: 0 } }],
          edges: [],
          attachments: {},
          pivotal: [],
        } as unknown as TimelineLayout,
      },
    })

    expect(backlogItems(wrapper)).toHaveLength(0)
    const nodes = wrapper.findComponent({ name: 'VueFlow' }).props('nodes') as {
      id: string
      data: { withdrawn: boolean }
    }[]
    expect(nodes).toHaveLength(1)
    expect(nodes[0]?.id).toBe('eA')
    expect(nodes[0]?.data.withdrawn).toBe(true)
  })
})
