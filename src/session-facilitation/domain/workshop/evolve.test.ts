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
  workshopId,
  format: 'big-picture',
  creatorName: 'Dana',
}

describe('Workshop.evolve', () => {
  it('Workshop Started records the fixed format and creator name', () => {
    expect(evolve(emptyWorkshop(), started)).toEqual({
      started: true,
      format: 'big-picture',
      creatorName: 'Dana',
      stakeholderCheckRun: false,
      problemDecided: false,
    })
  })

  it('Workshop Started clears the once-only close-ceremony guards', () => {
    expect(evolve(emptyWorkshop(), started)).toMatchObject({
      stakeholderCheckRun: false,
      problemDecided: false,
    })
  })

  it('Scope Set leaves the write model unchanged (scope status is not an aggregate field)', () => {
    const afterStart = evolve(emptyWorkshop(), started)
    const scopeSet: WorkshopEvent = {
      v: 1,
      at,
      type: 'Scope Set',
      workshopId,
      statement: 'Library lending across branches.',
    }
    expect(evolve(afterStart, scopeSet)).toEqual({
      started: true,
      format: 'big-picture',
      creatorName: 'Dana',
      stakeholderCheckRun: false,
      problemDecided: false,
    })
  })

  it('Stakeholder Check Recorded sets the run guard and the completeness flag', () => {
    const afterStart = evolve(emptyWorkshop(), started)
    const next = evolve(afterStart, {
      v: 1,
      at,
      type: 'Stakeholder Check Recorded',
      workshopId,
      complete: false,
      absentNames: ['ops lead'],
    })
    expect(next).toMatchObject({ stakeholderCheckRun: true, stakeholderComplete: false })
  })

  it('Problem Chosen and Problem Choice Skipped both set problemDecided', () => {
    const afterStart = evolve(emptyWorkshop(), started)
    expect(
      evolve(afterStart, {
        v: 1,
        at,
        type: 'Problem Chosen',
        workshopId,
        problemHotSpotId: 'b_1' as never,
        qualification: 'firm',
      }).problemDecided,
    ).toBe(true)
    expect(
      evolve(afterStart, {
        v: 1,
        at,
        type: 'Problem Choice Skipped',
        workshopId,
        reason: 'none-chosen',
      }).problemDecided,
    ).toBe(true)
  })
})
