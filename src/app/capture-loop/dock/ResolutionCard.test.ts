import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ResolutionCard from './ResolutionCard.vue'

// Suite: ResolutionCard
// Invariant: A resolution card renders the right actions and collapsed state for each disposition;
//   the reference is editable before accept.
// Boundary IN: active actions, edit emit, resolved / already-resolved / rejected collapsed states.
// Boundary OUT: transport POST wiring (use-review-resolution.test.ts), dock shell (FacilitatorDock.test.ts).

const base = { reference: 'we added a retry step', hotSpotLabel: 'Payment captured' } as const

describe('ResolutionCard', () => {
  it('offers Accept / Edit / Reject and shows the reference on a proposed resolution', () => {
    const wrapper = mount(ResolutionCard, { props: { ...base, disposition: 'PROPOSED' } })
    expect(wrapper.findAll('button').map((button) => button.text())).toEqual(['Accept', 'Edit', 'Reject'])
    expect(wrapper.get('.rc__ref').text()).toBe('we added a retry step')
  })

  it('emits accept and reject intents without mutating', () => {
    const wrapper = mount(ResolutionCard, { props: { ...base, disposition: 'EDITED' } })
    void wrapper.get('.btn--primary').trigger('click')
    void wrapper.get('.btn--danger').trigger('click')
    expect(wrapper.emitted('accept')).toHaveLength(1)
    expect(wrapper.emitted('reject')).toHaveLength(1)
  })

  it('emits the edited reference on save', async () => {
    const wrapper = mount(ResolutionCard, { props: { ...base, disposition: 'PROPOSED' } })
    await wrapper.get('.btn--outline').trigger('click')
    await wrapper.get('.rc__input').setValue('we route refunds through billing now')
    await wrapper.get('.btn--primary').trigger('click')
    expect(wrapper.emitted('edit')).toEqual([['we route refunds through billing now']])
  })

  it('collapses an applied resolution to a resolved receipt showing its reference', () => {
    const wrapper = mount(ResolutionCard, { props: { ...base, disposition: 'APPLIED' } })
    expect(wrapper.get('[role="status"]').text()).toContain('Resolved — we added a retry step')
    expect(wrapper.findAll('button')).toHaveLength(0)
  })

  it('collapses a lapsed resolution to an already-resolved line', () => {
    const wrapper = mount(ResolutionCard, {
      props: { ...base, disposition: 'LAPSED', lapsedReason: 'already-resolved' },
    })
    expect(wrapper.get('[role="status"]').text()).toBe('Set aside — already resolved')
    expect(wrapper.findAll('button')).toHaveLength(0)
  })

  it('collapses a rejected resolution to a not-resolved line', () => {
    const wrapper = mount(ResolutionCard, { props: { ...base, disposition: 'REJECTED' } })
    expect(wrapper.get('[role="status"]').text()).toContain('Not resolved')
  })
})
