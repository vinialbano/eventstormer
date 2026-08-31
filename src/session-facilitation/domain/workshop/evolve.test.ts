import { describe, expect, it } from 'vitest'
import type { WorkshopId } from '~/plumbing/ids.ts'
import type { WorkshopEvent } from '../schema/events.ts'
import { evolve } from './evolve.ts'
import { emptyWorkshop } from './model.ts'

const at = '2026-08-30T12:00:00.000Z'
const workshopId = 'w_1' as WorkshopId

const started: WorkshopEvent = {
  v: 1,
  at,
  type: 'Workshop Started',
  workshopId: workshopId,
  format: 'big-picture',
  creatorName: 'Dana',
}

describe('Workshop.evolve', () => {
  it('Workshop Started records the fixed format and creator name', () => {
    expect(evolve(emptyWorkshop(), started)).toEqual({
      started: true,
      format: 'big-picture',
      creatorName: 'Dana',
    })
  })

  it('Scope Set leaves the write model unchanged (scope status is not an aggregate field)', () => {
    const afterStart = evolve(emptyWorkshop(), started)
    const scopeSet: WorkshopEvent = {
      v: 1,
      at,
      type: 'Scope Set',
      workshopId: workshopId,
      statement: 'Library lending across branches.',
    }
    expect(evolve(afterStart, scopeSet)).toBe(afterStart)
  })
})
