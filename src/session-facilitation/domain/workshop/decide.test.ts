import { describe, expect, it } from 'vitest'
import type { BuildingBlockId, WorkshopId } from '~/plumbing/ids.ts'
import { isErr, isOk } from '~/plumbing/result.ts'
import type { WorkshopEvent } from '../schema/events.ts'
import { decide } from './decide.ts'
import { emptyWorkshop } from './model.ts'
import { replay } from './replay.ts'

const at = '2026-08-30T12:00:00.000Z'
const workshopId = 'w_1' as WorkshopId
const hotSpotId = 'b_hs' as BuildingBlockId

const started: WorkshopEvent = {
  v: 1,
  at,
  type: 'Workshop Started',
  workshopId,
  format: 'big-picture',
  creatorName: 'Dana',
}

describe('Workshop.decide — Start Workshop', () => {
  it('emits Workshop Started bound to big-picture with the creator name', () => {
    const result = decide(emptyWorkshop(), {
      type: 'Start Workshop',
      workshopId,
      creatorName: 'Dana',
      at,
    })
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value).toEqual([
        { v: 1, at, type: 'Workshop Started', workshopId, format: 'big-picture', creatorName: 'Dana' },
      ])
    }
  })

  it('rejects a blank / whitespace-only name', () => {
    const result = decide(emptyWorkshop(), {
      type: 'Start Workshop',
      workshopId,
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
      workshopId,
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
      workshopId,
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
      workshopId,
      statement: 'Library lending.',
      at,
    })
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error).toEqual({ kind: 'not-started', classification: 'systemic' })
    }
  })

  it('is repeatable — 3 successive Set Scope all emit Scope Set', () => {
    const writeModel = replay([started])
    for (const statement of ['first scope', 'second scope', 'third scope']) {
      const result = decide(writeModel, { type: 'Set Scope', workshopId, statement, at })
      expect(isOk(result)).toBe(true)
      if (isOk(result)) {
        expect(result.value).toEqual([{ v: 1, at, type: 'Scope Set', workshopId, statement }])
      }
    }
  })

  it('rejects an empty statement', () => {
    const result = decide(replay([started]), {
      type: 'Set Scope',
      workshopId,
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
      workshopId,
      statement: 'x'.repeat(10_001),
      at,
    })
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error).toEqual({ kind: 'statement-too-long', classification: 'systemic' })
    }
  })
})

const recorded = (complete: boolean): WorkshopEvent => ({
  v: 1,
  at,
  type: 'Stakeholder Check Recorded',
  workshopId,
  complete,
  absentNames: complete ? [] : ['ops lead'],
})

describe('Workshop.decide — Record Stakeholder Check', () => {
  it('emits Stakeholder Check Recorded carrying the flag and the absent names', () => {
    const result = decide(replay([started]), {
      type: 'Record Stakeholder Check',
      workshopId,
      complete: false,
      absentNames: ['ops lead', 'the auditor'],
      at,
    })
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value).toEqual([
        {
          v: 1,
          at,
          type: 'Stakeholder Check Recorded',
          workshopId,
          complete: false,
          absentNames: ['ops lead', 'the auditor'],
        },
      ])
    }
  })

  it('is once-only — a second Record Stakeholder Check emits nothing', () => {
    const result = decide(replay([started, recorded(true)]), {
      type: 'Record Stakeholder Check',
      workshopId,
      complete: false,
      absentNames: ['ops lead'],
      at,
    })
    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value).toEqual([])
  })

  it('rejects a stakeholder check before the workshop is started', () => {
    const result = decide(emptyWorkshop(), {
      type: 'Record Stakeholder Check',
      workshopId,
      complete: true,
      absentNames: [],
      at,
    })
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error).toEqual({ kind: 'not-started', classification: 'systemic' })
  })
})

describe('Workshop.decide — Choose Problem / Skip Problem Choice', () => {
  it('qualifies a chosen problem provisional when the stakeholder check is incomplete', () => {
    const result = decide(replay([started, recorded(false)]), {
      type: 'Choose Problem',
      workshopId,
      problemHotSpotId: hotSpotId,
      at,
    })
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value).toEqual([
        {
          v: 1,
          at,
          type: 'Problem Chosen',
          workshopId,
          problemHotSpotId: hotSpotId,
          qualification: 'provisional',
        },
      ])
    }
  })

  it('qualifies a chosen problem firm when the stakeholder check is complete', () => {
    const result = decide(replay([started, recorded(true)]), {
      type: 'Choose Problem',
      workshopId,
      problemHotSpotId: hotSpotId,
      at,
    })
    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value[0]).toMatchObject({ type: 'Problem Chosen', qualification: 'firm' })
  })

  it('qualifies a chosen problem firm when no stakeholder check ran', () => {
    const result = decide(replay([started]), {
      type: 'Choose Problem',
      workshopId,
      problemHotSpotId: hotSpotId,
      at,
    })
    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value[0]).toMatchObject({ type: 'Problem Chosen', qualification: 'firm' })
  })

  it('emits Problem Choice Skipped carrying the reason', () => {
    const result = decide(replay([started]), {
      type: 'Skip Problem Choice',
      workshopId,
      reason: 'no-impediments-yet',
      at,
    })
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value).toEqual([
        { v: 1, at, type: 'Problem Choice Skipped', workshopId, reason: 'no-impediments-yet' },
      ])
    }
  })

  it('is once-only — choosing after a skip (and a repeat choice) emits nothing', () => {
    const afterSkip = replay([
      started,
      { v: 1, at, type: 'Problem Choice Skipped', workshopId, reason: 'none-chosen' },
    ])
    const choose = decide(afterSkip, { type: 'Choose Problem', workshopId, problemHotSpotId: hotSpotId, at })
    expect(isOk(choose)).toBe(true)
    if (isOk(choose)) expect(choose.value).toEqual([])

    const afterChoose = replay([
      started,
      { v: 1, at, type: 'Problem Chosen', workshopId, problemHotSpotId: hotSpotId, qualification: 'firm' },
    ])
    const skip = decide(afterChoose, { type: 'Skip Problem Choice', workshopId, reason: 'none-chosen', at })
    expect(isOk(skip)).toBe(true)
    if (isOk(skip)) expect(skip.value).toEqual([])
  })
})
