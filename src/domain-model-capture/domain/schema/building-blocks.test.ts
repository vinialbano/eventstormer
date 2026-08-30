import { describe, expect, it } from 'vitest'
import { BuildingBlock } from './building-blocks.ts'

describe('BuildingBlock schema union', () => {
  it('parses each of the four kinds', () => {
    for (const kind of ['domain-event', 'actor', 'system'] as const) {
      expect(BuildingBlock.parse({ kind, id: 'b1', label: 'x' })).toMatchObject({
        kind,
        id: 'b1',
        label: 'x',
      })
    }
    expect(BuildingBlock.parse({ kind: 'hot-spot', id: 'h1', label: 'slow expo' })).toMatchObject({
      kind: 'hot-spot',
      id: 'h1',
      label: 'slow expo',
    })
  })

  it('defaults hotSpot.modelAffecting to true (model-affecting) when absent', () => {
    const parsed = BuildingBlock.parse({ kind: 'hot-spot', id: 'h1', label: 'x' })
    expect(parsed).toMatchObject({ modelAffecting: true })
  })

  it('round-trips an informational hot spot (modelAffecting: false)', () => {
    const parsed = BuildingBlock.parse({
      kind: 'hot-spot',
      id: 'h1',
      label: 'x',
      modelAffecting: false,
    })
    expect(parsed).toMatchObject({ modelAffecting: false })
  })

  it('rejects an unknown discriminant', () => {
    expect(() => BuildingBlock.parse({ kind: 'sticky-note', id: 'b1', label: 'x' })).toThrow()
  })

  it('rejects a member missing its id', () => {
    expect(() => BuildingBlock.parse({ kind: 'actor', label: 'x' })).toThrow()
  })
})
