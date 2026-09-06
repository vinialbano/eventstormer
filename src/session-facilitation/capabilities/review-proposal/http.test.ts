import { beforeEach, describe, expect, it } from 'vitest'
import { createMemoryEventStore } from '~/plumbing/event-store/memory-store.ts'
import type { EventStore } from '~/plumbing/event-store/port.ts'
import type { ContributionId, ProposalId, SessionId } from '~/plumbing/ids.ts'
import { readBoardSnapshot } from '../../../domain-model-capture/api.ts'
import { ProposalEvent } from '../../domain/schema/events.ts'
import { proposalStream, sessionStream, workshopStream } from '../../infrastructure/streams.ts'
import { reviewProposalRoutes } from './http.ts'

const at = '2026-08-30T12:00:00.000Z'
const clock = () => at
const sessionId = 's_1' as SessionId
const c1 = 'c_1' as ContributionId

let store: EventStore

const routes = () => reviewProposalRoutes({ store, clock })

const seedProposal = (id: string, label = `Block ${id}`): void => {
  store.append(proposalStream(id as ProposalId), -1, [
    {
      at,
      opVersion: 1,
      operation: {
        v: 1,
        type: 'Building Block Proposed',
        proposalId: id,
        sessionId,
        contributionId: c1,
        blockKind: 'domain-event',
        label,
        bar: 'strict',
        at,
      },
    },
  ])
}

const seedHotSpotProposal = (id: string): void => {
  store.append(proposalStream(id as ProposalId), -1, [
    {
      at,
      opVersion: 1,
      operation: {
        v: 1,
        type: 'Building Block Proposed',
        proposalId: id,
        sessionId,
        contributionId: c1,
        blockKind: 'hot-spot',
        label: `Hot spot ${id}`,
        bar: 'strict',
        at,
      },
    },
  ])
}

const proposalTypes = (id: string): string[] =>
  store.read(proposalStream(id as ProposalId)).map((row) => (row.operation as { type: string }).type)

const post = async (path: string, body: unknown = {}): Promise<Response> =>
  routes().request(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

beforeEach(() => {
  store = createMemoryEventStore()
})

describe('POST /proposals/:id/{edit,reject,hold,unhold}', () => {
  it('edit → 200 and a Proposal Edited event with the new label', async () => {
    seedProposal('p_1')
    const response = await post('/proposals/p_1/edit', { label: 'Loan recorded' })
    expect(response.status).toBe(200)
    const edited = store
      .read(proposalStream('p_1' as ProposalId))
      .map((row) => ProposalEvent.parse(row.operation))
      .find((event) => event.type === 'Proposal Edited')
    expect(edited?.type === 'Proposal Edited' && edited.label).toBe('Loan recorded')
  })

  it('reject → 200, REJECTED, and nothing else appended', async () => {
    seedProposal('p_1')
    await post('/proposals/p_1/reject')
    expect(proposalTypes('p_1')).toEqual(['Building Block Proposed', 'Proposal Rejected'])
  })

  it('hold then unhold is reversible', async () => {
    seedProposal('p_1')
    await post('/proposals/p_1/hold')
    await post('/proposals/p_1/unhold')
    expect(proposalTypes('p_1')).toEqual(['Building Block Proposed', 'Proposal Held', 'Proposal Unheld'])
  })

  it('edit after reject → 409 (bad transition), no further event', async () => {
    seedProposal('p_1')
    await post('/proposals/p_1/reject')
    const response = await post('/proposals/p_1/edit', { label: 'too late' })
    expect(response.status).toBe(409)
    expect(proposalTypes('p_1')).toEqual(['Building Block Proposed', 'Proposal Rejected'])
  })

  it('unknown proposal → 404', async () => {
    const response = await post('/proposals/p_missing/reject')
    expect(response.status).toBe(404)
  })

  it('edit with a label longer than 200 characters → 400', async () => {
    seedProposal('p_1')
    const response = await post('/proposals/p_1/edit', { label: 'x'.repeat(201) })
    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'label-too-long' })
    expect(proposalTypes('p_1')).toEqual(['Building Block Proposed'])
  })

  it('edit with a malformed body → 400', async () => {
    seedProposal('p_1')
    const response = await routes().request('/proposals/p_1/edit', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ notLabel: 'Loan recorded' }),
    })
    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'invalid-body' })
    expect(proposalTypes('p_1')).toEqual(['Building Block Proposed'])
  })
})

describe('POST /proposals/:id/kind', () => {
  it('flips a hot-spot proposal to informational → 200 and a Proposal Kind Set event', async () => {
    seedHotSpotProposal('p_1')
    const response = await post('/proposals/p_1/kind', { modelAffecting: false })
    expect(response.status).toBe(200)
    const set = store
      .read(proposalStream('p_1' as ProposalId))
      .map((row) => ProposalEvent.parse(row.operation))
      .find((event) => event.type === 'Proposal Kind Set')
    expect(set?.type === 'Proposal Kind Set' && set.modelAffecting).toBe(false)
  })

  it('flipping to the value it already has → 200 and no event appended', async () => {
    seedHotSpotProposal('p_1')
    const response = await post('/proposals/p_1/kind', { modelAffecting: true })
    expect(response.status).toBe(200)
    expect(proposalTypes('p_1')).toEqual(['Building Block Proposed'])
  })

  it('kind after reject → 409 and no further event', async () => {
    seedHotSpotProposal('p_1')
    await post('/proposals/p_1/reject')
    const response = await post('/proposals/p_1/kind', { modelAffecting: false })
    expect(response.status).toBe(409)
    expect(proposalTypes('p_1')).toEqual(['Building Block Proposed', 'Proposal Rejected'])
  })

  it('malformed body → 400', async () => {
    seedHotSpotProposal('p_1')
    const response = await post('/proposals/p_1/kind', { modelAffecting: 'no' })
    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'invalid-body' })
  })

  it('unknown proposal → 404', async () => {
    const response = await post('/proposals/p_missing/kind', { modelAffecting: false })
    expect(response.status).toBe(404)
  })
})

describe('POST /proposals/:id/edit — model-change proposal', () => {
  const workshopId = 'w_1'
  const author = { proposer: { name: 'facilitator' }, accepter: { name: 'Dana' } }

  const seedBoardAndStreams = (): void => {
    store.append(workshopStream(workshopId as never), -1, [
      { at, opVersion: 1, operation: { v: 1, type: 'Workshop Started', workshopId, format: 'big-picture', creatorName: 'Dana', at } },
    ])
    store.append({ context: 'domain-model-capture', aggregate: 'board', id: workshopId }, -1, [
      ['bb_a', 'A'],
      ['bb_b', 'B'],
      ['bb_c', 'C'],
    ].map(([id, label]) => ({
      at,
      opVersion: 1,
      operation: { v: 1, kind: 'capture-domain-event', id, label, author },
    })))
    store.append(sessionStream(sessionId), -1, [
      { at, opVersion: 1, operation: { v: 1, type: 'Session Started', sessionId, workshopId, at } },
    ])
    store.append(proposalStream('mc_1' as ProposalId), -1, [
      {
        at,
        opVersion: 1,
        operation: {
          v: 1,
          type: 'Model Change Proposed',
          proposalId: 'mc_1',
          sessionId,
          contributionId: c1,
          intent: { kind: 'relation', relationKind: 'sequence', predecessor: 'bb_a', successor: 'bb_b' },
          at,
        },
      },
    ])
  }

  it('resolves a new endpoint label and appends Model Change Edited { changed }', async () => {
    seedBoardAndStreams()
    const response = await post('/proposals/mc_1/edit', { field: 'successor', label: 'C' })
    expect(response.status).toBe(200)
    const edited = store
      .read(proposalStream('mc_1' as ProposalId))
      .map((row) => ProposalEvent.parse(row.operation))
      .find((event) => event.type === 'Model Change Edited')
    expect(edited?.type === 'Model Change Edited' && edited.changed).toEqual({ successor: 'bb_c' })
  })

  it('an unknown endpoint label → 422 and nothing appended', async () => {
    seedBoardAndStreams()
    const response = await post('/proposals/mc_1/edit', { field: 'successor', label: 'Nonexistent' })
    expect(response.status).toBe(422)
    await expect(response.json()).resolves.toEqual({ error: 'unknown-label' })
    expect(proposalTypes('mc_1')).toEqual(['Model Change Proposed'])
  })

  it('edit-then-accept applies the edited intent', async () => {
    seedBoardAndStreams()
    await post('/proposals/mc_1/edit', { field: 'successor', label: 'C' })
    const accepted = await post('/proposals/mc_1/accept')
    expect(accepted.status).toBe(200)
    expect(readBoardSnapshot({ store }, workshopId as never).follows).toEqual([
      { predecessor: 'bb_a', successor: 'bb_c' },
    ])
  })
})

describe('GET /sessions/:id/proposals', () => {
  it('returns the session proposals from the read model', async () => {
    const ids = ['p_1', 'p_2'] as const
    store.append(sessionStream(sessionId), -1, [
      {
        at,
        opVersion: 1,
        operation: {
          v: 1,
          type: 'Contribution Interpreted',
          sessionId,
          contributionId: c1,
          tracks: ids.map((id) => ({
            track: 'propose-building-block',
            proposalId: id,
            blockKind: 'domain-event',
            label: `Block ${id}`,
            bar: 'strict',
          })),
          at,
        },
      },
    ])
    for (const id of ids) {
      seedProposal(id)
    }

    const response = await routes().request(`/sessions/${sessionId}/proposals`)
    expect(response.status).toBe(200)
    const { proposals } = (await response.json()) as { proposals: { proposalId: string; overflow: boolean }[] }
    expect(proposals.map((proposal) => proposal.proposalId)).toEqual([...ids])
    expect(proposals.every((proposal) => typeof proposal.overflow === 'boolean')).toBe(true)
  })

  it('returns the model-change intent card with endpoints resolved to current board labels', async () => {
    const workshopId = 'w_1'
    store.append(
      { context: 'domain-model-capture', aggregate: 'board', id: workshopId },
      -1,
      (
        [
          ['bb_a', 'Loan requested'],
          ['bb_b', 'Loan approved'],
        ] as const
      ).map(([id, label]) => ({
        at,
        opVersion: 1,
        operation: {
          v: 1,
          kind: 'capture-domain-event',
          id,
          label,
          author: { proposer: { name: 'facilitator' }, accepter: { name: 'Dana' } },
        },
      })),
    )
    store.append(sessionStream(sessionId), -1, [
      { at, opVersion: 1, operation: { v: 1, type: 'Session Started', sessionId, workshopId, at } },
      {
        at,
        opVersion: 1,
        operation: {
          v: 1,
          type: 'Contribution Interpreted',
          sessionId,
          contributionId: c1,
          tracks: [
            {
              track: 'propose-relation',
              proposalId: 'mc_1',
              relationKind: 'sequence',
              predecessor: 'bb_a',
              successor: 'bb_b',
            },
          ],
          at,
        },
      },
    ])
    store.append(proposalStream('mc_1' as ProposalId), -1, [
      {
        at,
        opVersion: 1,
        operation: {
          v: 1,
          type: 'Model Change Proposed',
          proposalId: 'mc_1',
          sessionId,
          contributionId: c1,
          intent: {
            kind: 'relation',
            relationKind: 'sequence',
            predecessor: 'bb_a',
            successor: 'bb_b',
          },
          at,
        },
      },
    ])

    const response = await routes().request(`/sessions/${sessionId}/proposals`)
    expect(response.status).toBe(200)
    const { proposals } = (await response.json()) as {
      proposals: { proposalId: string; intent?: { kind: string; summary: string; endpoints?: { id: string; label: string }[] } }[]
    }
    expect(proposals[0]?.intent).toEqual({
      kind: 'relation',
      summary: 'sequence: Loan requested → Loan approved',
      endpoints: [
        { id: 'bb_a', label: 'Loan requested' },
        { id: 'bb_b', label: 'Loan approved' },
      ],
    })
  })
})
