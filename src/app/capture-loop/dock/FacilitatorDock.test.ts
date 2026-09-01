import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProposalCard, SessionView } from '../types.ts'
import { useBoardStore } from '../stores/board.ts'
import { useProposalsStore } from '../stores/proposals.ts'
import { useSessionStore } from '../stores/session.ts'
import FacilitatorDock from './FacilitatorDock.vue'

const card = (over: Partial<ProposalCard> = {}): ProposalCard => ({
  proposalId: 'p1',
  contributionId: 'c1',
  blockKind: 'domain-event',
  label: 'Order placed',
  bar: 'strict',
  disposition: 'PROPOSED',
  held: false,
  overflow: false,
  ...over,
})

const view = (over: Partial<SessionView> = {}): SessionView => ({
  sessionId: 's1',
  sessionOpen: true,
  creatorName: 'Maria',
  scope: { status: 'set' },
  transcript: [
    { kind: 'question', speaker: 'facilitator', text: 'What happens first?', at: 't1' },
    { kind: 'contribution', speaker: 'Maria', text: 'A customer places an order.', at: 't2', contributionId: 'c1' },
  ],
  openQuestions: [],
  contributions: [{ contributionId: 'c1', status: 'derived' }],
  fullyDerived: true,
  ...over,
})

let fetchMock: ReturnType<typeof vi.fn>

const seed = (sessionView: SessionView, cards: ProposalCard[]) => {
  const session = useSessionStore()
  const proposals = useProposalsStore()
  session.view = sessionView
  proposals.cards = cards
  return { session, proposals }
}

enableAutoUnmount(afterEach)

beforeEach(() => {
  setActivePinia(createPinia())
  fetchMock = vi.fn(() => Promise.resolve(new Response('{}', { status: 200 })))
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => {
  vi.unstubAllGlobals()
})

describe('FacilitatorDock', () => {
  it('welds a proposal cluster to the contribution turn and renders questions as messages', () => {
    seed(view(), [card(), card({ proposalId: 'p2', label: 'Order confirmed' })])
    const wrapper = mount(FacilitatorDock, { props: { workshopId: 'w1', sessionId: 's1', accepter: 'Maria' } })

    const question = wrapper.findAll('.turn').find((turn) => turn.text().includes('What happens first?'))
    expect(question?.attributes('role')).toBe('status')

    expect(wrapper.findAll('.dock__cluster')).toHaveLength(1)
    expect(wrapper.findAll('.pc--active')).toHaveLength(2)
    expect(wrapper.text()).toContain('You said: A customer places an order.')
    expect(wrapper.text()).toContain('This name is not in what you said — check it before you add it.')
    // two acceptable cards in the cluster -> Accept all
    expect(wrapper.get('.dock__acceptall').text()).toBe('Accept all')
  })

  it('accept POSTs, asks for a board refetch, and does NOT collapse the card until the store confirms', async () => {
    const { proposals } = seed(view(), [card()])
    const wrapper = mount(FacilitatorDock, { props: { workshopId: 'w1', sessionId: 's1', accepter: 'Maria' } })

    await wrapper.get('.pc--active .btn--primary').trigger('click')
    await flushPromises()

    expect(fetchMock).toHaveBeenCalledWith('/api/proposals/p1/accept', expect.objectContaining({ method: 'POST' }))
    expect(wrapper.emitted('board-dirty')).toHaveLength(1)
    expect(wrapper.emitted('mutated')).toHaveLength(1)
    // still shown as an active card — no optimistic collapse
    expect(wrapper.find('.pc--active').exists()).toBe(true)
    expect(wrapper.find('.pc--receipt').exists()).toBe(false)

    // server-confirmed refetch lands
    proposals.cards = [card({ disposition: 'APPLIED' })]
    await wrapper.vm.$nextTick()
    expect(wrapper.get('.pc--receipt').text()).toContain('Order placed — added by Maria')
  })

  it('updates an applied receipt when the board label is reworded', () => {
    seed(view(), [card({ disposition: 'APPLIED', buildingBlockId: 'b1', label: 'Order placed' })])
    const board = useBoardStore()
    board.snapshot = {
      position: 2,
      blocks: [
        {
          id: 'b1',
          kind: 'domain-event',
          label: 'Invoice sent',
          withdrawn: false,
          placement: 'backlog',
        },
      ],
    }
    const wrapper = mount(FacilitatorDock, { props: { workshopId: 'w1', sessionId: 's1', accepter: 'Maria' } })
    expect(wrapper.get('.pc--receipt').text()).toContain('Invoice sent — added by Maria')
    expect(wrapper.get('.pc--receipt').text()).not.toContain('Order placed')
  })

  it('submits a contribution through the composer', async () => {
    seed(view(), [])
    const wrapper = mount(FacilitatorDock, { props: { workshopId: 'w1', sessionId: 's1', accepter: 'Maria' } })

    await wrapper.get('.composer__field').setValue('Then the kitchen starts cooking.')
    await wrapper.get('.composer__send').trigger('click')
    await flushPromises()

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/sessions/s1/contributions',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ text: 'Then the kitchen starts cooking.' }) }),
    )
  })

  it('shows a quiet catching-up line while a contribution is still interpreting', () => {
    seed(view({ contributions: [{ contributionId: 'c1', status: 'interpreting' }], fullyDerived: false }), [])
    const wrapper = mount(FacilitatorDock, { props: { workshopId: 'w1', sessionId: 's1', accepter: 'Maria' } })
    const note = wrapper.get('.composer__note')
    expect(note.text()).toBe('Catching up…')
    expect(note.attributes('role')).toBe('status')
  })

  it('renders the scope question as an F05 card and POSTs /scope on accept', async () => {
    seed(
      view({
        scope: { status: 'proposed', proposedStatement: 'Restaurant service, from seating to payment.' },
        transcript: [
          { kind: 'question', speaker: 'facilitator', text: 'What are we mapping?', at: 't0', questionKind: 'scope' },
        ],
        contributions: [],
      }),
      [],
    )
    const wrapper = mount(FacilitatorDock, { props: { workshopId: 'w1', sessionId: 's1', accepter: 'Maria' } })

    const scopeCard = wrapper.get('.dock__scope .pc--active')
    expect(scopeCard.text()).toContain('SCOPE')
    expect(scopeCard.text()).toContain('Restaurant service, from seating to payment.')
    // the raw scope question is folded into the card, not also shown as a plain message
    expect(wrapper.findAll('.turn').filter((turn) => turn.text().includes('What are we mapping?'))).toHaveLength(0)
    expect(wrapper.findAll('.dock__scope')).toHaveLength(1)

    await wrapper.get('.dock__scope .btn--primary').trigger('click')
    await flushPromises()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/workshops/w1/scope',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ statement: 'Restaurant service, from seating to payment.' }),
      }),
    )
  })

  it('clears the scope card on reject without POSTing', async () => {
    seed(
      view({ scope: { status: 'proposed', proposedStatement: 'X' }, transcript: [], contributions: [] }),
      [],
    )
    const wrapper = mount(FacilitatorDock, { props: { workshopId: 'w1', sessionId: 's1', accepter: 'Maria' } })

    expect(wrapper.find('.dock__scope').exists()).toBe(true)
    const named = (name: string) => wrapper.findAll('button').find((button) => button.text() === name)
    await named('Not this')?.trigger('click')
    await named('Reject')?.trigger('click')
    expect(wrapper.find('.dock__scope').exists()).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('shows the facilitator first prompt once the scope is set and nothing is narrated yet', () => {
    seed(
      view({
        scope: { status: 'set' },
        transcript: [
          { kind: 'question', speaker: 'facilitator', text: 'What are we mapping?', at: 't0', questionKind: 'scope' },
        ],
        contributions: [],
      }),
      [],
    )
    const wrapper = mount(FacilitatorDock, { props: { workshopId: 'w1', sessionId: 's1', accepter: 'Maria' } })

    expect(wrapper.text()).toContain('describe the first thing that happens')
    expect(wrapper.find('.dock__scope').exists()).toBe(false)
  })

  it('keeps the first prompt at the head of the feed after contributions are narrated', () => {
    seed(view(), [])
    const wrapper = mount(FacilitatorDock, { props: { workshopId: 'w1', sessionId: 's1', accepter: 'Maria' } })

    expect(wrapper.text()).toContain('describe the first thing that happens')
    const turns = wrapper.findAll('.turn').map((turn) => turn.text())
    expect(turns[0]).toContain('describe the first thing that happens')
    expect(turns.some((turn) => turn.includes('A customer places an order.'))).toBe(true)
  })

  it('labels a proposal card by its building-block kind, not always EVENT', () => {
    seed(view(), [
      card({ proposalId: 'p1', blockKind: 'actor', label: 'Host' }),
      card({ proposalId: 'p2', blockKind: 'system', label: 'POS terminal' }),
    ])
    const wrapper = mount(FacilitatorDock, { props: { workshopId: 'w1', sessionId: 's1', accepter: 'Maria' } })

    const pills = wrapper.findAll('.pc__pill')
    expect(pills.map((pill) => pill.text())).toEqual(['ACTOR', 'SYSTEM'])
    expect(pills[0]?.classes()).toContain('pc__pill--actor')
    expect(pills[1]?.classes()).toContain('pc__pill--system')
  })

  it('shows a "noted" reply when a contribution produced no proposals', () => {
    seed(
      view({
        transcript: [
          { kind: 'contribution', speaker: 'Maria', text: 'Hmm, let me think.', at: 't1', contributionId: 'c1' },
        ],
        contributions: [{ contributionId: 'c1', status: 'derived' }],
      }),
      [],
    )
    const wrapper = mount(FacilitatorDock, { props: { workshopId: 'w1', sessionId: 's1', accepter: 'Maria' } })

    expect(wrapper.text()).toContain('Noted')
  })

  it('shows a rephrase hint when a contribution failed interpretation', () => {
    seed(
      view({
        transcript: [
          { kind: 'contribution', speaker: 'Maria', text: 'zzz', at: 't1', contributionId: 'c1' },
        ],
        contributions: [{ contributionId: 'c1', status: 'failed' }],
      }),
      [],
    )
    const wrapper = mount(FacilitatorDock, { props: { workshopId: 'w1', sessionId: 's1', accepter: 'Maria' } })

    expect(wrapper.text()).toContain('try rephrasing')
  })

  it('does not add a rephrase hint when a failed contribution was answered with a question', () => {
    seed(
      view({
        transcript: [
          { kind: 'contribution', speaker: 'Maria', text: 'zzz', at: 't1', contributionId: 'c1' },
          { kind: 'question', speaker: 'facilitator', text: 'Could you say that another way?', at: 't2', questionKind: 'free' },
        ],
        contributions: [{ contributionId: 'c1', status: 'failed' }],
      }),
      [],
    )
    const wrapper = mount(FacilitatorDock, { props: { workshopId: 'w1', sessionId: 's1', accepter: 'Maria' } })

    expect(wrapper.text()).not.toContain('try rephrasing')
    expect(wrapper.text()).toContain('Could you say that another way?')
  })

  it('does not add a "noted" reply when the facilitator answered with a question', () => {
    seed(
      view({
        transcript: [
          { kind: 'contribution', speaker: 'Maria', text: 'A phase of work.', at: 't1', contributionId: 'c1' },
          { kind: 'question', speaker: 'facilitator', text: 'Is that a phase rather than an event?', at: 't2', questionKind: 'phase' },
        ],
        contributions: [{ contributionId: 'c1', status: 'derived' }],
      }),
      [],
    )
    const wrapper = mount(FacilitatorDock, { props: { workshopId: 'w1', sessionId: 's1', accepter: 'Maria' } })

    expect(wrapper.text()).not.toContain('Noted')
  })

  it('does not show the first prompt while the scope is still unset', () => {
    seed(view({ scope: { status: 'none' }, transcript: [], contributions: [] }), [])
    const wrapper = mount(FacilitatorDock, { props: { workshopId: 'w1', sessionId: 's1', accepter: 'Maria' } })

    expect(wrapper.text()).not.toContain('describe the first thing that happens')
  })

  it('shows a getting-started placeholder before the scope question exists', () => {
    seed(view({ scope: { status: 'none' }, transcript: [], contributions: [] }), [])
    const wrapper = mount(FacilitatorDock, { props: { workshopId: 'w1', sessionId: 's1', accepter: 'Maria' } })
    expect(wrapper.get('.dock__placeholder').text()).toContain('Getting started')
  })

  it('widens to the pending drawer, jumps + pulses an inline card, then collapses', async () => {
    seed(view(), [card({ proposalId: 'p1', label: 'Order placed' }), card({ proposalId: 'p2', label: 'Order confirmed' })])
    const wrapper = mount(FacilitatorDock, { props: { workshopId: 'w1', sessionId: 's1', accepter: 'Maria' } })

    // handle shows the pending count; opens the drawer
    await wrapper.get('.dock__handle').trigger('click')
    const drawer = wrapper.get('.dock__drawer')
    expect(drawer.findAll('.drawer__row').length).toBe(2)

    const secondRow = drawer.findAll('.drawer__row').at(1)
    if (secondRow === undefined) throw new Error('expected a second drawer row')
    await secondRow.trigger('click')
    expect(wrapper.find('.dock__drawer').exists()).toBe(false) // collapsed on jump
    expect(wrapper.get('#proposal-p2').classes()).toContain('dock__cardslot--pulse')
  })

  it('drawer Accept all remaining accepts every non-held pending proposal once', async () => {
    seed(view(), [card({ proposalId: 'p1' }), card({ proposalId: 'p2', label: 'B' }), card({ proposalId: 'p3', label: 'C', held: true })])
    const wrapper = mount(FacilitatorDock, { props: { workshopId: 'w1', sessionId: 's1', accepter: 'Maria' } })
    await wrapper.get('.dock__handle').trigger('click')
    await wrapper.get('.drawer__acceptall').trigger('click')
    await flushPromises()

    const urls = fetchMock.mock.calls.map((call) => String(call[0])).filter((url) => url.endsWith('/accept'))
    expect(urls).toEqual(['/api/proposals/p1/accept', '/api/proposals/p2/accept'])
    expect(wrapper.emitted('board-dirty')).toHaveLength(1)
  })

  it('reject POSTs and collapses to Dismissed only after the store confirms', async () => {
    const { proposals } = seed(view(), [card()])
    const wrapper = mount(FacilitatorDock, { props: { workshopId: 'w1', sessionId: 's1', accepter: 'Maria' } })

    const named = (name: string) => wrapper.findAll('button').find((button) => button.text() === name)
    await named('Not this')?.trigger('click')
    const reject = named('Reject')
    if (reject === undefined) throw new Error('expected a Reject button')
    await reject.trigger('click')
    await flushPromises()

    expect(fetchMock).toHaveBeenCalledWith('/api/proposals/p1/reject', expect.objectContaining({ method: 'POST' }))
    expect(wrapper.findAll('button').some((button) => button.text() === 'Reject')).toBe(true)

    proposals.cards = [card({ disposition: 'REJECTED' })]
    await wrapper.vm.$nextTick()
    expect(wrapper.findAll('button').some((button) => button.text() === 'Reject')).toBe(false)
    expect(wrapper.text()).toContain('Dismissed')
  })

  it('edit POSTs the new label', async () => {
    seed(view(), [card()])
    const wrapper = mount(FacilitatorDock, { props: { workshopId: 'w1', sessionId: 's1', accepter: 'Maria' } })

    const named = (name: string) => wrapper.findAll('button').find((button) => button.text() === name)
    await named('Not this')?.trigger('click')
    const edit = named('Edit')
    if (edit === undefined) throw new Error('expected an Edit button')
    await edit.trigger('click')
    await wrapper.get('input').setValue('Invoice sent')
    const save = wrapper.findAll('button').find((button) => button.text() === 'Save')
    if (save === undefined) throw new Error('expected a Save button')
    await save.trigger('click')
    await flushPromises()

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/proposals/p1/edit',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ label: 'Invoice sent' }) }),
    )
  })

  it('hold then unhold POST in sequence', async () => {
    const { proposals } = seed(view(), [card()])
    const wrapper = mount(FacilitatorDock, { props: { workshopId: 'w1', sessionId: 's1', accepter: 'Maria' } })

    const named = (name: string) => wrapper.findAll('button').find((button) => button.text() === name)
    await named('Not this')?.trigger('click')
    const hold = named('Hold')
    if (hold === undefined) throw new Error('expected a Hold button')
    await hold.trigger('click')
    await flushPromises()
    expect(fetchMock).toHaveBeenCalledWith('/api/proposals/p1/hold', expect.objectContaining({ method: 'POST' }))

    proposals.cards = [card({ held: true })]
    await wrapper.vm.$nextTick()

    const unpark = wrapper.findAll('button').find((button) => button.text() === 'Unpark')
    if (unpark === undefined) throw new Error('expected an Unpark button')
    await unpark.trigger('click')
    await flushPromises()
    expect(fetchMock).toHaveBeenCalledWith('/api/proposals/p1/unhold', expect.objectContaining({ method: 'POST' }))
  })

  it('collapses to a Facilitator pill with a pending count and a parked dot', async () => {
    seed(view(), [card({ disposition: 'PROPOSED' }), card({ proposalId: 'p2', held: true })])
    const wrapper = mount(FacilitatorDock, { props: { workshopId: 'w1', sessionId: 's1', accepter: 'Maria' } })

    await wrapper.get('.dock__min').trigger('click')

    const pill = wrapper.get('.dock__pill')
    expect(pill.text()).toContain('Facilitator')
    expect(pill.get('.dock__count').text()).toBe('2')
    expect(pill.find('.dock__dot').exists()).toBe(true)
  })

  it('hides the pending count on the collapsed pill when nothing is waiting', async () => {
    seed(view(), [card({ disposition: 'APPLIED' })])
    const wrapper = mount(FacilitatorDock, { props: { workshopId: 'w1', sessionId: 's1', accepter: 'Maria' } })

    await wrapper.get('.dock__min').trigger('click')

    expect(wrapper.get('.dock__pill').text()).toBe('Facilitator')
    expect(wrapper.find('.dock__count').exists()).toBe(false)
  })
})
