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
})
