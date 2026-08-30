import { DatabaseSync } from 'node:sqlite'
import { beforeEach, describe, expect, it } from 'vitest'
import { createMemoryEventStore } from '~/plumbing/event-store/memory-store.ts'
import type { EventStore } from '~/plumbing/event-store/port.ts'
import type { ProposalId, QuestionId, SessionId, WorkshopId } from '~/plumbing/ids.ts'
import { err, ok, type Result } from '~/plumbing/result.ts'
import { applySessionFacilitationMigrations } from '../../infrastructure/migrations.ts'
import type { DerivedTrackDb } from '../../infrastructure/derived-track.ts'
import { close, reserve, sessionIdsFor, type SessionIndexDb } from '../../infrastructure/session-index.ts'
import { proposalStream, sessionStream, workshopStream } from '../../infrastructure/streams.ts'
import { ProposalEvent, SessionEvent } from '../../domain/schema/events.ts'
import type { Facilitator, FacilitatorFailure } from '../../infrastructure/facilitator/port.ts'
import type { OpeningQuestion } from '../../infrastructure/facilitator/turn-schema.ts'
import type { TrackIdMint } from '../../infrastructure/facilitator/map.ts'
import { createInFlightGuard } from './in-flight.ts'
import { askOpeningQuestion, reconcilePendingDerivations } from './interpret.ts'
import type { InterpretContributionDeps } from './deps.ts'

const at = '2026-08-30T12:00:00.000Z'
const clock = () => at
const w = 'w_1' as WorkshopId
const s = 's_1' as SessionId

let store: EventStore
let db: SessionIndexDb & DerivedTrackDb
let interpretCalls: number

const mint = (): TrackIdMint => {
  let q = 0
  return { proposalId: () => 'p_x' as ProposalId, questionId: () => `q_${String((q += 1))}` as QuestionId }
}

const facilitator = (openings: (OpeningQuestion | FacilitatorFailure)[]): Facilitator => {
  let i = 0
  return {
    interpret: () => {
      interpretCalls += 1
      return Promise.resolve(err({ kind: 'provider-down' as const }))
    },
    askOpening: (): Promise<Result<OpeningQuestion, FacilitatorFailure>> => {
      const step = openings[i++] ?? ({ kind: 'provider-down' } as const)
      return Promise.resolve('kind' in step ? err(step) : ok(step))
    },
  }
}

const deps = (openings: (OpeningQuestion | FacilitatorFailure)[] = []): InterpretContributionDeps => ({
  store,
  db,
  clock,
  facilitator: facilitator(openings),
  inFlight: createInFlightGuard(),
  mint: mint(),
})

const sessionEvents = (id: SessionId = s): SessionEvent[] =>
  store.read(sessionStream(id)).map((r) => SessionEvent.parse(r.operation))

const only = <T extends SessionEvent['type']>(t: T): Extract<SessionEvent, { type: T }>[] =>
  sessionEvents().filter((e): e is Extract<SessionEvent, { type: T }> => e.type === t)

beforeEach(() => {
  const raw = new DatabaseSync(':memory:')
  applySessionFacilitationMigrations(raw)
  db = raw
  store = createMemoryEventStore()
  interpretCalls = 0
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
  reserve(db, w, s, at)
})

describe('askOpeningQuestion (S1-08, S1-33, S1-58)', () => {
  it('produces the scope question + proposed statement on a fresh session', async () => {
    await askOpeningQuestion(
      deps([{ questionText: 'What business are you mapping?', scopeStatement: 'Library lending across branches.' }]),
    )

    const q = only('Question Asked')
    expect(q).toHaveLength(1)
    expect(q[0]?.kind).toBe('scope')
    expect(q[0]?.text).toBe('What business are you mapping?')
    expect(q[0]?.scopeStatement).toBe('Library lending across branches.')
  })

  it('asks nothing on provider-down, then asks on the next tick when the provider returns', async () => {
    await askOpeningQuestion(deps([{ kind: 'provider-down' }]))
    expect(only('Question Asked')).toHaveLength(0)

    await askOpeningQuestion(deps([{ questionText: 'Scope?', scopeStatement: 'Library lending.' }]))
    expect(only('Question Asked')).toHaveLength(1)
  })

  it('does not re-ask once a scope question exists', async () => {
    await askOpeningQuestion(deps([{ questionText: 'Scope?', scopeStatement: 'Library lending.' }]))
    await askOpeningQuestion(deps([{ questionText: 'Scope again?', scopeStatement: 'Other.' }]))
    expect(only('Question Asked')).toHaveLength(1)
  })
})

describe('reconcilePendingDerivations — crash-consistency (S1-56, S1-65)', () => {
  // Post-ledger crash (Contribution Interpreted written, deriveTracks not run) is
  // repaired here with NO second model call. The PRE-ledger window — a crash
  // after facilitator.interpret returns but before the Contribution Interpreted
  // append — re-selects the contribution next tick and calls the model again
  // (a second billable call, possibly different proposals). That window is an
  // ACCEPTED risk for v1 (spec Assumptions row "Interpretation model-call
  // at-most-once" / S1-65): single-user, ~cents, no proposal applies without a
  // human accept. It is not covered by a reconcile test because there is nothing
  // to reconcile — no ledger event was written.

  const p1 = 'p_1' as ProposalId
  const p2 = 'p_2' as ProposalId

  const proposalEvents = (id: ProposalId): ProposalEvent[] =>
    store.read(proposalStream(id)).map((r) => ProposalEvent.parse(r.operation))

  // A crash between the Contribution Interpreted append and deriveTracks: the
  // ledger event is present, no derived_track rows, no proposal streams.
  const ledgerWithoutDerivation = (): void => {
    store.append(sessionStream(s), store.read(sessionStream(s)).length - 1, [
      {
        at,
        opVersion: 1,
        operation: {
          v: 1,
          type: 'Contribution Made',
          sessionId: s,
          contributionId: 'c_1',
          speaker: 'Dana',
          body: 'a member borrowed a book and returned another',
          source: 'typed',
          at,
        },
      },
      {
        at,
        opVersion: 1,
        operation: {
          v: 1,
          type: 'Contribution Interpreted',
          sessionId: s,
          contributionId: 'c_1',
          tracks: [
            { track: 'propose-building-block', proposalId: p1, blockKind: 'domain-event', label: 'Book borrowed', bar: 'strict' },
            { track: 'propose-building-block', proposalId: p2, blockKind: 'domain-event', label: 'Book returned', bar: 'strict' },
          ],
          at,
        },
      },
    ])
  }

  it('restores every proposal from the ledger event with zero extra facilitator.interpret calls', () => {
    ledgerWithoutDerivation()

    reconcilePendingDerivations(deps())

    expect(proposalEvents(p1).map((e) => e.type)).toEqual(['Building Block Proposed'])
    expect(proposalEvents(p2).map((e) => e.type)).toEqual(['Building Block Proposed'])
    expect(interpretCalls).toBe(0)
  })

  it('is idempotent — a second reconcile adds no events and makes no model calls', () => {
    ledgerWithoutDerivation()
    reconcilePendingDerivations(deps())
    const before = store.read(proposalStream(p1)).length + store.read(sessionStream(s)).length

    reconcilePendingDerivations(deps())

    const after = store.read(proposalStream(p1)).length + store.read(sessionStream(s)).length
    expect(after).toBe(before)
    expect(interpretCalls).toBe(0)
  })

  it('sweeps the half-closed case — Session Closed present but the index row still open', () => {
    store.append(sessionStream(s), store.read(sessionStream(s)).length - 1, [
      {
        at,
        opVersion: 1,
        operation: { v: 1, type: 'Session Closed', sessionId: s, workshopId: w, unresolvedQuestionIds: [], at },
      },
    ])
    expect(sessionIdsFor(db, w).open).toBe(s)

    reconcilePendingDerivations(deps())

    expect(sessionIdsFor(db, w)).toEqual({ closed: [s] })
  })

  it('leaves a sound closed session alone (no open row to sweep)', () => {
    close(db, s, at)
    reconcilePendingDerivations(deps())
    expect(sessionIdsFor(db, w).closed).toEqual([s])
  })

  it('completes a crash-mid-close: lapses the session proposals the close handler did not reach', () => {
    // one proposed proposal, and Session Closed on the stream, but the index row still open
    store.append(sessionStream(s), store.read(sessionStream(s)).length - 1, [
      {
        at,
        opVersion: 1,
        operation: {
          v: 1,
          type: 'Contribution Interpreted',
          sessionId: s,
          contributionId: 'c_1',
          tracks: [{ track: 'propose-building-block', proposalId: 'p_x', blockKind: 'domain-event', label: 'Book borrowed', bar: 'strict' }],
          at,
        },
      },
      {
        at,
        opVersion: 1,
        operation: { v: 1, type: 'Session Closed', sessionId: s, workshopId: w, unresolvedQuestionIds: [], at },
      },
    ])
    store.append(proposalStream('p_x' as ProposalId), -1, [
      {
        at,
        opVersion: 1,
        operation: {
          v: 1,
          type: 'Building Block Proposed',
          proposalId: 'p_x',
          sessionId: s,
          contributionId: 'c_1',
          blockKind: 'domain-event',
          label: 'Book borrowed',
          bar: 'strict',
          at,
        },
      },
    ])

    reconcilePendingDerivations(deps())

    expect(sessionIdsFor(db, w)).toEqual({ closed: [s] })
    expect(
      store
        .read(proposalStream('p_x' as ProposalId))
        .map((r) => (r.operation as { type: string }).type),
    ).toEqual(['Building Block Proposed', 'Proposal Lapsed'])
  })
})
