import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import type { BoardSnapshot, ProposalCard, SessionView } from '../types.ts'
import BoardWall from '../board/BoardWall.vue'
import FacilitatorDock from '../dock/FacilitatorDock.vue'
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

describe('CaptureScreen', () => {
  it('renders the board wall and, with no open session, the Start session gate', async () => {
    fetchMock = vi.fn((url: string) => Promise.resolve(respondNoSession(url)))
    vi.stubGlobal('fetch', fetchMock)

    const wrapper = mount(CaptureScreen, { props: { id: 'w1' }, global: { plugins: [router] } })
    await flushPromises()

    expect(wrapper.find('.wall').exists()).toBe(true)
    expect(wrapper.findAll('.sticky')).toHaveLength(0)
    expect(wrapper.get('[role="list"]').attributes('data-empty')).toBe('true')
    expect(wrapper.get('.screen__gate').text()).toContain('Start session')
    // no dock while there is no open session
    expect(wrapper.find('.dock').exists()).toBe(false)
  })

  it('starts a session on click and reloads', async () => {
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
      return Promise.resolve(new Response(JSON.stringify({ proposals: [] }), { status: 200 }))
    })
    vi.stubGlobal('fetch', fetchMock)

    const wrapper = mount(CaptureScreen, { props: { id: 'w1' }, global: { plugins: [router] } })
    await flushPromises()
    await wrapper.get('.screen__gate button').trigger('click')
    await flushPromises()

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/workshops/w1/sessions',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(wrapper.find('.screen__gate').exists()).toBe(false)
    expect(wrapper.find('.dock').exists()).toBe(true)
    wrapper.unmount()
  })

  it('accepts a proposal, refetches session and board, and lands the sticky on the wall', async () => {
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

    expect(wrapper.find('.sticky').exists()).toBe(false)
    const boardCallsBefore = fetchMock.mock.calls.filter((call) => String(call[0]).endsWith('/board')).length
    const sessionCallsBefore = fetchMock.mock.calls.filter((call) => String(call[0]).endsWith('/session')).length
    const proposalCallsBefore = fetchMock.mock.calls.filter((call) => String(call[0]).endsWith('/proposals')).length

    await wrapper.get('.pc--active .btn--primary').trigger('click')
    await flushPromises()

    expect(fetchMock).toHaveBeenCalledWith('/api/proposals/p1/accept', expect.objectContaining({ method: 'POST' }))
    expect(fetchMock.mock.calls.filter((call) => String(call[0]).endsWith('/board')).length).toBe(boardCallsBefore + 1)
    expect(fetchMock.mock.calls.filter((call) => String(call[0]).endsWith('/session')).length).toBe(
      sessionCallsBefore + 1,
    )
    expect(fetchMock.mock.calls.filter((call) => String(call[0]).endsWith('/proposals')).length).toBe(
      proposalCallsBefore + 1,
    )

    const sticky = wrapper.get('.sticky')
    expect(sticky.text()).toContain('Order placed')
    expect(sticky.attributes('aria-label')).toBe('event: Order placed, added by Maria')
    expect(wrapper.get('.pc--receipt').text()).toContain('Order placed — added by Maria')
    wrapper.unmount()
  })

  it('refetches the board (server-confirmed) when the dock reports an accept', async () => {
    const boardCalls: string[] = []
    fetchMock = vi.fn((url: string) => {
      if (url.endsWith('/board')) {
        boardCalls.push(url)
        return Promise.resolve(
          new Response(JSON.stringify({ position: -1, blocks: [], follows: [], causedBy: [] }), { status: 200 }),
        )
      }
      if (url.endsWith('/session')) return Promise.resolve(new Response(JSON.stringify(sessionView()), { status: 200 }))
      return Promise.resolve(new Response(JSON.stringify({ proposals: [] }), { status: 200 }))
    })
    vi.stubGlobal('fetch', fetchMock)

    const wrapper = mount(CaptureScreen, { props: { id: 'w1' }, global: { plugins: [router] } })
    await flushPromises()
    const before = boardCalls.length

    wrapper.getComponent(FacilitatorDock).vm.$emit('board-dirty')
    await flushPromises()

    expect(boardCalls.length).toBe(before + 1)
    wrapper.unmount()
  })

  it('hides a withdrawn snapshot block until Show withdrawn is on', async () => {
    fetchMock = vi.fn((url: string) => {
      if (url.endsWith('/session')) {
        return Promise.resolve(
          new Response(
            JSON.stringify(
              sessionView({ contributions: [{ contributionId: 'c1', status: 'derived' }] }),
            ),
            { status: 200 },
          ),
        )
      }
      if (url.endsWith('/board')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              position: 1,
              blocks: [
                {
                  id: 'b1',
                  kind: 'domain-event',
                  label: 'Order placed',
                  withdrawn: true,
                  placement: 'backlog',
                  pivotal: false,
                },
              ],
              follows: [],
              causedBy: [],
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

    expect(wrapper.find('[data-withdrawn="true"]').exists()).toBe(false)

    await wrapper.get('[aria-label="Show withdrawn"]').setValue(true)
    await flushPromises()
    await nextTick()

    const ghost = wrapper.get('[data-withdrawn="true"]')
    expect(ghost.attributes('aria-label')).toBe('event: Order placed')
    expect(ghost.text()).toContain('Order placed')
    wrapper.unmount()
  })

  it('loads board and account when the wall emits board-dirty', async () => {
    const urls: string[] = []
    fetchMock = vi.fn((url: string) => {
      urls.push(url)
      if (url.endsWith('/session')) return Promise.resolve(new Response(JSON.stringify(sessionView()), { status: 200 }))
      if (url.endsWith('/board')) {
        return Promise.resolve(
          new Response(JSON.stringify({ position: 1, blocks: [], follows: [], causedBy: [] }), { status: 200 }),
        )
      }
      if (url.endsWith('/readable-account')) {
        return Promise.resolve(
          new Response(JSON.stringify({ position: 1, markdown: '# Readable account\n' }), { status: 200 }),
        )
      }
      return Promise.resolve(new Response(JSON.stringify({ proposals: [] }), { status: 200 }))
    })
    vi.stubGlobal('fetch', fetchMock)

    const wrapper = mount(CaptureScreen, { props: { id: 'w1' }, global: { plugins: [router] } })
    await flushPromises()
    const beforeAccount = urls.filter((url) => url.endsWith('/readable-account')).length
    const beforeBoard = urls.filter((url) => url.endsWith('/board')).length

    wrapper.getComponent(BoardWall).vm.$emit('board-dirty')
    await flushPromises()

    expect(urls.filter((url) => url.endsWith('/board')).length).toBe(beforeBoard + 1)
    expect(urls.filter((url) => url.endsWith('/readable-account')).length).toBe(beforeAccount + 1)
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
    expect(wrapper.get('.account__body').text()).toContain('Order placed')

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
      expect(wrapper.find('.pc--active').exists()).toBe(false)

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

      expect(wrapper.findAll('.pc--active')).toHaveLength(1)
      expect(wrapper.get('.pc--active').text()).toContain('Order placed')
      wrapper.unmount()
    } finally {
      vi.useRealTimers()
    }
  })
})
