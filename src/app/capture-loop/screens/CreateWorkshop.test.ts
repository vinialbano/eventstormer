import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import CaptureScreen from './CaptureScreen.vue'
import CreateWorkshop from './CreateWorkshop.vue'

let router: Router

enableAutoUnmount(afterEach)

beforeEach(() => {
  router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: CreateWorkshop },
      { path: '/workshops/:id', name: 'capture', component: CaptureScreen, props: true },
    ],
  })
})
afterEach(() => {
  vi.unstubAllGlobals()
})

it('creates a workshop from a name and routes to its resumable URL', async () => {
  const fetchMock = vi.fn(() =>
    Promise.resolve(
      new Response(JSON.stringify({ workshopId: 'abc123', url: '/workshops/abc123' }), { status: 201 }),
    ),
  )
  vi.stubGlobal('fetch', fetchMock)
  await router.push('/')
  await router.isReady()

  const wrapper = mount(CreateWorkshop, { global: { plugins: [router] } })
  await wrapper.get('#creator-name').setValue('Maria')
  await wrapper.get('form').trigger('submit')
  await flushPromises()

  expect(fetchMock).toHaveBeenCalledWith(
    '/api/workshops',
    expect.objectContaining({ method: 'POST', body: JSON.stringify({ creatorName: 'Maria' }) }),
  )
  expect(router.currentRoute.value.path).toBe('/workshops/abc123')
})

it('keeps the button disabled until a name is entered', () => {
  vi.stubGlobal('fetch', vi.fn())
  const wrapper = mount(CreateWorkshop, { global: { plugins: [router] } })
  expect(wrapper.get('button').attributes('disabled')).toBeDefined()
})
