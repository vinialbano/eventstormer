import { DatabaseSync } from 'node:sqlite'
import { beforeEach, describe, expect, it } from 'vitest'
import { createMemoryEventStore } from '~/plumbing/event-store/memory-store.ts'
import type { EventStore } from '~/plumbing/event-store/port.ts'
import type { ProposalId, SessionId, WorkshopId } from '~/plumbing/ids.ts'
import { applySessionFacilitationMigrations } from '../../infrastructure/migrations.ts'
import { reserve, sessionIdsFor, type SessionIndexDb } from '../../infrastructure/session-index.ts'
import { proposalStream, sessionStream } from '../../infrastructure/streams.ts'
import { ProposalEvent, SessionEvent } from '../../domain/schema/events.ts'
import { closeSessionRoutes } from './http.ts'

const at = '2026-08-30T12:00:00.000Z'
const clock = () => at
const w = 'w_1' as WorkshopId
const s = 's_1' as SessionId

let store: EventStore
let db: SessionIndexDb

const routes = () => closeSessionRoutes({ store, db, clock })
const close = async (id: SessionId = s): Promise<Response> =>
  routes().request(`/sessions/${id}/close`, { method: 'POST' })

const proposalDisposition = (id: string): string | undefined => {
  const events = store.read(proposalStream(id as ProposalId)).map((r) => ProposalEvent.parse(r.operation))
  const lapsed = events.some((e) => e.type === 'Proposal Lapsed')
  const rejected = events.some((e) => e.type === 'Proposal Rejected')
  const accepted = events.some((e) => e.type === 'Proposal Accepted')
  if (lapsed) return 'LAPSED'
  if (rejected) return 'REJECTED'
  if (accepted) return 'ACCEPTED'
  return 'PROPOSED'
}

const seedProposal = (id: string, tail: ProposalEvent[] = []): void => {
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
        label: `Block ${id}`,
        bar: 'strict',
        at,
      },
    },
  ])
  if (tail.length > 0) {
    store.append(
      proposalStream(id as ProposalId),
      0,
      tail.map((operation) => ({ at, opVersion: 1, operation })),
    )
  }
}

beforeEach(() => {
  const raw = new DatabaseSync(':memory:')
  applySessionFacilitationMigrations(raw)
  db = raw
  store = createMemoryEventStore()
  store.append(sessionStream(s), -1, [
    { at, opVersion: 1, operation: { v: 1, type: 'Session Started', sessionId: s, workshopId: w, at } },
  ])
  reserve(db, w, s, at)
  // one Contribution Interpreted listing three proposals p_1 (PROPOSED), p_2 (APPLY_FAILED), p_3 (ACCEPTED)
  store.append(sessionStream(s), 0, [
    {
      at,
      opVersion: 1,
      operation: {
        v: 1,
        type: 'Contribution Interpreted',
        sessionId: s,
        contributionId: 'c_1',
        tracks: ['p_1', 'p_2', 'p_3'].map((proposalId) => ({
          track: 'propose-building-block',
          proposalId,
          blockKind: 'domain-event',
          label: `Block ${proposalId}`,
          bar: 'strict',
        })),
        at,
      },
    },
  ])
  seedProposal('p_1')
  seedProposal('p_2', [
    { v: 1, at, type: 'Proposal Accepted', proposalId: 'p_2' as ProposalId, accepter: 'Dana', buildingBlockId: 'bb_2' as never },
    { v: 1, at, type: 'Operation Rejected', proposalId: 'p_2' as ProposalId, reason: 'x' },
  ])
  seedProposal('p_3', [
    { v: 1, at, type: 'Proposal Accepted', proposalId: 'p_3' as ProposalId, accepter: 'Dana', buildingBlockId: 'bb_3' as never },
  ])
})

describe('POST /sessions/:id/close', () => {
  it('appends Session Closed with raw facts only, frees the index slot, lapses non-terminal proposals', async () => {
    const res = await close()
    expect(res.status).toBe(200)

    const closed = store
      .read(sessionStream(s))
      .map((r) => SessionEvent.parse(r.operation))
      .find((e) => e.type === 'Session Closed')
    expect(closed).toEqual({
      v: 1,
      type: 'Session Closed',
      sessionId: s,
      workshopId: w,
      unresolvedQuestionIds: [],
      at,
    })

    expect(sessionIdsFor(db, w)).toEqual({ closed: [s] })
    expect(proposalDisposition('p_1')).toBe('LAPSED')
    expect(proposalDisposition('p_2')).toBe('LAPSED')
    expect(proposalDisposition('p_3')).toBe('ACCEPTED') // in-flight — left to finish
  })

  it('lapses APPLY_FAILED with cause "apply-failed" and PROPOSED with "undisposed"', async () => {
    await close()
    const causeOf = (id: string): string | undefined => {
      const lapsed = store
        .read(proposalStream(id as ProposalId))
        .map((r) => ProposalEvent.parse(r.operation))
        .find((e) => e.type === 'Proposal Lapsed')
      return lapsed?.type === 'Proposal Lapsed' ? lapsed.cause : undefined
    }
    expect(causeOf('p_1')).toBe('undisposed')
    expect(causeOf('p_2')).toBe('apply-failed')
  })

  it('is a clean no-op when re-run on an already-closed session', async () => {
    await close()
    const before = store.read(sessionStream(s)).length
    const res = await close()
    expect(res.status).toBe(200)
    expect(store.read(sessionStream(s)).length).toBe(before)
    expect(proposalDisposition('p_1')).toBe('LAPSED')
  })

  it('404s for an unknown session', async () => {
    const res = await close('s_missing' as SessionId)
    expect(res.status).toBe(404)
  })
})
