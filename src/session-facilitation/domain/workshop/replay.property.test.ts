import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import type { WorkshopId } from '~/plumbing/ids.ts'
import type { WorkshopEvent } from '../schema/events.ts'
import { evolve } from './evolve.ts'
import { replay } from './replay.ts'

const at = '2026-08-30T12:00:00.000Z'
const workshopId = 'w_1' as WorkshopId

/** A pool of valid workshop events for incremental-replay property tests. */
const POOL: WorkshopEvent[] = [
  {
    v: 1,
    at,
    type: 'Workshop Started',
    workshopId,
    format: 'big-picture',
    creatorName: 'Dana',
  },
  {
    v: 1,
    at,
    type: 'Scope Set',
    workshopId,
    statement: 'Library lending across branches.',
  },
  {
    v: 1,
    at,
    type: 'Stakeholder Check Recorded',
    workshopId,
    complete: false,
    absentNames: ['ops lead'],
  },
  {
    v: 1,
    at,
    type: 'Problem Chosen',
    workshopId,
    problemHotSpotId: 'b_1' as never,
    qualification: 'provisional',
  },
  {
    v: 1,
    at,
    type: 'Problem Choice Skipped',
    workshopId,
    reason: 'none-chosen',
  },
]

describe('Workshop replay — property', () => {
  // Consistency property only — not an independent oracle. Both sides share `evolve`.
  it('replay(log ++ [event]) deep-equals evolve(replay(log), event)', () => {
    fc.assert(
      fc.property(fc.array(fc.constantFrom(...POOL)), fc.constantFrom(...POOL), (log, next) => {
        expect(replay([...log, next])).toEqual(evolve(replay(log), next))
      }),
    )
  })
})
