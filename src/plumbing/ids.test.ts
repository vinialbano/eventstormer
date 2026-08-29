import { describe, expect, it } from 'vitest'
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
    for (let i = 0; i < 1000; i++) seen.add(newWorkshopId())
    expect(seen.size).toBe(1000)
  })

  it('rejects a bare string where a brand is required (compile-time)', () => {
    // @ts-expect-error a plain string is not assignable to WorkshopId
    const bad: WorkshopId = 'not-a-workshop-id'
    expect(typeof bad).toBe('string')
  })

  it('workshopUrlSlug returns the id verbatim (already URL-safe)', () => {
    const id = newWorkshopId()
    expect(workshopUrlSlug(id)).toBe(id)
    expect(workshopUrlSlug(id)).toMatch(URL_SAFE)
  })
})
