import type { z } from 'zod'
import { describe, expect, it } from 'vitest'
import type { BuildingBlockId as PlumbingBuildingBlockId } from '~/plumbing/ids.ts'
import { WorkshopId as PlumbingWorkshopId } from '~/plumbing/ids.ts'
import { BuildingBlockId, WorkshopId } from './ids.ts'

describe('branded id schemas', () => {
  it('parses a string into the brand, leaving the value unchanged', () => {
    expect(WorkshopId.parse('w_abc')).toBe('w_abc')
    expect(BuildingBlockId.parse('b_abc')).toBe('b_abc')
  })

  it('rejects a non-string', () => {
    expect(() => WorkshopId.parse(123)).toThrow()
  })

  it('a bare string is not assignable to the inferred brand (compile-time)', () => {
    // @ts-expect-error a plain string is not a BuildingBlockId
    const bad: z.infer<typeof BuildingBlockId> = 'not-branded'
    expect(typeof bad).toBe('string')
  })

  it('re-exports the one canonical WorkshopId from plumbing (S1-69)', () => {
    expect(WorkshopId).toBe(PlumbingWorkshopId)
  })

  it('BuildingBlockId infers the same type as plumbing/ids.ts — assignable both directions, no cast', () => {
    const parsed = BuildingBlockId.parse('b_1')
    const asPlumbing: PlumbingBuildingBlockId = parsed
    const back: z.infer<typeof BuildingBlockId> = asPlumbing
    expect(back).toBe('b_1')
  })
})
