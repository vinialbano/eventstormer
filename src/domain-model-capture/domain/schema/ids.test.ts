import type { z } from 'zod'
import { describe, expect, it } from 'vitest'
import type { WorkshopId as PlumbingWorkshopId } from '~/plumbing/ids.ts'
import { BuildingBlockId, SessionId, WorkshopId } from './ids.ts'

describe('branded id schemas', () => {
  it('parses a string into the brand, leaving the value unchanged', () => {
    expect(WorkshopId.parse('w_abc')).toBe('w_abc')
    expect(SessionId.parse('s_abc')).toBe('s_abc')
    expect(BuildingBlockId.parse('b_abc')).toBe('b_abc')
  })

  it('rejects a non-string', () => {
    expect(() => WorkshopId.parse(123)).toThrow()
  })

  it('a bare string is not assignable to the inferred brand (compile-time)', () => {
    // @ts-expect-error a plain string is not a WorkshopId
    const bad: z.infer<typeof WorkshopId> = 'not-branded'
    expect(typeof bad).toBe('string')
  })

  it('infers the same type as plumbing/ids.ts — assignable both directions, no cast', () => {
    const parsed = WorkshopId.parse('w_1')
    const asPlumbing: PlumbingWorkshopId = parsed
    const back: z.infer<typeof WorkshopId> = asPlumbing
    expect(back).toBe('w_1')
  })
})
