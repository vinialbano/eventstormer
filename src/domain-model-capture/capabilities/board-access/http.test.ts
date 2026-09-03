import { testClient } from 'hono/testing'
import { describe, expect, it } from 'vitest'
import { createMemoryEventStore } from '~/plumbing/event-store/memory-store.ts'
import type { WorkshopId } from '~/plumbing/ids.ts'
import { Operation } from '../../domain/schema/index.ts'
import { applyOperation } from '../../infrastructure/apply-operation.ts'
import type { BoardAccessDeps } from './deps.ts'
import { boardAccessRoutes } from './http.ts'

const workshopId = 'w_1' as WorkshopId
const author = { accepter: { name: 'Dana' } }
const clock = () => '2026-08-30T12:00:00.000Z'

describe('GET /workshops/:id/board', () => {
  it('returns the snapshot rebuilt from the log', async () => {
    const deps: BoardAccessDeps = { store: createMemoryEventStore(), clock }
    applyOperation(deps, workshopId, Operation.parse({ author, kind: 'capture-domain-event', id: 'b_1', label: 'Loan recorded' }))

    const response = await testClient(boardAccessRoutes(deps)).workshops[':id'].board.$get({
      param: { id: workshopId },
    })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      position: 0,
      blocks: [
        {
          id: 'b_1',
          kind: 'domain-event',
          label: 'Loan recorded',
          withdrawn: false,
          placement: 'backlog',
          pivotal: false,
          provenance: { accepter: { name: 'Dana' } },
        },
      ],
      follows: [],
      causedBy: [],
      hotSpotCount: 0,
    })
  })

  it('carries per-hot-spot annotates/resolved/reference and a top-level hotSpotCount', async () => {
    const deps: BoardAccessDeps = { store: createMemoryEventStore(), clock }
    applyOperation(deps, workshopId, Operation.parse({ author, kind: 'capture-domain-event', id: 'e_1', label: 'Loan recorded' }))
    applyOperation(deps, workshopId, Operation.parse({ author, kind: 'raise-hot-spot', id: 'h_1', label: 'Unclear fee' }))
    applyOperation(deps, workshopId, Operation.parse({ author, kind: 'annotate', hotSpot: 'h_1', target: 'e_1' }))
    applyOperation(deps, workshopId, Operation.parse({ author, kind: 'resolve', target: 'h_1', reference: 'fee is waived for members' }))

    const response = await testClient(boardAccessRoutes(deps)).workshops[':id'].board.$get({
      param: { id: workshopId },
    })
    expect(response.status).toBe(200)
    const body = (await response.json()) as {
      hotSpotCount: number
      blocks: { id: string; annotates?: string | null; resolved?: boolean; reference?: unknown }[]
    }
    expect(body.hotSpotCount).toBe(1)
    const hotSpot = body.blocks.find((block) => block.id === 'h_1')
    expect(hotSpot).toMatchObject({
      annotates: 'e_1',
      resolved: true,
      reference: 'fee is waived for members',
    })
  })

  it('404s for an unknown workshop id (no operations logged)', async () => {
    const deps: BoardAccessDeps = { store: createMemoryEventStore(), clock }
    const response = await testClient(boardAccessRoutes(deps)).workshops[':id'].board.$get({
      param: { id: 'nope' },
    })
    expect(response.status).toBe(404)
  })

})
