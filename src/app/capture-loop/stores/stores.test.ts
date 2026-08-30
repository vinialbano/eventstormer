import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { BoardSnapshot, ProposalCard, SessionView } from '../types.ts'
import { useBoardStore } from './board.ts'
import { useProposalsStore } from './proposals.ts'
import { useSessionStore } from './session.ts'

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

const emptySessionView: SessionView = {
  scope: { status: 'none' },
  transcript: [],
  openQuestions: [],
  contributions: [],
  fullyDerived: true,
}

beforeEach(() => {
  setActivePinia(createPinia())
})
afterEach(() => {
  vi.unstubAllGlobals()
})

describe('session store', () => {
  it('cold-loads its view from exactly one GET', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(emptySessionView))
    vi.stubGlobal('fetch', fetchMock)

    const store = useSessionStore()
    await store.load('w1')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith('/api/workshops/w1/session')
    expect(store.view).toEqual(emptySessionView)
    expect(store.scopeStatus).toBe('none')
    expect(store.error).toBeNull()
  })

  it('records an error string on a failed load and keeps the store usable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ error: 'boom' }, 500)))

    const store = useSessionStore()
    await store.load('w1')

    expect(store.view).toBeNull()
    expect(store.error).not.toBeNull()
  })
})

describe('proposals store', () => {
  it('cold-loads the proposal cards from one GET keyed by session id', async () => {
    const cards: ProposalCard[] = [
      {
        proposalId: 'p1',
        contributionId: 'c1',
        blockKind: 'domain-event',
        label: 'Order placed',
        bar: 'strict',
        disposition: 'PROPOSED',
        held: false,
        overflow: false,
      },
    ]
    const fetchMock = vi.fn().mockResolvedValue(json({ proposals: cards }))
    vi.stubGlobal('fetch', fetchMock)

    const store = useProposalsStore()
    await store.load('s1')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith('/api/sessions/s1/proposals')
    expect(store.cards).toEqual(cards)
  })
})

describe('board store', () => {
  it('cold-loads the snapshot from one GET', async () => {
    const snapshot: BoardSnapshot = {
      position: 0,
      blocks: [
        { id: 'b1', kind: 'domain-event', label: 'Order placed', withdrawn: false, placement: 'backlog' },
      ],
    }
    const fetchMock = vi.fn().mockResolvedValue(json(snapshot))
    vi.stubGlobal('fetch', fetchMock)

    const store = useBoardStore()
    await store.load('w1')

    expect(fetchMock).toHaveBeenCalledWith('/api/workshops/w1/board')
    expect(store.snapshot).toEqual(snapshot)
  })

  it('treats a 404 board stream as an empty board, not an error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ error: 'workshop not found' }, 404)))

    const store = useBoardStore()
    await store.load('w1')

    expect(store.snapshot).toEqual({ position: -1, blocks: [] })
    expect(store.error).toBeNull()
  })
})
