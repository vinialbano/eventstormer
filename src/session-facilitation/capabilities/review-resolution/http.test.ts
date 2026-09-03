import { beforeEach, describe, expect, it } from 'vitest'
import { createMemoryEventStore } from '~/plumbing/event-store/memory-store.ts'
import type { EventStore } from '~/plumbing/event-store/port.ts'
import type { BuildingBlockId, ContributionId, ResolutionId, SessionId } from '~/plumbing/ids.ts'
import { ResolutionEvent } from '../../domain/schema/events.ts'
import { resolutionStream, sessionStream } from '../../infrastructure/streams.ts'
import { reviewResolutionRoutes } from './http.ts'

const at = '2026-08-30T12:00:00.000Z'
const clock = () => at
const sessionId = 's_1' as SessionId
const c1 = 'c_1' as ContributionId
const hotSpotId = 'h_1' as BuildingBlockId
const resolutionId = 'r_1' as ResolutionId

let store: EventStore

const routes = () => reviewResolutionRoutes({ store, clock })

const seedResolution = (extra: ResolutionEvent[] = []): void => {
  store.append(resolutionStream(resolutionId), -1, [
    {
      at,
      opVersion: 1,
      operation: {
        v: 1,
        at,
        type: 'Resolution Proposed',
        resolutionId,
        sessionId,
        contributionId: c1,
        hotSpotId,
        reference: 'added a retry with backoff',
      },
    },
  ])
  if (extra.length > 0) {
    store.append(
      resolutionStream(resolutionId),
      0,
      extra.map((operation) => ({ at, opVersion: 1, operation })),
    )
  }
}

const seedSessionTrack = (): void => {
  store.append(sessionStream(sessionId), -1, [
    {
      at,
      opVersion: 1,
      operation: {
        v: 1,
        at,
        type: 'Contribution Interpreted',
        sessionId,
        contributionId: c1,
        tracks: [{ track: 'propose-resolution', resolutionId, hotSpotId, reference: 'added a retry with backoff' }],
      },
    },
  ])
}

const resolutionTypes = (): string[] =>
  store.read(resolutionStream(resolutionId)).map((row) => (row.operation as { type: string }).type)

const post = async (path: string, body: unknown = {}): Promise<Response> =>
  routes().request(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

beforeEach(() => {
  store = createMemoryEventStore()
})

describe('POST /resolutions/:id/edit', () => {
  it('edits a proposed resolution reference → 200 and a Resolution Edited event', async () => {
    seedResolution()
    const response = await post('/resolutions/r_1/edit', { reference: 'switched providers' })
    expect(response.status).toBe(200)
    const edited = store
      .read(resolutionStream(resolutionId))
      .map((row) => ResolutionEvent.parse(row.operation))
      .find((event) => event.type === 'Resolution Edited')
    expect(edited?.type === 'Resolution Edited' && edited.reference).toBe('switched providers')
  })

  it('edit after a terminal disposition → 409 bad-transition, no new event', async () => {
    seedResolution([{ v: 1, at, type: 'Resolution Rejected', resolutionId }])
    const response = await post('/resolutions/r_1/edit', { reference: 'too late' })
    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({ error: 'bad-transition' })
    expect(resolutionTypes()).toEqual(['Resolution Proposed', 'Resolution Rejected'])
  })

  it('edit an unknown resolution → 404', async () => {
    const response = await post('/resolutions/nope/edit', { reference: 'x' })
    expect(response.status).toBe(404)
  })

  it('rejects an empty reference → 400', async () => {
    seedResolution()
    const response = await post('/resolutions/r_1/edit', { reference: '' })
    expect(response.status).toBe(400)
  })
})

describe('POST /resolutions/:id/reject', () => {
  it('rejects a proposed resolution → 200 and GET shows REJECTED', async () => {
    seedResolution()
    seedSessionTrack()

    const response = await post('/resolutions/r_1/reject')
    expect(response.status).toBe(200)

    const view = await routes().request('/sessions/s_1/resolutions')
    const body = (await view.json()) as { resolutions: { resolutionId: string; disposition: string; hotSpotId: string }[] }
    expect(body.resolutions).toEqual([
      expect.objectContaining({ resolutionId: 'r_1', hotSpotId: 'h_1', disposition: 'REJECTED' }),
    ])
  })

  it('a second reject is an idempotent no-op → 200, one Resolution Rejected', async () => {
    seedResolution()
    await post('/resolutions/r_1/reject')
    await post('/resolutions/r_1/reject')
    expect(resolutionTypes().filter((type) => type === 'Resolution Rejected')).toHaveLength(1)
  })
})

describe('GET /sessions/:id/resolutions', () => {
  it('returns an empty list for a session with no resolution tracks', async () => {
    const response = await routes().request('/sessions/s_1/resolutions')
    expect(await response.json()).toEqual({ resolutions: [] })
  })
})
