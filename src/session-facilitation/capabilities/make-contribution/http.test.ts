import { DatabaseSync } from 'node:sqlite'
import { beforeEach, describe, expect, it } from 'vitest'
import { createMemoryEventStore } from '~/plumbing/event-store/memory-store.ts'
import type { EventStore } from '~/plumbing/event-store/port.ts'
import type { SessionId, WorkshopId } from '~/plumbing/ids.ts'
import { applySessionFacilitationMigrations } from '../../infrastructure/migrations.ts'
import { reserve, type SessionIndexDb } from '../../infrastructure/session-index.ts'
import { sessionStream, workshopStream } from '../../infrastructure/streams.ts'
import { SessionEvent } from '../../domain/schema/events.ts'
import { makeContributionRoutes } from './http.ts'
import type { MakeContributionDeps } from './deps.ts'

const at = '2026-08-30T12:00:00.000Z'
const clock = () => at
const workshopId = 'w_1' as WorkshopId
const sessionId = 's_1' as SessionId

let store: EventStore
let db: SessionIndexDb

beforeEach(() => {
  const raw = new DatabaseSync(':memory:')
  applySessionFacilitationMigrations(raw)
  db = raw
  store = createMemoryEventStore()
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
  reserve(db, workshopId, sessionId, at)
})

const deps = (): MakeContributionDeps => ({ store, db, clock })

const postContribution = async (text: string): Promise<Response> =>
  makeContributionRoutes(deps()).request(`/sessions/${sessionId}/contributions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text }),
  })

const contributions = (): Extract<SessionEvent, { type: 'Contribution Made' }>[] =>
  store
    .read(sessionStream(sessionId))
    .map((row) => SessionEvent.parse(row.operation))
    .filter((event): event is Extract<SessionEvent, { type: 'Contribution Made' }> => event.type === 'Contribution Made')

describe('POST /sessions/:id/contributions', () => {
  it('captures a non-empty contribution — 202, and a trimmed segment with session id / speaker / source / at', async () => {
    const response = await postContribution('  A member borrowed a book.  ')
    expect(response.status).toBe(202)
    const { contributionId } = (await response.json()) as { contributionId: string }

    expect(contributions()).toEqual([
      {
        v: 1,
        type: 'Contribution Made',
        sessionId,
        contributionId,
        speaker: 'Dana',
        body: 'A member borrowed a book.',
        source: 'typed',
        at,
      },
    ])
  })

  it('is a no-op for a whitespace-only body — 204, no segment written', async () => {
    const response = await postContribution('    ')
    expect(response.status).toBe(204)
    expect(contributions()).toEqual([])
  })

  it('rejects a contribution over the 10,000-char bound with 400', async () => {
    const response = await postContribution('x'.repeat(10_001))
    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'contribution-too-long' })
    expect(contributions()).toEqual([])
  })

  it('rejects a contribution on a closed session with 409', async () => {
    store.append(sessionStream(sessionId), 0, [
      { at, opVersion: 1, operation: { v: 1, type: 'Session Closed', sessionId, workshopId, unresolvedQuestionIds: [], at } },
    ])
    const response = await postContribution('too late')
    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toEqual({ error: 'session-closed' })
  })
})

describe('GET /workshops/:id/session', () => {
  it('reflects a fresh contribution with interpretation status "pending" and scope status "none"', async () => {
    await postContribution('A member borrowed a book.')
    const { contributionId } = (await (await postContribution('and returned it')).json()) as {
      contributionId: string
    }

    const response = await makeContributionRoutes(deps()).request(`/workshops/${workshopId}/session`)
    expect(response.status).toBe(200)
    const view = (await response.json()) as {
      scope: { status: string }
      contributions: { contributionId: string; status: string }[]
      fullyDerived: boolean
    }
    expect(view.scope.status).toBe('none')
    expect(view.contributions.map((cn) => cn.status)).toEqual(['pending', 'pending'])
    expect(view.contributions.some((cn) => cn.contributionId === contributionId)).toBe(true)
    expect(view.fullyDerived).toBe(false)
  })

  it('404s when the workshop is unknown', async () => {
    const response = await makeContributionRoutes(deps()).request(`/workshops/w_other/session`)
    expect(response.status).toBe(404)
  })

  it('200s with sessionId null + sessionOpen false for a known workshop with no session', async () => {
    store.append(workshopStream('w_2' as WorkshopId), -1, [
      {
        at,
        opVersion: 1,
        operation: { v: 1, type: 'Workshop Started', workshopId: 'w_2' as WorkshopId, format: 'big-picture', creatorName: 'Ola', at },
      },
    ])
    const response = await makeContributionRoutes(deps()).request(`/workshops/w_2/session`)
    expect(response.status).toBe(200)
    const body = (await response.json()) as { sessionId: string | null; sessionOpen: boolean; creatorName: string }
    expect(body).toMatchObject({ sessionId: null, sessionOpen: false, creatorName: 'Ola' })
  })
})
