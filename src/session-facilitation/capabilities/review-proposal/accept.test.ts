import { beforeEach, describe, expect, it } from 'vitest'
import { createMemoryEventStore } from '~/plumbing/event-store/memory-store.ts'
import type { EventStore, StreamKey } from '~/plumbing/event-store/port.ts'
import type { BuildingBlockId, ProposalId, SessionId, WorkshopId } from '~/plumbing/ids.ts'
import { readBuildingBlocks } from '../../../domain-model-capture/api.ts'
import { ProposalEvent } from '../../domain/schema/events.ts'
import { proposalStream, sessionStream, workshopStream } from '../../infrastructure/streams.ts'
import { reviewProposalRoutes } from './http.ts'

const at = '2026-08-30T12:00:00.000Z'
const clock = () => at
const w = 'w_1' as WorkshopId
const s = 's_1' as SessionId
const boardStream: StreamKey = { context: 'domain-model-capture', aggregate: 'board', id: w }

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
  store.append(workshopStream(w), -1, [
    {
      at,
      opVersion: 1,
      operation: { v: 1, type: 'Workshop Started', workshopId: w, format: 'big-picture', creatorName: 'Dana', at },
    },
  ])
  store.append(sessionStream(s), -1, [
    { at, opVersion: 1, operation: { v: 1, type: 'Session Started', sessionId: s, workshopId: w, at } },
  ])
}

const seedProposal = (id: string, extra: ProposalEvent[] = []): void => {
  store.append(proposalStream(id as ProposalId), -1, [
    {
      at,
      opVersion: 1,
      operation: {
        v: 1,
        type: 'Building Block Proposed',
        proposalId: id,
        sessionId: s,
        contributionId: 'c_1',
        blockKind: 'domain-event',
        label: 'Book borrowed',
        bar: 'strict',
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
  store.read(proposalStream(id as ProposalId)).map((r) => (r.operation as { type: string }).type)

const accept = async (id: string): Promise<Response> =>
  routes().request(`/proposals/${id}/accept`, { method: 'POST' })

beforeEach(() => {
  appendStreams = []
  boardReads = 0
  store = recording(createMemoryEventStore())
  seedWorkshopAndSession()
})

describe('POST /proposals/:id/accept — the synchronous apply chain (S1-41…S1-47)', () => {
  it('applies the operation and the building block lands in the backlog', async () => {
    seedProposal('p_1')
    const res = await accept('p_1')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { boardPosition: number | null; proposal: { disposition: string } }

    expect(body.proposal.disposition).toBe('APPLIED')
    expect(body.boardPosition).toBe(0)
    expect(readBuildingBlocks(deps(), w)).toEqual([
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
      .map((r) => ProposalEvent.parse(r.operation))
      .find((e) => e.type === 'Proposal Accepted')
    expect(accepted?.type === 'Proposal Accepted' && accepted.accepter).toBe('Dana')
  })

  it('commits the two contexts in separate appends — never one transaction', async () => {
    seedProposal('p_1')
    await accept('p_1')

    const contexts = appendStreams.map((k) => k.context)
    expect(contexts).toContain('domain-model-capture')
    expect(contexts).toContain('session-facilitation')
    // every append call targets exactly one stream — the two contexts are never batched
    expect(new Set(appendStreams.map((k) => `${k.context}/${k.aggregate}/${k.id}`)).size).toBeGreaterThanOrEqual(2)
  })

  it('double-accept produces exactly one building block, reusing the stored id, without re-applying', async () => {
    seedProposal('p_1')
    const first = (await (await accept('p_1')).json()) as { proposal: { buildingBlockId?: string } }
    const boardReadsAfterFirst = boardReads
    const second = (await (await accept('p_1')).json()) as { proposal: { buildingBlockId?: string; disposition: string } }
    const boardReadsAfterSecond = boardReads

    expect(second.proposal.disposition).toBe('APPLIED')
    expect(second.proposal.buildingBlockId).toBe(first.proposal.buildingBlockId)
    expect(readBuildingBlocks(deps(), w)).toHaveLength(1)

    // S1-47: once APPLIED, the second accept returns the stored id and does NOT run
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

    const res = await accept('p_1')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { proposal: { disposition: string } }
    expect(body.proposal.disposition).toBe('APPLIED')
    expect(readBuildingBlocks(deps(), w)).toEqual([{ id: 'bb_1', kind: 'domain-event', label: 'Book borrowed' }])
  })
})
