import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AccountSnapshot, BoardSnapshot, ProposalCard, SessionView } from '../types.ts'
import { useAccountStore } from './account.ts'
import { useBoardStore } from './board.ts'
import { useProposalsStore } from './proposals.ts'
import { useSessionStore } from './session.ts'

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

const emptySessionView: SessionView = {
  sessionId: 's1',
  sessionOpen: true,
  creatorName: 'Maria',
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
        {
          id: 'b1',
          kind: 'domain-event',
          label: 'Order placed',
          withdrawn: false,
          placement: 'backlog',
          pivotal: false,
        },
      ],
      follows: [],
      causedBy: [],
    }
    const fetchMock = vi.fn().mockResolvedValue(json(snapshot))
    vi.stubGlobal('fetch', fetchMock)

    const store = useBoardStore()
    await store.load('w1')

    expect(fetchMock).toHaveBeenCalledWith('/api/workshops/w1/board')
    expect(store.snapshot).toEqual(snapshot)
    expect(store.timeline.tracks).toEqual([])
  })

  it('lays out published follows as ranks and edges', async () => {
    const snapshot: BoardSnapshot = {
      position: 2,
      blocks: [
        {
          id: 'eA',
          kind: 'domain-event',
          label: 'Loan recorded',
          withdrawn: false,
          placement: 'timeline',
          pivotal: false,
        },
        {
          id: 'eB',
          kind: 'domain-event',
          label: 'Book returned',
          withdrawn: false,
          placement: 'timeline',
          pivotal: false,
        },
      ],
      follows: [{ predecessor: 'eA', successor: 'eB' }],
      causedBy: [],
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(snapshot)))

    const store = useBoardStore()
    await store.load('w1')

    expect(store.showWithdrawn).toBe(false)
    expect(store.timeline.tracks).toEqual([
      { eventIds: ['eA', 'eB'], ranks: { eA: 0, eB: 1 } },
    ])
    expect(store.timeline.edges).toEqual([{ predecessor: 'eA', successor: 'eB' }])
  })

  it('treats a 404 board stream as an empty board, not an error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ error: 'workshop not found' }, 404)))

    const store = useBoardStore()
    await store.load('w1')

    expect(store.snapshot).toEqual({ position: -1, blocks: [], follows: [], causedBy: [] })
    expect(store.error).toBeNull()
  })

  it('defaults showWithdrawn to false and toggling it does not fetch', async () => {
    const snapshot: BoardSnapshot = {
      position: 3,
      blocks: [
        {
          id: 'eA',
          kind: 'domain-event',
          label: 'Loan recorded',
          withdrawn: true,
          placement: 'timeline',
          pivotal: false,
        },
      ],
      follows: [],
      causedBy: [],
    }
    const fetchMock = vi.fn().mockResolvedValue(json(snapshot))
    vi.stubGlobal('fetch', fetchMock)

    const store = useBoardStore()
    expect(store.showWithdrawn).toBe(false)
    await store.load('w1')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(store.timeline.tracks).toEqual([])

    store.showWithdrawn = true
    expect(store.showWithdrawn).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(store.timeline.tracks).toEqual([{ eventIds: ['eA'], ranks: { eA: 0 } }])

    store.showWithdrawn = false
    expect(store.timeline.tracks).toEqual([])
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe('account store', () => {
  const emptyAccount: AccountSnapshot = {
    position: -1,
    markdown: `# Readable account
Format: Big Picture
Narrators: 0
Scope: (not set)
`,
  }

  it('cold-loads from exactly one GET and stores 200 empty markdown as success', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(emptyAccount))
    vi.stubGlobal('fetch', fetchMock)

    const store = useAccountStore()
    await store.load('w1')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith('/api/workshops/w1/readable-account')
    expect(store.document).toEqual(emptyAccount)
    expect(store.error).toBeNull()
  })

  it('records an error on 404 and does not invent an empty document', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ error: 'workshop-not-found' }, 404)))

    const store = useAccountStore()
    await store.load('w1')

    expect(store.document).toBeNull()
    expect(store.error).not.toBeNull()
  })
})
