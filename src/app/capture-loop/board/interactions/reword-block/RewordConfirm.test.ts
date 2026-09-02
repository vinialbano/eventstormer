import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mountRewordPortalHost, unmountRewordPortalHost } from '../../../test-support/reword-portal-host.ts'
import RewordConfirm from './RewordConfirm.vue'
import {
  confirmLoadFailed,
  confirmLoadSucceeded,
  startConfirmLoad,
  startConfirmPost,
} from './reword-confirm.ts'

enableAutoUnmount(afterEach)

const sites = [{ kind: 'readable-account', path: 'building-blocks' }]

const mountConfirm = async (phase = confirmLoadSucceeded(sites), open = true) => {
  const wrapper = mount(RewordConfirm, {
    attachTo: document.body,
    props: { open, phase },
  })
  await flushPromises()
  return wrapper
}

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
  beforeEach(() => {
    mountRewordPortalHost()
  })
  afterEach(() => {
    unmountRewordPortalHost()
  })

  it('names the popover Reword impact and lists reference sites when ready', async () => {
    await mountConfirm()
    expect(popover().getAttribute('aria-label')).toBe('Reword impact')
    expect(popover().textContent).toContain('Readable account · Building blocks')
    expect(popover().closest('.wall')).toBeNull()
    expect(buttonNamed('Confirm reword')).toBeDefined()
  })

  it('shows retry when references failed to load', async () => {
    await mountConfirm(confirmLoadFailed())
    expect(popover().textContent).toContain("Couldn't list where this appears — retry or cancel.")
    expect(buttonNamed('Retry')).toBeDefined()
  })

  it('disables confirm while references are loading', async () => {
    await mountConfirm(startConfirmLoad())
    expect(buttonNamed('Confirm reword').disabled).toBe(true)
  })

  it('emits confirm without posting by itself', async () => {
    const wrapper = await mountConfirm()
    buttonNamed('Confirm reword').click()
    await flushPromises()
    expect(wrapper.emitted('confirm')).toHaveLength(1)
  })

  it('emits cancel without posting by itself', async () => {
    const wrapper = await mountConfirm()
    buttonNamed('Cancel').click()
    await flushPromises()
    expect(wrapper.emitted('cancel')).toHaveLength(1)
  })

  it('disables confirm while posting', async () => {
    await mountConfirm(startConfirmPost(sites))
    expect(buttonNamed('Confirm reword').disabled).toBe(true)
  })
})
