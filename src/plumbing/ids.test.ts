import { describe, expect, it } from 'vitest'
import type { z } from 'zod'
import {
  newBuildingBlockId,
  newSessionId,
  newWorkshopId,
  workshopUrlSlug,
  type WorkshopId,
} from './ids.ts'

const URL_SAFE = /^[A-Za-z0-9_-]+$/

describe('branded ids', () => {
  it('generates URL-safe, 21-char ids for every brand', () => {
    for (const gen of [newWorkshopId, newSessionId, newBuildingBlockId]) {
      const id = gen()
      expect(id).toMatch(URL_SAFE)
      expect(id).toHaveLength(21)
    }
  })

  it('generates mutually distinct ids across 1000 draws', () => {
    const seen = new Set<string>()
    for (let counter = 0; counter < 1000; counter++) seen.add(newWorkshopId())
    expect(seen.size).toBe(1000)
  })

  it('rejects a bare string where a brand is required (compile-time)', () => {
    // @ts-expect-error a plain string is not assignable to WorkshopId
    const bad: WorkshopId = 'not-a-workshop-id'
    expect(typeof bad).toBe('string')
  })

  it('accepts a Zod $brand-shaped value where a WorkshopId is required (seam compatibility)', () => {
    // The type `z.string().brand<'WorkshopId'>()` infers in the domain schema
    // module — assignable here with no cast, which is what the plumbing/domain
    // id seam relies on.
    const plain: string = newWorkshopId()
    const fromSchema = plain as string & z.$brand<'WorkshopId'>
    const asWorkshopId: WorkshopId = fromSchema
    expect(typeof asWorkshopId).toBe('string')
  })

  it('workshopUrlSlug returns the id verbatim (already URL-safe)', () => {
    const id = newWorkshopId()
    expect(workshopUrlSlug(id)).toBe(id)
    expect(workshopUrlSlug(id)).toMatch(URL_SAFE)
  })
})
