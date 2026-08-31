import { describe, expect, it } from 'vitest'
import type { BuildingBlockId, ContributionId, ProposalId, SessionId } from '~/plumbing/ids.ts'
import { isErr, isOk } from '~/plumbing/result.ts'
import type { ProposalEvent } from '../schema/events.ts'
import { decide } from './decide.ts'
import { emptyProposal } from './model.ts'
import { replay } from './replay.ts'

const at = '2026-08-30T12:00:00.000Z'
const proposalId = 'p_1' as ProposalId
const bb = 'b_1' as BuildingBlockId

const proposed: ProposalEvent = {
  v: 1,
  at,
  type: 'Building Block Proposed',
  proposalId: proposalId,
  sessionId: 's_1' as SessionId,
  contributionId: 'c_1' as ContributionId,
  blockKind: 'domain-event',
  label: 'Loan recorded',
  bar: 'strict',
}

const accept = { type: 'Accept Proposal', proposalId: proposalId, accepter: 'Dana', buildingBlockId: bb, at } as const

describe('Proposal.decide — birth', () => {
  it('a command before birth is rejected', () => {
    const result = decide(emptyProposal(), { type: 'Edit Proposal', proposalId: proposalId, label: 'x', at })
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.kind).toBe('not-born')
  })

  it('a repeated Propose Building Block is an idempotent no-op', () => {
    const result = decide(replay([proposed]), {
      type: 'Propose Building Block',
      proposalId: proposalId,
      sessionId: 's_1' as SessionId,
      contributionId: 'c_1' as ContributionId,
      blockKind: 'domain-event',
      label: 'Loan recorded',
      bar: 'strict',
      at,
    })
    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value).toEqual([])
  })
})

describe('Proposal.decide — accept idempotency', () => {
  it('accept twice emits exactly one Proposal Accepted with the same buildingBlockId', () => {
    const first = decide(replay([proposed]), accept)
    expect(isOk(first)).toBe(true)
    if (!isOk(first)) return
    expect(first.value).toEqual([
      { v: 1, at, type: 'Proposal Accepted', proposalId: proposalId, accepter: 'Dana', buildingBlockId: bb },
    ])

    const afterAccept = replay([proposed, ...first.value])
    const second = decide(afterAccept, { ...accept, buildingBlockId: 'b_other' as BuildingBlockId })
    expect(isOk(second)).toBe(true)
    if (isOk(second)) expect(second.value).toEqual([])
    expect(afterAccept.buildingBlockId).toBe(bb)
  })

  it('accept is still a no-op once APPLIED', () => {
    const writeModel = replay([
      proposed,
      { v: 1, at, type: 'Proposal Accepted', proposalId: proposalId, accepter: 'Dana', buildingBlockId: bb },
      { v: 1, at, type: 'Operation Applied', proposalId: proposalId, resultingBuildingBlockId: bb },
    ])
    const result = decide(writeModel, accept)
    expect(isOk(result) && result.value).toEqual([])
  })
})

describe('Proposal.decide — disposition machine', () => {
  it('APPLY_FAILED is re-editable and re-acceptable', () => {
    const failed = replay([
      proposed,
      { v: 1, at, type: 'Proposal Accepted', proposalId: proposalId, accepter: 'Dana', buildingBlockId: bb },
      { v: 1, at, type: 'Operation Rejected', proposalId: proposalId, reason: 'unknown-target' },
    ])
    expect(isOk(decide(failed, { type: 'Edit Proposal', proposalId: proposalId, label: 'fixed', at }))).toBe(true)
    const reaccept = decide(failed, accept)
    expect(isOk(reaccept)).toBe(true)
    if (isOk(reaccept)) expect(reaccept.value[0]).toMatchObject({ type: 'Proposal Accepted' })
  })

  it('REJECTED is terminal — a later edit is rejected', () => {
    const rejected = replay([proposed, { v: 1, at, type: 'Proposal Rejected', proposalId: proposalId }])
    const result = decide(rejected, { type: 'Edit Proposal', proposalId: proposalId, label: 'x', at })
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error).toEqual({
        kind: 'bad-transition',
        classification: 'systemic',
        from: 'REJECTED',
        command: 'Edit Proposal',
      })
    }
  })

  it('Edit rejects a label longer than 200 characters', () => {
    const result = decide(replay([proposed]), {
      type: 'Edit Proposal',
      proposalId: proposalId,
      label: 'x'.repeat(201),
      at,
    })
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.kind).toBe('label-too-long')
  })
})

describe('Proposal.decide — Hold marker', () => {
  it('hold then unhold is reversible and orthogonal to the disposition', () => {
    const held = decide(replay([proposed]), { type: 'Hold Proposal', proposalId: proposalId, at })
    expect(isOk(held) && held.value[0]).toMatchObject({ type: 'Proposal Held' })

    const afterHold = replay([proposed, { v: 1, at, type: 'Proposal Held', proposalId: proposalId }])
    expect(afterHold.held).toBe(true)
    expect(afterHold.disposition).toBe('PROPOSED')

    const unheld = decide(afterHold, { type: 'Unhold Proposal', proposalId: proposalId, at })
    expect(isOk(unheld) && unheld.value[0]).toMatchObject({ type: 'Proposal Unheld' })

    const redundant = decide(afterHold, { type: 'Hold Proposal', proposalId: proposalId, at })
    expect(isOk(redundant) && redundant.value).toEqual([])
  })
})

describe('Proposal.decide — Lapse (close behaviour)', () => {
  it('lapses a PROPOSED / held proposal', () => {
    const result = decide(replay([proposed]), {
      type: 'Lapse Proposal',
      proposalId: proposalId,
      cause: 'undisposed',
      at,
    })
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value).toEqual([
        { v: 1, at, type: 'Proposal Lapsed', proposalId: proposalId, cause: 'undisposed' },
      ])
    }
  })

  it('lapse on an APPLIED proposal is an idempotent no-op', () => {
    const applied = replay([
      proposed,
      { v: 1, at, type: 'Proposal Accepted', proposalId: proposalId, accepter: 'Dana', buildingBlockId: bb },
      { v: 1, at, type: 'Operation Applied', proposalId: proposalId, resultingBuildingBlockId: bb },
    ])
    const result = decide(applied, { type: 'Lapse Proposal', proposalId: proposalId, cause: 'undisposed', at })
    expect(isOk(result) && result.value).toEqual([])
  })

  it('lapse on an ACCEPTED in-flight proposal is left alone (ok([]))', () => {
    const accepted = replay([
      proposed,
      { v: 1, at, type: 'Proposal Accepted', proposalId: proposalId, accepter: 'Dana', buildingBlockId: bb },
    ])
    const result = decide(accepted, { type: 'Lapse Proposal', proposalId: proposalId, cause: 'undisposed', at })
    expect(isOk(result) && result.value).toEqual([])
  })
})
