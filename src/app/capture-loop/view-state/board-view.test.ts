// Suite: board-view
// Invariant: Client-only board filters and timeline layout derive correctly from a board snapshot ref.
// Boundary IN: useBoardViewState composable with literal snapshot fixtures.
// Boundary OUT: BoardWall mount and dagre layout (BoardWall.test.ts, use-dagre-layout.test.ts).

import { ref } from 'vue'
import { describe, expect, it } from 'vitest'
import type { BoardSnapshot } from '../types.ts'
import { useBoardViewState } from './board-view.ts'

describe('useBoardViewState', () => {
  it('lays out published follows as ranks and edges', () => {
    const snapshot = ref<BoardSnapshot>({
      position: 2,
      blocks: [
        {
          id: 'eA',
          kind: 'domain-event',
          label: 'Loan recorded',
          withdrawn: false,
          placement: 'timeline',
          pivotal: false,
        },
        {
          id: 'eB',
          kind: 'domain-event',
          label: 'Book returned',
          withdrawn: false,
          placement: 'timeline',
          pivotal: false,
        },
      ],
      follows: [{ predecessor: 'eA', successor: 'eB' }],
      causedBy: [],
      hotSpotCount: 0,
    })
    const view = useBoardViewState(snapshot)

    expect(view.showWithdrawn.value).toBe(false)
    expect(view.timeline.value.tracks).toEqual([
      { eventIds: ['eA', 'eB'], ranks: { eA: 0, eB: 1 } },
    ])
    expect(view.timeline.value.edges).toEqual([{ predecessor: 'eA', successor: 'eB' }])
  })

  it('defaults showWithdrawn to false and toggling it does not change the snapshot', () => {
    const snapshot = ref<BoardSnapshot>({
      position: 3,
      blocks: [
        {
          id: 'eA',
          kind: 'domain-event',
          label: 'Loan recorded',
          withdrawn: true,
          placement: 'timeline',
          pivotal: false,
        },
      ],
      follows: [],
      causedBy: [],
      hotSpotCount: 0,
    })
    const view = useBoardViewState(snapshot)

    expect(view.showWithdrawn.value).toBe(false)
    expect(view.timeline.value.tracks).toEqual([])

    view.showWithdrawn.value = true
    expect(view.showWithdrawn.value).toBe(true)
    expect(view.timeline.value.tracks).toEqual([{ eventIds: ['eA'], ranks: { eA: 0 } }])

    view.showWithdrawn.value = false
    expect(view.timeline.value.tracks).toEqual([])
  })

  it('groups hot-spot callouts by target, lists unannotated ones, and counts from the snapshot', () => {
    const snapshot = ref<BoardSnapshot>({
      position: 6,
      blocks: [
        {
          id: 'eA',
          kind: 'domain-event',
          label: 'Payment captured',
          withdrawn: false,
          placement: 'timeline',
          pivotal: false,
        },
        {
          id: 'h1',
          kind: 'hot-spot',
          label: 'Refund path unclear',
          withdrawn: false,
          placement: 'backlog',
          pivotal: false,
          modelAffecting: true,
          annotates: 'eA',
          resolved: true,
          reference: 'we added a retry step',
        },
        {
          id: 'h2',
          kind: 'hot-spot',
          label: 'Who owns dunning?',
          withdrawn: false,
          placement: 'backlog',
          pivotal: false,
          modelAffecting: false,
          annotates: null,
          resolved: false,
          reference: null,
        },
      ],
      follows: [],
      causedBy: [],
      hotSpotCount: 2,
    })
    const view = useBoardViewState(snapshot)

    expect(view.hotSpots.value.annotated.get('eA')).toEqual([
      {
        hotSpotId: 'h1',
        label: 'Refund path unclear',
        modelAffecting: true,
        resolved: true,
        reference: 'we added a retry step',
      },
    ])
    expect(view.hotSpots.value.unannotated).toEqual([
      {
        hotSpotId: 'h2',
        label: 'Who owns dunning?',
        modelAffecting: false,
        resolved: false,
        reference: null,
      },
    ])
    expect(view.hotSpots.value.count).toBe(2)
  })

  it('drops a withdrawn hot spot from the callouts and list', () => {
    const snapshot = ref<BoardSnapshot>({
      position: 7,
      blocks: [
        {
          id: 'h1',
          kind: 'hot-spot',
          label: 'Stale concern',
          withdrawn: true,
          placement: 'backlog',
          pivotal: false,
          annotates: null,
          resolved: false,
        },
      ],
      follows: [],
      causedBy: [],
      hotSpotCount: 0,
    })
    const view = useBoardViewState(snapshot)

    expect(view.hotSpots.value.annotated.size).toBe(0)
    expect(view.hotSpots.value.unannotated).toEqual([])
    expect(view.hotSpots.value.count).toBe(0)
  })
})
