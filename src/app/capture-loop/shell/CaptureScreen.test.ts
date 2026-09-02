import { enableAutoUnmount, flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import type { BoardSnapshot, ProposalCard, SessionView } from '../types.ts'
import CaptureScreen from './CaptureScreen.vue'

const sessionView = (over: Partial<SessionView> = {}): SessionView => ({
  sessionId: 's1',
  sessionOpen: true,
  creatorName: 'Maria',
  scope: { status: 'set' },
  transcript: [],
  openQuestions: [],
  contributions: [],
  fullyDerived: true,
  ...over,
})

let router: Router
let fetchMock: ReturnType<typeof vi.fn>

const respondNoSession = (url: string): Response => {
  if (url.endsWith('/session')) return new Response(JSON.stringify({ error: 'no-session' }), { status: 404 })
  if (url.endsWith('/board')) return new Response(JSON.stringify({ error: 'workshop not found' }), { status: 404 })
  return new Response('{}', { status: 200 })
}

const acceptButton = (wrapper: VueWrapper): ReturnType<VueWrapper['get']> => {
  const proposed = wrapper.find('[data-disposition="PROPOSED"]')
  if (!proposed.exists()) throw new Error('missing PROPOSED proposal card')
  const button = proposed.findAll('button').find((node) => node.text().trim() === 'Accept')
  if (button === undefined) throw new Error('missing Accept button')
  return button
}

const startSessionButton = (wrapper: VueWrapper): ReturnType<VueWrapper['get']> => {
  const button = wrapper.findAll('button').find((node) => node.text().trim() === 'Start session')
  if (button === undefined) throw new Error('missing Start session button')
  return button
}

const hasFacilitatorHeading = (wrapper: VueWrapper): boolean =>
  wrapper.findAll('h2').some((heading) => heading.text().trim() === 'Facilitator')

enableAutoUnmount(afterEach)

beforeEach(async () => {
  setActivePinia(createPinia())
  router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/workshops/:id', name: 'capture', component: CaptureScreen, props: true }],
  })
  await router.push('/workshops/w1')
  await router.isReady()
})
afterEach(() => {
  vi.unstubAllGlobals()
})

// Suite: CaptureScreen
// Invariant: Shell composes zones, session gate, proposals cold load, and poll-surfaced cards from server state.
// Boundary IN: End-to-end shell composition, shouldLoadProposals watch wiring, account drawer lazy load.
// Boundary OUT: Zone-event refetch wiring (use-capture-orchestration.integration.test.ts).

describe('CaptureScreen', () => {
  it('renders the board wall and, with no open session, the Start session gate', async () => {
    fetchMock = vi.fn((url: string) => Promise.resolve(respondNoSession(url)))
    vi.stubGlobal('fetch', fetchMock)

    const wrapper = mount(CaptureScreen, { props: { id: 'w1' }, global: { plugins: [router] } })
    await flushPromises()

    expect(wrapper.find('[aria-label="EventStorming board"]').exists()).toBe(true)
    expect(wrapper.get('[role="list"][aria-label="Backlog"]').attributes('data-empty')).toBe('true')
    expect(wrapper.findAll('button').some((node) => node.text().trim() === 'Start session')).toBe(true)
    expect(hasFacilitatorHeading(wrapper)).toBe(false)
  })

  it('starts a session on click, reloads, and loads proposals when sessionId is set', async () => {
    let hasSession = false
    fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (url.endsWith('/sessions') && init?.method === 'POST') {
        hasSession = true
        return Promise.resolve(new Response(JSON.stringify({ sessionId: 's1' }), { status: 202 }))
      }
      if (url.endsWith('/session')) {
        return Promise.resolve(
          hasSession
            ? new Response(JSON.stringify(sessionView()), { status: 200 })
            : new Response(JSON.stringify({ error: 'no-session' }), { status: 404 }),
        )
      }
      if (url.endsWith('/board')) return Promise.resolve(new Response(JSON.stringify({ error: 'x' }), { status: 404 }))
      if (url.endsWith('/proposals')) return Promise.resolve(new Response(JSON.stringify({ proposals: [] }), { status: 200 }))
      return Promise.resolve(new Response('{}', { status: 200 }))
    })
    vi.stubGlobal('fetch', fetchMock)

    const wrapper = mount(CaptureScreen, { props: { id: 'w1' }, global: { plugins: [router] } })
    await flushPromises()
    await startSessionButton(wrapper).trigger('click')
    await flushPromises()

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/workshops/w1/sessions',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(fetchMock.mock.calls.some((call) => String(call[0]).endsWith('/proposals'))).toBe(true)
    expect(hasFacilitatorHeading(wrapper)).toBe(true)
    wrapper.unmount()
  })

  it('accepts a proposal and lands the sticky on the wall', async () => {
    const proposalCards: ProposalCard[] = [
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
    let boardSnapshot: BoardSnapshot = { position: -1, blocks: [], follows: [], causedBy: [] }
    const activeSession = (): SessionView =>
      sessionView({
        contributions: [{ contributionId: 'c1', status: 'derived' }],
        transcript: [
          {
            kind: 'contribution',
            speaker: 'Maria',
            text: 'A customer places an order.',
            at: 't1',
            contributionId: 'c1',
          },
        ],
      })

    fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (url.endsWith('/accept') && init?.method === 'POST') {
        boardSnapshot = {
          position: 1,
          blocks: [
            {
              id: 'b1',
              kind: 'domain-event',
              label: 'Order placed',
              withdrawn: false,
              placement: 'backlog',
              pivotal: false,
              provenance: { accepter: { name: 'Maria' } },
            },
          ],
          follows: [],
          causedBy: [],
        }
        proposalCards[0] = {
          proposalId: 'p1',
          contributionId: 'c1',
          blockKind: 'domain-event',
          label: 'Order placed',
          bar: 'strict',
          disposition: 'APPLIED',
          held: false,
          overflow: false,
          buildingBlockId: 'b1',
        }
        return Promise.resolve(new Response('{}', { status: 200 }))
      }
      if (url.endsWith('/session')) {
        return Promise.resolve(new Response(JSON.stringify(activeSession()), { status: 200 }))
      }
      if (url.endsWith('/board')) {
        return Promise.resolve(new Response(JSON.stringify(boardSnapshot), { status: 200 }))
      }
      if (url.endsWith('/proposals')) {
        return Promise.resolve(new Response(JSON.stringify({ proposals: proposalCards }), { status: 200 }))
      }
      if (url.endsWith('/readable-account')) {
        return Promise.resolve(
          new Response(JSON.stringify({ position: -1, markdown: '# Readable account\n' }), { status: 200 }),
        )
      }
      return Promise.resolve(new Response('{}', { status: 200 }))
    })
    vi.stubGlobal('fetch', fetchMock)

    const wrapper = mount(CaptureScreen, { props: { id: 'w1' }, global: { plugins: [router] } })
    await flushPromises()

    expect(wrapper.find('[aria-label="event: Order placed, added by Maria"]').exists()).toBe(false)

    await acceptButton(wrapper).trigger('click')
    await flushPromises()

    expect(fetchMock).toHaveBeenCalledWith('/api/proposals/p1/accept', expect.objectContaining({ method: 'POST' }))

    const sticky = wrapper.get('[aria-label="event: Order placed, added by Maria"]')
    expect(sticky.text()).toContain('Order placed')
    const receipt = wrapper
      .findAll('[role="status"]')
      .find((node) => node.text().includes('added by Maria'))
    if (receipt === undefined) throw new Error('missing applied receipt')
    expect(receipt.text()).toContain('Order placed — added by Maria')
    wrapper.unmount()
  })

  it('GETs the readable account once when the drawer first opens', async () => {
    const urls: string[] = []
    fetchMock = vi.fn((url: string) => {
      urls.push(url)
      if (url.endsWith('/session')) return Promise.resolve(new Response(JSON.stringify(sessionView()), { status: 200 }))
      if (url.endsWith('/readable-account')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              position: -1,
              markdown: '# Readable account\n\n## Building blocks\n- Event: Order placed\n',
            }),
            { status: 200 },
          ),
        )
      }
      return Promise.resolve(new Response(JSON.stringify({ proposals: [] }), { status: 200 }))
    })
    vi.stubGlobal('fetch', fetchMock)

    const wrapper = mount(CaptureScreen, { props: { id: 'w1' }, global: { plugins: [router] } })
    await flushPromises()
    expect(urls.some((url) => url.endsWith('/readable-account'))).toBe(false)

    await wrapper.get('[aria-label="Readable account"]').trigger('click')
    await flushPromises()
    expect(urls.filter((url) => url.endsWith('/readable-account'))).toHaveLength(1)
    expect(wrapper.get('aside[role="region"][aria-labelledby="account-title"]').text()).toContain('Order placed')

    await wrapper.get('[aria-label="Readable account"]').trigger('click')
    await wrapper.get('[aria-label="Readable account"]').trigger('click')
    await flushPromises()
    expect(urls.filter((url) => url.endsWith('/readable-account'))).toHaveLength(1)
    wrapper.unmount()
  })

  it('surfaces proposal cards when a contribution moves from interpreting to derived', async () => {
    vi.useFakeTimers()
    try {
      const proposalCards: ProposalCard[] = []
      let contributions: SessionView['contributions'] = [{ contributionId: 'c1', status: 'interpreting' }]
      const activeSession = (): SessionView =>
        sessionView({
          contributions,
          fullyDerived: contributions.every((contribution) => contribution.status === 'derived'),
          transcript: [
            {
              kind: 'contribution',
              speaker: 'Maria',
              text: 'A customer places an order.',
              at: 't1',
              contributionId: 'c1',
            },
          ],
        })

      fetchMock = vi.fn((url: string, init?: RequestInit) => {
        if (url.endsWith('/session')) {
          return Promise.resolve(new Response(JSON.stringify(activeSession()), { status: 200 }))
        }
        if (url.endsWith('/board')) {
          return Promise.resolve(
            new Response(JSON.stringify({ position: -1, blocks: [], follows: [], causedBy: [] }), { status: 200 }),
          )
        }
        if (url.endsWith('/proposals')) {
          return Promise.resolve(new Response(JSON.stringify({ proposals: proposalCards }), { status: 200 }))
        }
        if (url.endsWith('/contributions') && init?.method === 'POST') {
          return Promise.resolve(new Response('{}', { status: 202 }))
        }
        return Promise.resolve(new Response('{}', { status: 200 }))
      })
      vi.stubGlobal('fetch', fetchMock)

      const wrapper = mount(CaptureScreen, { props: { id: 'w1' }, global: { plugins: [router] } })
      await flushPromises()
      expect(wrapper.find('[data-disposition="PROPOSED"]').exists()).toBe(false)

      contributions = [{ contributionId: 'c1', status: 'interpreted' }]
      await vi.advanceTimersByTimeAsync(1000)
      await flushPromises()
      expect(wrapper.find('[data-disposition="PROPOSED"]').exists()).toBe(false)

      contributions = [{ contributionId: 'c1', status: 'derived' }]
      proposalCards.push({
        proposalId: 'p1',
        contributionId: 'c1',
        blockKind: 'domain-event',
        label: 'Order placed',
        bar: 'strict',
        disposition: 'PROPOSED',
        held: false,
        overflow: false,
      })
      await vi.advanceTimersByTimeAsync(1000)
      await flushPromises()

      expect(wrapper.findAll('[data-disposition="PROPOSED"]')).toHaveLength(1)
      expect(wrapper.get('[data-disposition="PROPOSED"]').text()).toContain('Order placed')
      wrapper.unmount()
    } finally {
      vi.useRealTimers()
    }
  })
})
