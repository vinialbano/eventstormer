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
      hotSpotCount: 0,
    })
  })

  it('serialises an annotated resolved hot spot with its annotates/resolved/reference and hotSpotCount', () => {
    const store = createMemoryEventStore()
    const deps = { store, clock }
    applyOperation(
      deps,
      workshopId,
      Operation.parse({ author, kind: 'capture-domain-event', id: 'e_1', label: 'Payment taken' }),
    )
    applyOperation(
      deps,
      workshopId,
      Operation.parse({ author, kind: 'raise-hot-spot', id: 'h_1', label: 'Payment keeps timing out' }),
    )
    applyOperation(
      deps,
      workshopId,
      Operation.parse({ author, kind: 'annotate', hotSpot: 'h_1', target: 'e_1' }),
    )
    applyOperation(
      deps,
      workshopId,
      Operation.parse({ author, kind: 'resolve', target: 'h_1', reference: 'added a retry with backoff' }),
    )

    const snapshot = readBoardSnapshot({ store }, workshopId)
    expect(snapshot.hotSpotCount).toBe(1)
    expect(snapshot.blocks).toContainEqual(
      expect.objectContaining({
        id: 'h_1',
        kind: 'hot-spot',
        annotates: 'e_1',
        resolved: true,
        reference: 'added a retry with backoff',
      }),
    )
  })

  it('round-trips through JSON — Map blocks become an array, hotSpotCount survives', () => {
    const store = createMemoryEventStore()
    const deps = { store, clock }
    applyOperation(
      deps,
      workshopId,
      Operation.parse({ author, kind: 'raise-hot-spot', id: 'h_1', label: 'Unowned decision' }),
    )
    applyOperation(
      deps,
      workshopId,
      Operation.parse({ author, kind: 'raise-hot-spot', id: 'h_2', label: 'Second gap' }),
    )

    const snapshot = readBoardSnapshot({ store }, workshopId)
    const parsed = JSON.parse(JSON.stringify(snapshot)) as typeof snapshot
    expect(parsed.hotSpotCount).toBe(2)
    expect(parsed.blocks.map((block) => block.id).toSorted()).toEqual(['h_1', 'h_2'])
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
