import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import type { Connection } from '@vue-flow/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import type { TimelineLayout } from '~/domain-model-capture/domain/timeline/compute-timeline-layout.ts'
import { HttpError } from '../transport/board.ts'
import * as mutations from '../transport/board.ts'
import BoardWall from './BoardWall.vue'
import { encodeDragged } from './kernel/semantic-edit.ts'
import TimelinePane from './TimelinePane.vue'
import BacklogPane from './presentation/BacklogPane.vue'

enableAutoUnmount(afterEach)
afterEach(() => {
  vi.restoreAllMocks()
})

const posted = () => vi.mocked(mutations.postBoardOperation)

const sequenced: TimelineLayout = {
  tracks: [{ eventIds: ['eA', 'eB'], ranks: { eA: 0, eB: 1 } }],
  edges: [{ predecessor: 'eA', successor: 'eB' }],
  attachments: {},
  pivotal: ['eA'],
} as unknown as TimelineLayout

const mountWall = () =>
  mount(BoardWall, {
    attachTo: document.body,
    props: {
      workshopId: 'w1',
      accepter: 'Maria',
      blocks: [
        { id: 'eA', kind: 'domain-event', label: 'Loan recorded', placement: 'timeline', pivotal: true },
        { id: 'eB', kind: 'domain-event', label: 'Book returned', placement: 'timeline' },
        { id: 'eC', kind: 'domain-event', label: 'Still loose', placement: 'backlog' },
        { id: 'a1', kind: 'actor', label: 'Clerk', placement: 'backlog' },
      ],
      timeline: sequenced,
    },
  })

const connect = (wrapper: ReturnType<typeof mount>, source: string, target: string): void => {
  const pane = wrapper.getComponent(TimelinePane)
  const exposed: { onConnect: (connection: Connection) => void } = pane.vm
  exposed.onConnect({ source, target, sourceHandle: null, targetHandle: null })
}

const selectBlock = async (wrapper: ReturnType<typeof mount>, id: string): Promise<void> => {
  wrapper.findComponent(BacklogPane).vm.$emit('select', id)
  await nextTick()
}

const dropOn = (host: Element, payload: { id: string; kind: string }, onto?: Element): void => {
  const transfer = {
    getData: () => encodeDragged(payload),
    setData: () => undefined,
  }
  const event = new Event('drop', { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'dataTransfer', { value: transfer })
  ;(onto ?? host).dispatchEvent(event)
}

// Suite: BoardWall semantic edits
// Invariant: Gestures POST the expected edit kind and emit board-dirty; cycle 422 surfaces inline.
// Boundary IN: Drop, connect, and toolbar wiring from BoardWall to transport.
// Boundary OUT: Full POST wire bodies (transport/board.test.ts), relation mapping (semantic-edit.test.ts).

describe('BoardWall semantic edits', () => {
  beforeEach(() => {
    vi.spyOn(mutations, 'postBoardOperation').mockResolvedValue({ position: 9 })
  })

  it('POSTs nothing when an actor is dropped on the empty timeline pane', async () => {
    const wrapper = mountWall()
    dropOn(wrapper.get('[aria-label="Timeline"]').element, { id: 'a1', kind: 'actor' })
    await flushPromises()
    expect(posted()).not.toHaveBeenCalled()
  })

  it('POSTs place from a backlog drop onto the empty timeline pane', async () => {
    const wrapper = mountWall()
    dropOn(wrapper.get('[aria-label="Timeline"]').element, { id: 'eC', kind: 'domain-event' })
    await flushPromises()
    expect(posted()).toHaveBeenCalledWith(
      'w1',
      expect.objectContaining({ kind: 'place', target: 'eC' }),
    )
    expect(wrapper.emitted('board-dirty')).toHaveLength(1)
  })

  it('POSTs sequence from a handle-connect', async () => {
    const wrapper = mountWall()
    connect(wrapper, 'eA', 'eB')
    await flushPromises()
    expect(posted()).toHaveBeenCalledWith(
      'w1',
      expect.objectContaining({ kind: 'sequence', predecessor: 'eA', successor: 'eB' }),
    )
  })

  it('does not POST on pan or zoom of the timeline pane', async () => {
    const wrapper = mountWall()
    const vueFlow = wrapper.findComponent({ name: 'VueFlow' })
    const emit = (vueFlow.vm as { $emit: (event: string) => void }).$emit
    emit('move')
    emit('viewportChange')
    emit('viewport-change')
    await flushPromises()
    expect(posted()).not.toHaveBeenCalled()
  })

  it('POSTs sequence when dropped onto an event node', async () => {
    const wrapper = mountWall()
    const timeline = wrapper.get('[aria-label="Timeline"]').element
    const eventNode = document.createElement('div')
    eventNode.setAttribute('data-event-id', 'eA')
    timeline.append(eventNode)
    dropOn(timeline, { id: 'eC', kind: 'domain-event' }, eventNode)
    await flushPromises()
    expect(posted()).toHaveBeenCalledWith(
      'w1',
      expect.objectContaining({ kind: 'sequence', predecessor: 'eA', successor: 'eC' }),
    )
  })

  it('POSTs link-cause when an actor is dropped onto an event node', async () => {
    const wrapper = mountWall()
    const timeline = wrapper.get('[aria-label="Timeline"]').element
    const eventNode = document.createElement('div')
    eventNode.setAttribute('data-event-id', 'eA')
    timeline.append(eventNode)
    dropOn(timeline, { id: 'a1', kind: 'actor' }, eventNode)
    await flushPromises()
    expect(posted()).toHaveBeenCalledWith(
      'w1',
      expect.objectContaining({ kind: 'link-cause', cause: 'a1', effect: 'eA' }),
    )
  })

  it('POSTs insert-between when dropped onto an edge', async () => {
    const wrapper = mountWall()
    const timeline = wrapper.get('[aria-label="Timeline"]').element
    const edge = document.createElement('div')
    edge.className = 'vue-flow__edge'
    edge.setAttribute('data-id', 'eA>eB')
    timeline.append(edge)
    dropOn(timeline, { id: 'eC', kind: 'domain-event' }, edge)
    await flushPromises()
    expect(posted()).toHaveBeenCalledWith(
      'w1',
      expect.objectContaining({
        kind: 'insert-between',
        predecessor: 'eA',
        inserted: 'eC',
        successor: 'eB',
      }),
    )
  })

  it('POSTs place from Place on timeline', async () => {
    const wrapper = mountWall()
    await wrapper.get('[aria-label="event: Still loose"]').trigger('focus')
    await wrapper.get('[aria-label="Place on timeline"]').trigger('click')
    await flushPromises()
    expect(posted()).toHaveBeenCalledWith(
      'w1',
      expect.objectContaining({ kind: 'place', target: 'eC' }),
    )
  })

  it('POSTs unmark-pivotal from Unmark pivotal', async () => {
    const wrapper = mountWall()
    await selectBlock(wrapper, 'eA')
    await wrapper.get('[aria-label="Unmark pivotal"]').trigger('click')
    await flushPromises()
    expect(posted()).toHaveBeenCalledWith(
      'w1',
      expect.objectContaining({ kind: 'unmark-pivotal', target: 'eA' }),
    )
  })

  it('POSTs unplace from Unplace', async () => {
    const wrapper = mountWall()
    await selectBlock(wrapper, 'eA')
    await wrapper.get('[aria-label="Unplace"]').trigger('click')
    await flushPromises()
    expect(posted()).toHaveBeenCalledWith(
      'w1',
      expect.objectContaining({ kind: 'unplace', target: 'eA' }),
    )
  })

  it('POSTs sequence from Sequence after', async () => {
    const wrapper = mountWall()
    await selectBlock(wrapper, 'eA')
    await wrapper.get('[aria-label="event: Still loose"]').trigger('focus')
    await wrapper.get('[aria-label="Sequence after"]').trigger('click')
    await flushPromises()
    expect(posted()).toHaveBeenCalledWith(
      'w1',
      expect.objectContaining({ kind: 'sequence', predecessor: 'eA', successor: 'eC' }),
    )
  })

  it('POSTs mark-pivotal from Mark pivotal', async () => {
    const wrapper = mountWall()
    await wrapper.get('[aria-label="event: Still loose"]').trigger('focus')
    await wrapper.get('[aria-label="Mark pivotal"]').trigger('click')
    await flushPromises()
    expect(posted()).toHaveBeenCalledWith(
      'w1',
      expect.objectContaining({ kind: 'mark-pivotal', target: 'eC' }),
    )
  })

  it('shows a cycle 422 inline with labels from the snapshot', async () => {
    posted().mockRejectedValueOnce(
      new HttpError(422, { error: 'cycle', path: ['eA', 'eB', 'eA'] }),
    )
    const wrapper = mountWall()
    connect(wrapper, 'eB', 'eA')
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toBe(
      'That sequence would loop: Loan recorded → Book returned → Loan recorded.',
    )
    expect(wrapper.emitted('board-dirty')).toBeUndefined()
  })
})
