import { describe, expect, it } from 'vitest'
import { REFETCH_BY_ZONE_EVENT, refetchTargetsFor, ZONE_EVENTS } from './refetch-graph.ts'

// Suite: refetch-graph
// Invariant: Each zone event maps to its declared refetch targets; mutated never pulls board or account.
// Boundary IN: refetchTargetsFor and the REFETCH_BY_ZONE_EVENT record.
// Boundary OUT: Store loader wiring (apply-capture-effect.test.ts, use-capture-orchestration.integration.test.ts).

describe('refetch-graph', () => {
  it('pins mutated and board-dirty refetch targets', () => {
    expect(ZONE_EVENTS).toEqual(['mutated', 'board-dirty'])
    expect(refetchTargetsFor('mutated')).toEqual(['session', 'proposals'])
    expect(refetchTargetsFor('board-dirty')).toEqual(['board', 'account'])
    expect(REFETCH_BY_ZONE_EVENT.mutated).toEqual(['session', 'proposals'])
    expect(REFETCH_BY_ZONE_EVENT['board-dirty']).toEqual(['board', 'account'])
  })

  it('excludes board and account from mutated targets', () => {
    const targets = refetchTargetsFor('mutated')
    expect(targets).not.toContain('board')
    expect(targets).not.toContain('account')
  })
})
