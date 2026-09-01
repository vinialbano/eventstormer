import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import RewordConfirm from './RewordConfirm.vue'

enableAutoUnmount(afterEach)

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

const sites = [{ kind: 'readable-account', path: 'building-blocks' }]

const mountConfirm = (over: Record<string, unknown> = {}) =>
  mount(RewordConfirm, {
    attachTo: document.body,
    props: {
      open: true,
      workshopId: 'w1',
      blockId: 'b1',
      label: 'Order acknowledged',
      revision: 3,
      accepter: 'Maria',
      ...over,
    },
  })

const postsOf = (fetchMock: ReturnType<typeof vi.fn>): unknown[] =>
  fetchMock.mock.calls.filter((call) => {
    const init = call[1] as RequestInit | undefined
    return init?.method === 'POST'
  })

const popover = (): HTMLElement => {
  const node = document.body.querySelector('[aria-label="Reword impact"]')
  if (!(node instanceof HTMLElement)) throw new Error('missing Reword impact popover')
  return node
}

const buttonNamed = (name: string): HTMLButtonElement => {
  const found = [...popover().querySelectorAll('button')].find(
    (button) => button.textContent.trim() === name,
  )
  if (!(found instanceof HTMLButtonElement)) throw new Error(`missing button ${name}`)
  return found
}

describe('RewordConfirm', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn((url: string) => {
      if (url.includes('/references')) return Promise.resolve(json(sites))
      return Promise.resolve(json({ position: 4 }))
    })
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('GETs references on open, names the popover Reword impact, and does not POST until confirm', async () => {
    mountConfirm()
    await flushPromises()

    expect(fetchMock).toHaveBeenCalledWith('/api/workshops/w1/board/blocks/b1/references')
    expect(postsOf(fetchMock)).toHaveLength(0)
    expect(popover().getAttribute('aria-label')).toBe('Reword impact')
    expect(popover().textContent).toContain('Readable account · Building blocks')
    expect(popover().closest('.wall')).toBeNull()
    expect(buttonNamed('Confirm reword')).toBeDefined()
  })

  it('POSTs one reword on confirm and emits confirmed', async () => {
    const wrapper = mountConfirm()
    await flushPromises()

    buttonNamed('Confirm reword').click()
    await flushPromises()

    expect(postsOf(fetchMock)).toHaveLength(1)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/workshops/w1/board/operations',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          v: 1,
          kind: 'reword',
          target: 'b1',
          label: 'Order acknowledged',
          author: { accepter: { name: 'Maria' } },
        }),
      }),
    )
    expect(wrapper.emitted('confirmed')).toHaveLength(1)
  })

  it('POSTs zero times on cancel', async () => {
    mountConfirm()
    await flushPromises()

    buttonNamed('Cancel').click()
    await flushPromises()

    expect(postsOf(fetchMock)).toHaveLength(0)
  })

  it('keeps the popover on GET-fail with retry/cancel and POSTs zero times', async () => {
    fetchMock = vi.fn(() => Promise.resolve(json({ error: 'boom' }, 500)))
    vi.stubGlobal('fetch', fetchMock)

    mountConfirm()
    await flushPromises()

    expect(popover().textContent).toContain("Couldn't list where this appears — retry or cancel.")
    expect(buttonNamed('Retry')).toBeDefined()
    expect(buttonNamed('Cancel')).toBeDefined()
    expect(postsOf(fetchMock)).toHaveLength(0)
  })

  it('refetches references when revision changes while open', async () => {
    const wrapper = mountConfirm()
    await flushPromises()
    expect(
      fetchMock.mock.calls.filter((call) => typeof call[0] === 'string' && call[0].includes('/references')),
    ).toHaveLength(1)

    await wrapper.setProps({ revision: 4 })
    await flushPromises()

    expect(
      fetchMock.mock.calls.filter((call) => typeof call[0] === 'string' && call[0].includes('/references')),
    ).toHaveLength(2)
    expect(postsOf(fetchMock)).toHaveLength(0)
  })

  it('disables Confirm reword until the references GET resolves and ignores a click in flight', async () => {
    let resolveReferences: ((value: Response) => void) | undefined
    fetchMock = vi.fn((url: string) => {
      if (url.includes('/references')) {
        return new Promise<Response>((resolve) => {
          resolveReferences = resolve
        })
      }
      return Promise.resolve(json({ position: 4 }))
    })
    vi.stubGlobal('fetch', fetchMock)

    mountConfirm()
    await nextTick()

    const confirm = buttonNamed('Confirm reword')
    expect(confirm.disabled).toBe(true)
    confirm.click()
    await flushPromises()
    expect(postsOf(fetchMock)).toHaveLength(0)

    resolveReferences?.(json(sites))
    await flushPromises()

    expect(buttonNamed('Confirm reword').disabled).toBe(false)
  })

  it('disables Confirm reword while a revision refetch is in flight', async () => {
    const wrapper = mountConfirm()
    await flushPromises()
    expect(buttonNamed('Confirm reword').disabled).toBe(false)

    let resolveReferences: ((value: Response) => void) | undefined
    fetchMock = vi.fn((url: string) => {
      if (url.includes('/references')) {
        return new Promise<Response>((resolve) => {
          resolveReferences = resolve
        })
      }
      return Promise.resolve(json({ position: 4 }))
    })
    vi.stubGlobal('fetch', fetchMock)

    await wrapper.setProps({ revision: 4 })
    await nextTick()

    const confirm = buttonNamed('Confirm reword')
    expect(confirm.disabled).toBe(true)
    confirm.click()
    await flushPromises()
    expect(postsOf(fetchMock)).toHaveLength(0)

    resolveReferences?.(json(sites))
    await flushPromises()
    expect(buttonNamed('Confirm reword').disabled).toBe(false)
  })
})
