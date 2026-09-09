import { describe, expect, it } from 'vitest'
import { kindLabel } from './kind-label.ts'

// Suite: kind-label
// Invariant: Every building-block kind and every model-change intent kind maps to a short pill label.
// Boundary IN: the three block kinds, the three intent kinds, an unknown kind.
// Boundary OUT: pill colour (ProposalCard.test.ts), card layout (DockFeed / drawer tests).

describe('kindLabel', () => {
  it('labels the building-block kinds', () => {
    expect(kindLabel('domain-event')).toBe('EVENT')
    expect(kindLabel('actor')).toBe('ACTOR')
    expect(kindLabel('system')).toBe('SYSTEM')
  })

  it('labels the model-change intent kinds', () => {
    expect(kindLabel('relation')).toBe('RELATION')
    expect(kindLabel('pivotal')).toBe('PIVOTAL')
    expect(kindLabel('reword')).toBe('REWORD')
  })

  it('falls back to the raw string for an unknown kind', () => {
    expect(kindLabel('mystery')).toBe('mystery')
  })
})
