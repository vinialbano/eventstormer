import { describe, expect, it } from 'vitest'
import { applyOperation, Operation } from '../../../domain-model-capture/api.ts'
import { createMemoryEventStore } from '~/plumbing/event-store/memory-store.ts'
import type { EventStore } from '~/plumbing/event-store/port.ts'
import { newBuildingBlockId, type WorkshopId } from '~/plumbing/ids.ts'
import { WorkshopEvent } from '../../domain/schema/events.ts'
import { workshopStream } from '../../infrastructure/streams.ts'
import { chooseProblemRoutes } from './http.ts'

const at = '2026-09-03T12:00:00.000Z'
const clock = () => at
const workshopId = 'w_1' as WorkshopId
const author = { accepter: { name: 'Dana' } }

const seededStore = (): EventStore => {
  const store = createMemoryEventStore()
  store.append(workshopStream(workshopId), -1, [
    {
      at,
      opVersion: 1,
      operation: { v: 1, type: 'Workshop Started', workshopId, format: 'big-picture', creatorName: 'Dana', at },
    },
  ])
  return store
}

const raiseHotSpot = (store: EventStore, label: string): string => {
  const id = newBuildingBlockId()
  applyOperation({ store, clock }, workshopId, Operation.parse({ kind: 'raise-hot-spot', id, label, author }))
  return id
}

const post = async (store: EventStore, body: unknown): Promise<Response> =>
  chooseProblemRoutes({ store, clock }).request(`/workshops/${workshopId}/chosen-problem`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

const workshopEvents = (store: EventStore): WorkshopEvent[] =>
  store.read(workshopStream(workshopId)).map((row) => WorkshopEvent.parse(row.operation))

describe('POST /workshops/:id/chosen-problem', () => {
  it('records Problem Chosen for a currently-open hot spot', async () => {
    const store = seededStore()
    const hotSpotId = raiseHotSpot(store, 'Payments keep timing out')

    const response = await post(store, { problemHotSpotId: hotSpotId })
    expect(response.status).toBe(200)
    expect(workshopEvents(store).at(-1)).toEqual({
      v: 1,
      at,
      type: 'Problem Chosen',
      workshopId,
      problemHotSpotId: hotSpotId,
      qualification: 'firm',
    })
  })

  it('records the provisional qualification when the stakeholder check was incomplete', async () => {
    const store = seededStore()
    store.append(workshopStream(workshopId), 0, [
      {
        at,
        opVersion: 1,
        operation: {
          v: 1,
          type: 'Stakeholder Check Recorded',
          workshopId,
          complete: false,
          absentNames: ['ops lead'],
          at,
        },
      },
    ])
    const hotSpotId = raiseHotSpot(store, 'Payments keep timing out')

    await post(store, { problemHotSpotId: hotSpotId })
    expect(workshopEvents(store).at(-1)).toMatchObject({ type: 'Problem Chosen', qualification: 'provisional' })
  })

  it('rejects an unknown hot-spot id with 409 unknown-open-hot-spot, no event', async () => {
    const store = seededStore()
    raiseHotSpot(store, 'Payments keep timing out')

    const response = await post(store, { problemHotSpotId: 'not-a-real-block' })
    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toEqual({ error: 'unknown-open-hot-spot' })
    expect(workshopEvents(store).some((event) => event.type === 'Problem Chosen')).toBe(false)
  })

  it('rejects a resolved hot spot with 409 — a resolved one is never a candidate', async () => {
    const store = seededStore()
    const hotSpotId = raiseHotSpot(store, 'Payments keep timing out')
    applyOperation(
      { store, clock },
      workshopId,
      Operation.parse({ kind: 'resolve', target: hotSpotId, reference: 'added a retry', author }),
    )

    const response = await post(store, { problemHotSpotId: hotSpotId })
    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toEqual({ error: 'unknown-open-hot-spot' })
  })

  it('records Problem Choice Skipped with the reason', async () => {
    const store = seededStore()
    const response = await post(store, { skipReason: 'no-impediments-yet' })
    expect(response.status).toBe(200)
    expect(workshopEvents(store).at(-1)).toEqual({
      v: 1,
      at,
      type: 'Problem Choice Skipped',
      workshopId,
      reason: 'no-impediments-yet',
    })
  })

  it('is idempotent — a second decision returns 200 and appends nothing', async () => {
    const store = seededStore()
    const hotSpotId = raiseHotSpot(store, 'Payments keep timing out')
    expect((await post(store, { problemHotSpotId: hotSpotId })).status).toBe(200)
    expect((await post(store, { skipReason: 'none-chosen' })).status).toBe(200)
    expect(workshopEvents(store).filter((event) => event.type === 'Problem Chosen')).toHaveLength(1)
    expect(workshopEvents(store).some((event) => event.type === 'Problem Choice Skipped')).toBe(false)
  })

  it('rejects a malformed body with a 400 typed body', async () => {
    const response = await post(seededStore(), { skipReason: 'whatever' })
    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'invalid-body' })
  })
})
