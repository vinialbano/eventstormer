import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ProposalCard from './ProposalCard.vue'

const base = { kindLabel: 'EVENT', label: 'Order placed', accepter: 'Maria' } as const

// Suite: ProposalCard
// Invariant: A proposal card renders the correct actions and receipt state for each disposition.
// Boundary IN: Accept/Not this staging, receipts, held chip, source-text mismatch, inline edit emit.
// Boundary OUT: transport POST wiring (use-review-proposal.test.ts), dock shell (FacilitatorDock.test.ts).

describe('ProposalCard', () => {
  it('offers Accept and Not this on a fresh proposal, and stages the rest', async () => {
    const wrapper = mount(ProposalCard, { props: { ...base, disposition: 'PROPOSED' } })
    expect(wrapper.findAll('button').map((button) => button.text())).toEqual(['Accept', 'Not this'])
    void wrapper.get('.btn--primary').trigger('click')
    expect(wrapper.emitted('accept')).toHaveLength(1)

    await wrapper.get('button.btn--outline').trigger('click')
    expect(wrapper.findAll('button').map((button) => button.text())).toEqual([
      'Accept',
      'Not this',
      'Edit',
      'Reject',
      'Hold',
    ])
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

  it('shows Adding… while the proposal is applying', () => {
    const wrapper = mount(ProposalCard, { props: { ...base, disposition: 'ACCEPTED' } })

    expect(wrapper.get('[role="status"]').text()).toBe('Adding…')
    expect(wrapper.findAll('button')).toHaveLength(0)
  })

  it('collapses to a transcript receipt naming the accepter once APPLIED', () => {
    const wrapper = mount(ProposalCard, { props: { ...base, disposition: 'APPLIED' } })
    expect(wrapper.text()).toContain('Order placed — added by Maria')
    expect(wrapper.findAll('button')).toHaveLength(0)
  })

  it('renders a superseded receipt naming the kept label when a later reword won', () => {
    const wrapper = mount(ProposalCard, {
      props: { ...base, disposition: 'APPLIED', superseded: true, supersededByLabel: 'Order placed' },
    })
    expect(wrapper.text()).toContain('Superseded')
    expect(wrapper.text()).toContain('“Order placed” was kept instead')
    expect(wrapper.text()).not.toContain('added by Maria')
    expect(wrapper.findAll('button')).toHaveLength(0)
  })

  it('keeps the plain applied receipt when superseded is absent', () => {
    const wrapper = mount(ProposalCard, { props: { ...base, disposition: 'APPLIED' } })
    expect(wrapper.text()).not.toContain('Superseded')
    expect(wrapper.text()).toContain('Order placed — added by Maria')
  })

  it('collapses to “Dismissed” on reject', () => {
    const wrapper = mount(ProposalCard, { props: { ...base, disposition: 'REJECTED' } })
    expect(wrapper.text()).toContain('Dismissed')
    expect(wrapper.findAll('button')).toHaveLength(0)
  })

  it('shows a parked chip and an Unpark action when held', () => {
    const wrapper = mount(ProposalCard, { props: { ...base, disposition: 'PROPOSED', held: true } })
    expect(wrapper.get('.pc__parked').text()).toBe('parked')
    wrapper.get('.pc--held')
    const labels = wrapper.findAll('button').map((button) => button.text())
    expect(labels).toContain('Unpark')
    expect(labels).not.toContain('Hold')
    expect(labels).toContain('Not this')
  })

  it('surfaces the apply-failed reason and a retry, never a silent drop', () => {
    const wrapper = mount(ProposalCard, {
      props: { ...base, disposition: 'APPLY_FAILED', applyFailedReason: 'target was withdrawn' },
    })
    expect(wrapper.text()).toContain('target was withdrawn')
    expect(wrapper.get('.btn--primary').text()).toBe('Try again')
  })

  it('quotes the contribution and stays quiet when the name is in what she said', () => {
    const wrapper = mount(ProposalCard, {
      props: {
        ...base,
        disposition: 'PROPOSED',
        sourceText: 'Book borrowed when a member takes a book from the library.',
        label: 'Book borrowed',
      },
    })
    expect(wrapper.text()).toContain('You said: Book borrowed when a member takes a book from the library.')
    expect(wrapper.text()).not.toContain('not in what you said')
  })

  it('names the mismatch when the proposed name is not in the contribution', () => {
    const wrapper = mount(ProposalCard, {
      props: {
        ...base,
        disposition: 'PROPOSED',
        sourceText: 'Book borrowed when a member takes a book from the library.',
        label: 'Member registered',
      },
    })
    expect(wrapper.text()).toContain('This name is not in what you said — check it before you add it.')
  })

  const intentBase = { kindLabel: 'RELATION', accepter: 'Maria' } as const

  it('renders a relation proposal as summary + pill + Accept / Not this', () => {
    const wrapper = mount(ProposalCard, {
      props: {
        ...intentBase,
        disposition: 'PROPOSED',
        intent: { kind: 'relation', summary: 'sequence: Order placed → Order cooked' },
      },
    })
    expect(wrapper.get('.pc__pill').text()).toBe('RELATION')
    expect(wrapper.get('.pc__label').text()).toBe('sequence: Order placed → Order cooked')
    expect(wrapper.findAll('button').map((button) => button.text())).toEqual(['Accept', 'Not this'])
  })

  it('renders a pivotal proposal', () => {
    const wrapper = mount(ProposalCard, {
      props: {
        ...intentBase,
        kindLabel: 'PIVOTAL',
        disposition: 'PROPOSED',
        intent: { kind: 'pivotal', summary: 'mark-pivotal: Food delivered' },
      },
    })
    expect(wrapper.get('.pc__pill').text()).toBe('PIVOTAL')
    expect(wrapper.get('.pc__label').text()).toBe('mark-pivotal: Food delivered')
    expect(wrapper.get('.btn--primary').text()).toBe('Accept')
  })

  it('renders a reword proposal', () => {
    const wrapper = mount(ProposalCard, {
      props: {
        ...intentBase,
        kindLabel: 'REWORD',
        disposition: 'PROPOSED',
        intent: { kind: 'reword', summary: 'reword: Order goes in → Order placed', newLabel: 'Order placed' },
      },
    })
    expect(wrapper.get('.pc__pill').text()).toBe('REWORD')
    expect(wrapper.get('.pc__label').text()).toBe('reword: Order goes in → Order placed')
  })

  it('renders every disposition of a model-change card without error', () => {
    for (const disposition of [
      'PROPOSED',
      'EDITED',
      'ACCEPTED',
      'APPLIED',
      'APPLY_FAILED',
      'REJECTED',
      'LAPSED',
    ] as const) {
      const wrapper = mount(ProposalCard, {
        props: {
          ...intentBase,
          disposition,
          held: disposition === 'PROPOSED',
          intent: { kind: 'relation', summary: 'sequence: A → B' },
        },
      })
      expect(wrapper.html()).not.toBe('')
    }
  })

  it('renders nothing for a card with neither a label nor an intent', () => {
    const wrapper = mount(ProposalCard, { props: { kindLabel: '', disposition: 'PROPOSED' } })
    expect(wrapper.find('.pc').exists()).toBe(false)
    expect(wrapper.findAll('button')).toHaveLength(0)
  })

  it('collapses a model-change card to a receipt showing its summary once APPLIED', () => {
    const wrapper = mount(ProposalCard, {
      props: {
        ...intentBase,
        disposition: 'APPLIED',
        intent: { kind: 'relation', summary: 'sequence: Order placed → Order cooked' },
      },
    })
    expect(wrapper.get('[role="status"]').text()).toContain('sequence: Order placed → Order cooked')
  })

  it('edits inline and emits the trimmed new label', async () => {
    const wrapper = mount(ProposalCard, { props: { ...base, disposition: 'PROPOSED' } })
    const named = (name: string) => wrapper.findAll('button').find((button) => button.text() === name)
    await named('Not this')?.trigger('click')
    await named('Edit')?.trigger('click')
    const input = wrapper.get('input')
    await input.setValue('  Order confirmed  ')
    await input.trigger('keydown.enter')
    expect(wrapper.emitted('edit')).toEqual([['Order confirmed']])
  })
})
