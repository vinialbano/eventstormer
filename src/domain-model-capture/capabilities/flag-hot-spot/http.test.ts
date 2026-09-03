import { describe, expect, it } from 'vitest'
import { createMemoryEventStore } from '~/plumbing/event-store/memory-store.ts'
import type { WorkshopId } from '~/plumbing/ids.ts'
import type { BoardSnapshot, SnapshotBlock } from '../../domain/board/model.ts'
import { replay } from '../../domain/board/replay.ts'
import { Operation } from '../../domain/schema/index.ts'
import { applyOperation } from '../../infrastructure/apply-operation.ts'
import { boardStream } from '../../infrastructure/board-stream.ts'
import type { FlagHotSpotDeps } from './deps.ts'
import { flagHotSpotRoutes } from './http.ts'

const workshopId = 'w_1' as WorkshopId
const author = { accepter: { name: 'Dana' } }
const clock = () => '2026-08-30T12:00:00.000Z'

const depsFor = (): FlagHotSpotDeps => ({ store: createMemoryEventStore(), clock })

const seedEvent = (deps: FlagHotSpotDeps, id: string, label: string): void => {
  applyOperation(deps, workshopId, Operation.parse({ author, kind: 'capture-domain-event', id, label }))
}

const flag = async (deps: FlagHotSpotDeps, body: unknown): Promise<Response> =>
  flagHotSpotRoutes(deps).request(`/workshops/${workshopId}/board/hot-spots`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

const reopen = async (deps: FlagHotSpotDeps, blockId: string): Promise<Response> =>
  flagHotSpotRoutes(deps).request(`/workshops/${workshopId}/board/hot-spots/${blockId}/reopen`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ author }),
  })

const boardOps = (deps: FlagHotSpotDeps): Operation[] =>
  deps.store.read(boardStream(workshopId)).map((row) => Operation.parse(row.operation))

const boardSnapshot = (deps: FlagHotSpotDeps): BoardSnapshot => replay(boardOps(deps))

const blockById = (deps: FlagHotSpotDeps, id: string): SnapshotBlock | undefined =>
  boardSnapshot(deps).blocks.get(id as never)

describe('POST /workshops/:id/board/hot-spots — direct flag', () => {
  it('flags a hot spot annotating a live block: 200, callout on the block, hotSpotCount 1', async () => {
    const deps = depsFor()
    seedEvent(deps, 'e_1', 'Payment taken')

    const response = await flag(deps, { label: 'Payment keeps timing out', annotatesTargetId: 'e_1', author })
    expect(response.status).toBe(200)
    const body = (await response.json()) as { hotSpotId: string; annotates: string | null }
    expect(body.annotates).toBe('e_1')

    const snapshot = boardSnapshot(deps)
    expect(snapshot.hotSpotCount).toBe(1)
    expect(blockById(deps, body.hotSpotId)).toMatchObject({ kind: 'hot-spot', annotates: 'e_1' })
  })

  it('flags with no target: 200, hot spot in the unannotated set (annotates null)', async () => {
    const deps = depsFor()
    seedEvent(deps, 'e_1', 'Payment taken')

    const response = await flag(deps, { label: 'Unowned decision', author })
    expect(response.status).toBe(200)
    const body = (await response.json()) as { hotSpotId: string; annotates: string | null }
    expect(body.annotates).toBeNull()

    expect(boardSnapshot(deps).hotSpotCount).toBe(1)
    expect(blockById(deps, body.hotSpotId)).toMatchObject({ kind: 'hot-spot', annotates: null })
  })

  it('rejects a target that is another hot spot: 422 kind-permission, log unchanged', async () => {
    const deps = depsFor()
    seedEvent(deps, 'e_1', 'Payment taken')
    const first = await flag(deps, { label: 'First hot spot', author })
    const { hotSpotId } = (await first.json()) as { hotSpotId: string }
    const before = boardOps(deps).length

    const response = await flag(deps, { label: 'Bad', annotatesTargetId: hotSpotId, author })
    expect(response.status).toBe(422)
    expect(await response.json()).toEqual({ error: 'kind-permission', classification: 'systemic' })
    expect(boardOps(deps).length).toBe(before)
  })

  it('rejects an unknown target: 422 unknown-target, log unchanged', async () => {
    const deps = depsFor()
    seedEvent(deps, 'e_1', 'Payment taken')

    const response = await flag(deps, { label: 'Bad', annotatesTargetId: 'missing', author })
    expect(response.status).toBe(422)
    expect(await response.json()).toEqual({ error: 'unknown-target', classification: 'systemic' })
    expect(boardSnapshot(deps).hotSpotCount).toBe(0)
  })

  it('rejects a withdrawn target: 422 withdrawn-target, log unchanged', async () => {
    const deps = depsFor()
    seedEvent(deps, 'e_1', 'Payment taken')
    applyOperation(deps, workshopId, Operation.parse({ author, kind: 'withdraw', target: 'e_1' }))

    const response = await flag(deps, { label: 'Bad', annotatesTargetId: 'e_1', author })
    expect(response.status).toBe(422)
    expect(await response.json()).toEqual({ error: 'withdrawn-target', classification: 'systemic' })
    expect(boardSnapshot(deps).hotSpotCount).toBe(0)
  })

  it('flags the first hot spot on an empty board — no other block is required', async () => {
    const deps = depsFor()
    const response = await flag(deps, { label: 'Unowned decision', author })
    expect(response.status).toBe(200)
    expect(boardSnapshot(deps).hotSpotCount).toBe(1)
  })
})

describe('POST /workshops/:id/board/hot-spots/:blockId/reopen', () => {
  it('reopens a resolved hot spot: 200 resolved false, reference retained', async () => {
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
    expect(blockById(deps, hotSpotId)).toMatchObject({ resolved: false, reference: 'added a retry' })
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
