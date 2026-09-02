import { describe, expect, it } from 'vitest'
import type { TimelineLayout } from '~/domain-model-capture/domain/timeline/compute-timeline-layout.ts'
import { CELL } from './layout.ts'
import { layoutTimeline } from './use-dagre-layout.ts'

const emptyAttachments = { attachments: {}, pivotal: [] as string[] }

const asLayout = (layout: {
  tracks: { eventIds: string[]; ranks: Record<string, number> }[]
  edges: { predecessor: string; successor: string }[]
  attachments: Record<string, string[]>
  pivotal: string[]
}): TimelineLayout => layout as unknown as TimelineLayout

describe('layoutTimeline', () => {
  it('places a sequenced pair left-to-right at fixed CELL width', () => {
    const timeline = asLayout({
      tracks: [{ eventIds: ['eA', 'eB'], ranks: { eA: 0, eB: 1 } }],
      edges: [{ predecessor: 'eA', successor: 'eB' }],
      ...emptyAttachments,
    })
    const blocks = new Map([
      ['eA', { label: 'Loan recorded', kind: 'domain-event', withdrawn: false }],
      ['eB', { label: 'Book returned', kind: 'domain-event', withdrawn: false }],
    ])

    const { nodes, edges } = layoutTimeline(timeline, blocks)
    const left = nodes.find((node) => node.id === 'eA')
    const right = nodes.find((node) => node.id === 'eB')
    if (left === undefined || right === undefined) throw new Error('missing nodes')

    expect(left.position.x).toBeLessThan(right.position.x)
    expect(left.width).toBe(CELL)
    expect(right.width).toBe(CELL)
    expect(edges).toEqual([{ id: 'eA>eB', source: 'eA', target: 'eB' }])
  })

  it('keeps both successors of a branch and does not put an actor on the axis', () => {
    const timeline = asLayout({
      tracks: [{ eventIds: ['eA', 'eB', 'eC'], ranks: { eA: 0, eB: 1, eC: 1 } }],
      edges: [
        { predecessor: 'eA', successor: 'eB' },
        { predecessor: 'eA', successor: 'eC' },
      ],
      attachments: { eA: ['a1'] },
      pivotal: [],
    })
    const blocks = new Map([
      ['eA', { label: 'Loan recorded', kind: 'domain-event', withdrawn: false }],
      ['eB', { label: 'Book returned', kind: 'domain-event', withdrawn: false }],
      ['eC', { label: 'Fine assessed', kind: 'domain-event', withdrawn: false }],
      ['a1', { label: 'Clerk', kind: 'actor', withdrawn: false }],
    ])

    const { nodes } = layoutTimeline(timeline, blocks)
    expect(nodes.map((node) => node.id).toSorted()).toEqual(['eA', 'eB', 'eC'])
    expect(nodes.some((node) => node.id === 'a1')).toBe(false)
    const predecessor = nodes.find((node) => node.id === 'eA')
    const first = nodes.find((node) => node.id === 'eB')
    const second = nodes.find((node) => node.id === 'eC')
    if (predecessor === undefined || first === undefined || second === undefined) {
      throw new Error('missing branch nodes')
    }
    expect(first.position.x).toBeGreaterThan(predecessor.position.x)
    expect(second.position.x).toBeGreaterThan(predecessor.position.x)
    expect(first.position.y).not.toBe(second.position.y)
    expect(predecessor.data?.attachments).toEqual([{ id: 'a1', kind: 'actor', label: 'Clerk' }])
  })

  it('does not move neighbours when a placed label grows', () => {
    const timeline = asLayout({
      tracks: [{ eventIds: ['eA', 'eB'], ranks: { eA: 0, eB: 1 } }],
      edges: [{ predecessor: 'eA', successor: 'eB' }],
      ...emptyAttachments,
    })
    const short = layoutTimeline(
      timeline,
      new Map([
        ['eA', { label: 'Hi', kind: 'domain-event', withdrawn: false }],
        ['eB', { label: 'Bye', kind: 'domain-event', withdrawn: false }],
      ]),
    )
    const long = layoutTimeline(
      timeline,
      new Map([
        [
          'eA',
          {
            label: 'A very long past-tense event label that wraps inside the sticky',
            kind: 'domain-event',
            withdrawn: false,
          },
        ],
        ['eB', { label: 'Bye', kind: 'domain-event', withdrawn: false }],
      ]),
    )

    expect(long.nodes[0]?.position).toEqual(short.nodes[0]?.position)
    expect(long.nodes[1]?.position).toEqual(short.nodes[1]?.position)
    expect(long.nodes[0]?.width).toBe(CELL)
    expect(long.nodes[0]?.height).toBe(short.nodes[0]?.height)
  })
})
