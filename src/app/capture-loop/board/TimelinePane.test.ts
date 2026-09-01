import { enableAutoUnmount, mount } from '@vue/test-utils'
import type { Node } from '@vue-flow/core'
import { afterEach, describe, expect, it } from 'vitest'
import type { TimelineLayout } from '~/domain-model-capture/domain/timeline/compute-timeline-layout.ts'
import TimelinePane from './TimelinePane.vue'
import type { EventNodeData } from './use-dagre-layout.ts'

enableAutoUnmount(afterEach)

const asLayout = (layout: {
  tracks: { eventIds: string[]; ranks: Record<string, number> }[]
  edges: { predecessor: string; successor: string }[]
  attachments: Record<string, string[]>
  pivotal: string[]
}): TimelineLayout => layout as unknown as TimelineLayout

const sequenced = asLayout({
  tracks: [{ eventIds: ['eA', 'eB'], ranks: { eA: 0, eB: 1 } }],
  edges: [{ predecessor: 'eA', successor: 'eB' }],
  attachments: {},
  pivotal: [],
})

const branched = asLayout({
  tracks: [{ eventIds: ['eA', 'eB', 'eC'], ranks: { eA: 0, eB: 1, eC: 1 } }],
  edges: [
    { predecessor: 'eA', successor: 'eB' },
    { predecessor: 'eA', successor: 'eC' },
  ],
  attachments: { eA: ['a1'] },
  pivotal: ['eA'],
})

const flowNodes = (wrapper: ReturnType<typeof mount>): Node<EventNodeData>[] =>
  wrapper.findComponent({ name: 'VueFlow' }).props('nodes') as Node<EventNodeData>[]

describe('TimelinePane', () => {
  it('renders sequenced events left-to-right with drag disabled', () => {
    const wrapper = mount(TimelinePane, {
      props: {
        timeline: sequenced,
        blocks: [
          { id: 'eA', kind: 'domain-event', label: 'Loan recorded' },
          { id: 'eB', kind: 'domain-event', label: 'Book returned' },
        ],
      },
    })

    const vueFlow = wrapper.findComponent({ name: 'VueFlow' })
    expect(vueFlow.props('nodesDraggable')).toBe(false)
    const nodes = flowNodes(wrapper)
    const left = nodes.find((node) => node.id === 'eA')
    const right = nodes.find((node) => node.id === 'eB')
    if (left === undefined || right === undefined) throw new Error('missing nodes')
    expect(left.data?.label).toBe('Loan recorded')
    expect(right.data?.label).toBe('Book returned')
    expect(left.position.x).toBeLessThan(right.position.x)
    expect(left.draggable).toBe(false)
  })

  it('shows both branch successors and actor chips on the event, not as axis nodes', () => {
    const wrapper = mount(TimelinePane, {
      props: {
        timeline: branched,
        blocks: [
          { id: 'eA', kind: 'domain-event', label: 'Loan recorded', pivotal: true },
          { id: 'eB', kind: 'domain-event', label: 'Book returned' },
          { id: 'eC', kind: 'domain-event', label: 'Fine assessed' },
          { id: 'a1', kind: 'actor', label: 'Clerk' },
        ],
      },
    })

    const nodes = flowNodes(wrapper)
    expect(nodes.map((node) => node.id).toSorted()).toEqual(['eA', 'eB', 'eC'])
    expect(nodes.some((node) => node.id === 'a1')).toBe(false)
    const source = nodes.find((node) => node.id === 'eA')
    const first = nodes.find((node) => node.id === 'eB')
    const second = nodes.find((node) => node.id === 'eC')
    if (source === undefined || first === undefined || second === undefined) {
      throw new Error('missing branch nodes')
    }
    expect(source.data?.attachments).toEqual([{ id: 'a1', kind: 'actor', label: 'Clerk' }])
    expect(source.data?.pivotal).toBe(true)
    expect(first.position.x).toBeGreaterThan(source.position.x)
    expect(second.position.x).toBeGreaterThan(source.position.x)
    expect(first.position.y).not.toBe(second.position.y)
  })
})
