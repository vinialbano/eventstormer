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
      expect(writeModel.get(bid('b1'))).toEqual({ kind: blockKind, withdrawn: false })
    }
  })

  it('withdraw sets withdrawn: true, reinstate sets it back to false', () => {
    let writeModel = evolve(emptyWriteModel(), op({ kind: 'capture-domain-event', id: 'e1', label: 'x' }))
    writeModel = evolve(writeModel, op({ kind: 'withdraw', target: 'e1' }))
    expect(writeModel.get(bid('e1'))).toEqual({ kind: 'domain-event', withdrawn: true })
    writeModel = evolve(writeModel, op({ kind: 'reinstate', target: 'e1' }))
    expect(writeModel.get(bid('e1'))).toEqual({ kind: 'domain-event', withdrawn: false })
  })

  it('reword does not change the write model', () => {
    const base = evolve(emptyWriteModel(), op({ kind: 'capture-domain-event', id: 'e1', label: 'x' }))
    const after = evolve(base, op({ kind: 'reword', target: 'e1', label: 'y' }))
    expect([...after.entries()]).toEqual([...base.entries()])
  })

  it('a not-yet-handled operation kind leaves the write model unchanged', () => {
    const base = evolve(emptyWriteModel(), op({ kind: 'capture-domain-event', id: 'e1', label: 'x' }))
    const after = evolve(base, op({ kind: 'place', target: 'e1' }))
    expect([...after.entries()]).toEqual([...base.entries()])
  })

  it('does not mutate its argument (returns a fresh map)', () => {
    const before = emptyWriteModel()
    const after = evolve(before, op({ kind: 'capture-domain-event', id: 'e1', label: 'x' }))
    expect(before.size).toBe(0)
    expect(after).not.toBe(before)
  })
})
