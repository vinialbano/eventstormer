import { describe, expect, it } from 'vitest'
import type { BuildingBlockId } from '~/plumbing/ids.ts'
import { Operation } from '../schema/index.ts'
import { emptySnapshot } from './model.ts'
import { project } from './project.ts'

const author = { proposer: { name: 'facilitator' }, accepter: { name: 'Dana' } }
const op = (raw: Record<string, unknown>): Operation => Operation.parse({ author, ...raw })
const bid = (value: string): BuildingBlockId => value as BuildingBlockId

describe('project (read-model fold)', () => {
  it('adds a captured block to the backlog with its label and provenance (S0-14)', () => {
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
        provenance: author,
      })
    }
  })

  it('preserves both proposer and accepter in per-block provenance (S0-18 / AC12)', () => {
    const snap = project(emptySnapshot(), op({ kind: 'capture-domain-event', id: 'e1', label: 'x' }))
    expect(snap.blocks.get(bid('e1'))?.provenance).toEqual({
      proposer: { name: 'facilitator' },
      accepter: { name: 'Dana' },
    })
  })

  it('reword changes the label but not the id, and never dedupes (S0-15)', () => {
    let snap = project(emptySnapshot(), op({ kind: 'capture-domain-event', id: 'e1', label: 'same' }))
    snap = project(snap, op({ kind: 'capture-domain-event', id: 'e2', label: 'same' }))
    snap = project(snap, op({ kind: 'reword', target: 'e1', label: 'same' }))
    expect(snap.blocks.get(bid('e1'))?.label).toBe('same')
    expect(snap.blocks.get(bid('e2'))?.label).toBe('same')
    expect(snap.blocks.size).toBe(2)
  })

  it('withdraw flips withdrawn to true; reinstate returns a naked active block (AT-17)', () => {
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
    snap = project(snap, op({ kind: 'place', target: 'e1' })) // not folded, still advances
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
})
