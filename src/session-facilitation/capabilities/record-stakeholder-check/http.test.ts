import { describe, expect, it } from 'vitest'
import { createMemoryEventStore } from '~/plumbing/event-store/memory-store.ts'
import type { EventStore } from '~/plumbing/event-store/port.ts'
import type { WorkshopId } from '~/plumbing/ids.ts'
import { WorkshopEvent } from '../../domain/schema/events.ts'
import { workshopStream } from '../../infrastructure/streams.ts'
import { recordStakeholderCheckRoutes } from './http.ts'

const at = '2026-09-03T12:00:00.000Z'
const clock = () => at
const workshopId = 'w_1' as WorkshopId

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

const post = async (store: EventStore, body: unknown): Promise<Response> =>
  recordStakeholderCheckRoutes({ store, clock }).request(`/workshops/${workshopId}/stakeholder-check`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

const recorded = (store: EventStore): Extract<WorkshopEvent, { type: 'Stakeholder Check Recorded' }>[] =>
  store
    .read(workshopStream(workshopId))
    .map((row) => WorkshopEvent.parse(row.operation))
    .filter((event): event is Extract<WorkshopEvent, { type: 'Stakeholder Check Recorded' }> =>
      event.type === 'Stakeholder Check Recorded',
    )

describe('POST /workshops/:id/stakeholder-check', () => {
  it('records a complete check with no absent names', async () => {
    const store = seededStore()
    const response = await post(store, { complete: true })
    expect(response.status).toBe(200)
    expect(recorded(store)).toEqual([
      { v: 1, at, type: 'Stakeholder Check Recorded', workshopId, complete: true, absentNames: [] },
    ])
  })

  it('carries every named absent stakeholder on the event when the check is incomplete', async () => {
    const store = seededStore()
    const response = await post(store, { complete: false, absentNames: ['ops lead', 'the auditor'] })
    expect(response.status).toBe(200)
    expect(recorded(store)).toEqual([
      {
        v: 1,
        at,
        type: 'Stakeholder Check Recorded',
        workshopId,
        complete: false,
        absentNames: ['ops lead', 'the auditor'],
      },
    ])
  })

  it('is idempotent — a second post returns 200 and appends no duplicate event', async () => {
    const store = seededStore()
    expect((await post(store, { complete: true })).status).toBe(200)
    expect((await post(store, { complete: false, absentNames: ['ops lead'] })).status).toBe(200)
    expect(recorded(store)).toEqual([
      { v: 1, at, type: 'Stakeholder Check Recorded', workshopId, complete: true, absentNames: [] },
    ])
  })

  it('rejects a check on a workshop that was never started with a 400 typed body', async () => {
    const response = await post(createMemoryEventStore(), { complete: true })
    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'not-started' })
  })

  it('rejects a malformed body with a 400 typed body', async () => {
    const response = await post(seededStore(), { complete: 'yes' })
    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'invalid-body' })
  })
})
