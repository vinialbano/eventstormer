import { describe, expect, it } from 'vitest'
import type { BuildingBlockId, ContributionId, ProposalId, SessionId } from '~/plumbing/ids.ts'
import type { ProposalEvent, SessionEvent } from '../schema/events.ts'
import { proposalsView } from './proposals-view.ts'

const at = '2026-08-30T12:00:00.000Z'
const sessionId = 's_1' as SessionId
const c1 = 'c_1' as ContributionId
const pid = (value: string): ProposalId => value as ProposalId

const interpretedWith = (proposalIds: ProposalId[]): SessionEvent[] => [
  {
    v: 1,
    at,
    type: 'Contribution Interpreted',
    sessionId,
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
  sessionId,
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
        modelAffecting: true,
        disposition: 'PROPOSED',
        held: false,
        overflow: false,
      },
    ])
  })

  it('a hot-spot proposal carries its kind, and a Proposal Kind Set flips it', () => {
    const events: ProposalEvent[] = [
      {
        v: 1,
        at,
        type: 'Building Block Proposed',
        proposalId: pid('h_1'),
        sessionId,
        contributionId: c1,
        blockKind: 'hot-spot',
        label: 'Hot spot h_1',
        bar: 'strict',
        modelAffecting: true,
      },
      { v: 1, at, type: 'Proposal Kind Set', proposalId: pid('h_1'), modelAffecting: false },
    ]
    const [card] = proposalsView(interpretedWith([pid('h_1')]), [{ proposalId: pid('h_1'), events }])
    expect(card?.blockKind).toBe('hot-spot')
    expect(card?.modelAffecting).toBe(false)
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
    const ids = Array.from({ length: 9 }, (_, index) => pid(`p_${String(index + 1)}`))
    const cards = proposalsView(
      interpretedWith(ids),
      ids.map((proposalId) => ({ proposalId, events: [birth(proposalId)] })),
    )
    expect(cards.map((card) => card.overflow)).toEqual([false, false, false, false, false, false, false, true, true])
  })

  it('includes buildingBlockId once a proposal is accepted', () => {
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
    ]
    const [card] = proposalsView(interpretedWith([pid('p_1')]), [{ proposalId: pid('p_1'), events }])
    expect(card?.buildingBlockId).toBe('bb_1')
  })

  it('skips a proposal stream with no birth event', () => {
    const cards = proposalsView(interpretedWith([pid('p_1')]), [{ proposalId: pid('p_1'), events: [] }])
    expect(cards).toEqual([])
  })
})

describe('proposalsView — model-change intent card', () => {
  const bb = (value: string): BuildingBlockId => value as BuildingBlockId

  const interpretedWithTrack = (track: unknown): SessionEvent[] => [
    {
      v: 1,
      at,
      type: 'Contribution Interpreted',
      sessionId,
      contributionId: c1,
      tracks: [track as never],
    },
  ]

  const modelChangeBirth = (proposalId: ProposalId, intent: unknown): ProposalEvent => ({
    v: 1,
    at,
    type: 'Model Change Proposed',
    proposalId,
    sessionId,
    contributionId: c1,
    intent: intent as never,
  })

  const labels = new Map<string, string>([
    ['bb_a', 'Loan requested'],
    ['bb_b', 'Loan approved'],
  ])
  const resolveLabel = (id: BuildingBlockId): string | undefined => labels.get(id)

  it('renders a relation intent with endpoints resolved to current labels', () => {
    const [card] = proposalsView(
      interpretedWithTrack({
        track: 'propose-relation',
        proposalId: pid('p_1'),
        relationKind: 'sequence',
        predecessor: bb('bb_a'),
        successor: bb('bb_b'),
      }),
      [
        {
          proposalId: pid('p_1'),
          events: [
            modelChangeBirth(pid('p_1'), {
              kind: 'relation',
              relationKind: 'sequence',
              predecessor: bb('bb_a'),
              successor: bb('bb_b'),
            }),
          ],
        },
      ],
      resolveLabel,
    )
    expect(card?.intent).toEqual({
      kind: 'relation',
      summary: 'sequence: Loan requested → Loan approved',
      endpoints: [
        { id: 'bb_a', label: 'Loan requested' },
        { id: 'bb_b', label: 'Loan approved' },
      ],
    })
    expect(card?.blockKind).toBeUndefined()
  })

  it('renders a pivotal intent with the target label', () => {
    const [card] = proposalsView(
      interpretedWithTrack({
        track: 'propose-pivotal',
        proposalId: pid('p_1'),
        pivotalKind: 'mark-pivotal',
        target: bb('bb_b'),
        heldBack: false,
        eventLabel: 'Loan approved',
      }),
      [
        {
          proposalId: pid('p_1'),
          events: [
            modelChangeBirth(pid('p_1'), { kind: 'pivotal', pivotalKind: 'mark-pivotal', target: bb('bb_b') }),
          ],
        },
      ],
      resolveLabel,
    )
    expect(card?.intent).toEqual({
      kind: 'pivotal',
      summary: 'mark-pivotal: Loan approved',
      target: { id: 'bb_b', label: 'Loan approved' },
    })
  })

  it('renders a reword intent with the old and new label', () => {
    const [card] = proposalsView(
      interpretedWithTrack({
        track: 'propose-reword',
        proposalId: pid('p_1'),
        target: bb('bb_a'),
        newLabel: 'Loan application received',
        heldBack: false,
        targetLabel: 'Loan requested',
      }),
      [
        {
          proposalId: pid('p_1'),
          events: [
            modelChangeBirth(pid('p_1'), {
              kind: 'reword',
              target: bb('bb_a'),
              newLabel: 'Loan application received',
            }),
          ],
        },
      ],
      resolveLabel,
    )
    expect(card?.intent).toEqual({
      kind: 'reword',
      summary: 'reword: Loan requested → Loan application received',
      target: { id: 'bb_a', label: 'Loan requested' },
      newLabel: 'Loan application received',
    })
  })

  it('falls back to the endpoint id when a label cannot be resolved (withdrawn block)', () => {
    const [card] = proposalsView(
      interpretedWithTrack({
        track: 'propose-relation',
        proposalId: pid('p_1'),
        relationKind: 'sequence',
        predecessor: bb('bb_a'),
        successor: bb('bb_gone'),
      }),
      [
        {
          proposalId: pid('p_1'),
          events: [
            modelChangeBirth(pid('p_1'), {
              kind: 'relation',
              relationKind: 'sequence',
              predecessor: bb('bb_a'),
              successor: bb('bb_gone'),
            }),
          ],
        },
      ],
      resolveLabel,
    )
    expect(card?.intent?.endpoints).toEqual([
      { id: 'bb_a', label: 'Loan requested' },
      { id: 'bb_gone', label: 'bb_gone' },
    ])
  })

  it('reflects the last Model Change Edited over the birth intent', () => {
    const [card] = proposalsView(
      interpretedWithTrack({
        track: 'propose-relation',
        proposalId: pid('p_1'),
        relationKind: 'sequence',
        predecessor: bb('bb_a'),
        successor: bb('bb_b'),
      }),
      [
        {
          proposalId: pid('p_1'),
          events: [
            modelChangeBirth(pid('p_1'), {
              kind: 'relation',
              relationKind: 'sequence',
              predecessor: bb('bb_a'),
              successor: bb('bb_a'),
            }),
            { v: 1, at, type: 'Model Change Edited', proposalId: pid('p_1'), changed: { successor: bb('bb_b') } },
          ],
        },
      ],
      resolveLabel,
    )
    expect(card?.intent?.endpoints).toEqual([
      { id: 'bb_a', label: 'Loan requested' },
      { id: 'bb_b', label: 'Loan approved' },
    ])
  })
})
