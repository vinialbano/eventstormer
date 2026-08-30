import { describe, expect, it } from 'vitest'
import { createMemoryEventStore } from '~/plumbing/event-store/memory-store.ts'
import type { EventStore } from '~/plumbing/event-store/port.ts'
import type { WorkshopId } from '~/plumbing/ids.ts'
import { isErr, isOk } from '~/plumbing/result.ts'
import { Operation } from '../../domain/schema/index.ts'
import { applyOperation } from './apply-operation.ts'
import type { BoardAccessDeps } from './deps.ts'
import { readBuildingBlocks } from './read-building-blocks.ts'

const w = 'w_1' as WorkshopId
const author = { accepter: { name: 'Dana' } }
const clock = () => '2026-08-30T12:00:00.000Z'
const depsFor = (store: EventStore): BoardAccessDeps => ({ store, clock })

const captureOp = (id: string, label: string): Operation =>
  Operation.parse({ author, kind: 'capture-domain-event', id, label })

describe('applyOperation — happy path (S1-42)', () => {
  it('appends the operation and returns the resulting building-block id + next position', () => {
    const deps = depsFor(createMemoryEventStore())
    const result = applyOperation(deps, w, captureOp('b_1', 'Loan recorded'))

    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value).toEqual({ resultingBuildingBlockId: 'b_1', nextPosition: 0 })
    }
    expect(readBuildingBlocks(deps, w)).toEqual([
      { id: 'b_1', kind: 'domain-event', label: 'Loan recorded' },
    ])
  })
})

describe('applyOperation — merits rejections bubble to the caller', () => {
  it('duplicate-id → Rejection', () => {
    const deps = depsFor(createMemoryEventStore())
    applyOperation(deps, w, captureOp('b_1', 'first'))
    const result = applyOperation(deps, w, captureOp('b_1', 'again'))
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error).toEqual({ kind: 'duplicate-id', classification: 'systemic', id: 'b_1' })
    }
  })

  it('unknown-target → Rejection', () => {
    const deps = depsFor(createMemoryEventStore())
    const result = applyOperation(
      deps,
      w,
      Operation.parse({ author, kind: 'withdraw', target: 'missing' }),
    )
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.kind).toBe('unknown-target')
  })
})

describe('applyOperation — a genuine two-accept race (AD-022)', () => {
  it('both operations apply with no APPLY_FAILED — the stale-position retry is internal', () => {
    const base = createMemoryEventStore()
    let reads = 0
    const racy: EventStore = {
      // The second applyOperation's first read observes the pre-first-append
      // state — a real optimistic-concurrency miss.
      read: (s) => {
        reads += 1
        return reads === 2 ? [] : base.read(s)
      },
      append: (s, pos, ops) => base.append(s, pos, ops),
    }
    const deps = depsFor(racy)

    const first = applyOperation(deps, w, captureOp('b_1', 'Loan recorded'))
    const second = applyOperation(deps, w, captureOp('b_2', 'Book returned'))

    expect(isOk(first) && isOk(second)).toBe(true)
    if (isOk(second)) expect(second.value.nextPosition).toBe(1)
    expect(readBuildingBlocks(depsFor(base), w).map((b) => b.id)).toEqual(['b_1', 'b_2'])
  })
})

describe('readBuildingBlocks — minimal shape', () => {
  it('projects each block to { id, kind, label } only, rebuilt from the log', () => {
    const deps = depsFor(createMemoryEventStore())
    applyOperation(deps, w, Operation.parse({ author, kind: 'identify-actor', id: 'a_1', label: 'Member' }))
    applyOperation(deps, w, Operation.parse({ author, kind: 'identify-system', id: 's_1', label: 'Catalogue' }))

    expect(readBuildingBlocks(deps, w)).toEqual([
      { id: 'a_1', kind: 'actor', label: 'Member' },
      { id: 's_1', kind: 'system', label: 'Catalogue' },
    ])
  })
})
