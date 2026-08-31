import { describe, expect, it } from 'vitest'
import type { WorkshopId } from '~/plumbing/ids.ts'
import { isErr, isOk } from '~/plumbing/result.ts'
import type { WorkshopEvent } from '../schema/events.ts'
import { decide } from './decide.ts'
import { emptyWorkshop } from './model.ts'
import { replay } from './replay.ts'

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

describe('Workshop.decide — Start Workshop', () => {
  it('emits Workshop Started bound to big-picture with the creator name', () => {
    const result = decide(emptyWorkshop(), {
      type: 'Start Workshop',
      workshopId: workshopId,
      creatorName: 'Dana',
      at,
    })
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value).toEqual([
        { v: 1, at, type: 'Workshop Started', workshopId: workshopId, format: 'big-picture', creatorName: 'Dana' },
      ])
    }
  })

  it('rejects a blank / whitespace-only name', () => {
    const result = decide(emptyWorkshop(), {
      type: 'Start Workshop',
      workshopId: workshopId,
      creatorName: '   ',
      at,
    })
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error).toEqual({ kind: 'blank-name', classification: 'systemic' })
    }
  })

  it('rejects a name longer than 80 characters', () => {
    const result = decide(emptyWorkshop(), {
      type: 'Start Workshop',
      workshopId: workshopId,
      creatorName: 'x'.repeat(81),
      at,
    })
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error).toEqual({ kind: 'name-too-long', classification: 'systemic' })
    }
  })

  it('rejects a second Start Workshop', () => {
    const result = decide(replay([started]), {
      type: 'Start Workshop',
      workshopId: workshopId,
      creatorName: 'Dana',
      at,
    })
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error).toEqual({ kind: 'already-started', classification: 'systemic' })
    }
  })
})

describe('Workshop.decide — Set Scope', () => {
  it('rejects Set Scope before the workshop is started', () => {
    const result = decide(emptyWorkshop(), {
      type: 'Set Scope',
      workshopId: workshopId,
      statement: 'Library lending.',
      at,
    })
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error).toEqual({ kind: 'not-started', classification: 'systemic' })
    }
  })

  it('is repeatable — 3 successive Set Scope all emit Scope Set', () => {
    const wm = replay([started])
    for (const statement of ['first scope', 'second scope', 'third scope']) {
      const result = decide(wm, { type: 'Set Scope', workshopId: workshopId, statement, at })
      expect(isOk(result)).toBe(true)
      if (isOk(result)) {
        expect(result.value).toEqual([{ v: 1, at, type: 'Scope Set', workshopId: workshopId, statement }])
      }
    }
  })

  it('rejects an empty statement', () => {
    const result = decide(replay([started]), {
      type: 'Set Scope',
      workshopId: workshopId,
      statement: '   ',
      at,
    })
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error).toEqual({ kind: 'blank-statement', classification: 'systemic' })
    }
  })

  it('rejects a statement longer than 10 000 characters', () => {
    const result = decide(replay([started]), {
      type: 'Set Scope',
      workshopId: workshopId,
      statement: 'x'.repeat(10_001),
      at,
    })
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error).toEqual({ kind: 'statement-too-long', classification: 'systemic' })
    }
  })
})
