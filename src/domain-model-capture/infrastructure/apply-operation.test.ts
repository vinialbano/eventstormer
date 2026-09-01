import { describe, expect, it } from 'vitest'
import { createMemoryEventStore } from '~/plumbing/event-store/memory-store.ts'
import type { EventStore } from '~/plumbing/event-store/port.ts'
import type { BuildingBlockId, WorkshopId } from '~/plumbing/ids.ts'
import { err, isErr, isOk } from '~/plumbing/result.ts'
import type { AppendConflict } from '~/plumbing/event-store/port.ts'
import { replay } from '../domain/board/replay.ts'
import { Operation } from '../domain/schema/index.ts'
import { readBoardSnapshot } from '../api.ts'
import { applyOperation, type ApplyOperationDeps } from './apply-operation.ts'
import { boardStream } from './board-stream.ts'

const workshopId = 'w_1' as WorkshopId
const author = { accepter: { name: 'Dana' } }
const clock = () => '2026-08-30T12:00:00.000Z'
const depsFor = (store: EventStore): ApplyOperationDeps => ({ store, clock })

const captureOp = (id: string, label: string): Operation =>
  Operation.parse({ author, kind: 'capture-domain-event', id, label })

const snapshotOf = (store: EventStore) =>
  replay(store.read(boardStream(workshopId)).map((row) => Operation.parse(row.operation)))

describe('applyOperation — capture kinds return the operation id', () => {
  it('appends a capture and returns that id plus the next position', () => {
    const store = createMemoryEventStore()
    const result = applyOperation(depsFor(store), workshopId, captureOp('b_1', 'Loan recorded'))

    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value).toEqual({ resultingBuildingBlockId: 'b_1', nextPosition: 0 })
    }
    expect(snapshotOf(store).blocks.get('b_1' as BuildingBlockId)).toMatchObject({
      kind: 'domain-event',
      label: 'Loan recorded',
    })
  })

  it('returns the id for identify-actor and identify-system', () => {
    const store = createMemoryEventStore()
    const actor = applyOperation(
      depsFor(store),
      workshopId,
      Operation.parse({ author, kind: 'identify-actor', id: 'a_1', label: 'Member' }),
    )
    const system = applyOperation(
      depsFor(store),
      workshopId,
      Operation.parse({ author, kind: 'identify-system', id: 's_1', label: 'Catalogue' }),
    )

    expect(isOk(actor) && isOk(system)).toBe(true)
    if (isOk(actor)) expect(actor.value.resultingBuildingBlockId).toBe('a_1')
    if (isOk(system)) expect(system.value.resultingBuildingBlockId).toBe('s_1')
  })
})

describe('applyOperation — target-bearing kinds return the target and do not throw', () => {
  it('reword returns the target id and the log carries the distinct new label', () => {
    const store = createMemoryEventStore()
    applyOperation(depsFor(store), workshopId, captureOp('b_1', 'Loan recorded'))

    const result = applyOperation(
      depsFor(store),
      workshopId,
      Operation.parse({ author, kind: 'reword', target: 'b_1', label: 'Loan was recorded' }),
    )

    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value.resultingBuildingBlockId).toBe('b_1')
      expect(result.value.nextPosition).toBe(1)
    }
    expect(snapshotOf(store).blocks.get('b_1' as BuildingBlockId)?.label).toBe('Loan was recorded')
  })

  it('withdraw returns the target id and the block stays in the log as withdrawn', () => {
    const store = createMemoryEventStore()
    applyOperation(depsFor(store), workshopId, captureOp('b_1', 'Loan recorded'))

    const result = applyOperation(
      depsFor(store),
      workshopId,
      Operation.parse({ author, kind: 'withdraw', target: 'b_1' }),
    )

    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value.resultingBuildingBlockId).toBe('b_1')
    expect(snapshotOf(store).blocks.get('b_1' as BuildingBlockId)?.withdrawn).toBe(true)
  })

  it('reinstate returns the target id and the block is no longer withdrawn', () => {
    const store = createMemoryEventStore()
    applyOperation(depsFor(store), workshopId, captureOp('b_1', 'Loan recorded'))
    applyOperation(
      depsFor(store),
      workshopId,
      Operation.parse({ author, kind: 'withdraw', target: 'b_1' }),
    )

    const result = applyOperation(
      depsFor(store),
      workshopId,
      Operation.parse({ author, kind: 'reinstate', target: 'b_1' }),
    )

    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value.resultingBuildingBlockId).toBe('b_1')
    expect(snapshotOf(store).blocks.get('b_1' as BuildingBlockId)?.withdrawn).toBe(false)
  })
})

describe('applyOperation — merits rejections bubble to the caller', () => {
  it('duplicate-id → Rejection', () => {
    const store = createMemoryEventStore()
    applyOperation(depsFor(store), workshopId, captureOp('b_1', 'first'))
    const result = applyOperation(depsFor(store), workshopId, captureOp('b_1', 'again'))
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error).toEqual({ kind: 'duplicate-id', classification: 'systemic', id: 'b_1' })
    }
  })

  it('unknown-target → Rejection', () => {
    const result = applyOperation(
      depsFor(createMemoryEventStore()),
      workshopId,
      Operation.parse({ author, kind: 'withdraw', target: 'missing' }),
    )
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.kind).toBe('unknown-target')
  })
})

describe('applyOperation — a genuine two-accept race', () => {
  it('both capture operations apply — the stale-position retry is internal', () => {
    const base = createMemoryEventStore()
    let reads = 0
    const racy: EventStore = {
      read: (stream) => {
        reads += 1
        return reads === 2 ? [] : base.read(stream)
      },
      append: (stream, pos, ops) => base.append(stream, pos, ops),
    }

    const first = applyOperation(depsFor(racy), workshopId, captureOp('b_1', 'Loan recorded'))
    const second = applyOperation(depsFor(racy), workshopId, captureOp('b_2', 'Book returned'))

    expect(isOk(first) && isOk(second)).toBe(true)
    if (isOk(second)) expect(second.value.nextPosition).toBe(1)
    expect([...snapshotOf(base).blocks.keys()]).toEqual(['b_1', 'b_2'])
  })
})

describe('applyOperation — relation kinds map an id and do not throw', () => {
  it('appends sequence and returns the successor id', () => {
    const store = createMemoryEventStore()
    const deps = depsFor(store)
    applyOperation(deps, workshopId, captureOp('eA', 'Loan recorded'))
    applyOperation(deps, workshopId, captureOp('eB', 'Book returned'))

    const result = applyOperation(
      deps,
      workshopId,
      Operation.parse({ author, kind: 'sequence', predecessor: 'eA', successor: 'eB' }),
    )

    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value.resultingBuildingBlockId).toBe('eB')
      expect(result.value.nextPosition).toBe(2)
    }
    expect(snapshotOf(store).follows).toEqual([
      { predecessor: 'eA' as BuildingBlockId, successor: 'eB' as BuildingBlockId },
    ])
  })

  it('appends insert-between and returns the inserted id', () => {
    const store = createMemoryEventStore()
    const deps = depsFor(store)
    applyOperation(deps, workshopId, captureOp('eA', 'Loan recorded'))
    applyOperation(deps, workshopId, captureOp('eB', 'Book returned'))
    applyOperation(deps, workshopId, captureOp('eC', 'Fine assessed'))
    applyOperation(
      deps,
      workshopId,
      Operation.parse({ author, kind: 'sequence', predecessor: 'eA', successor: 'eB' }),
    )

    const result = applyOperation(
      deps,
      workshopId,
      Operation.parse({
        author,
        kind: 'insert-between',
        predecessor: 'eA',
        inserted: 'eC',
        successor: 'eB',
      }),
    )

    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value.resultingBuildingBlockId).toBe('eC')
    expect(snapshotOf(store).follows).toEqual([
      { predecessor: 'eA' as BuildingBlockId, successor: 'eC' as BuildingBlockId },
      { predecessor: 'eC' as BuildingBlockId, successor: 'eB' as BuildingBlockId },
    ])
  })

  it('appends link-cause and returns the effect id', () => {
    const store = createMemoryEventStore()
    const deps = depsFor(store)
    applyOperation(deps, workshopId, captureOp('eA', 'Loan recorded'))
    applyOperation(
      deps,
      workshopId,
      Operation.parse({ author, kind: 'identify-actor', id: 'a1', label: 'Clerk' }),
    )

    const result = applyOperation(
      deps,
      workshopId,
      Operation.parse({ author, kind: 'link-cause', cause: 'a1', effect: 'eA' }),
    )

    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value.resultingBuildingBlockId).toBe('eA')
    expect(snapshotOf(store).causedBy).toEqual([
      { cause: 'a1' as BuildingBlockId, effect: 'eA' as BuildingBlockId },
    ])
  })

  it('withdraws an actor with two causes as one append of three operations', () => {
    const store = createMemoryEventStore()
    const deps = depsFor(store)
    applyOperation(deps, workshopId, captureOp('e1', 'Loan recorded'))
    applyOperation(deps, workshopId, captureOp('e2', 'Book returned'))
    applyOperation(
      deps,
      workshopId,
      Operation.parse({ author, kind: 'identify-actor', id: 'a1', label: 'Clerk' }),
    )
    applyOperation(
      deps,
      workshopId,
      Operation.parse({ author, kind: 'link-cause', cause: 'a1', effect: 'e1' }),
    )
    applyOperation(
      deps,
      workshopId,
      Operation.parse({ author, kind: 'link-cause', cause: 'a1', effect: 'e2' }),
    )

    let appendCalls = 0
    let lastBatchSize = 0
    const counting: EventStore = {
      read: (stream) => store.read(stream),
      append: (stream, position, ops) => {
        appendCalls += 1
        lastBatchSize = ops.length
        return store.append(stream, position, ops)
      },
    }

    const before = store.read(boardStream(workshopId)).length
    const result = applyOperation(
      depsFor(counting),
      workshopId,
      Operation.parse({ author, kind: 'withdraw', target: 'a1' }),
    )

    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value.resultingBuildingBlockId).toBe('a1')
    expect(appendCalls).toBe(1)
    expect(lastBatchSize).toBe(3)
    expect(store.read(boardStream(workshopId))).toHaveLength(before + 3)
    expect(
      store.read(boardStream(workshopId)).slice(-3).map((row) => Operation.parse(row.operation).kind),
    ).toEqual(['withdraw', 'unlink-cause', 'unlink-cause'])
  })

  it('unplaces a sequenced event as one append of three operations', () => {
    const store = createMemoryEventStore()
    const deps = depsFor(store)
    applyOperation(deps, workshopId, captureOp('eA', 'Loan recorded'))
    applyOperation(deps, workshopId, captureOp('eB', 'Book returned'))
    applyOperation(deps, workshopId, captureOp('eC', 'Fine assessed'))
    applyOperation(
      deps,
      workshopId,
      Operation.parse({ author, kind: 'sequence', predecessor: 'eA', successor: 'eB' }),
    )
    applyOperation(
      deps,
      workshopId,
      Operation.parse({ author, kind: 'sequence', predecessor: 'eC', successor: 'eA' }),
    )

    let appendCalls = 0
    let lastBatchSize = 0
    const counting: EventStore = {
      read: (stream) => store.read(stream),
      append: (stream, position, ops) => {
        appendCalls += 1
        lastBatchSize = ops.length
        return store.append(stream, position, ops)
      },
    }

    const before = store.read(boardStream(workshopId)).length
    const result = applyOperation(
      depsFor(counting),
      workshopId,
      Operation.parse({ author, kind: 'unplace', target: 'eA' }),
    )

    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value.resultingBuildingBlockId).toBe('eA')
    expect(appendCalls).toBe(1)
    expect(lastBatchSize).toBe(3)
    expect(store.read(boardStream(workshopId))).toHaveLength(before + 3)
    expect(
      store.read(boardStream(workshopId)).slice(-3).map((row) => Operation.parse(row.operation).kind),
    ).toEqual(['unsequence', 'unsequence', 'unplace'])

    const board = readBoardSnapshot({ store }, workshopId)
    expect(board.follows).toEqual([])
    expect(board.blocks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'eA', placement: 'backlog' }),
        expect.objectContaining({ id: 'eB', placement: 'timeline' }),
      ]),
    )
  })
})

describe('applyOperation — stale-position retry budget', () => {
  it('throws after MAX_RETRIES when append always returns stale-position', () => {
    const base = createMemoryEventStore()
    const alwaysStale: EventStore = {
      read: (stream) => base.read(stream),
      append: () =>
        err<AppendConflict>({
          kind: 'stale-position',
          actual: 0,
          classification: 'transient',
        }),
    }

    expect(() =>
      applyOperation(depsFor(alwaysStale), workshopId, captureOp('b_1', 'Loan recorded')),
    ).toThrow('applyOperation: exceeded stale-position retry budget')
  })
})

describe('applyOperation — concurrent target-bearing applies retry internally', () => {
  it('two concurrent rewords both succeed via the stale-position retry', () => {
    const base = createMemoryEventStore()
    applyOperation(depsFor(base), workshopId, captureOp('b_1', 'Loan recorded'))
    applyOperation(depsFor(base), workshopId, captureOp('b_2', 'Book returned'))
    const afterCaptures = base.read(boardStream(workshopId))

    let reads = 0
    const racy: EventStore = {
      read: (stream) => {
        reads += 1
        return reads === 2 ? afterCaptures : base.read(stream)
      },
      append: (stream, pos, ops) => base.append(stream, pos, ops),
    }

    const first = applyOperation(
      depsFor(racy),
      workshopId,
      Operation.parse({ author, kind: 'reword', target: 'b_1', label: 'Loan was recorded' }),
    )
    const second = applyOperation(
      depsFor(racy),
      workshopId,
      Operation.parse({ author, kind: 'reword', target: 'b_2', label: 'Book was returned' }),
    )

    expect(isOk(first) && isOk(second)).toBe(true)
    if (isOk(first)) expect(first.value.resultingBuildingBlockId).toBe('b_1')
    if (isOk(second)) {
      expect(second.value.resultingBuildingBlockId).toBe('b_2')
      expect(second.value.nextPosition).toBe(3)
    }
    const snapshot = snapshotOf(base)
    expect(snapshot.blocks.get('b_1' as BuildingBlockId)?.label).toBe('Loan was recorded')
    expect(snapshot.blocks.get('b_2' as BuildingBlockId)?.label).toBe('Book was returned')
  })
})
