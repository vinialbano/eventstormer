import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProposalCard, SessionView } from '../types.ts'
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

const dockProps = (over: { blockLabels?: Record<string, string> } = {}) => ({
  workshopId: 'w1',
  sessionId: 's1',
  accepter: 'Maria',
  blockLabels: over.blockLabels ?? {},
})

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

// Suite: FacilitatorDock
// Invariant: Dock shell wires stores, transport, and child zones into the facilitator surface.
// Boundary IN: cluster rendering, accept POST wiring, scope card, pending drawer, composer submit.
// Boundary OUT: feed assembly (use-dock-feed.test.ts), proposal actions (use-review-proposal.test.ts), card UI (ProposalCard.test.ts), drawer rows (PendingDrawer.test.ts).

describe('FacilitatorDock', () => {
  it('welds a proposal cluster to the contribution turn and renders questions as messages', () => {
    seed(view(), [card(), card({ proposalId: 'p2', label: 'Order confirmed' })])
    const wrapper = mount(FacilitatorDock, { props: dockProps() })

    const question = wrapper.findAll('.turn').find((turn) => turn.text().includes('What happens first?'))
    expect(question?.attributes('role')).toBe('status')

    expect(wrapper.findAll('.dock__cluster')).toHaveLength(1)
    expect(wrapper.findAll('.pc--active')).toHaveLength(2)
    expect(wrapper.text()).toContain('You said: A customer places an order.')
    expect(wrapper.get('.dock__acceptall').text()).toBe('Accept all')
  })

  it('accept POSTs, asks for a board refetch, and does NOT collapse the card until the store confirms', async () => {
    const { proposals } = seed(view(), [card()])
    const wrapper = mount(FacilitatorDock, { props: dockProps() })

    await wrapper.get('.pc--active .btn--primary').trigger('click')
    await flushPromises()

    expect(fetchMock).toHaveBeenCalledWith('/api/proposals/p1/accept', expect.objectContaining({ method: 'POST' }))
    expect(wrapper.emitted('board-dirty')).toHaveLength(1)
    expect(wrapper.emitted('mutated')).toHaveLength(1)
    expect(wrapper.find('.pc--active').exists()).toBe(true)
    expect(wrapper.find('.pc--receipt').exists()).toBe(false)

    proposals.cards = [card({ disposition: 'APPLIED' })]
    await wrapper.vm.$nextTick()
    expect(wrapper.get('.pc--receipt').text()).toContain('Order placed — added by Maria')
  })

  it('submits a contribution through the composer', async () => {
    seed(view(), [])
    const wrapper = mount(FacilitatorDock, { props: dockProps() })

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
    const wrapper = mount(FacilitatorDock, { props: dockProps() })
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
    const wrapper = mount(FacilitatorDock, { props: dockProps() })

    const scopeCard = wrapper.get('.dock__scope .pc--active')
    expect(scopeCard.text()).toContain('SCOPE')
    expect(scopeCard.text()).toContain('Restaurant service, from seating to payment.')
    expect(wrapper.findAll('.turn').filter((turn) => turn.text().includes('What are we mapping?'))).toHaveLength(0)

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

  it('widens to the pending drawer, jumps + pulses an inline card, then collapses', async () => {
    seed(view(), [card({ proposalId: 'p1', label: 'Order placed' }), card({ proposalId: 'p2', label: 'Order confirmed' })])
    const wrapper = mount(FacilitatorDock, { props: dockProps() })

    await wrapper.get('.dock__handle').trigger('click')
    const drawer = wrapper.get('.dock__drawer')
    expect(drawer.findAll('.drawer__row').length).toBe(2)

    const secondRow = drawer.findAll('.drawer__row').at(1)
    if (secondRow === undefined) throw new Error('expected a second drawer row')
    await secondRow.trigger('click')
    expect(wrapper.find('.dock__drawer').exists()).toBe(false)
    expect(wrapper.get('#proposal-p2').classes()).toContain('dock__cardslot--pulse')
  })

  it('collapses to a Facilitator pill with a pending count and a parked dot', async () => {
    seed(view(), [card({ disposition: 'PROPOSED' }), card({ proposalId: 'p2', held: true })])
    const wrapper = mount(FacilitatorDock, { props: dockProps() })

    await wrapper.get('.dock__min').trigger('click')

    const pill = wrapper.get('.dock__pill')
    expect(pill.text()).toContain('Facilitator')
    expect(pill.get('.dock__count').text()).toBe('2')
    expect(pill.find('.dock__dot').exists()).toBe(true)
  })
})
