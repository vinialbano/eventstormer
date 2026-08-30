import { describe, expect, it } from 'vitest'
import { applyOperation, Operation } from '../../../domain-model-capture/api.ts'
import { createMemoryEventStore } from '~/plumbing/event-store/memory-store.ts'
import type { EventStore } from '~/plumbing/event-store/port.ts'
import type { WorkshopId } from '~/plumbing/ids.ts'
import { WorkshopEvent } from '../../domain/schema/events.ts'
import { workshopStream } from '../../infrastructure/streams.ts'
import { setScopeRoutes } from './http.ts'

const at = '2026-08-30T12:00:00.000Z'
const clock = () => at
const w = 'w_1' as WorkshopId

const seededStore = (): EventStore => {
  const store = createMemoryEventStore()
  store.append(workshopStream(w), -1, [
    {
      at,
      opVersion: 1,
      operation: { v: 1, type: 'Workshop Started', workshopId: w, format: 'big-picture', creatorName: 'Dana', at },
    },
  ])
  return store
}

const postScope = async (store: EventStore, statement: string): Promise<Response> =>
  setScopeRoutes({ store, clock }).request(`/workshops/${w}/scope`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ statement }),
  })

const scopeSet = (store: EventStore): { statement: string }[] =>
  store
    .read(workshopStream(w))
    .map((r) => WorkshopEvent.parse(r.operation))
    .filter((e): e is Extract<WorkshopEvent, { type: 'Scope Set' }> => e.type === 'Scope Set')

describe('POST /workshops/:id/scope (S1-09, S1-10)', () => {
  it('replaces the scope on every call while the model has zero applied blocks', async () => {
    const store = seededStore()
    for (const statement of ['first scope', 'second scope', 'third scope']) {
      expect((await postScope(store, statement)).status).toBe(200)
    }
    expect(scopeSet(store).map((e) => e.statement)).toEqual(['first scope', 'second scope', 'third scope'])
  })

  it('rejects with 409 and leaves the scope unchanged once a building block is applied', async () => {
    const store = seededStore()
    applyOperation(
      { store, clock },
      w,
      Operation.parse({
        author: { accepter: { name: 'Dana' } },
        kind: 'capture-domain-event',
        id: 'b_1',
        label: 'Loan recorded',
      }),
    )

    const res = await postScope(store, 'trying to change it')

    expect(res.status).toBe(409)
    await expect(res.json()).resolves.toEqual({ error: 'scope-locked' })
    expect(scopeSet(store)).toEqual([])
  })

  it('rejects a blank statement with a 400 typed body', async () => {
    const res = await postScope(seededStore(), '   ')
    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({ error: 'blank-statement' })
  })

  it('rejects a scope set on a workshop that was never started', async () => {
    const res = await postScope(createMemoryEventStore(), 'x')
    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({ error: 'not-started' })
  })
})
