import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import type { Connection } from '@vue-flow/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TimelineLayout } from '~/domain-model-capture/domain/timeline/compute-timeline-layout.ts'
import { HttpError } from '../client.ts'
import * as mutations from '../dock/mutations.ts'
import BoardWall from './BoardWall.vue'
import { encodeDragged } from './semantic-edit.ts'
import TimelinePane from './TimelinePane.vue'

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

const dropOn = (host: Element, payload: { id: string; kind: string }, onto?: Element): void => {
  const transfer = {
    getData: () => encodeDragged(payload),
    setData: () => undefined,
  }
  const event = new Event('drop', { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'dataTransfer', { value: transfer })
  ;(onto ?? host).dispatchEvent(event)
}

describe('BoardWall semantic edits', () => {
  beforeEach(() => {
    vi.spyOn(mutations, 'postBoardOperation').mockResolvedValue({ position: 9 })
  })

  it('POSTs place from a backlog drop onto the empty timeline pane', async () => {
    const wrapper = mountWall()
    dropOn(wrapper.get('[aria-label="Timeline"]').element, { id: 'eC', kind: 'domain-event' })
    await flushPromises()
    expect(posted()).toHaveBeenCalledWith(
      'w1',
      expect.objectContaining({ kind: 'place', target: 'eC' }),
    )
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

  it('POSTs sequence, link-cause, and insert-between from the matching drop sites', async () => {
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

    posted().mockClear()
    dropOn(timeline, { id: 'a1', kind: 'actor' }, eventNode)
    await flushPromises()
    expect(posted()).toHaveBeenCalledWith(
      'w1',
      expect.objectContaining({ kind: 'link-cause', cause: 'a1', effect: 'eA' }),
    )

    posted().mockClear()
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

  it('POSTs place / unplace / sequence-after / mark-pivotal from the selected-sticky actions', async () => {
    const wrapper = mountWall()
    await wrapper.get('[aria-label="event: Still loose"]').trigger('focus')
    await wrapper.get('[aria-label="Place on timeline"]').trigger('click')
    await flushPromises()
    expect(posted()).toHaveBeenCalledWith(
      'w1',
      expect.objectContaining({ kind: 'place', target: 'eC' }),
    )

    posted().mockClear()
    await wrapper.get('[data-event-id="eA"]').trigger('click')
    await wrapper.get('[aria-label="Unmark pivotal"]').trigger('click')
    await flushPromises()
    expect(posted()).toHaveBeenCalledWith(
      'w1',
      expect.objectContaining({ kind: 'unmark-pivotal', target: 'eA' }),
    )

    posted().mockClear()
    await wrapper.get('[data-event-id="eA"]').trigger('click')
    await wrapper.get('[aria-label="Unplace"]').trigger('click')
    await flushPromises()
    expect(posted()).toHaveBeenCalledWith(
      'w1',
      expect.objectContaining({ kind: 'unplace', target: 'eA' }),
    )

    posted().mockClear()
    await wrapper.get('[aria-label="event: Still loose"]').trigger('focus')
    await wrapper.get('[aria-label="Sequence after"]').trigger('click')
    await flushPromises()
    expect(posted()).toHaveBeenCalledWith(
      'w1',
      expect.objectContaining({ kind: 'sequence', predecessor: 'eA', successor: 'eC' }),
    )

    posted().mockClear()
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
  })
})
