import { beforeEach, describe, expect, it } from 'vitest'
import { createMemoryEventStore } from '~/plumbing/event-store/memory-store.ts'
import type { EventStore, StreamKey } from '~/plumbing/event-store/port.ts'
import type { BuildingBlockId, ProposalId, SessionId, WorkshopId } from '~/plumbing/ids.ts'
import { readBoardSnapshot, readBuildingBlocks } from '../../../domain-model-capture/api.ts'
import { ProposalEvent } from '../../domain/schema/events.ts'
import { proposalStream, sessionStream, workshopStream } from '../../infrastructure/streams.ts'
import { reviewProposalRoutes } from './http.ts'

const at = '2026-08-30T12:00:00.000Z'
const clock = () => at
const workshopId = 'w_1' as WorkshopId
const sessionId = 's_1' as SessionId
const boardStream: StreamKey = { context: 'domain-model-capture', aggregate: 'board', id: workshopId }

let store: EventStore
let appendStreams: StreamKey[]
let boardReads: number

const isBoard = (stream: StreamKey): boolean =>
  stream.context === 'domain-model-capture' && stream.aggregate === 'board'

const recording = (inner: EventStore): EventStore => ({
  read: (stream) => {
    if (isBoard(stream)) boardReads += 1
    return inner.read(stream)
  },
  append: (stream, expected, ops) => {
    appendStreams.push(stream)
    return inner.append(stream, expected, ops)
  },
})

const deps = () => ({ store, clock })
const routes = () => reviewProposalRoutes(deps())

const seedWorkshopAndSession = (): void => {
  store.append(workshopStream(workshopId), -1, [
    {
      at,
      opVersion: 1,
      operation: { v: 1, type: 'Workshop Started', workshopId, format: 'big-picture', creatorName: 'Dana', at },
    },
  ])
  store.append(sessionStream(sessionId), -1, [
    { at, opVersion: 1, operation: { v: 1, type: 'Session Started', sessionId, workshopId, at } },
  ])
}

type BirthOverrides = Partial<{
  blockKind: 'domain-event' | 'actor' | 'system' | 'hot-spot'
  label: string
  contributionId: string
  modelAffecting: boolean
  annotatesTargetId: string
}>

const seedProposal = (id: string, extra: ProposalEvent[] = [], birth: BirthOverrides = {}): void => {
  store.append(proposalStream(id as ProposalId), -1, [
    {
      at,
      opVersion: 1,
      operation: {
        v: 1,
        type: 'Building Block Proposed',
        proposalId: id,
        sessionId,
        contributionId: birth.contributionId ?? 'c_1',
        blockKind: birth.blockKind ?? 'domain-event',
        label: birth.label ?? 'Book borrowed',
        bar: 'strict',
        ...(birth.modelAffecting === undefined ? {} : { modelAffecting: birth.modelAffecting }),
        ...(birth.annotatesTargetId === undefined
          ? {}
          : { annotatesTargetId: birth.annotatesTargetId }),
        at,
      },
    },
  ])
  if (extra.length > 0) {
    store.append(
      proposalStream(id as ProposalId),
      0,
      extra.map((operation) => ({ at, opVersion: 1, operation })),
    )
  }
}

const author = { proposer: { name: 'facilitator' }, accepter: { name: 'Dana' } }

type Intent =
  | {
      kind: 'relation'
      relationKind: 'sequence' | 'insert-between' | 'place' | 'unplace' | 'link-cause' | 'unlink-cause'
      predecessor?: string
      successor?: string
      inserted?: string
      cause?: string
      effect?: string
      target?: string
    }
  | { kind: 'pivotal'; pivotalKind: 'mark-pivotal' | 'unmark-pivotal'; target: string }
  | { kind: 'reword'; target: string; newLabel: string }

const seedModelChange = (id: string, intent: Intent, extra: ProposalEvent[] = []): void => {
  store.append(proposalStream(id as ProposalId), -1, [
    {
      at,
      opVersion: 1,
      operation: {
        v: 1,
        type: 'Model Change Proposed',
        proposalId: id,
        sessionId,
        contributionId: 'c_1',
        intent,
        at,
      },
    },
  ])
  if (extra.length > 0) {
    store.append(
      proposalStream(id as ProposalId),
      0,
      extra.map((operation) => ({ at, opVersion: 1, operation })),
    )
  }
}

const seedBoardOp = (operation: Record<string, unknown>): void => {
  store.append(boardStream, store.read(boardStream).length - 1, [{ at, opVersion: 1, operation }])
}

const seedBoardActor = (id: string, label: string): void => {
  seedBoardOp({ v: 1, kind: 'identify-actor', id, label, author })
}

const closeSession = (): void => {
  store.append(sessionStream(sessionId), store.read(sessionStream(sessionId)).length - 1, [
    {
      at,
      opVersion: 1,
      operation: { v: 1, type: 'Session Closed', sessionId, workshopId, unresolvedQuestionIds: [], at },
    },
  ])
}

const follows = () => readBoardSnapshot(deps(), workshopId).follows
const blockById = (id: string) =>
  readBoardSnapshot(deps(), workshopId).blocks.find((block) => block.id === id)

const proposalTypes = (id: string): string[] =>
  store.read(proposalStream(id as ProposalId)).map((row) => (row.operation as { type: string }).type)

const accept = async (id: string): Promise<Response> =>
  routes().request(`/proposals/${id}/accept`, { method: 'POST' })

const reject = async (id: string): Promise<Response> =>
  routes().request(`/proposals/${id}/reject`, { method: 'POST' })

const seedBoardBlock = (id: string, label: string): void => {
  store.append(boardStream, store.read(boardStream).length - 1, [
    {
      at,
      opVersion: 1,
      operation: {
        v: 1,
        kind: 'capture-domain-event',
        id,
        label,
        author: { proposer: { name: 'facilitator' }, accepter: { name: 'Dana' } },
      },
    },
  ])
}

const hotSpotBlock = (label: string) =>
  readBoardSnapshot(deps(), workshopId).blocks.find(
    (block) => block.kind === 'hot-spot' && block.label === label,
  )

beforeEach(() => {
  appendStreams = []
  boardReads = 0
  store = recording(createMemoryEventStore())
  seedWorkshopAndSession()
})

describe('POST /proposals/:id/accept — the synchronous apply chain', () => {
  it('applies the operation and the building block lands in the backlog', async () => {
    seedProposal('p_1')
    const response = await accept('p_1')
    expect(response.status).toBe(200)
    const body = (await response.json()) as { boardPosition: number | null; proposal: { disposition: string } }

    expect(body.proposal.disposition).toBe('APPLIED')
    expect(body.boardPosition).toBe(0)
    expect(readBuildingBlocks(deps(), workshopId)).toEqual([
      { id: expect.any(String) as string, kind: 'domain-event', label: 'Book borrowed' },
    ])
    expect(proposalTypes('p_1')).toEqual(['Building Block Proposed', 'Proposal Accepted', 'Operation Applied'])
  })

  it('records the facilitator as proposer and the workshop creator as accepter', async () => {
    seedProposal('p_1')
    await accept('p_1')

    const boardOp = store.read(boardStream)[0]?.operation as { author: unknown }
    expect(boardOp.author).toEqual({ proposer: { name: 'facilitator' }, accepter: { name: 'Dana' } })

    const accepted = store
      .read(proposalStream('p_1' as ProposalId))
      .map((row) => ProposalEvent.parse(row.operation))
      .find((event) => event.type === 'Proposal Accepted')
    expect(accepted?.type === 'Proposal Accepted' && accepted.accepter).toBe('Dana')
  })

  it('commits the two contexts in separate appends — never one transaction', async () => {
    seedProposal('p_1')
    await accept('p_1')

    const contexts = appendStreams.map((streamKey) => streamKey.context)
    expect(contexts).toContain('domain-model-capture')
    expect(contexts).toContain('session-facilitation')
    // every append call targets exactly one stream — the two contexts are never batched
    expect(new Set(appendStreams.map((streamKey) => `${streamKey.context}/${streamKey.aggregate}/${streamKey.id}`)).size).toBeGreaterThanOrEqual(2)
  })

  it('double-accept produces exactly one building block, reusing the stored id, without re-applying', async () => {
    seedProposal('p_1')
    const first = (await (await accept('p_1')).json()) as { proposal: { buildingBlockId?: string } }
    const boardReadsAfterFirst = boardReads
    const second = (await (await accept('p_1')).json()) as { proposal: { buildingBlockId?: string; disposition: string } }
    const boardReadsAfterSecond = boardReads

    expect(second.proposal.disposition).toBe('APPLIED')
    expect(second.proposal.buildingBlockId).toBe(first.proposal.buildingBlockId)
    expect(readBuildingBlocks(deps(), workshopId)).toHaveLength(1)

    // once APPLIED, the second accept returns the stored id and does NOT run
    // the apply chain again. applyOperation is the only reader of the board stream on
    // this path, so its read count must not move across the second accept.
    expect(boardReadsAfterFirst).toBeGreaterThan(0)
    expect(boardReadsAfterSecond).toBe(boardReadsAfterFirst)
  })

  it('an APPLY_FAILED proposal is re-acceptable and applies on retry', async () => {
    seedProposal('p_1', [
      { v: 1, at, type: 'Proposal Accepted', proposalId: 'p_1' as ProposalId, accepter: 'Dana', buildingBlockId: 'bb_1' as BuildingBlockId },
      { v: 1, at, type: 'Operation Rejected', proposalId: 'p_1' as ProposalId, reason: 'unknown-target' },
    ])

    const response = await accept('p_1')
    expect(response.status).toBe(200)
    const body = (await response.json()) as { proposal: { disposition: string } }
    expect(body.proposal.disposition).toBe('APPLIED')
    expect(readBuildingBlocks(deps(), workshopId)).toEqual([{ id: 'bb_1', kind: 'domain-event', label: 'Book borrowed' }])
  })

  it('returns 404 unknown-proposal when the proposal id has no stream', async () => {
    const response = await accept('no-such')
    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: 'unknown-proposal' })
  })

  it('returns 409 and leaves the board empty when the proposal is already rejected', async () => {
    seedProposal('p_1', [{ v: 1, at, type: 'Proposal Rejected', proposalId: 'p_1' as ProposalId }])

    const response = await accept('p_1')
    expect(response.status).toBe(409)
    expect(readBuildingBlocks(deps(), workshopId)).toEqual([])
  })
})

describe('POST /proposals/:id/accept — hot-spot proposals', () => {
  it('applies raise-hot-spot and the follow-on annotate — indistinguishable from a direct flag', async () => {
    seedBoardBlock('bb_target', 'Refund issued')
    seedProposal('p_1', [], {
      blockKind: 'hot-spot',
      label: 'Refund policy is disputed',
      modelAffecting: false,
      annotatesTargetId: 'bb_target',
    })

    const response = await accept('p_1')
    expect(response.status).toBe(200)
    const body = (await response.json()) as { proposal: { disposition: string } }
    expect(body.proposal.disposition).toBe('APPLIED')

    const block = hotSpotBlock('Refund policy is disputed')
    expect(block?.annotates).toBe('bb_target')
    expect(block?.modelAffecting).toBe(false)
    expect(block?.resolved).toBe(false)
    expect(readBoardSnapshot(deps(), workshopId).hotSpotCount).toBe(1)
  })

  it('carries modelAffecting from the last Proposal Kind Set over the birth default', async () => {
    seedProposal('p_1', [
      { v: 1, at, type: 'Proposal Kind Set', proposalId: 'p_1' as ProposalId, modelAffecting: false },
    ], { blockKind: 'hot-spot', label: 'Team is unsure who owns refunds' })

    await accept('p_1')
    expect(hotSpotBlock('Team is unsure who owns refunds')?.modelAffecting).toBe(false)
  })

  it('leaves the hot spot unannotated and still APPLIED when the follow-on annotate is rejected', async () => {
    seedProposal('p_1', [], {
      blockKind: 'hot-spot',
      label: 'Dangling hot spot',
      annotatesTargetId: 'bb_missing',
    })

    const response = await accept('p_1')
    const body = (await response.json()) as { proposal: { disposition: string } }
    expect(body.proposal.disposition).toBe('APPLIED')

    const block = hotSpotBlock('Dangling hot spot')
    expect(block).toBeDefined()
    expect(block?.annotates).toBeNull()
  })

  it('a hot-spot proposal and a building-block proposal on one contribution are independent — rejecting one leaves the other', async () => {
    seedProposal('p_hot', [], { blockKind: 'hot-spot', label: 'Pricing is contested', contributionId: 'c_9' })
    seedProposal('p_block', [], { label: 'Order placed', contributionId: 'c_9' })

    expect((await reject('p_hot')).status).toBe(200)
    expect((await accept('p_block')).status).toBe(200)

    expect(proposalTypes('p_hot')).toEqual(['Building Block Proposed', 'Proposal Rejected'])
    expect(readBuildingBlocks(deps(), workshopId)).toEqual([
      { id: expect.any(String) as string, kind: 'domain-event', label: 'Order placed' },
    ])
    expect(readBoardSnapshot(deps(), workshopId).hotSpotCount).toBe(0)
  })

  it('rejects a late accept onto a closed session with 409 session-closed, board untouched', async () => {
    seedProposal('p_1')
    closeSession()

    const response = await accept('p_1')
    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({ error: 'session-closed' })
    expect(readBuildingBlocks(deps(), workshopId)).toEqual([])
    expect(proposalTypes('p_1')).toEqual(['Building Block Proposed'])
  })
})

describe('POST /proposals/:id/accept — model-change proposals', () => {
  it('accepting a sequence proposal applies the follows edge', async () => {
    seedBoardBlock('bb_a', 'A')
    seedBoardBlock('bb_b', 'B')
    seedModelChange('p_seq', {
      kind: 'relation',
      relationKind: 'sequence',
      predecessor: 'bb_a',
      successor: 'bb_b',
    })

    const body = (await (await accept('p_seq')).json()) as { proposal: { disposition: string } }
    expect(body.proposal.disposition).toBe('APPLIED')
    expect(follows()).toEqual([{ predecessor: 'bb_a', successor: 'bb_b' }])
    expect(proposalTypes('p_seq')).toEqual(['Model Change Proposed', 'Proposal Accepted', 'Operation Applied'])
  })

  it('accepting a link-cause proposal applies the causedBy edge', async () => {
    seedBoardActor('bb_clerk', 'Clerk')
    seedBoardBlock('bb_e', 'Loan recorded')
    seedModelChange('p_lc', {
      kind: 'relation',
      relationKind: 'link-cause',
      cause: 'bb_clerk',
      effect: 'bb_e',
    })

    await accept('p_lc')
    expect(readBoardSnapshot(deps(), workshopId).causedBy).toEqual([{ cause: 'bb_clerk', effect: 'bb_e' }])
  })

  it('accepting a mark-pivotal proposal marks the target pivotal', async () => {
    seedBoardBlock('bb_p', 'Milestone')
    seedModelChange('p_mp', { kind: 'pivotal', pivotalKind: 'mark-pivotal', target: 'bb_p' })

    await accept('p_mp')
    expect(blockById('bb_p')?.pivotal).toBe(true)
  })

  it('accepting a reword proposal changes the block label', async () => {
    seedBoardBlock('bb_r', 'Old label')
    seedModelChange('p_rw', { kind: 'reword', target: 'bb_r', newLabel: 'New label' })

    await accept('p_rw')
    expect(blockById('bb_r')?.label).toBe('New label')
  })

  it('applies the last Model Change Edited over the birth intent', async () => {
    seedBoardBlock('bb_r', 'Old label')
    seedModelChange('p_rw', { kind: 'reword', target: 'bb_r', newLabel: 'First' }, [
      { v: 1, at, type: 'Model Change Edited', proposalId: 'p_rw' as ProposalId, changed: { newLabel: 'Edited' } },
    ])

    await accept('p_rw')
    expect(blockById('bb_r')?.label).toBe('Edited')
  })

  it('rejecting a model-change proposal leaves the board unchanged and the proposal REJECTED', async () => {
    seedBoardBlock('bb_a', 'A')
    seedBoardBlock('bb_b', 'B')
    seedModelChange('p_x', {
      kind: 'relation',
      relationKind: 'sequence',
      predecessor: 'bb_a',
      successor: 'bb_b',
    })

    expect((await reject('p_x')).status).toBe(200)
    expect(proposalTypes('p_x')).toEqual(['Model Change Proposed', 'Proposal Rejected'])
    expect(follows()).toEqual([])
  })

  it('a planted cycle is APPLY_FAILED and surfaced, with the pre-existing edge intact', async () => {
    seedBoardBlock('bb_a', 'A')
    seedBoardBlock('bb_b', 'B')
    seedBoardOp({ v: 1, kind: 'sequence', predecessor: 'bb_a', successor: 'bb_b', author })
    seedModelChange('p_cyc', {
      kind: 'relation',
      relationKind: 'sequence',
      predecessor: 'bb_b',
      successor: 'bb_a',
    })

    const body = (await (await accept('p_cyc')).json()) as {
      proposal: { disposition: string; applyFailedReason?: string }
    }
    expect(body.proposal.disposition).toBe('APPLY_FAILED')
    expect(body.proposal.applyFailedReason).toBe('cycle')
    expect(follows()).toEqual([{ predecessor: 'bb_a', successor: 'bb_b' }])
  })

  it('an insert-between with no existing edge is APPLY_FAILED', async () => {
    seedBoardBlock('bb_a', 'A')
    seedBoardBlock('bb_b', 'B')
    seedBoardBlock('bb_c', 'C')
    seedModelChange('p_ib', {
      kind: 'relation',
      relationKind: 'insert-between',
      predecessor: 'bb_a',
      inserted: 'bb_c',
      successor: 'bb_b',
    })

    const body = (await (await accept('p_ib')).json()) as {
      proposal: { disposition: string; applyFailedReason?: string }
    }
    expect(body.proposal.disposition).toBe('APPLY_FAILED')
    expect(body.proposal.applyFailedReason).toBe('missing-edge')
  })

  it('re-accepting an already-applied relation proposal converges to APPLIED with one edge', async () => {
    seedBoardBlock('bb_a', 'A')
    seedBoardBlock('bb_b', 'B')
    seedModelChange('p_seq', {
      kind: 'relation',
      relationKind: 'sequence',
      predecessor: 'bb_a',
      successor: 'bb_b',
    })

    await accept('p_seq')
    const body = (await (await accept('p_seq')).json()) as { proposal: { disposition: string } }
    expect(body.proposal.disposition).toBe('APPLIED')
    expect(follows()).toHaveLength(1)
  })

  it('a second competing track for the same pair accepts as APPLIED, no duplicate edge', async () => {
    seedBoardBlock('bb_a', 'A')
    seedBoardBlock('bb_b', 'B')
    const intent = {
      kind: 'relation' as const,
      relationKind: 'sequence' as const,
      predecessor: 'bb_a',
      successor: 'bb_b',
    }
    seedModelChange('p_1', intent)
    seedModelChange('p_2', intent)

    await accept('p_1')
    const body = (await (await accept('p_2')).json()) as { proposal: { disposition: string } }
    expect(body.proposal.disposition).toBe('APPLIED')
    expect(follows()).toHaveLength(1)
    expect(proposalTypes('p_2')).toEqual(['Model Change Proposed', 'Proposal Accepted', 'Operation Applied'])
  })

  it('recovers the crash window: edge on the board, outcome commit lost, re-accept → APPLIED', async () => {
    seedBoardBlock('bb_a', 'A')
    seedBoardBlock('bb_b', 'B')
    seedBoardOp({ v: 1, kind: 'sequence', predecessor: 'bb_a', successor: 'bb_b', author })
    seedModelChange(
      'p_cw',
      { kind: 'relation', relationKind: 'sequence', predecessor: 'bb_a', successor: 'bb_b' },
      [{ v: 1, at, type: 'Proposal Accepted', proposalId: 'p_cw' as ProposalId, accepter: 'Dana' }],
    )

    const body = (await (await accept('p_cw')).json()) as { proposal: { disposition: string } }
    expect(body.proposal.disposition).toBe('APPLIED')
    expect(follows()).toHaveLength(1)
  })

  it('rejects a late model-change accept onto a closed session, leaving it re-lapsable', async () => {
    seedBoardBlock('bb_a', 'A')
    seedBoardBlock('bb_b', 'B')
    seedModelChange('p_cl', {
      kind: 'relation',
      relationKind: 'sequence',
      predecessor: 'bb_a',
      successor: 'bb_b',
    })
    closeSession()

    const response = await accept('p_cl')
    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({ error: 'session-closed' })
    expect(follows()).toEqual([])
    expect(proposalTypes('p_cl')).toEqual(['Model Change Proposed'])
  })
})
