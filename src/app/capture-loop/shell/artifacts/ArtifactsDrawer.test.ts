import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ArtifactsDrawer from './ArtifactsDrawer.vue'
import { useArtifactsStore } from '../../stores/artifacts.ts'

// Suite: ArtifactsDrawer component
// Invariant: the drawer reflects the artifacts store — it renders the bytes the
//   last fetch returned, downloads those same bytes, surfaces a failed read
//   without wedging, and meets the brief's focus / reduced-motion contract.
// Boundary IN: ArtifactsDrawer over a real store driven by stubbed fetch.
// Boundary OUT: store↔transport seam (artifacts.integration.test.ts), dock
//   wiring (CaptureScreen.test.ts).

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

const modelBody = {
  format: 'eventstormer.model',
  formatVersion: 1,
  renderedAt: '2026-09-06T10:00:00.000Z',
  boardPosition: 3,
  sessionRecordPosition: 1,
  buildingBlocks: [{ id: 'e_1', kind: 'domain-event', label: 'Order placed' }],
  follows: [],
  causedBy: [],
}

beforeEach(() => {
  setActivePinia(createPinia())
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const mountLoaded = async (
  fetchImpl: (url: string) => Promise<Response>,
  session: string | null = 's1',
) => {
  vi.stubGlobal('fetch', vi.fn(fetchImpl))
  const wrapper = mount(ArtifactsDrawer)
  await useArtifactsStore().load('w1', session)
  await flushPromises()
  return wrapper
}

describe('ArtifactsDrawer', () => {
  it('renders the JSON bytes the model route returned in a code block', async () => {
    const wrapper = await mountLoaded((url) =>
      Promise.resolve(url.endsWith('/artifacts/model') ? json(modelBody) : json({}, 500)),
    )

    const code = wrapper.get('pre.artifacts__code')
    expect(code.text()).toContain('"boardPosition": 3')
    expect(code.text()).toContain('"label": "Order placed"')
    expect(wrapper.get('.artifacts__stamp').text()).toContain('Board position 3')
    expect(wrapper.get('.artifacts__stamp').text()).toContain('session record 1')
  })

  it('renders the summary markdown as sanitised HTML after selecting that segment', async () => {
    const wrapper = await mountLoaded((url) => {
      if (url.endsWith('/artifacts/model')) return Promise.resolve(json(modelBody))
      if (url.endsWith('/artifacts/summary')) {
        return Promise.resolve(json({ boardPosition: 3, sessionRecordPosition: 1, markdown: '## Spine\n\n- Order placed\n' }))
      }
      return Promise.resolve(json({}, 500))
    })

    await wrapper.get('button[role="radio"][aria-checked="false"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('.artifacts__body').html()).toContain('<h2>Spine</h2>')
    expect(wrapper.get('.artifacts__body').html()).toContain('<li>Order placed</li>')
  })

  it('re-renders the body when an applied operation changes the model', async () => {
    let position = 3
    const wrapper = await mountLoaded((url) =>
      Promise.resolve(
        url.endsWith('/artifacts/model')
          ? json({ ...modelBody, boardPosition: position })
          : json({}, 500),
      ),
    )
    expect(wrapper.get('pre.artifacts__code').text()).toContain('"boardPosition": 3')

    position = 4
    await useArtifactsStore().refetch()
    await flushPromises()

    expect(wrapper.get('pre.artifacts__code').text()).toContain('"boardPosition": 4')
    expect(wrapper.get('.artifacts__stamp').text()).toContain('Board position 4')
  })

  it('downloads the bytes on screen with the stamped filename', async () => {
    const created: string[] = []
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => {
        created.push('blob:x')
        return 'blob:x'
      }),
      revokeObjectURL: vi.fn(),
    })
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined)

    const wrapper = await mountLoaded((url) =>
      Promise.resolve(url.endsWith('/artifacts/model') ? json(modelBody) : json({}, 500)),
    )

    const button = wrapper.findAll('button').find((node) => node.text().trim() === 'Download')
    if (button === undefined) throw new Error('missing Download button')
    expect(button.attributes('disabled')).toBeUndefined()

    await button.trigger('click')

    expect(created).toHaveLength(1)
    expect(clickSpy).toHaveBeenCalledTimes(1)
  })

  it('shows an error message and a Try again action on a 404, keeping the segments usable', async () => {
    const wrapper = await mountLoaded((url) =>
      Promise.resolve(
        url.endsWith('/artifacts/model')
          ? json({ error: 'workshop-not-found' }, 404)
          : json({ boardPosition: 0, sessionRecordPosition: 0, markdown: '## Spine\n' }),
      ),
    )

    expect(wrapper.get('.artifacts__message').text()).toContain('Couldn’t load this artifact.')
    expect(wrapper.find('pre.artifacts__code').exists()).toBe(false)
    const retry = wrapper.findAll('button').find((node) => node.text().trim() === 'Try again')
    expect(retry).toBeDefined()

    await wrapper.findAll('button[role="radio"]')[1]?.trigger('click')
    await flushPromises()
    expect(wrapper.get('.artifacts__body').html()).toContain('<h2>Spine</h2>')
  })

  it('gives the segmented control a roving tabindex with the selected segment first in order', async () => {
    const wrapper = await mountLoaded((url) =>
      Promise.resolve(url.endsWith('/artifacts/model') ? json(modelBody) : json({}, 500)),
    )

    const radios = wrapper.findAll('button[role="radio"]')
    expect(radios.map((node) => node.attributes('tabindex'))).toEqual(['0', '-1', '-1'])
    expect(radios[0]?.attributes('aria-checked')).toBe('true')
  })

  it('honours prefers-reduced-motion by dropping the body-fade transition', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
    )
    const wrapper = await mountLoaded((url) =>
      Promise.resolve(url.endsWith('/artifacts/model') ? json(modelBody) : json({}, 500)),
    )

    expect(wrapper.get('.artifacts').classes()).toContain('artifacts--reduced')
  })

  it('flags the transcript segment as unavailable with no session and does not fetch it', async () => {
    const fetchImpl = vi.fn((url: string) =>
      Promise.resolve(url.endsWith('/artifacts/model') ? json(modelBody) : json({}, 500)),
    )
    vi.stubGlobal('fetch', fetchImpl)
    const wrapper = mount(ArtifactsDrawer)
    await useArtifactsStore().load('w1', null)
    await flushPromises()
    fetchImpl.mockClear()

    await wrapper.findAll('button[role="radio"]')[2]?.trigger('click')
    await flushPromises()

    expect(fetchImpl).not.toHaveBeenCalled()
    expect(wrapper.get('.artifacts__message').text()).toContain('Start a session to see it')
  })
})
