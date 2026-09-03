import { describe, expect, it } from 'vitest'
import { createMemoryEventStore } from '~/plumbing/event-store/memory-store.ts'
import type { BuildingBlockId, WorkshopId } from '~/plumbing/ids.ts'
import { Operation } from '../../domain/schema/index.ts'
import { applyOperation } from '../../infrastructure/apply-operation.ts'
import { readBoardSnapshot } from '../board-access/read-board-snapshot.ts'
import type { FlagHotSpotDeps } from './deps.ts'
import { flagHotSpotRoutes } from './http.ts'

const workshopId = 'w_1' as WorkshopId
const author = { accepter: { name: 'Dana' } }
const clock = () => '2026-08-30T12:00:00.000Z'

const depsFor = (): FlagHotSpotDeps => ({ store: createMemoryEventStore(), clock })

const seedEvent = (deps: FlagHotSpotDeps, id: string, label: string): void => {
  applyOperation(deps, workshopId, Operation.parse({ author, kind: 'capture-domain-event', id, label }))
}

const flag = (deps: FlagHotSpotDeps, body: unknown): Promise<Response> =>
  flagHotSpotRoutes(deps).request(`/workshops/${workshopId}/board/hot-spots`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

const reopen = (deps: FlagHotSpotDeps, blockId: string): Promise<Response> =>
  flagHotSpotRoutes(deps).request(`/workshops/${workshopId}/board/hot-spots/${blockId}/reopen`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ author }),
  })

const board = (deps: FlagHotSpotDeps) => readBoardSnapshot({ store: deps.store }, workshopId)

describe('POST /workshops/:id/board/hot-spots — direct flag', () => {
  it('flags a hot spot annotating a live block: 200, callout on the block, hotSpotCount 1', async () => {
    const deps = depsFor()
    seedEvent(deps, 'e_1', 'Payment taken')

    const response = await flag(deps, { label: 'Payment keeps timing out', annotatesTargetId: 'e_1', author })
    expect(response.status).toBe(200)
    const body = (await response.json()) as { hotSpotId: string; annotates: string | null }
    expect(body.annotates).toBe('e_1')

    const snapshot = board(deps)
    expect(snapshot.hotSpotCount).toBe(1)
    expect(snapshot.blocks).toContainEqual(
      expect.objectContaining({ id: body.hotSpotId, kind: 'hot-spot', annotates: 'e_1' }),
    )
  })

  it('flags with no target: 200, hot spot in the unannotated set (annotates null)', async () => {
    const deps = depsFor()
    seedEvent(deps, 'e_1', 'Payment taken')

    const response = await flag(deps, { label: 'Unowned decision', author })
    expect(response.status).toBe(200)
    const body = (await response.json()) as { hotSpotId: string; annotates: string | null }
    expect(body.annotates).toBeNull()

    const snapshot = board(deps)
    expect(snapshot.hotSpotCount).toBe(1)
    expect(snapshot.blocks).toContainEqual(
      expect.objectContaining({ id: body.hotSpotId, kind: 'hot-spot', annotates: null }),
    )
  })

  it('rejects a target that is another hot spot: 422 kind-permission, log unchanged', async () => {
    const deps = depsFor()
    seedEvent(deps, 'e_1', 'Payment taken')
    await flag(deps, { label: 'First hot spot', author })
    const otherHotSpot = board(deps).blocks.find((block) => block.kind === 'hot-spot')?.id as string
    const before = deps.store.read({ context: 'domain-model-capture', aggregate: 'board', id: workshopId }).length

    const response = await flag(deps, { label: 'Bad', annotatesTargetId: otherHotSpot, author })
    expect(response.status).toBe(422)
    expect(await response.json()).toEqual({ error: 'kind-permission', classification: 'systemic' })
    expect(
      deps.store.read({ context: 'domain-model-capture', aggregate: 'board', id: workshopId }).length,
    ).toBe(before)
  })

  it('rejects an unknown target: 422 unknown-target, log unchanged', async () => {
    const deps = depsFor()
    seedEvent(deps, 'e_1', 'Payment taken')

    const response = await flag(deps, { label: 'Bad', annotatesTargetId: 'missing', author })
    expect(response.status).toBe(422)
    expect(await response.json()).toEqual({ error: 'unknown-target', classification: 'systemic' })
    expect(board(deps).hotSpotCount).toBe(0)
  })

  it('rejects a withdrawn target: 422 withdrawn-target, log unchanged', async () => {
    const deps = depsFor()
    seedEvent(deps, 'e_1', 'Payment taken')
    applyOperation(deps, workshopId, Operation.parse({ author, kind: 'withdraw', target: 'e_1' }))

    const response = await flag(deps, { label: 'Bad', annotatesTargetId: 'e_1', author })
    expect(response.status).toBe(422)
    expect(await response.json()).toEqual({ error: 'withdrawn-target', classification: 'systemic' })
    expect(board(deps).hotSpotCount).toBe(0)
  })

  it('404s when the board stream is empty', async () => {
    const response = await flag(depsFor(), { label: 'x', author })
    expect(response.status).toBe(404)
  })
})

describe('POST /workshops/:id/board/hot-spots/:blockId/reopen', () => {
  it('reopens a resolved hot spot: 200 resolved false', async () => {
    const deps = depsFor()
    seedEvent(deps, 'e_1', 'Payment taken')
    const flagResponse = await flag(deps, { label: 'Timeout', author })
    const { hotSpotId } = (await flagResponse.json()) as { hotSpotId: string }
    applyOperation(
      deps,
      workshopId,
      Operation.parse({ author, kind: 'resolve', target: hotSpotId, reference: 'added a retry' }),
    )

    const response = await reopen(deps, hotSpotId)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ hotSpotId, resolved: false })
    const hotSpot = board(deps).blocks.find((block) => block.id === (hotSpotId as BuildingBlockId))
    expect(hotSpot?.resolved).toBe(false)
    expect(hotSpot?.reference).toBe('added a retry')
  })

  it('rejects reopening an open hot spot: 422 not-resolved', async () => {
    const deps = depsFor()
    seedEvent(deps, 'e_1', 'Payment taken')
    const flagResponse = await flag(deps, { label: 'Timeout', author })
    const { hotSpotId } = (await flagResponse.json()) as { hotSpotId: string }

    const response = await reopen(deps, hotSpotId)
    expect(response.status).toBe(422)
    expect(await response.json()).toEqual({ error: 'not-resolved', classification: 'systemic' })
  })
})
