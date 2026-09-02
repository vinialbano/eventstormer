import { describe, expect, it } from 'vitest'
import type { BuildingBlockId } from '~/plumbing/ids.ts'
import { Operation } from '../schema/index.ts'
import { evolve } from './evolve.ts'
import { emptyWriteModel } from './model.ts'

const author = { accepter: { name: 'Dana' } }
const op = (raw: Record<string, unknown>): Operation => Operation.parse({ author, ...raw })
const bid = (value: string): BuildingBlockId => value as BuildingBlockId

describe('evolve (write-model fold)', () => {
  it('adds a captured block as id -> { kind, withdrawn: false } for each capture kind', () => {
    const cases = [
      ['capture-domain-event', 'domain-event'],
      ['identify-actor', 'actor'],
      ['identify-system', 'system'],
    ] as const
    for (const [kind, blockKind] of cases) {
      const writeModel = evolve(emptyWriteModel(), op({ kind, id: 'b1', label: 'x' }))
      expect(writeModel.blocks.get(bid('b1'))).toEqual({ kind: blockKind, withdrawn: false })
      expect(writeModel.follows.size).toBe(0)
      expect(writeModel.causedBy.size).toBe(0)
    }
  })

  it('withdraw sets withdrawn: true, reinstate sets it back to false', () => {
    let writeModel = evolve(emptyWriteModel(), op({ kind: 'capture-domain-event', id: 'e1', label: 'x' }))
    writeModel = evolve(writeModel, op({ kind: 'withdraw', target: 'e1' }))
    expect(writeModel.blocks.get(bid('e1'))).toEqual({ kind: 'domain-event', withdrawn: true })
    writeModel = evolve(writeModel, op({ kind: 'reinstate', target: 'e1' }))
    expect(writeModel.blocks.get(bid('e1'))).toEqual({ kind: 'domain-event', withdrawn: false })
  })

  it('reword does not change the write model', () => {
    const base = evolve(emptyWriteModel(), op({ kind: 'capture-domain-event', id: 'e1', label: 'x' }))
    const after = evolve(base, op({ kind: 'reword', target: 'e1', label: 'y' }))
    expect(after).toEqual(base)
    expect(after).not.toBe(base)
    expect(after.blocks).not.toBe(base.blocks)
  })

  it('a not-yet-handled operation kind leaves the write model unchanged', () => {
    const base = evolve(emptyWriteModel(), op({ kind: 'capture-domain-event', id: 'e1', label: 'x' }))
    const after = evolve(base, op({ kind: 'place', target: 'e1' }))
    expect(after).toEqual(base)
    expect(after).not.toBe(base)
  })

  it('does not mutate its argument (returns a fresh write model)', () => {
    const before = emptyWriteModel()
    const after = evolve(before, op({ kind: 'capture-domain-event', id: 'e1', label: 'x' }))
    expect(before.blocks.size).toBe(0)
    expect(before.follows.size).toBe(0)
    expect(before.causedBy.size).toBe(0)
    expect(after).not.toBe(before)
    expect(after.blocks).not.toBe(before.blocks)
  })

  it('sequence A then A to a second successor keeps both successors', () => {
    let writeModel = evolve(emptyWriteModel(), op({ kind: 'capture-domain-event', id: 'e1', label: 'a' }))
    writeModel = evolve(writeModel, op({ kind: 'capture-domain-event', id: 'e2', label: 'b' }))
    writeModel = evolve(writeModel, op({ kind: 'capture-domain-event', id: 'e3', label: 'c' }))
    writeModel = evolve(writeModel, op({ kind: 'sequence', predecessor: 'e1', successor: 'e2' }))
    writeModel = evolve(writeModel, op({ kind: 'sequence', predecessor: 'e1', successor: 'e3' }))
    expect(writeModel.follows.get(bid('e1'))).toEqual(new Set([bid('e2'), bid('e3')]))
  })

  it('insert-between replaces A→B with A→C and C→B and leaves another successor of A', () => {
    let writeModel = evolve(emptyWriteModel(), op({ kind: 'capture-domain-event', id: 'eA', label: 'a' }))
    writeModel = evolve(writeModel, op({ kind: 'capture-domain-event', id: 'eB', label: 'b' }))
    writeModel = evolve(writeModel, op({ kind: 'capture-domain-event', id: 'eC', label: 'c' }))
    writeModel = evolve(writeModel, op({ kind: 'capture-domain-event', id: 'eD', label: 'd' }))
    writeModel = evolve(writeModel, op({ kind: 'sequence', predecessor: 'eA', successor: 'eB' }))
    writeModel = evolve(writeModel, op({ kind: 'sequence', predecessor: 'eA', successor: 'eD' }))
    writeModel = evolve(
      writeModel,
      op({ kind: 'insert-between', predecessor: 'eA', inserted: 'eC', successor: 'eB' }),
    )
    expect(writeModel.follows.get(bid('eA'))).toEqual(new Set([bid('eC'), bid('eD')]))
    expect(writeModel.follows.get(bid('eC'))).toEqual(new Set([bid('eB')]))
    expect(writeModel.follows.get(bid('eB'))).toBeUndefined()
  })

  it('unsequence removes one follows edge and leaves the other', () => {
    let writeModel = evolve(emptyWriteModel(), op({ kind: 'capture-domain-event', id: 'e1', label: 'a' }))
    writeModel = evolve(writeModel, op({ kind: 'capture-domain-event', id: 'e2', label: 'b' }))
    writeModel = evolve(writeModel, op({ kind: 'capture-domain-event', id: 'e3', label: 'c' }))
    writeModel = evolve(writeModel, op({ kind: 'sequence', predecessor: 'e1', successor: 'e2' }))
    writeModel = evolve(writeModel, op({ kind: 'sequence', predecessor: 'e1', successor: 'e3' }))
    writeModel = evolve(writeModel, op({ kind: 'unsequence', predecessor: 'e1', successor: 'e2' }))
    expect(writeModel.follows.get(bid('e1'))).toEqual(new Set([bid('e3')]))
  })

  it('link-cause records two causes on one effect; unlink-cause removes one', () => {
    let writeModel = evolve(emptyWriteModel(), op({ kind: 'identify-actor', id: 'a1', label: 'clerk' }))
    writeModel = evolve(writeModel, op({ kind: 'identify-system', id: 's1', label: 'ledger' }))
    writeModel = evolve(writeModel, op({ kind: 'capture-domain-event', id: 'e1', label: 'posted' }))
    writeModel = evolve(writeModel, op({ kind: 'link-cause', cause: 'a1', effect: 'e1' }))
    writeModel = evolve(writeModel, op({ kind: 'link-cause', cause: 's1', effect: 'e1' }))
    expect(writeModel.causedBy.get(bid('e1'))).toEqual(new Set([bid('a1'), bid('s1')]))
    writeModel = evolve(writeModel, op({ kind: 'unlink-cause', cause: 'a1', effect: 'e1' }))
    expect(writeModel.causedBy.get(bid('e1'))).toEqual(new Set([bid('s1')]))
  })

  it('withdraw of an event with follows on both sides leaves no edge between the neighbours', () => {
    let writeModel = evolve(emptyWriteModel(), op({ kind: 'capture-domain-event', id: 'eA', label: 'a' }))
    writeModel = evolve(writeModel, op({ kind: 'capture-domain-event', id: 'eM', label: 'm' }))
    writeModel = evolve(writeModel, op({ kind: 'capture-domain-event', id: 'eB', label: 'b' }))
    writeModel = evolve(writeModel, op({ kind: 'sequence', predecessor: 'eA', successor: 'eM' }))
    writeModel = evolve(writeModel, op({ kind: 'sequence', predecessor: 'eM', successor: 'eB' }))
    writeModel = evolve(writeModel, op({ kind: 'withdraw', target: 'eM' }))
    expect(writeModel.blocks.get(bid('eM'))).toEqual({ kind: 'domain-event', withdrawn: true })
    expect(writeModel.follows.get(bid('eA'))).toBeUndefined()
    expect(writeModel.follows.get(bid('eM'))).toBeUndefined()
    expect(writeModel.follows.size).toBe(0)
  })

  it('withdraw of an actor that caused two events leaves those events with empty causes', () => {
    let writeModel = evolve(emptyWriteModel(), op({ kind: 'identify-actor', id: 'a1', label: 'clerk' }))
    writeModel = evolve(writeModel, op({ kind: 'capture-domain-event', id: 'e1', label: 'one' }))
    writeModel = evolve(writeModel, op({ kind: 'capture-domain-event', id: 'e2', label: 'two' }))
    writeModel = evolve(writeModel, op({ kind: 'link-cause', cause: 'a1', effect: 'e1' }))
    writeModel = evolve(writeModel, op({ kind: 'link-cause', cause: 'a1', effect: 'e2' }))
    writeModel = evolve(writeModel, op({ kind: 'withdraw', target: 'a1' }))
    expect(writeModel.causedBy.get(bid('e1'))).toBeUndefined()
    expect(writeModel.causedBy.get(bid('e2'))).toBeUndefined()
    expect(writeModel.causedBy.size).toBe(0)
    expect(writeModel.blocks.get(bid('a1'))).toEqual({ kind: 'actor', withdrawn: true })
  })

  it('reinstate after withdraw does not restore dropped edges', () => {
    let writeModel = evolve(emptyWriteModel(), op({ kind: 'capture-domain-event', id: 'e1', label: 'a' }))
    writeModel = evolve(writeModel, op({ kind: 'capture-domain-event', id: 'e2', label: 'b' }))
    writeModel = evolve(writeModel, op({ kind: 'sequence', predecessor: 'e1', successor: 'e2' }))
    writeModel = evolve(writeModel, op({ kind: 'withdraw', target: 'e1' }))
    writeModel = evolve(writeModel, op({ kind: 'reinstate', target: 'e1' }))
    expect(writeModel.blocks.get(bid('e1'))).toEqual({ kind: 'domain-event', withdrawn: false })
    expect(writeModel.follows.size).toBe(0)
  })

  it('raise-hot-spot adds a hot-spot block and marks it unresolved', () => {
    const writeModel = evolve(emptyWriteModel(), op({ kind: 'raise-hot-spot', id: 'h1', label: 'timeouts' }))
    expect(writeModel.blocks.get(bid('h1'))).toEqual({ kind: 'hot-spot', withdrawn: false })
    expect(writeModel.hotSpotResolved.get(bid('h1'))).toBe(false)
    expect(writeModel.annotates.size).toBe(0)
  })

  it('annotate after a raise records exactly the hotSpot -> target edge', () => {
    let writeModel = evolve(emptyWriteModel(), op({ kind: 'capture-domain-event', id: 'e1', label: 'payment' }))
    writeModel = evolve(writeModel, op({ kind: 'raise-hot-spot', id: 'h1', label: 'timeouts' }))
    writeModel = evolve(writeModel, op({ kind: 'annotate', hotSpot: 'h1', target: 'e1' }))
    expect([...writeModel.annotates]).toEqual([[bid('h1'), bid('e1')]])
  })

  it('unannotate removes the edge; unannotate of a hot spot annotating nothing leaves annotates unchanged', () => {
    let writeModel = evolve(emptyWriteModel(), op({ kind: 'capture-domain-event', id: 'e1', label: 'payment' }))
    writeModel = evolve(writeModel, op({ kind: 'raise-hot-spot', id: 'h1', label: 'timeouts' }))
    writeModel = evolve(writeModel, op({ kind: 'annotate', hotSpot: 'h1', target: 'e1' }))
    writeModel = evolve(writeModel, op({ kind: 'unannotate', hotSpot: 'h1' }))
    expect(writeModel.annotates.size).toBe(0)
    const after = evolve(writeModel, op({ kind: 'unannotate', hotSpot: 'h1' }))
    expect([...after.annotates]).toEqual([])
  })

  it('place, unplace, and mark-pivotal do not touch the write model', () => {
    const base = evolve(emptyWriteModel(), op({ kind: 'capture-domain-event', id: 'e1', label: 'x' }))
    expect(evolve(base, op({ kind: 'place', target: 'e1' }))).toEqual(base)
    expect(evolve(base, op({ kind: 'unplace', target: 'e1' }))).toEqual(base)
    expect(evolve(base, op({ kind: 'mark-pivotal', target: 'e1' }))).toEqual(base)
  })
})
