import { describe, expect, it } from 'vitest'
import { REFETCH_BY_ZONE_EVENT, refetchTargetsFor, ZONE_EVENTS } from './refetch-graph.ts'

describe('refetch-graph', () => {
  it('maps mutated to session and proposals', () => {
    expect(refetchTargetsFor('mutated')).toEqual(['session', 'proposals'])
  })

  it('maps board-dirty to board and account', () => {
    expect(refetchTargetsFor('board-dirty')).toEqual(['board', 'account'])
  })

  it('exposes a frozen graph record', () => {
    expect(REFETCH_BY_ZONE_EVENT.mutated).toEqual(['session', 'proposals'])
    expect(REFETCH_BY_ZONE_EVENT['board-dirty']).toEqual(['board', 'account'])
  })

  it('covers every zone event', () => {
    for (const event of ZONE_EVENTS) {
      expect(refetchTargetsFor(event).length).toBeGreaterThan(0)
    }
  })
})
