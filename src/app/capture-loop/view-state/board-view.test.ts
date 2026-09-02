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
})
