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

const flowNodes = (wrapper: ReturnType<typeof mount>): Node<EventNodeData>[] =>
  wrapper.findComponent({ name: 'VueFlow' }).props('nodes') as Node<EventNodeData>[]

// Suite: TimelinePane
// Invariant: Vue Flow is configured for a read-only timeline and passes block labels into event nodes.
// Boundary IN: nodesDraggable / autoConnect props, node labels and draggable flags from blocks.
// Boundary OUT: dagre geometry and branch layout (use-dagre-layout.test.ts).

describe('TimelinePane', () => {
  it('passes drag-disabled Vue Flow props and block labels into timeline nodes', () => {
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
    expect(vueFlow.props('autoConnect')).toBe(false)

    const nodes = flowNodes(wrapper)
    expect(nodes.map((node) => node.id).toSorted()).toEqual(['eA', 'eB'])
    expect(nodes.find((node) => node.id === 'eA')?.data?.label).toBe('Loan recorded')
    expect(nodes.find((node) => node.id === 'eB')?.data?.label).toBe('Book returned')
    expect(nodes.every((node) => node.draggable === false)).toBe(true)
  })
})
