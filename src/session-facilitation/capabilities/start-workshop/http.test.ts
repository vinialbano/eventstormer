import { testClient } from 'hono/testing'
import { describe, expect, it } from 'vitest'
import { createMemoryEventStore } from '~/plumbing/event-store/memory-store.ts'
import type { WorkshopId } from '~/plumbing/ids.ts'
import { WorkshopEvent } from '../../domain/schema/events.ts'
import { replay } from '../../domain/workshop/replay.ts'
import { workshopStream } from '../../infrastructure/streams.ts'
import { startWorkshopRoutes } from './http.ts'

const clock = () => '2026-08-30T12:00:00.000Z'
const depsFor = () => ({ store: createMemoryEventStore(), clock })

describe('POST /workshops', () => {
  it('starts a workshop and returns 201 with a nanoid slug id and its resumable URL', async () => {
    const deps = depsFor()
    const response = await testClient(startWorkshopRoutes(deps)).workshops.$post({
      json: { creatorName: 'Dana' },
    })

    expect(response.status).toBe(201)
    const body = (await response.json()) as { workshopId: string; url: string }
    expect(body.workshopId).toMatch(/^[A-Za-z0-9_-]{21}$/)
    expect(body.url).toBe(`/workshops/${body.workshopId}`)
  })

  it('rebuilds the identical Workshop write model from the logged stream', async () => {
    const deps = depsFor()
    const response = await testClient(startWorkshopRoutes(deps)).workshops.$post({
      json: { creatorName: 'Dana' },
    })
    const { workshopId } = (await response.json()) as { workshopId: string }

    const events = deps.store
      .read(workshopStream(workshopId as WorkshopId))
      .map((row) => WorkshopEvent.parse(row.operation))
    expect(replay(events)).toEqual({ started: true, format: 'big-picture', creatorName: 'Dana' })
  })

  it('rejects a blank name with a 400 typed body', async () => {
    const response = await testClient(startWorkshopRoutes(depsFor())).workshops.$post({
      json: { creatorName: '   ' },
    })
    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'blank-name' })
  })

  it('rejects a name longer than 80 characters with a 400 typed body', async () => {
    const response = await testClient(startWorkshopRoutes(depsFor())).workshops.$post({
      json: { creatorName: 'x'.repeat(81) },
    })
    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'name-too-long' })
  })

  it('rejects a body with no creatorName with a 400 typed body', async () => {
    const response = await testClient(startWorkshopRoutes(depsFor())).workshops.$post({
      json: {} as { creatorName: string },
    })
    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'invalid-body' })
  })
})
