import { describe, expect, it } from 'vitest'
import type {
  BuildingBlockId,
  ContributionId,
  ProposalId,
  ResolutionId,
  SessionId,
  WorkshopId,
} from '~/plumbing/ids.ts'
import type { ProposalEvent, ResolutionEvent, SessionEvent } from '../schema/events.ts'
import { SessionTranscript } from './session-transcript-contract.ts'
import { sessionTranscript } from './session-transcript.ts'

const at = '2026-08-30T12:00:00.000Z'
const sessionId = 's_1' as SessionId
const workshopId = 'w_1' as WorkshopId
const cid = (value: string) => value as ContributionId
const pid = (value: string) => value as ProposalId
const bb = (value: string) => value as BuildingBlockId
const rid = (value: string) => value as ResolutionId

const contribution = (id: string, speaker: string, body: string): SessionEvent => ({
  v: 1,
  at,
  type: 'Contribution Made',
  sessionId,
  contributionId: cid(id),
  speaker,
  body,
  source: 'typed',
})

const sessionEvents: SessionEvent[] = [
  { v: 1, at, type: 'Session Started', sessionId, workshopId },
  contribution('c_1', 'Dana', 'A member borrowed a book.'),
  {
    v: 1,
    at,
    type: 'Question Asked',
    sessionId,
    questionId: 'q_1' as never,
    kind: 'free',
    text: 'When was it returned?',
  },
  contribution('c_2', 'Eli', 'The clerk logged the loan.'),
  {
    v: 1,
    at,
    type: 'Contribution Interpreted',
    sessionId,
    contributionId: cid('c_1'),
    tracks: [
      { track: 'propose-building-block', proposalId: pid('p_1'), blockKind: 'domain-event', label: 'Loan recorded', bar: 'strict' },
      { track: 'propose-building-block', proposalId: pid('p_2'), blockKind: 'domain-event', label: 'Book shelved', bar: 'strict' },
    ],
  },
  {
    v: 1,
    at,
    type: 'Contribution Interpreted',
    sessionId,
    contributionId: cid('c_2'),
    tracks: [
      { track: 'propose-relation', proposalId: pid('p_3'), relationKind: 'link-cause', cause: bb('bb_clerk'), effect: bb('bb_1') },
      { track: 'propose-building-block', proposalId: pid('p_4'), blockKind: 'actor', label: 'Clerk', bar: 'strict' },
      { track: 'propose-reword', newLabel: 'Loan registered', heldBack: true, targetLabel: 'Loan recorded' },
    ],
  },
]

// p_1 (Dana): proposed -> accepted -> applied
const p1: ProposalEvent[] = [
  { v: 1, at, type: 'Building Block Proposed', proposalId: pid('p_1'), sessionId, contributionId: cid('c_1'), blockKind: 'domain-event', label: 'Loan recorded', bar: 'strict' },
  { v: 1, at, type: 'Proposal Accepted', proposalId: pid('p_1'), accepter: 'Dana', buildingBlockId: bb('bb_1') },
  { v: 1, at, type: 'Operation Applied', proposalId: pid('p_1'), resultingBuildingBlockId: bb('bb_1') },
]
// p_2 (Dana): proposed -> edited -> rejected
const p2: ProposalEvent[] = [
  { v: 1, at, type: 'Building Block Proposed', proposalId: pid('p_2'), sessionId, contributionId: cid('c_1'), blockKind: 'domain-event', label: 'Book shelved', bar: 'strict' },
  { v: 1, at, type: 'Proposal Edited', proposalId: pid('p_2'), label: 'Book returned to shelf' },
  { v: 1, at, type: 'Proposal Rejected', proposalId: pid('p_2') },
]
// p_3 (Eli): model change proposed -> accepted -> apply-failed
const p3: ProposalEvent[] = [
  { v: 1, at, type: 'Model Change Proposed', proposalId: pid('p_3'), sessionId, contributionId: cid('c_2'), intent: { kind: 'relation', relationKind: 'link-cause', cause: bb('bb_clerk'), effect: bb('bb_1') } },
  { v: 1, at, type: 'Proposal Accepted', proposalId: pid('p_3'), accepter: 'Eli' },
  { v: 1, at, type: 'Operation Rejected', proposalId: pid('p_3'), reason: 'cycle' },
]
// p_4 (Eli): proposed -> lapsed
const p4: ProposalEvent[] = [
  { v: 1, at, type: 'Building Block Proposed', proposalId: pid('p_4'), sessionId, contributionId: cid('c_2'), blockKind: 'actor', label: 'Clerk', bar: 'strict' },
  { v: 1, at, type: 'Proposal Lapsed', proposalId: pid('p_4'), cause: 'undisposed' },
]

const streams = [
  { proposalId: pid('p_1'), events: p1 },
  { proposalId: pid('p_2'), events: p2 },
  { proposalId: pid('p_3'), events: p3 },
  { proposalId: pid('p_4'), events: p4 },
]

const labels = new Map<string, string>([
  ['bb_clerk', 'Clerk'],
  ['bb_1', 'Loan recorded'],
])

const build = (resolutionStreams: { resolutionId: ResolutionId; events: ResolutionEvent[] }[] = []) =>
  sessionTranscript(sessionEvents, streams, resolutionStreams, {
    scope: 'Library lending',
    resolveLabel: (id) => labels.get(id),
  })

describe('sessionTranscript', () => {
  it('states format, scope, and the session-record position stamp', () => {
    const transcript = build()
    expect(transcript.format).toBe('big-picture')
    expect(transcript.scope).toBe('Library lending')
    expect(transcript.position).toBe(sessionEvents.length)
  })

  it('reproduces every turn in order — contributions, questions, and held-back notices', () => {
    const transcript = build()
    expect(transcript.turns.map((turn) => turn.kind)).toEqual([
      'contribution',
      'question',
      'contribution',
      'notice',
    ])
    expect(transcript.turns[0]?.text).toBe('A member borrowed a book.')
    expect(transcript.turns[1]?.text).toBe('When was it returned?')
    expect(transcript.turns[3]).toMatchObject({
      kind: 'notice',
      speaker: 'facilitator',
      text: 'Reword of "Loan recorded" held until the model has structure',
      proposals: [],
    })
  })

  it('annotates each contribution turn with its proposals, disposition, and resulting block', () => {
    const transcript = build()
    expect(transcript.turns[0]?.proposals).toEqual([
      { summary: 'Loan recorded', disposition: 'applied', resultingBuildingBlockId: 'bb_1' },
      { summary: 'Book returned to shelf', disposition: 'rejected', resultingBuildingBlockId: null },
    ])
    expect(transcript.turns[2]?.proposals).toEqual([
      { summary: 'link-cause: Clerk → Loan recorded', disposition: 'apply-failed', resultingBuildingBlockId: null },
      { summary: 'Clerk', disposition: 'lapsed', resultingBuildingBlockId: null },
    ])
  })

  it('counts accepted / edited / rejected proposals per contributor, speaker ascending', () => {
    expect(build().contributorCounts).toEqual([
      { speaker: 'Dana', accepted: 1, edited: 1, rejected: 1 },
      { speaker: 'Eli', accepted: 1, edited: 0, rejected: 0 },
    ])
  })

  it('a held-back track contributes to no count', () => {
    // The held reword names "Loan recorded"; only p_1..p_4 feed the counts —
    // Dana 1+1+1, Eli 1+0+0.
    const total = build().contributorCounts.reduce(
      (sum, row) => sum + row.accepted + row.edited + row.rejected,
      0,
    )
    expect(total).toBe(4)
  })

  it('satisfies the SessionTranscript contract', () => {
    expect(() => SessionTranscript.parse(build())).not.toThrow()
  })

  it('produces an empty resolutions lane when the session proposed no resolutions', () => {
    expect(build().resolutions).toEqual([])
  })
})

describe('sessionTranscript — resolution lane', () => {
  const resolutionSessionEvents: SessionEvent[] = [
    { v: 1, at, type: 'Session Started', sessionId, workshopId },
    {
      v: 1,
      at,
      type: 'Contribution Interpreted',
      sessionId,
      contributionId: cid('c_r'),
      tracks: [
        { track: 'propose-resolution', resolutionId: rid('r_1'), hotSpotId: bb('h_1'), reference: 'added a retry with backoff' },
        { track: 'propose-resolution', resolutionId: rid('r_2'), hotSpotId: bb('h_2'), reference: 'switched to a queue' },
        { track: 'propose-resolution', resolutionId: rid('r_3'), hotSpotId: bb('h_3'), reference: 'capped batch size' },
      ],
    },
  ]

  const applied: ResolutionEvent[] = [
    { v: 1, at, type: 'Resolution Proposed', resolutionId: rid('r_1'), sessionId, contributionId: cid('c_r'), hotSpotId: bb('h_1'), reference: 'added a retry with backoff' },
    { v: 1, at, type: 'Resolution Accepted', resolutionId: rid('r_1'), accepter: 'Dana' },
    { v: 1, at, type: 'Hot Spot Resolved', resolutionId: rid('r_1') },
  ]
  const lapsed: ResolutionEvent[] = [
    { v: 1, at, type: 'Resolution Proposed', resolutionId: rid('r_2'), sessionId, contributionId: cid('c_r'), hotSpotId: bb('h_2'), reference: 'switched to a queue' },
    { v: 1, at, type: 'Resolution Accepted', resolutionId: rid('r_2'), accepter: 'Dana' },
    { v: 1, at, type: 'Hot Spot Resolution Rejected', resolutionId: rid('r_2'), reason: 'unknown-target' },
  ]
  const superseded: ResolutionEvent[] = [
    { v: 1, at, type: 'Resolution Proposed', resolutionId: rid('r_3'), sessionId, contributionId: cid('c_r'), hotSpotId: bb('h_3'), reference: 'capped batch size' },
    { v: 1, at, type: 'Resolution Accepted', resolutionId: rid('r_3'), accepter: 'Dana' },
    { v: 1, at, type: 'Resolution Superseded', resolutionId: rid('r_3'), hotSpotId: bb('h_3'), supersededByReference: 'rate-limited the producer' },
  ]

  const resolutionStreams = [
    { resolutionId: rid('r_1'), events: applied },
    { resolutionId: rid('r_2'), events: lapsed },
    { resolutionId: rid('r_3'), events: superseded },
  ]

  it('produces one entry per propose-resolution track with the right disposition', () => {
    const transcript = sessionTranscript(resolutionSessionEvents, [], resolutionStreams, {
      scope: 'Library lending',
    })
    expect(transcript.resolutions).toEqual([
      { resolutionId: 'r_1', hotSpotId: 'h_1', reference: 'added a retry with backoff', disposition: 'applied' },
      { resolutionId: 'r_2', hotSpotId: 'h_2', reference: 'switched to a queue', disposition: 'lapsed' },
      {
        resolutionId: 'r_3',
        hotSpotId: 'h_3',
        reference: 'capped batch size',
        disposition: 'superseded',
        supersededByReference: 'rate-limited the producer',
      },
    ])
  })
})
