import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mountRewordPortalHost, unmountRewordPortalHost } from '../../../test-support/reword-portal-host.ts'
import RewordConfirm from './RewordConfirm.vue'
import { fetchBlockReferences } from './reword-references.ts'
import { useRewordBlock } from './use-reword-block.ts'

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

const sites = [{ kind: 'readable-account', path: 'building-blocks' }]

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

const mountInteraction = (revision = 3) => {
  const blocks = ref([
    { id: 'b1', kind: 'domain-event', label: 'Order acknowledged', withdrawn: false },
  ])
  const workshopId = ref('w1')
  const accepter = ref('Maria')
  const revisionReference = ref(revision)
  const dirty = vi.fn()

  const Harness = defineComponent({
    components: { RewordConfirm },
    setup() {
      const reword = useRewordBlock({
        blocks,
        workshopId,
        accepter,
        revision: revisionReference,
        onBoardDirty: dirty,
        fetchReferences: fetchBlockReferences,
      })
      void reword.startReword('b1')
      reword.requestConfirm()
      return reword
    },
    template: `
      <RewordConfirm
        :open="confirmOpen"
        :phase="confirmPhase"
        @update:open="confirmOpen = $event"
        @confirm="confirmReword"
        @cancel="cancelReword"
        @retry="retryReferences"
      />
    `,
  })

  return {
    wrapper: mount(Harness, { attachTo: document.body }),
    dirty,
    revisionReference,
  }
}

describe('useRewordBlock', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mountRewordPortalHost()
    fetchMock = vi.fn((url: string) => {
      if (url.includes('/references')) return Promise.resolve(json(sites))
      return Promise.resolve(json({ position: 4 }))
    })
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    unmountRewordPortalHost()
  })

  it('GETs references on confirm open and POSTs one reword on confirm', async () => {
    const { wrapper, dirty } = mountInteraction()
    await flushPromises()

    expect(fetchMock).toHaveBeenCalledWith('/api/workshops/w1/board/blocks/b1/references')
    expect(postsOf(fetchMock)).toHaveLength(0)

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
    expect(dirty).toHaveBeenCalledTimes(1)
    expect(wrapper.vm.confirmOpen).toBe(false)
    expect(wrapper.vm.editingId).toBeNull()
  })

  it('POSTs zero times on cancel', async () => {
    mountInteraction()
    await flushPromises()

    buttonNamed('Cancel').click()
    await flushPromises()

    expect(postsOf(fetchMock)).toHaveLength(0)
  })

  it('keeps the popover on GET-fail with retry and POSTs zero times', async () => {
    fetchMock = vi.fn(() => Promise.resolve(json({ error: 'boom' }, 500)))
    vi.stubGlobal('fetch', fetchMock)

    mountInteraction()
    await flushPromises()

    expect(popover().textContent).toContain("Couldn't list where this appears — retry or cancel.")
    expect(buttonNamed('Retry')).toBeDefined()
    expect(postsOf(fetchMock)).toHaveLength(0)
  })

  it('refetches references when revision changes while open', async () => {
    const { revisionReference } = mountInteraction()
    await flushPromises()
    expect(
      fetchMock.mock.calls.filter((call) => typeof call[0] === 'string' && call[0].includes('/references')),
    ).toHaveLength(1)

    revisionReference.value = 4
    await flushPromises()

    expect(
      fetchMock.mock.calls.filter((call) => typeof call[0] === 'string' && call[0].includes('/references')),
    ).toHaveLength(2)
    expect(postsOf(fetchMock)).toHaveLength(0)
  })

  it('disables Confirm reword until the references GET resolves', async () => {
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

    mountInteraction()
    await flushPromises()
    expect(buttonNamed('Confirm reword').disabled).toBe(true)

    resolveReferences?.(json(sites))
    await flushPromises()
    expect(buttonNamed('Confirm reword').disabled).toBe(false)
  })

  it('disables Confirm reword while a revision refetch is in flight', async () => {
    const { revisionReference } = mountInteraction()
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

    revisionReference.value = 4
    await flushPromises()

    expect(buttonNamed('Confirm reword').disabled).toBe(true)

    resolveReferences?.(json(sites))
    await flushPromises()
    expect(buttonNamed('Confirm reword').disabled).toBe(false)
  })
})
