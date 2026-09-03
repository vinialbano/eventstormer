import { describe, expect, it } from 'vitest'
import type { BuildingBlockId, ContributionId, ResolutionId, SessionId } from '~/plumbing/ids.ts'
import { isErr, isOk } from '~/plumbing/result.ts'
import type { ResolutionEvent } from '../schema/events.ts'
import { decide } from './decide.ts'
import { emptyResolution } from './model.ts'
import { replay } from './replay.ts'

const at = '2026-08-30T12:00:00.000Z'
const resolutionId = 'r_1' as ResolutionId
const hotSpotId = 'h_1' as BuildingBlockId

const propose = {
  type: 'Propose Resolution',
  resolutionId,
  sessionId: 's_1' as SessionId,
  contributionId: 'c_1' as ContributionId,
  hotSpotId,
  reference: 'added a retry with backoff',
  at,
} as const

const proposed: ResolutionEvent = {
  v: 1,
  at,
  type: 'Resolution Proposed',
  resolutionId,
  sessionId: 's_1' as SessionId,
  contributionId: 'c_1' as ContributionId,
  hotSpotId,
  reference: 'added a retry with backoff',
}
const accepted: ResolutionEvent = { v: 1, at, type: 'Resolution Accepted', resolutionId, accepter: 'Dana' }
const resolved: ResolutionEvent = { v: 1, at, type: 'Hot Spot Resolved', resolutionId }

const events = (result: ReturnType<typeof decide>): ResolutionEvent[] => {
  if (!isOk(result)) throw new Error('expected ok')
  return result.value
}

describe('Resolution.decide — birth', () => {
  it('a command before birth is not-born', () => {
    const result = decide(emptyResolution(), { type: 'Edit Resolution', resolutionId, reference: 'x', at })
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.kind).toBe('not-born')
  })

  it('Propose Resolution on an empty model emits Resolution Proposed carrying the hot spot and reference', () => {
    const result = decide(emptyResolution(), propose)
    expect(events(result)).toEqual([
      {
        v: 1,
        at,
        type: 'Resolution Proposed',
        resolutionId,
        sessionId: 's_1',
        contributionId: 'c_1',
        hotSpotId,
        reference: 'added a retry with backoff',
      },
    ])
  })

  it('a repeated Propose Resolution is an idempotent no-op', () => {
    const result = decide(replay([proposed]), propose)
    expect(events(result)).toEqual([])
  })
})

describe('Resolution.decide — happy path to APPLIED', () => {
  it('Propose then Accept then Record Hot Spot Resolved ends APPLIED', () => {
    const afterAccept = decide(replay([proposed]), { type: 'Accept Resolution', resolutionId, accepter: 'Dana', at })
    expect(events(afterAccept)).toEqual([{ v: 1, at, type: 'Resolution Accepted', resolutionId, accepter: 'Dana' }])

    const afterRecord = decide(replay([proposed, accepted]), { type: 'Record Hot Spot Resolved', resolutionId, at })
    expect(events(afterRecord)).toEqual([{ v: 1, at, type: 'Hot Spot Resolved', resolutionId }])

    expect(replay([proposed, accepted, resolved]).disposition).toBe('APPLIED')
  })

  it('a second Accept while ACCEPTED is an idempotent no-op', () => {
    const result = decide(replay([proposed, accepted]), { type: 'Accept Resolution', resolutionId, accepter: 'Dana', at })
    expect(events(result)).toEqual([])
  })

  it('a second Accept while APPLIED is an idempotent no-op', () => {
    const result = decide(replay([proposed, accepted, resolved]), {
      type: 'Accept Resolution',
      resolutionId,
      accepter: 'Dana',
      at,
    })
    expect(events(result)).toEqual([])
  })
})

describe('Resolution.decide — reject leaves the hot spot untouched', () => {
  it('Propose then Reject ends REJECTED and emits no board-facing event', () => {
    const result = decide(replay([proposed]), { type: 'Reject Resolution', resolutionId, at })
    expect(events(result)).toEqual([{ v: 1, at, type: 'Resolution Rejected', resolutionId }])
    expect(replay([proposed, ...events(result)]).disposition).toBe('REJECTED')
    expect(events(result).some((event) => event.type === 'Hot Spot Resolved')).toBe(false)
  })

  it('Edit after a terminal disposition is bad-transition', () => {
    const rejected: ResolutionEvent = { v: 1, at, type: 'Resolution Rejected', resolutionId }
    const result = decide(replay([proposed, rejected]), { type: 'Edit Resolution', resolutionId, reference: 'y', at })
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.kind).toBe('bad-transition')
      expect(result.error).toMatchObject({ from: 'REJECTED', command: 'Edit Resolution' })
    }
  })
})

describe('Resolution.decide — apply bounce is terminal, no retry', () => {
  it('Accept then Record Resolution Rejected(already-resolved) ends LAPSED', () => {
    const result = decide(replay([proposed, accepted]), {
      type: 'Record Resolution Rejected',
      resolutionId,
      reason: 'already-resolved',
      at,
    })
    expect(events(result)).toEqual([
      { v: 1, at, type: 'Hot Spot Resolution Rejected', resolutionId, reason: 'already-resolved' },
    ])
    expect(replay([proposed, accepted, ...events(result)]).disposition).toBe('LAPSED')
  })

  it('no command re-opens a LAPSED resolution — Accept is bad-transition', () => {
    const bounced: ResolutionEvent = {
      v: 1,
      at,
      type: 'Hot Spot Resolution Rejected',
      resolutionId,
      reason: 'already-resolved',
    }
    const result = decide(replay([proposed, accepted, bounced]), {
      type: 'Accept Resolution',
      resolutionId,
      accepter: 'Dana',
      at,
    })
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.kind).toBe('bad-transition')
  })

  it('a second Record Resolution Rejected while LAPSED is an idempotent no-op', () => {
    const bounced: ResolutionEvent = {
      v: 1,
      at,
      type: 'Hot Spot Resolution Rejected',
      resolutionId,
      reason: 'already-resolved',
    }
    const result = decide(replay([proposed, accepted, bounced]), {
      type: 'Record Resolution Rejected',
      resolutionId,
      reason: 'already-resolved',
      at,
    })
    expect(events(result)).toEqual([])
  })
})

describe('Resolution.decide — edit loop and lapse', () => {
  it('Edit is legal from PROPOSED and from EDITED', () => {
    const first = decide(replay([proposed]), { type: 'Edit Resolution', resolutionId, reference: 'v2', at })
    expect(events(first)).toEqual([{ v: 1, at, type: 'Resolution Edited', resolutionId, reference: 'v2' }])

    const edited: ResolutionEvent = { v: 1, at, type: 'Resolution Edited', resolutionId, reference: 'v2' }
    const second = decide(replay([proposed, edited]), { type: 'Edit Resolution', resolutionId, reference: 'v3', at })
    expect(events(second)).toEqual([{ v: 1, at, type: 'Resolution Edited', resolutionId, reference: 'v3' }])
    expect(replay([proposed, edited, ...events(second)]).reference).toBe('v3')
  })

  it('Lapse Resolution from PROPOSED emits Resolution Lapsed; from ACCEPTED it is a no-op', () => {
    const fromProposed = decide(replay([proposed]), { type: 'Lapse Resolution', resolutionId, at })
    expect(events(fromProposed)).toEqual([{ v: 1, at, type: 'Resolution Lapsed', resolutionId }])

    const fromAccepted = decide(replay([proposed, accepted]), { type: 'Lapse Resolution', resolutionId, at })
    expect(events(fromAccepted)).toEqual([])
  })

  it('Record Hot Spot Resolved before Accept is bad-transition', () => {
    const result = decide(replay([proposed]), { type: 'Record Hot Spot Resolved', resolutionId, at })
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.kind).toBe('bad-transition')
  })
})
