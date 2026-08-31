import { describe, expect, it } from 'vitest'
import type { BuildingBlockId, ContributionId, ProposalId, SessionId } from '~/plumbing/ids.ts'
import type { ProposalEvent, SessionEvent } from '../schema/events.ts'
import { proposalsView } from './proposals-view.ts'

const at = '2026-08-30T12:00:00.000Z'
const s = 's_1' as SessionId
const c1 = 'c_1' as ContributionId
const pid = (n: string): ProposalId => n as ProposalId

const interpretedWith = (proposalIds: ProposalId[]): SessionEvent[] => [
  {
    v: 1,
    at,
    type: 'Contribution Interpreted',
    sessionId: s,
    contributionId: c1,
    tracks: proposalIds.map((proposalId) => ({
      track: 'propose-building-block',
      proposalId,
      blockKind: 'domain-event',
      label: `Block ${proposalId}`,
      bar: 'strict',
    })),
  },
]

const birth = (proposalId: ProposalId, label = `Block ${proposalId}`): ProposalEvent => ({
  v: 1,
  at,
  type: 'Building Block Proposed',
  proposalId,
  sessionId: s,
  contributionId: c1,
  blockKind: 'domain-event',
  label,
  bar: 'strict',
})

describe('proposalsView', () => {
  it('projects a freshly born proposal: PROPOSED, not held, not overflow, birth label', () => {
    const cards = proposalsView(interpretedWith([pid('p_1')]), [{ proposalId: pid('p_1'), events: [birth(pid('p_1'))] }])
    expect(cards).toEqual([
      {
        proposalId: 'p_1',
        contributionId: 'c_1',
        blockKind: 'domain-event',
        label: 'Block p_1',
        bar: 'strict',
        disposition: 'PROPOSED',
        held: false,
        overflow: false,
      },
    ])
  })

  it('reflects the latest edited label and the held marker', () => {
    const events: ProposalEvent[] = [
      birth(pid('p_1')),
      { v: 1, at, type: 'Proposal Edited', proposalId: pid('p_1'), label: 'Loan recorded' },
      { v: 1, at, type: 'Proposal Held', proposalId: pid('p_1') },
    ]
    const [card] = proposalsView(interpretedWith([pid('p_1')]), [{ proposalId: pid('p_1'), events }])
    expect(card?.label).toBe('Loan recorded')
    expect(card?.held).toBe(true)
    expect(card?.disposition).toBe('EDITED')
  })

  it('carries the APPLY_FAILED reason from Operation Rejected', () => {
    const events: ProposalEvent[] = [
      birth(pid('p_1')),
      {
        v: 1,
        at,
        type: 'Proposal Accepted',
        proposalId: pid('p_1'),
        accepter: 'Dana',
        buildingBlockId: 'bb_1' as BuildingBlockId,
      },
      { v: 1, at, type: 'Operation Rejected', proposalId: pid('p_1'), reason: 'unknown-target' },
    ]
    const [card] = proposalsView(interpretedWith([pid('p_1')]), [{ proposalId: pid('p_1'), events }])
    expect(card?.disposition).toBe('APPLY_FAILED')
    expect(card?.applyFailedReason).toBe('unknown-target')
  })

  it('groups the 8th+ proposal of one contribution as overflow (display cap of 7)', () => {
    const ids = Array.from({ length: 9 }, (_, i) => pid(`p_${String(i + 1)}`))
    const cards = proposalsView(
      interpretedWith(ids),
      ids.map((proposalId) => ({ proposalId, events: [birth(proposalId)] })),
    )
    expect(cards.map((c) => c.overflow)).toEqual([false, false, false, false, false, false, false, true, true])
  })
})
