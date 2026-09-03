import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import CloseCeremony from './CloseCeremony.vue'

// Suite: CloseCeremony
// Invariant: the card renders the right step, the picker offers only the open hot spots it is
//   given, choosing and skipping are the same-sized control (F09 / DESIGN §8), and the
//   reduced-motion variant carries no transition.
// Boundary IN: props + emitted intent.
// Boundary OUT: the POST sequence (use-close-ceremony.test.ts), dock wiring (FacilitatorDock).

const base = {
  step: 'stakeholder' as const,
  busy: false,
  error: null,
  report: null,
  openHotSpots: [] as { hotSpotId: string; label: string }[],
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('CloseCeremony', () => {
  it('emits a firm answer for "Nobody else"', async () => {
    const wrapper = mount(CloseCeremony, { props: base })
    await wrapper.get('.close__option--primary').trigger('click')
    expect(wrapper.emitted('answer')).toEqual([[true, []]])
  })

  it('collects names and emits a provisional answer with every name', async () => {
    const wrapper = mount(CloseCeremony, { props: base })
    await wrapper.findAll('.close__option')[1]?.trigger('click') // "Someone would"
    await wrapper.get('.close__input').setValue('ops lead')
    await wrapper.get('.close__add').trigger('click')
    await wrapper.get('.close__option--primary').trigger('click')
    expect(wrapper.emitted('answer')).toEqual([[false, ['ops lead']]])
  })

  it('offers exactly the open hot spots it is given, and no resolved ones', () => {
    const wrapper = mount(CloseCeremony, {
      props: {
        ...base,
        step: 'problem',
        openHotSpots: [
          { hotSpotId: 'h1', label: 'Payments time out' },
          { hotSpotId: 'h2', label: 'Nobody owns refunds' },
        ],
      },
    })
    const rows = wrapper.findAll('[role="radio"]')
    expect(rows.map((row) => row.text())).toEqual(['Payments time out', 'Nobody owns refunds'])
  })

  it('picks a hot spot and emits its id on Choose', async () => {
    const wrapper = mount(CloseCeremony, {
      props: { ...base, step: 'problem', openHotSpots: [{ hotSpotId: 'h1', label: 'Payments time out' }] },
    })
    await wrapper.get('[role="radio"]').trigger('click')
    await wrapper.get('.close__option--primary').trigger('click')
    expect(wrapper.emitted('choose')).toEqual([['h1']])
  })

  it('gives Choose and Skip the same-sized control class (F09)', () => {
    const wrapper = mount(CloseCeremony, {
      props: { ...base, step: 'problem', openHotSpots: [{ hotSpotId: 'h1', label: 'Payments time out' }] },
    })
    const choose = wrapper.get('.close__option--primary')
    const skip = wrapper.findAll('.close__option').find((button) => button.text().startsWith('Skip'))
    expect(choose.classes()).toContain('close__option')
    expect(skip?.classes()).toContain('close__option')
  })

  it('replaces the list with the "signal" line when there are no open hot spots, keeping Skip', async () => {
    const wrapper = mount(CloseCeremony, { props: { ...base, step: 'problem', openHotSpots: [] } })
    expect(wrapper.text()).toContain("that's a signal to interpret, not a pass or a failure")
    expect(wrapper.findAll('[role="radio"]')).toHaveLength(0)
    await wrapper.findAll('.close__option').find((button) => button.text().startsWith('Skip'))?.trigger('click')
    await wrapper.findAll('.close__option').find((button) => button.text() === 'No real impediments yet')?.trigger('click')
    expect(wrapper.emitted('skip')).toEqual([['no-impediments-yet']])
  })

  it('emits confirm and back on the confirm step', async () => {
    const wrapper = mount(CloseCeremony, { props: { ...base, step: 'confirm' } })
    await wrapper.get('.close__option--primary').trigger('click')
    await wrapper.get('.close__ghost').trigger('click')
    expect(wrapper.emitted('confirm')).toHaveLength(1)
    expect(wrapper.emitted('back')).toHaveLength(1)
  })

  it('reports the hot-spot count on the closed step, or names the absence as a signal', () => {
    const counted = mount(CloseCeremony, {
      props: { ...base, step: 'closed', report: { ok: true, hotSpotCount: 3, noHotSpotsIsASignal: false } },
    })
    expect(counted.text()).toContain('3 hot spots on the model')

    const signal = mount(CloseCeremony, {
      props: { ...base, step: 'closed', report: { ok: true, hotSpotCount: 0, noHotSpotsIsASignal: true } },
    })
    expect(signal.text()).toContain('a signal to interpret')
  })

  it('carries no transition in the reduced-motion variant and renders no console warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const wrapper = mount(CloseCeremony, { props: { ...base, step: 'problem', reducedMotion: true } })
    expect(wrapper.get('.close').classes()).toContain('close--reduced')
    expect(warn).not.toHaveBeenCalled()
    expect(error).not.toHaveBeenCalled()
  })
})
