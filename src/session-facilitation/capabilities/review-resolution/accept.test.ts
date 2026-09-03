import { beforeEach, describe, expect, it } from 'vitest'
import { createMemoryEventStore } from '~/plumbing/event-store/memory-store.ts'
import type { EventStore, StreamKey } from '~/plumbing/event-store/port.ts'
import type { BuildingBlockId, ResolutionId, SessionId, WorkshopId } from '~/plumbing/ids.ts'
import { applyOperation, Operation, readBoardSnapshot } from '../../../domain-model-capture/api.ts'
import { ResolutionEvent } from '../../domain/schema/events.ts'
import { resolutionStream, sessionStream, workshopStream } from '../../infrastructure/streams.ts'
import { reviewResolutionRoutes } from './http.ts'

const at = '2026-08-30T12:00:00.000Z'
const clock = () => at
const workshopId = 'w_1' as WorkshopId
const sessionId = 's_1' as SessionId
const author = { accepter: { name: 'Dana' } }

let store: EventStore
let appendStreams: StreamKey[]

const recording = (inner: EventStore): EventStore => ({
  read: (stream) => inner.read(stream),
  append: (stream, expected, ops) => {
    appendStreams.push(stream)
    return inner.append(stream, expected, ops)
  },
})

const deps = () => ({ store, clock })
const routes = () => reviewResolutionRoutes(deps())

const seedWorkshopAndSession = (): void => {
  store.append(workshopStream(workshopId), -1, [
    {
      at,
      opVersion: 1,
      operation: { v: 1, type: 'Workshop Started', workshopId, format: 'big-picture', creatorName: 'Dana', at },
    },
  ])
  store.append(sessionStream(sessionId), -1, [
    { at, opVersion: 1, operation: { v: 1, type: 'Session Started', sessionId, workshopId, at } },
  ])
}

const raiseHotSpot = (id: string): void => {
  applyOperation(deps(), workshopId, Operation.parse({ author, kind: 'raise-hot-spot', id, label: `Hot spot ${id}` }))
}

const seedResolution = (id: string, hotSpotId: string, reference: string): void => {
  store.append(resolutionStream(id as ResolutionId), -1, [
    {
      at,
      opVersion: 1,
      operation: {
        v: 1,
        at,
        type: 'Resolution Proposed',
        resolutionId: id,
        sessionId,
        contributionId: 'c_1',
        hotSpotId,
        reference,
      },
    },
  ])
}

const resolutionDisposition = (id: string): string | undefined => {
  const events = store.read(resolutionStream(id as ResolutionId)).map((row) => ResolutionEvent.parse(row.operation))
  const last = events.at(-1)
  const map: Record<string, string> = {
    'Resolution Proposed': 'PROPOSED',
    'Resolution Accepted': 'ACCEPTED',
    'Hot Spot Resolved': 'APPLIED',
    'Hot Spot Resolution Rejected': 'LAPSED',
  }
  return last === undefined ? undefined : map[last.type]
}

const hotSpotBlock = (id: string) =>
  readBoardSnapshot(deps(), workshopId).blocks.find((block) => block.id === (id as BuildingBlockId))

const accept = async (id: string): Promise<Response> =>
  routes().request(`/resolutions/${id}/accept`, { method: 'POST' })

beforeEach(() => {
  appendStreams = []
  store = recording(createMemoryEventStore())
  seedWorkshopAndSession()
})

describe('POST /resolutions/:id/accept — the synchronous resolve chain', () => {
  it('resolves the hot spot, records the reference, and lands the Resolution APPLIED', async () => {
    raiseHotSpot('h_1')
    seedResolution('r_1', 'h_1', 'added a retry with backoff')

    const response = await accept('r_1')
    expect(response.status).toBe(200)

    const block = hotSpotBlock('h_1')
    expect(block?.resolved).toBe(true)
    expect(block?.reference).toBe('added a retry with backoff')
    expect(resolutionDisposition('r_1')).toBe('APPLIED')
  })

  it('commits the board and the Resolution stream in separate appends — never one transaction', async () => {
    raiseHotSpot('h_1')
    seedResolution('r_1', 'h_1', 'fixed it')
    appendStreams = []

    await accept('r_1')

    const contexts = appendStreams.map((stream) => stream.context)
    expect(contexts).toContain('domain-model-capture')
    expect(contexts).toContain('session-facilitation')
    // each append call targets exactly one stream — the two contexts are never batched
    expect(
      new Set(appendStreams.map((stream) => `${stream.context}/${stream.aggregate}`)).size,
    ).toBeGreaterThanOrEqual(2)
  })

  it('a second resolution for an already-resolved hot spot LAPSES with the recorded reason and no retry (acceptance test 39)', async () => {
    raiseHotSpot('h_1')
    seedResolution('r_1', 'h_1', 'first fix')
    seedResolution('r_2', 'h_1', 'second fix')

    await accept('r_1')
    const second = await accept('r_2')
    expect(second.status).toBe(200)

    expect(resolutionDisposition('r_1')).toBe('APPLIED')
    expect(resolutionDisposition('r_2')).toBe('LAPSED')

    const lapsed = store
      .read(resolutionStream('r_2' as ResolutionId))
      .map((row) => ResolutionEvent.parse(row.operation))
      .find((event) => event.type === 'Hot Spot Resolution Rejected')
    expect(lapsed?.type === 'Hot Spot Resolution Rejected' && lapsed.reason).toBe('already-resolved')

    // the hot spot carries exactly one recorded reference — the first
    expect(hotSpotBlock('h_1')?.reference).toBe('first fix')

    // no retry path — a third accept of r_2 stays LAPSED, appends nothing new
    const before = store.read(resolutionStream('r_2' as ResolutionId)).length
    await accept('r_2')
    expect(store.read(resolutionStream('r_2' as ResolutionId)).length).toBe(before)
  })

  it('a re-accept of an APPLIED resolution is idempotent — no second board write', async () => {
    raiseHotSpot('h_1')
    seedResolution('r_1', 'h_1', 'the fix')
    await accept('r_1')
    const boardLength = store.read({ context: 'domain-model-capture', aggregate: 'board', id: workshopId }).length

    const again = await accept('r_1')
    expect(again.status).toBe(200)
    expect(store.read({ context: 'domain-model-capture', aggregate: 'board', id: workshopId }).length).toBe(boardLength)
  })

  it('404s for an unknown resolution id', async () => {
    const response = await accept('nope')
    expect(response.status).toBe(404)
  })
})
