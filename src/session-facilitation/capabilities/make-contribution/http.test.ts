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
const w = 'w_1' as WorkshopId
const s = 's_1' as SessionId

let store: EventStore
let db: SessionIndexDb

beforeEach(() => {
  const raw = new DatabaseSync(':memory:')
  applySessionFacilitationMigrations(raw)
  db = raw
  store = createMemoryEventStore()
  store.append(workshopStream(w), -1, [
    {
      at,
      opVersion: 1,
      operation: { v: 1, type: 'Workshop Started', workshopId: w, format: 'big-picture', creatorName: 'Dana', at },
    },
  ])
  store.append(sessionStream(s), -1, [
    { at, opVersion: 1, operation: { v: 1, type: 'Session Started', sessionId: s, workshopId: w, at } },
  ])
  reserve(db, w, s, at)
})

const deps = (): MakeContributionDeps => ({ store, db, clock })

const postContribution = async (text: string): Promise<Response> =>
  makeContributionRoutes(deps()).request(`/sessions/${s}/contributions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text }),
  })

const contributions = (): Extract<SessionEvent, { type: 'Contribution Made' }>[] =>
  store
    .read(sessionStream(s))
    .map((r) => SessionEvent.parse(r.operation))
    .filter((e): e is Extract<SessionEvent, { type: 'Contribution Made' }> => e.type === 'Contribution Made')

describe('POST /sessions/:id/contributions (S1-12, S1-13, S1-15, S1-16)', () => {
  it('captures a non-empty contribution — 202, and a trimmed segment with session id / speaker / source / at', async () => {
    const res = await postContribution('  A member borrowed a book.  ')
    expect(res.status).toBe(202)
    const { contributionId } = (await res.json()) as { contributionId: string }

    expect(contributions()).toEqual([
      {
        v: 1,
        type: 'Contribution Made',
        sessionId: s,
        contributionId,
        speaker: 'Dana',
        body: 'A member borrowed a book.',
        source: 'typed',
        at,
      },
    ])
  })

  it('is a no-op for a whitespace-only body — 204, no segment written', async () => {
    const res = await postContribution('    ')
    expect(res.status).toBe(204)
    expect(contributions()).toEqual([])
  })

  it('rejects a contribution over the 10,000-char bound with 400', async () => {
    const res = await postContribution('x'.repeat(10_001))
    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({ error: 'contribution-too-long' })
    expect(contributions()).toEqual([])
  })

  it('rejects a contribution on a closed session with 409', async () => {
    store.append(sessionStream(s), 0, [
      { at, opVersion: 1, operation: { v: 1, type: 'Session Closed', sessionId: s, workshopId: w, unresolvedQuestionIds: [], at } },
    ])
    const res = await postContribution('too late')
    expect(res.status).toBe(409)
    await expect(res.json()).resolves.toEqual({ error: 'session-closed' })
  })
})

describe('GET /workshops/:id/session (S1-16)', () => {
  it('reflects a fresh contribution with interpretation status "pending" and scope status "none"', async () => {
    await postContribution('A member borrowed a book.')
    const { contributionId } = (await (await postContribution('and returned it')).json()) as {
      contributionId: string
    }

    const res = await makeContributionRoutes(deps()).request(`/workshops/${w}/session`)
    expect(res.status).toBe(200)
    const view = (await res.json()) as {
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
    const res = await makeContributionRoutes(deps()).request(`/workshops/w_other/session`)
    expect(res.status).toBe(404)
  })

  it('200s with sessionId null + sessionOpen false for a known workshop with no session', async () => {
    store.append(workshopStream('w_2' as WorkshopId), -1, [
      {
        at,
        opVersion: 1,
        operation: { v: 1, type: 'Workshop Started', workshopId: 'w_2' as WorkshopId, format: 'big-picture', creatorName: 'Ola', at },
      },
    ])
    const res = await makeContributionRoutes(deps()).request(`/workshops/w_2/session`)
    expect(res.status).toBe(200)
    const body = (await res.json()) as { sessionId: string | null; sessionOpen: boolean; creatorName: string }
    expect(body).toMatchObject({ sessionId: null, sessionOpen: false, creatorName: 'Ola' })
  })
})
