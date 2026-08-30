import { DatabaseSync } from 'node:sqlite'
import { beforeEach, describe, expect, it } from 'vitest'
import { createMemoryEventStore } from '~/plumbing/event-store/memory-store.ts'
import type { EventStore } from '~/plumbing/event-store/port.ts'
import type { ContributionId, ProposalId, QuestionId, SessionId, WorkshopId } from '~/plumbing/ids.ts'
import { err, ok, type Result } from '~/plumbing/result.ts'
import { applySessionFacilitationMigrations } from '../../infrastructure/migrations.ts'
import type { DerivedTrackDb } from '../../infrastructure/derived-track.ts'
import { reserve, type SessionIndexDb } from '../../infrastructure/session-index.ts'
import { sessionStream, workshopStream } from '../../infrastructure/streams.ts'
import { ProposalEvent, SessionEvent } from '../../domain/schema/events.ts'
import type { Facilitator, FacilitatorFailure } from '../../infrastructure/facilitator/port.ts'
import type { FacilitationTurn } from '../../infrastructure/facilitator/turn-schema.ts'
import type { TrackIdMint } from '../../infrastructure/facilitator/map.ts'
import { createInFlightGuard } from './in-flight.ts'
import { interpretContribution } from './interpret.ts'
import type { InterpretContributionDeps } from './deps.ts'

const at = '2026-08-30T12:00:00.000Z'
const clock = () => at
const w = 'w_1' as WorkshopId
const s = 's_1' as SessionId

let store: EventStore
let db: SessionIndexDb & DerivedTrackDb
let interpretCalls: number

const countingMint = (): TrackIdMint => {
  let p = 0
  let q = 0
  return {
    proposalId: () => `p_${String((p += 1))}` as ProposalId,
    questionId: () => `q_${String((q += 1))}` as QuestionId,
  }
}

type Step = FacilitationTurn | FacilitatorFailure

const scriptedFacilitator = (steps: Step[]): Facilitator => {
  let i = 0
  return {
    interpret: (): Promise<Result<FacilitationTurn, FacilitatorFailure>> => {
      interpretCalls += 1
      const step = steps[i++] ?? ({ kind: 'provider-down' } as const)
      return Promise.resolve('kind' in step ? err(step) : ok(step))
    },
    askOpening: () => Promise.resolve(err({ kind: 'provider-down' as const })),
  }
}

const deps = (steps: Step[]): InterpretContributionDeps => ({
  store,
  db,
  clock,
  facilitator: scriptedFacilitator(steps),
  inFlight: createInFlightGuard(),
  mint: countingMint(),
})

const seedSession = (sessionId: SessionId = s): void => {
  store.append(sessionStream(sessionId), -1, [
    { at, opVersion: 1, operation: { v: 1, type: 'Session Started', sessionId, workshopId: w, at } },
  ])
  reserve(db, w, sessionId, at)
}

const contribute = (body: string, id: string, sessionId: SessionId = s): void => {
  const rows = store.read(sessionStream(sessionId))
  store.append(sessionStream(sessionId), rows.length - 1, [
    {
      at,
      opVersion: 1,
      operation: {
        v: 1,
        type: 'Contribution Made',
        sessionId,
        contributionId: id,
        speaker: 'Dana',
        body,
        source: 'typed',
        at,
      },
    },
  ])
}

const sessionEvents = (sessionId: SessionId = s): SessionEvent[] =>
  store.read(sessionStream(sessionId)).map((r) => SessionEvent.parse(r.operation))

const only = <T extends SessionEvent['type']>(
  t: T,
  sessionId: SessionId = s,
): Extract<SessionEvent, { type: T }>[] =>
  sessionEvents(sessionId).filter((e): e is Extract<SessionEvent, { type: T }> => e.type === t)

const proposalEvents = (id: string): ProposalEvent[] =>
  store.read({ context: 'session-facilitation', aggregate: 'proposal', id }).map((r) =>
    ProposalEvent.parse(r.operation),
  )

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
})

const propose = (
  blockKind: 'domain-event' | 'actor' | 'system',
  label: string,
  extra: Partial<{ bar: 'lenient' | 'strict'; evidenceSpan: string }> = {},
): FacilitationTurn['interpretation'][number] => ({
  track: 'propose-building-block',
  blockKind,
  label,
  bar: extra.bar ?? 'strict',
  ...(extra.evidenceSpan === undefined ? {} : { evidenceSpan: extra.evidenceSpan }),
})

const turn = (
  interpretation: FacilitationTurn['interpretation'],
  nextMove: FacilitationTurn['nextMove'] = { move: 'acknowledge' },
): FacilitationTurn => ({ interpretation, nextMove })

describe('interpretContribution — the commit point + derivation (S1-14, S1-23, S1-24, S1-25, S1-63, S1-64)', () => {
  it('proposes a building block per propose-building-block track, persisting bar and evidenceSpan', async () => {
    seedSession()
    contribute('a member borrowed a book', 'c_1')

    await interpretContribution(
      deps([turn([propose('domain-event', 'Book borrowed', { bar: 'lenient', evidenceSpan: 'borrowed a book' })])]),
    )

    const interpreted = sessionEvents().filter((e) => e.type === 'Contribution Interpreted')
    expect(interpreted).toHaveLength(1)

    expect(proposalEvents('p_1')).toEqual([
      {
        v: 1,
        type: 'Building Block Proposed',
        proposalId: 'p_1',
        sessionId: s,
        contributionId: 'c_1',
        blockKind: 'domain-event',
        label: 'Book borrowed',
        bar: 'lenient',
        evidenceSpan: 'borrowed a book',
        at,
      },
    ])
  })

  it('handles a multi-track turn: a phase question and an out-of-format notice, no block for either', async () => {
    seedSession()
    contribute('acquisitions is how we get new titles; the system auto-places a hold', 'c_1')

    await interpretContribution(
      deps([
        turn([
          { track: 'flag-phase', questionText: 'Break "Acquisitions" into concrete events?' },
          { track: 'attribute-to-other-format', format: 'policy', note: '"auto-place a hold" is a policy.' },
        ]),
      ]),
    )

    const phaseQ = only('Question Asked')
    expect(phaseQ.map((q) => q.kind)).toEqual(['phase'])
    expect(phaseQ[0]?.text).toBe('Break "Acquisitions" into concrete events?')
    expect(only('Contribution Attributed To Another Format').map((e) => e.format)).toEqual(['policy'])
  })

  it('resolves an open question from an answer-question track', async () => {
    seedSession()
    // an open question q_open
    store.append(sessionStream(s), store.read(sessionStream(s)).length - 1, [
      {
        at,
        opVersion: 1,
        operation: {
          v: 1,
          type: 'Question Asked',
          sessionId: s,
          questionId: 'q_open',
          kind: 'free',
          text: 'What happens next?',
          at,
        },
      },
    ])
    contribute('then the book is shelved', 'c_1')

    await interpretContribution(deps([turn([{ track: 'answer-question', questionId: 'q_open' }])]))

    expect(only('Question Answered').map((e) => e.questionId)).toEqual(['q_open'])
  })

  it('drops an answer-question track naming an unknown questionId — no Question Answered', async () => {
    seedSession()
    contribute('mumble', 'c_1')

    await interpretContribution(deps([turn([{ track: 'answer-question', questionId: 'q_nope' }])]))

    expect(sessionEvents().some((e) => e.type === 'Question Answered')).toBe(false)
    expect(sessionEvents().some((e) => e.type === 'Contribution Interpreted')).toBe(true)
  })

  it('appends a free Question Asked when nextMove.move is "ask"', async () => {
    seedSession()
    contribute('a member joined', 'c_1')

    await interpretContribution(
      deps([turn([], { move: 'ask', questionText: 'What happens right after a member joins?' })]),
    )

    const q = only('Question Asked')
    expect(q).toHaveLength(1)
    expect(q[0]?.kind).toBe('free')
    expect(q[0]?.text).toBe('What happens right after a member joins?')
  })
})

describe('interpretContribution — FIFO and one-in-flight (S1-14, S1-29)', () => {
  it('interprets contributions oldest-first by stream position, one per call', async () => {
    seedSession()
    contribute('first', 'c_1')
    contribute('second', 'c_2')

    const d = deps([
      turn([propose('domain-event', 'First happened')]),
      turn([propose('domain-event', 'Second happened')]),
    ])

    await interpretContribution(d)
    expect(only('Contribution Interpreted').map((e) => e.contributionId)).toEqual(['c_1'])

    await interpretContribution(d)
    expect(only('Contribution Interpreted').map((e) => e.contributionId)).toEqual(['c_1', 'c_2'])
  })

  it('skips a session already marked in flight', async () => {
    seedSession()
    contribute('first', 'c_1')

    const d = deps([turn([])])
    d.inFlight.mark(s, 'c_1' as ContributionId)

    await interpretContribution(d)

    expect(sessionEvents().some((e) => e.type === 'Contribution Interpreted')).toBe(false)
    expect(interpretCalls).toBe(0)
  })
})

describe('interpretContribution — failure classes (S1-27, S1-64)', () => {
  it('leaves a contribution un-interpreted on provider-down', async () => {
    seedSession()
    contribute('a member borrowed a book', 'c_1')

    await interpretContribution(deps([{ kind: 'provider-down' }]))

    expect(sessionEvents().some((e) => e.type === 'Contribution Interpreted')).toBe(false)
    expect(sessionEvents().some((e) => e.type === 'Contribution Interpretation Failed')).toBe(false)
  })

  it('appends Contribution Interpretation Failed on schema-invalid and counts it interpreted', async () => {
    seedSession()
    contribute('a member borrowed a book', 'c_1')

    await interpretContribution(deps([{ kind: 'schema-invalid', detail: 'interpretation: expected array' }]))

    const failed = only('Contribution Interpretation Failed')
    expect(failed).toHaveLength(1)
    expect(failed[0]?.reason).toContain('expected array')
    // interpret-once: a second tick does not re-call the facilitator
    interpretCalls = 0
    await interpretContribution(deps([turn([])]))
    expect(interpretCalls).toBe(0)
  })
})
