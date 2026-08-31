import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ProposalCard from './ProposalCard.vue'

const base = { kindLabel: 'EVENT', label: 'Order placed', accepter: 'Maria' } as const

describe('ProposalCard', () => {
  it('offers Accept / Edit / Reject / Hold on a fresh proposal', () => {
    const wrapper = mount(ProposalCard, { props: { ...base, disposition: 'PROPOSED' } })
    const labels = wrapper.findAll('button').map((button) => button.text())
    expect(labels).toEqual(['Accept', 'Edit', 'Reject', 'Hold'])
    void wrapper.get('.btn--primary').trigger('click')
    expect(wrapper.emitted('accept')).toHaveLength(1)
  })

  it('colours the kind pill by pillKind, and leaves it on the event pair when absent', () => {
    const actor = mount(ProposalCard, {
      props: { ...base, kindLabel: 'ACTOR', pillKind: 'actor', disposition: 'PROPOSED' },
    })
    expect(actor.get('.pc__pill').classes()).toContain('pc__pill--actor')

    const scope = mount(ProposalCard, {
      props: { kindLabel: 'SCOPE', label: 'A library.', disposition: 'PROPOSED', noHold: true },
    })
    const cls = scope.get('.pc__pill').classes()
    expect(cls).not.toContain('pc__pill--actor')
    expect(cls).not.toContain('pc__pill--system')
  })

  it('collapses to a transcript receipt naming the accepter once APPLIED', () => {
    const wrapper = mount(ProposalCard, { props: { ...base, disposition: 'APPLIED' } })
    expect(wrapper.text()).toContain('Order placed — added by Maria')
    expect(wrapper.findAll('button')).toHaveLength(0)
  })

  it('collapses to “Dismissed” on reject', () => {
    const wrapper = mount(ProposalCard, { props: { ...base, disposition: 'REJECTED' } })
    expect(wrapper.text()).toContain('Dismissed')
    expect(wrapper.findAll('button')).toHaveLength(0)
  })

  it('shows a parked chip and an Unpark action when held', () => {
    const wrapper = mount(ProposalCard, { props: { ...base, disposition: 'PROPOSED', held: true } })
    expect(wrapper.text()).toContain('parked')
    const labels = wrapper.findAll('button').map((button) => button.text())
    expect(labels).toContain('Unpark')
    expect(labels).not.toContain('Hold')
    void wrapper.get('.pc__ribbon')
  })

  it('surfaces the apply-failed reason and a retry, never a silent drop', () => {
    const wrapper = mount(ProposalCard, {
      props: { ...base, disposition: 'APPLY_FAILED', applyFailedReason: 'target was withdrawn' },
    })
    expect(wrapper.text()).toContain('target was withdrawn')
    expect(wrapper.get('.btn--primary').text()).toBe('Try again')
  })

  it('edits inline and emits the trimmed new label', async () => {
    const wrapper = mount(ProposalCard, { props: { ...base, disposition: 'PROPOSED' } })
    await wrapper.get('button.btn--outline').trigger('click')
    const input = wrapper.get('input')
    await input.setValue('  Order confirmed  ')
    await input.trigger('keydown.enter')
    expect(wrapper.emitted('edit')).toEqual([['Order confirmed']])
  })
})
