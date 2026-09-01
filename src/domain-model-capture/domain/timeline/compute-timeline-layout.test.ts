import { describe, expect, it } from 'vitest'
import type { BuildingBlockId } from '~/plumbing/ids.ts'
import { Operation } from '../schema/index.ts'
import { replay } from '../board/replay.ts'
import { computeTimelineLayout } from './compute-timeline-layout.ts'

const author = { accepter: { name: 'Dana' } }
const op = (raw: Record<string, unknown>): Operation => Operation.parse({ author, ...raw })
const bid = (value: string): BuildingBlockId => value as BuildingBlockId

const snapshotOf = (raws: Record<string, unknown>[]) => replay(raws.map(op))

describe('computeTimelineLayout', () => {
  it('puts two disconnected placed events on two tracks ordered by id', () => {
    const snapshot = snapshotOf([
      { kind: 'capture-domain-event', id: 'e1', label: 'Loan recorded' },
      { kind: 'capture-domain-event', id: 'e2', label: 'Book returned' },
      { kind: 'place', target: 'e1' },
      { kind: 'place', target: 'e2' },
    ])

    expect(computeTimelineLayout(snapshot)).toEqual({
      tracks: [
        { eventIds: [bid('e1')], ranks: { e1: 0 } },
        { eventIds: [bid('e2')], ranks: { e2: 0 } },
      ],
      edges: [],
      attachments: {},
      pivotal: [],
    })
  })

  it('keeps both distinct successors of one event on the same track', () => {
    const snapshot = snapshotOf([
      { kind: 'capture-domain-event', id: 'eA', label: 'Loan recorded' },
      { kind: 'capture-domain-event', id: 'eB', label: 'Book returned' },
      { kind: 'capture-domain-event', id: 'eC', label: 'Fine assessed' },
      { kind: 'sequence', predecessor: 'eA', successor: 'eB' },
      { kind: 'sequence', predecessor: 'eA', successor: 'eC' },
    ])

    const layout = computeTimelineLayout(snapshot)
    expect(layout.tracks).toEqual([
      {
        eventIds: [bid('eA'), bid('eB'), bid('eC')],
        ranks: { eA: 0, eB: 1, eC: 1 },
      },
    ])
    expect(layout.edges).toEqual([
      { predecessor: bid('eA'), successor: bid('eB') },
      { predecessor: bid('eA'), successor: bid('eC') },
    ])
    expect(layout.edges[0]?.successor).not.toBe(layout.edges[1]?.successor)
  })

  it('treats a placed event with no follows as a single-member track', () => {
    const snapshot = snapshotOf([
      { kind: 'capture-domain-event', id: 'eA', label: 'Loan recorded' },
      { kind: 'place', target: 'eA' },
    ])

    expect(computeTimelineLayout(snapshot)).toEqual({
      tracks: [{ eventIds: [bid('eA')], ranks: { eA: 0 } }],
      edges: [],
      attachments: {},
      pivotal: [],
    })
  })

  it('lists an actor under the event it caused and never in eventIds', () => {
    const snapshot = snapshotOf([
      { kind: 'capture-domain-event', id: 'eA', label: 'Loan recorded' },
      { kind: 'identify-actor', id: 'a1', label: 'Clerk' },
      { kind: 'place', target: 'eA' },
      { kind: 'link-cause', cause: 'a1', effect: 'eA' },
    ])

    const layout = computeTimelineLayout(snapshot)
    expect(layout.tracks[0]?.eventIds).toEqual([bid('eA')])
    expect(layout.tracks[0]?.eventIds).not.toContain(bid('a1'))
    expect(layout.attachments).toEqual({ eA: [bid('a1')] })
  })

  it('omits a withdrawn placed event unless includeWithdrawn is true', () => {
    const snapshot = snapshotOf([
      { kind: 'capture-domain-event', id: 'eA', label: 'Loan recorded' },
      { kind: 'place', target: 'eA' },
      { kind: 'withdraw', target: 'eA' },
    ])

    expect(computeTimelineLayout(snapshot).tracks).toEqual([])
    expect(computeTimelineLayout(snapshot, { includeWithdrawn: true })).toEqual({
      tracks: [{ eventIds: [bid('eA')], ranks: { eA: 0 } }],
      edges: [],
      attachments: {},
      pivotal: [],
    })
  })

  it('returns ranks, order, attachments, and edges with no pixel fields', () => {
    const snapshot = snapshotOf([
      { kind: 'capture-domain-event', id: 'eA', label: 'Loan recorded' },
      { kind: 'place', target: 'eA' },
      { kind: 'mark-pivotal', target: 'eA' },
    ])
    const layout = computeTimelineLayout(snapshot)
    expect(layout).toEqual({
      tracks: [{ eventIds: [bid('eA')], ranks: { eA: 0 } }],
      edges: [],
      attachments: {},
      pivotal: [bid('eA')],
    })
    expect(layout).not.toHaveProperty('x')
    expect(layout).not.toHaveProperty('y')
    expect(layout).not.toHaveProperty('width')
    expect(layout).not.toHaveProperty('height')
  })
})
