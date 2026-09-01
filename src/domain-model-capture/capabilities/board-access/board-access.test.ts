import { describe, expect, it } from 'vitest'
import { createMemoryEventStore } from '~/plumbing/event-store/memory-store.ts'
import type { EventStore } from '~/plumbing/event-store/port.ts'
import type { WorkshopId } from '~/plumbing/ids.ts'
import { Operation } from '../../domain/schema/index.ts'
import { applyOperation } from '../../infrastructure/apply-operation.ts'
import type { BoardAccessDeps } from './deps.ts'
import { readBuildingBlocks } from './read-building-blocks.ts'

const workshopId = 'w_1' as WorkshopId
const author = { accepter: { name: 'Dana' } }
const clock = () => '2026-08-30T12:00:00.000Z'
const depsFor = (store: EventStore): BoardAccessDeps => ({ store, clock })

describe('readBuildingBlocks — minimal shape', () => {
  it('projects each block to { id, kind, label } only, rebuilt from the log', () => {
    const deps = depsFor(createMemoryEventStore())
    applyOperation(deps, workshopId, Operation.parse({ author, kind: 'identify-actor', id: 'a_1', label: 'Member' }))
    applyOperation(deps, workshopId, Operation.parse({ author, kind: 'identify-system', id: 's_1', label: 'Catalogue' }))

    expect(readBuildingBlocks(deps, workshopId)).toEqual([
      { id: 'a_1', kind: 'actor', label: 'Member' },
      { id: 's_1', kind: 'system', label: 'Catalogue' },
    ])
  })

  it('still lists a withdrawn building block', () => {
    const deps = depsFor(createMemoryEventStore())
    applyOperation(deps, workshopId, Operation.parse({ author, kind: 'identify-actor', id: 'a_1', label: 'Member' }))
    applyOperation(deps, workshopId, Operation.parse({ author, kind: 'withdraw', target: 'a_1' }))

    expect(readBuildingBlocks(deps, workshopId)).toEqual([{ id: 'a_1', kind: 'actor', label: 'Member' }])
  })
})
