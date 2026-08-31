import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import type { SessionView } from '../types.ts'
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

  it('refetches the board (server-confirmed) when the dock reports an accept', async () => {
    const boardCalls: string[] = []
    fetchMock = vi.fn((url: string) => {
      if (url.endsWith('/board')) {
        boardCalls.push(url)
        return Promise.resolve(new Response(JSON.stringify({ position: -1, blocks: [] }), { status: 200 }))
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

  it('passes a withdrawn snapshot block to the wall with withdrawn true', async () => {
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
                },
              ],
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

    expect(wrapper.getComponent(BoardWall).props('blocks')).toEqual([
      { id: 'b1', kind: 'domain-event', label: 'Order placed', withdrawn: true },
    ])
    expect(wrapper.getComponent(BoardWall).props()).toMatchObject({
      workshopId: 'w1',
      accepter: 'Maria',
      revision: 1,
    })
    wrapper.unmount()
  })

  it('loads board and account when the wall emits board-dirty', async () => {
    const urls: string[] = []
    fetchMock = vi.fn((url: string) => {
      urls.push(url)
      if (url.endsWith('/session')) return Promise.resolve(new Response(JSON.stringify(sessionView()), { status: 200 }))
      if (url.endsWith('/board')) {
        return Promise.resolve(new Response(JSON.stringify({ position: 1, blocks: [] }), { status: 200 }))
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
          new Response(JSON.stringify({ position: -1, markdown: '# Readable account\n' }), { status: 200 }),
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

    await wrapper.get('[aria-label="Readable account"]').trigger('click')
    await wrapper.get('[aria-label="Readable account"]').trigger('click')
    await flushPromises()
    expect(urls.filter((url) => url.endsWith('/readable-account'))).toHaveLength(1)
    wrapper.unmount()
  })
})
