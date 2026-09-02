import { describe, expect, it } from 'vitest'
import { createMemoryEventStore } from '~/plumbing/event-store/memory-store.ts'
import type { WorkshopId } from '~/plumbing/ids.ts'
import { Operation } from '../../domain/schema/index.ts'
import { applyOperation } from '../../infrastructure/apply-operation.ts'
import { readBoardSnapshot } from './read-board-snapshot.ts'

const workshopId = 'w_1' as WorkshopId
const author = { accepter: { name: 'Dana' } }
const clock = () => '2026-08-30T12:00:00.000Z'

describe('readBoardSnapshot', () => {
  it('returns position -1 and an empty blocks array for an empty log', () => {
    expect(readBoardSnapshot({ store: createMemoryEventStore() }, workshopId)).toEqual({
      position: -1,
      blocks: [],
      follows: [],
      causedBy: [],
    })
  })

  it('includes a withdrawn block with its id, label, and withdrawn true', () => {
    const store = createMemoryEventStore()
    const deps = { store, clock }
    applyOperation(
      deps,
      workshopId,
      Operation.parse({ author, kind: 'capture-domain-event', id: 'b_1', label: 'Loan recorded' }),
    )
    applyOperation(deps, workshopId, Operation.parse({ author, kind: 'withdraw', target: 'b_1' }))

    const snapshot = readBoardSnapshot({ store }, workshopId)
    expect(snapshot.blocks).toContainEqual(
      expect.objectContaining({
        id: 'b_1',
        label: 'Loan recorded',
        withdrawn: true,
      }),
    )
  })

  it('publishes a follows pair and timeline placement after sequence', () => {
    const store = createMemoryEventStore()
    const deps = { store, clock }
    applyOperation(
      deps,
      workshopId,
      Operation.parse({ author, kind: 'capture-domain-event', id: 'eA', label: 'Loan recorded' }),
    )
    applyOperation(
      deps,
      workshopId,
      Operation.parse({ author, kind: 'capture-domain-event', id: 'eB', label: 'Book returned' }),
    )
    applyOperation(
      deps,
      workshopId,
      Operation.parse({ author, kind: 'sequence', predecessor: 'eA', successor: 'eB' }),
    )

    const snapshot = readBoardSnapshot({ store }, workshopId)
    expect(snapshot.follows).toEqual([{ predecessor: 'eA', successor: 'eB' }])
    expect(snapshot.causedBy).toEqual([])
    expect(snapshot.blocks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'eA', placement: 'timeline', pivotal: false }),
        expect.objectContaining({ id: 'eB', placement: 'timeline', pivotal: false }),
      ]),
    )
  })
})
