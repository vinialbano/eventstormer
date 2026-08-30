import { beforeEach, describe, expect, it } from 'vitest'
import { createMemoryEventStore } from '~/plumbing/event-store/memory-store.ts'
import type { EventStore } from '~/plumbing/event-store/port.ts'
import type { ContributionId, ProposalId, SessionId } from '~/plumbing/ids.ts'
import { ProposalEvent } from '../../domain/schema/events.ts'
import { proposalStream, sessionStream } from '../../infrastructure/streams.ts'
import { reviewProposalRoutes } from './http.ts'

const at = '2026-08-30T12:00:00.000Z'
const clock = () => at
const s = 's_1' as SessionId
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
        sessionId: s,
        contributionId: c1,
        blockKind: 'domain-event',
        label,
        bar: 'strict',
        at,
      },
    },
  ])
}

const proposalTypes = (id: string): string[] =>
  store.read(proposalStream(id as ProposalId)).map((r) => (r.operation as { type: string }).type)

const post = async (path: string, body: unknown = {}): Promise<Response> =>
  routes().request(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

beforeEach(() => {
  store = createMemoryEventStore()
})

describe('POST /proposals/:id/{edit,reject,hold,unhold} (S1-40, S1-45, S1-52)', () => {
  it('edit → 200 and a Proposal Edited event with the new label', async () => {
    seedProposal('p_1')
    const res = await post('/proposals/p_1/edit', { label: 'Loan recorded' })
    expect(res.status).toBe(200)
    const edited = store
      .read(proposalStream('p_1' as ProposalId))
      .map((r) => ProposalEvent.parse(r.operation))
      .find((e) => e.type === 'Proposal Edited')
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
    const res = await post('/proposals/p_1/edit', { label: 'too late' })
    expect(res.status).toBe(409)
    expect(proposalTypes('p_1')).toEqual(['Building Block Proposed', 'Proposal Rejected'])
  })

  it('unknown proposal → 404', async () => {
    const res = await post('/proposals/p_missing/reject')
    expect(res.status).toBe(404)
  })
})

describe('GET /sessions/:id/proposals (S1-40, S1-53)', () => {
  it('returns the session proposals with overflow grouping past the 7th', async () => {
    const ids = Array.from({ length: 8 }, (_, i) => `p_${String(i + 1)}`)
    store.append(sessionStream(s), -1, [
      {
        at,
        opVersion: 1,
        operation: {
          v: 1,
          type: 'Contribution Interpreted',
          sessionId: s,
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
    ids.forEach((id) => {
      seedProposal(id)
    })

    const res = await routes().request(`/sessions/${s}/proposals`)
    expect(res.status).toBe(200)
    const { proposals } = (await res.json()) as { proposals: { proposalId: string; overflow: boolean }[] }
    expect(proposals.map((p) => p.proposalId)).toEqual(ids)
    expect(proposals.map((p) => p.overflow)).toEqual([false, false, false, false, false, false, false, true])
  })
})
