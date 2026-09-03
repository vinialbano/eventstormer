import { describe, expect, it } from 'vitest'
import type {
  BuildingBlockId,
  ContributionId,
  ResolutionId,
  SessionId,
} from '~/plumbing/ids.ts'
import type { ResolutionEvent, SessionEvent } from '../schema/events.ts'
import { resolutionCard, resolutionsView, sessionResolutionIds } from './resolutions-view.ts'

const cardOf = (events: ResolutionEvent[]): NonNullable<ReturnType<typeof resolutionCard>> => {
  const result = resolutionCard(events)
  if (result === undefined) throw new Error('expected a resolution card')
  return result
}

const at = '2026-08-30T12:00:00.000Z'
const resolutionId = 'r_1' as ResolutionId
const hotSpotId = 'h_1' as BuildingBlockId
const sessionId = 's_1' as SessionId
const contributionId = 'c_1' as ContributionId

const proposed: ResolutionEvent = {
  v: 1,
  at,
  type: 'Resolution Proposed',
  resolutionId,
  sessionId,
  contributionId,
  hotSpotId,
  reference: 'added a retry with backoff',
}
const accepted: ResolutionEvent = { v: 1, at, type: 'Resolution Accepted', resolutionId, accepter: 'Dana' }
const resolved: ResolutionEvent = { v: 1, at, type: 'Hot Spot Resolved', resolutionId }
const rejected: ResolutionEvent = { v: 1, at, type: 'Resolution Rejected', resolutionId }
const bounced: ResolutionEvent = {
  v: 1,
  at,
  type: 'Hot Spot Resolution Rejected',
  resolutionId,
  reason: 'already-resolved',
}

describe('resolutionCard', () => {
  it('returns undefined for a stream with no birth', () => {
    expect(resolutionCard([])).toBeUndefined()
  })

  it('projects a PROPOSED resolution with its hot spot and reference', () => {
    expect(resolutionCard([proposed])).toEqual({
      resolutionId,
      hotSpotId,
      reference: 'added a retry with backoff',
      disposition: 'PROPOSED',
    })
  })

  it('carries the last-edited reference and EDITED disposition', () => {
    const edited: ResolutionEvent = { v: 1, at, type: 'Resolution Edited', resolutionId, reference: 'switched providers' }
    expect(resolutionCard([proposed, edited])).toMatchObject({
      reference: 'switched providers',
      disposition: 'EDITED',
    })
  })

  it('reports APPLIED after Accept then Hot Spot Resolved', () => {
    expect(cardOf([proposed, accepted, resolved]).disposition).toBe('APPLIED')
  })

  it('reports REJECTED with no lapsed reason', () => {
    const rejectedCard = cardOf([proposed, rejected])
    expect(rejectedCard.disposition).toBe('REJECTED')
    expect(rejectedCard.lapsedReason).toBeUndefined()
  })

  it('reports LAPSED with the apply-bounce reason', () => {
    expect(resolutionCard([proposed, accepted, bounced])).toMatchObject({
      disposition: 'LAPSED',
      lapsedReason: 'already-resolved',
    })
  })
})

describe('sessionResolutionIds', () => {
  it('folds every propose-resolution track id in stream order', () => {
    const events: SessionEvent[] = [
      {
        v: 1,
        at,
        type: 'Contribution Interpreted',
        sessionId,
        contributionId,
        tracks: [
          { track: 'propose-resolution', resolutionId, hotSpotId, reference: 'fixed it' },
          { track: 'answer-question', questionId: 'q_1' as never },
        ],
      },
      {
        v: 1,
        at,
        type: 'Contribution Interpreted',
        sessionId,
        contributionId: 'c_2' as ContributionId,
        tracks: [{ track: 'propose-resolution', resolutionId: 'r_2' as ResolutionId, hotSpotId, reference: 'also fixed' }],
      },
    ]
    expect(sessionResolutionIds(events)).toEqual(['r_1', 'r_2'])
  })

  it('is empty when no contribution proposed a resolution', () => {
    expect(sessionResolutionIds([])).toEqual([])
  })
})

describe('resolutionsView', () => {
  it('projects one card per session resolution, contiguous in stream order', () => {
    const sessionEvents: SessionEvent[] = [
      {
        v: 1,
        at,
        type: 'Contribution Interpreted',
        sessionId,
        contributionId,
        tracks: [{ track: 'propose-resolution', resolutionId, hotSpotId, reference: 'added a retry with backoff' }],
      },
    ]
    expect(resolutionsView(sessionEvents, [{ resolutionId, events: [proposed, rejected] }])).toEqual([
      { resolutionId, hotSpotId, reference: 'added a retry with backoff', disposition: 'REJECTED' },
    ])
  })
})
