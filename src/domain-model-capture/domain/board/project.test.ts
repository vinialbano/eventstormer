import { describe, expect, it } from 'vitest'
import type { BuildingBlockId } from '~/plumbing/ids.ts'
import { Operation } from '../schema/index.ts'
import { emptySnapshot } from './model.ts'
import { project } from './project.ts'

const author = { proposer: { name: 'facilitator' }, accepter: { name: 'Dana' } }
const op = (raw: Record<string, unknown>): Operation => Operation.parse({ author, ...raw })
const bid = (value: string): BuildingBlockId => value as BuildingBlockId

describe('project (read-model fold)', () => {
  it('adds a captured block to the backlog with its label and provenance', () => {
    const cases = [
      ['capture-domain-event', 'domain-event'],
      ['identify-actor', 'actor'],
      ['identify-system', 'system'],
    ] as const
    for (const [kind, blockKind] of cases) {
      const snap = project(emptySnapshot(), op({ kind, id: 'b1', label: 'order placed' }))
      expect(snap.blocks.get(bid('b1'))).toEqual({
        kind: blockKind,
        label: 'order placed',
        withdrawn: false,
        placement: 'backlog',
        pivotal: false,
        provenance: author,
      })
      expect(snap.follows).toEqual([])
      expect(snap.causedBy).toEqual([])
    }
  })

  it('preserves both proposer and accepter in per-block provenance', () => {
    const snap = project(emptySnapshot(), op({ kind: 'capture-domain-event', id: 'e1', label: 'x' }))
    expect(snap.blocks.get(bid('e1'))?.provenance).toEqual({
      proposer: { name: 'facilitator' },
      accepter: { name: 'Dana' },
    })
  })

  it('reword changes the label but not the id, and never dedupes', () => {
    let snap = project(emptySnapshot(), op({ kind: 'capture-domain-event', id: 'e1', label: 'first' }))
    snap = project(snap, op({ kind: 'capture-domain-event', id: 'e2', label: 'first' }))
    snap = project(snap, op({ kind: 'reword', target: 'e1', label: 'reworded' }))
    expect(snap.blocks.get(bid('e1'))?.label).toBe('reworded') // the new label is written
    expect(snap.blocks.get(bid('e1'))?.kind).toBe('domain-event') // id and kind unchanged
    expect(snap.blocks.get(bid('e2'))?.label).toBe('first') // the identical-label sibling is untouched
    expect(snap.blocks.size).toBe(2) // no dedupe, though the two shared a label
  })

  it('withdraw flips withdrawn to true; reinstate returns a naked active block', () => {
    let snap = project(emptySnapshot(), op({ kind: 'capture-domain-event', id: 'e1', label: 'x' }))
    const captured = snap.blocks.get(bid('e1'))
    snap = project(snap, op({ kind: 'withdraw', target: 'e1' }))
    expect(snap.blocks.get(bid('e1'))?.withdrawn).toBe(true)
    snap = project(snap, op({ kind: 'reinstate', target: 'e1' }))
    expect(snap.blocks.get(bid('e1'))).toEqual(captured)
  })

  it('advances position by one on every fold, whatever the kind', () => {
    let snap = emptySnapshot()
    expect(snap.position).toBe(-1)
    snap = project(snap, op({ kind: 'capture-domain-event', id: 'e1', label: 'x' }))
    expect(snap.position).toBe(0)
    snap = project(snap, op({ kind: 'place', target: 'e1' }))
    expect(snap.position).toBe(1)
  })

  it('does not mutate its argument', () => {
    const before = emptySnapshot()
    project(before, op({ kind: 'capture-domain-event', id: 'e1', label: 'x' }))
    expect(before.blocks.size).toBe(0)
    expect(before.position).toBe(-1)
  })

  it('a reword / withdraw of an absent target is a no-op on the blocks (position still advances)', () => {
    const snap = project(emptySnapshot(), op({ kind: 'reword', target: 'missing', label: 'x' }))
    expect(snap.blocks.size).toBe(0)
    expect(snap.position).toBe(0)
  })

  it('sequence puts both events on the timeline and records the follows edge', () => {
    const captureA = op({ kind: 'capture-domain-event', id: 'eA', label: 'a' })
    const captureB = op({ kind: 'capture-domain-event', id: 'eB', label: 'b' })
    const sequence = op({ kind: 'sequence', predecessor: 'eA', successor: 'eB' })
    const log = [captureA, captureB, sequence]
    expect(log.map((item) => item.kind)).toEqual([
      'capture-domain-event',
      'capture-domain-event',
      'sequence',
    ])
    let snap = emptySnapshot()
    for (const item of log) snap = project(snap, item)
    expect(snap.blocks.get(bid('eA'))?.placement).toBe('timeline')
    expect(snap.blocks.get(bid('eB'))?.placement).toBe('timeline')
    expect(snap.follows).toEqual([{ predecessor: bid('eA'), successor: bid('eB') }])
  })

  it('place puts a captured event on the timeline as its own track', () => {
    let snap = project(emptySnapshot(), op({ kind: 'capture-domain-event', id: 'eA', label: 'a' }))
    expect(snap.blocks.get(bid('eA'))?.placement).toBe('backlog')
    snap = project(snap, op({ kind: 'place', target: 'eA' }))
    expect(snap.blocks.get(bid('eA'))?.placement).toBe('timeline')
    expect(snap.follows).toEqual([])
  })

  it('unsequence removes the follows edge and leaves placements on the timeline', () => {
    let snap = project(emptySnapshot(), op({ kind: 'capture-domain-event', id: 'eA', label: 'a' }))
    snap = project(snap, op({ kind: 'capture-domain-event', id: 'eB', label: 'b' }))
    snap = project(snap, op({ kind: 'capture-domain-event', id: 'eC', label: 'c' }))
    snap = project(snap, op({ kind: 'sequence', predecessor: 'eA', successor: 'eB' }))
    snap = project(snap, op({ kind: 'sequence', predecessor: 'eB', successor: 'eC' }))
    expect(snap.blocks.get(bid('eA'))?.placement).toBe('timeline')
    expect(snap.blocks.get(bid('eB'))?.placement).toBe('timeline')
    expect(snap.blocks.get(bid('eC'))?.placement).toBe('timeline')
    expect(snap.follows).toEqual([
      { predecessor: bid('eA'), successor: bid('eB') },
      { predecessor: bid('eB'), successor: bid('eC') },
    ])
    snap = project(snap, op({ kind: 'unsequence', predecessor: 'eA', successor: 'eB' }))
    expect(snap.blocks.get(bid('eA'))?.placement).toBe('timeline')
    expect(snap.blocks.get(bid('eB'))?.placement).toBe('timeline')
    expect(snap.blocks.get(bid('eC'))?.placement).toBe('timeline')
    expect(snap.follows).toEqual([{ predecessor: bid('eB'), successor: bid('eC') }])
  })

  it('unplace returns a sequenced event to the backlog and drops follows involving it', () => {
    let snap = project(emptySnapshot(), op({ kind: 'capture-domain-event', id: 'eA', label: 'a' }))
    snap = project(snap, op({ kind: 'capture-domain-event', id: 'eB', label: 'b' }))
    snap = project(snap, op({ kind: 'sequence', predecessor: 'eA', successor: 'eB' }))
    expect(snap.blocks.get(bid('eA'))?.placement).toBe('timeline')
    expect(snap.follows).toEqual([{ predecessor: bid('eA'), successor: bid('eB') }])
    snap = project(snap, op({ kind: 'unplace', target: 'eA' }))
    expect(snap.blocks.get(bid('eA'))?.placement).toBe('backlog')
    expect(snap.blocks.get(bid('eB'))?.placement).toBe('timeline')
    expect(snap.follows).toEqual([])
  })

  it('insert-between places the three events and replaces A→B with A→C and C→B', () => {
    let snap = project(emptySnapshot(), op({ kind: 'capture-domain-event', id: 'eA', label: 'a' }))
    snap = project(snap, op({ kind: 'capture-domain-event', id: 'eB', label: 'b' }))
    snap = project(snap, op({ kind: 'capture-domain-event', id: 'eC', label: 'c' }))
    snap = project(snap, op({ kind: 'capture-domain-event', id: 'eD', label: 'd' }))
    snap = project(snap, op({ kind: 'sequence', predecessor: 'eA', successor: 'eB' }))
    snap = project(snap, op({ kind: 'sequence', predecessor: 'eA', successor: 'eD' }))
    snap = project(
      snap,
      op({ kind: 'insert-between', predecessor: 'eA', inserted: 'eC', successor: 'eB' }),
    )
    expect(snap.blocks.get(bid('eA'))?.placement).toBe('timeline')
    expect(snap.blocks.get(bid('eB'))?.placement).toBe('timeline')
    expect(snap.blocks.get(bid('eC'))?.placement).toBe('timeline')
    expect(snap.follows).toEqual([
      { predecessor: bid('eA'), successor: bid('eD') },
      { predecessor: bid('eA'), successor: bid('eC') },
      { predecessor: bid('eC'), successor: bid('eB') },
    ])
  })

  it('mark-pivotal then unmark-pivotal flips pivotal false to true to false', () => {
    let snap = project(emptySnapshot(), op({ kind: 'capture-domain-event', id: 'eA', label: 'a' }))
    expect(snap.blocks.get(bid('eA'))?.pivotal).toBe(false)
    snap = project(snap, op({ kind: 'mark-pivotal', target: 'eA' }))
    expect(snap.blocks.get(bid('eA'))?.pivotal).toBe(true)
    snap = project(snap, op({ kind: 'unmark-pivotal', target: 'eA' }))
    expect(snap.blocks.get(bid('eA'))?.pivotal).toBe(false)
  })

  it('link-cause publishes the causedBy edge; unlink-cause removes it', () => {
    let snap = project(emptySnapshot(), op({ kind: 'identify-actor', id: 'a1', label: 'clerk' }))
    snap = project(snap, op({ kind: 'capture-domain-event', id: 'eA', label: 'a' }))
    snap = project(snap, op({ kind: 'link-cause', cause: 'a1', effect: 'eA' }))
    expect(snap.causedBy).toEqual([{ cause: bid('a1'), effect: bid('eA') }])
    snap = project(snap, op({ kind: 'unlink-cause', cause: 'a1', effect: 'eA' }))
    expect(snap.causedBy).toEqual([])
  })

  it('withdraw drops incident published edges so withdrawn ids are absent', () => {
    let snap = project(emptySnapshot(), op({ kind: 'capture-domain-event', id: 'eA', label: 'a' }))
    snap = project(snap, op({ kind: 'capture-domain-event', id: 'eB', label: 'b' }))
    snap = project(snap, op({ kind: 'identify-actor', id: 'a1', label: 'clerk' }))
    snap = project(snap, op({ kind: 'sequence', predecessor: 'eA', successor: 'eB' }))
    snap = project(snap, op({ kind: 'link-cause', cause: 'a1', effect: 'eA' }))
    snap = project(snap, op({ kind: 'withdraw', target: 'eA' }))
    expect(snap.follows).toEqual([])
    expect(snap.causedBy).toEqual([])
    expect(snap.blocks.get(bid('eA'))?.withdrawn).toBe(true)
  })

  it('unmarks pivotal without touching placement or edges', () => {
    let snap = project(emptySnapshot(), op({ kind: 'capture-domain-event', id: 'eA', label: 'a' }))
    snap = project(snap, op({ kind: 'place', target: 'eA' }))
    snap = project(snap, op({ kind: 'mark-pivotal', target: 'eA' }))
    snap = project(snap, op({ kind: 'unmark-pivotal', target: 'eA' }))
    expect(snap.blocks.get(bid('eA'))?.pivotal).toBe(false)
    expect(snap.blocks.get(bid('eA'))?.placement).toBe('timeline')
  })

  it('raise-hot-spot adds a backlog hot-spot block, open and annotating nothing, and counts it', () => {
    const snap = project(emptySnapshot(), op({ kind: 'raise-hot-spot', id: 'h1', label: 'timeouts' }))
    expect(snap.blocks.get(bid('h1'))).toEqual({
      kind: 'hot-spot',
      label: 'timeouts',
      withdrawn: false,
      placement: 'backlog',
      pivotal: false,
      provenance: author,
      modelAffecting: true,
      annotates: null,
      resolved: false,
      reference: null,
    })
    expect(snap.hotSpotCount).toBe(1)
  })

  it('raise-hot-spot carries an explicit modelAffecting:false through the projection', () => {
    const snap = project(
      emptySnapshot(),
      op({ kind: 'raise-hot-spot', id: 'h1', label: 'note', modelAffecting: false }),
    )
    expect(snap.blocks.get(bid('h1'))?.modelAffecting).toBe(false)
  })

  it('project over [raise, annotate] points the hot spot at the target id and counts one', () => {
    let snap = project(emptySnapshot(), op({ kind: 'capture-domain-event', id: 'e1', label: 'payment' }))
    snap = project(snap, op({ kind: 'raise-hot-spot', id: 'h1', label: 'timeouts' }))
    snap = project(snap, op({ kind: 'annotate', hotSpot: 'h1', target: 'e1' }))
    expect(snap.blocks.get(bid('h1'))?.annotates).toBe(bid('e1'))
    expect(snap.hotSpotCount).toBe(1)
  })

  it('unannotate clears the annotation back to null', () => {
    let snap = project(emptySnapshot(), op({ kind: 'capture-domain-event', id: 'e1', label: 'payment' }))
    snap = project(snap, op({ kind: 'raise-hot-spot', id: 'h1', label: 'timeouts' }))
    snap = project(snap, op({ kind: 'annotate', hotSpot: 'h1', target: 'e1' }))
    snap = project(snap, op({ kind: 'unannotate', hotSpot: 'h1' }))
    expect(snap.blocks.get(bid('h1'))?.annotates).toBeNull()
  })

  it('a withdrawn hot spot is not in the count', () => {
    let snap = project(emptySnapshot(), op({ kind: 'raise-hot-spot', id: 'h1', label: 'timeouts' }))
    snap = project(snap, op({ kind: 'raise-hot-spot', id: 'h2', label: 'ownership' }))
    expect(snap.hotSpotCount).toBe(2)
    snap = project(snap, op({ kind: 'withdraw', target: 'h1' }))
    expect(snap.hotSpotCount).toBe(1)
  })

  it('reinstate returns a previously placed pivotal event to a naked backlog', () => {
    let snap = project(emptySnapshot(), op({ kind: 'capture-domain-event', id: 'eA', label: 'a' }))
    snap = project(snap, op({ kind: 'capture-domain-event', id: 'eB', label: 'b' }))
    snap = project(snap, op({ kind: 'sequence', predecessor: 'eA', successor: 'eB' }))
    snap = project(snap, op({ kind: 'mark-pivotal', target: 'eA' }))
    expect(snap.blocks.get(bid('eA'))?.placement).toBe('timeline')
    expect(snap.blocks.get(bid('eA'))?.pivotal).toBe(true)
    snap = project(snap, op({ kind: 'withdraw', target: 'eA' }))
    snap = project(snap, op({ kind: 'reinstate', target: 'eA' }))
    expect(snap.blocks.get(bid('eA'))).toEqual({
      kind: 'domain-event',
      label: 'a',
      withdrawn: false,
      placement: 'backlog',
      pivotal: false,
      provenance: author,
    })
    expect(snap.follows).toEqual([])
  })
})
