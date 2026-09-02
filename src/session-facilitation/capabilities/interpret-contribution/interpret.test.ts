import { DatabaseSync } from 'node:sqlite'
import { beforeEach, describe, expect, it } from 'vitest'
import { createMemoryEventStore } from '~/plumbing/event-store/memory-store.ts'
import type { EventStore } from '~/plumbing/event-store/port.ts'
import type { ContributionId, ProposalId, QuestionId, SessionId, WorkshopId } from '~/plumbing/ids.ts'
import { err, ok, type Result } from '~/plumbing/result.ts'
import { applySessionFacilitationMigrations } from '../../infrastructure/migrations.ts'
import { type DerivedTrackDb, readDerivedTrackKeys } from '../../infrastructure/derived-track.ts'
import { close as closeIndexRow, reserve, type SessionIndexDb } from '../../infrastructure/session-index.ts'
import { sessionStream, workshopStream } from '../../infrastructure/streams.ts'
import { ProposalEvent, SessionEvent } from '../../domain/schema/events.ts'
import type { Facilitator, FacilitatorFailure } from '../../infrastructure/facilitator/port.ts'
import type { FacilitationTurn } from '../../infrastructure/facilitator/turn-schema.ts'
import type { TrackIdMint } from '../../infrastructure/facilitator/map.ts'
import { createInFlightGuard } from './in-flight.ts'
import { interpretContribution, reconcilePendingDerivations } from './interpret.ts'
import type { InterpretContributionDeps } from './deps.ts'

const at = '2026-08-30T12:00:00.000Z'
const clock = () => at
const workshopId = 'w_1' as WorkshopId
const defaultSessionId = 's_1' as SessionId

let store: EventStore
let db: SessionIndexDb & DerivedTrackDb
let interpretCalls: number
let markDerivedTrackRuns: number

/** Wrap the DB handle to count `markDerivedTrack` calls — one `prepare` of the
 * derived-track insert per derived track per turn. */
const countingDb = (inner: SessionIndexDb & DerivedTrackDb): SessionIndexDb & DerivedTrackDb => ({
  prepare: (sql: string) => {
    if (sql.includes('INSERT OR IGNORE INTO derived_track')) markDerivedTrackRuns += 1
    return inner.prepare(sql)
  },
})

const countingMint = (): TrackIdMint => {
  let proposalCounter = 0
  let questionCounter = 0
  return {
    proposalId: () => `p_${String((proposalCounter += 1))}` as ProposalId,
    questionId: () => `q_${String((questionCounter += 1))}` as QuestionId,
  }
}

type Step = FacilitationTurn | FacilitatorFailure

const scriptedFacilitator = (steps: Step[]): Facilitator => {
  let index = 0
  return {
    interpret: (): Promise<Result<FacilitationTurn, FacilitatorFailure>> => {
      interpretCalls += 1
      const step = steps[index++] ?? ({ kind: 'provider-down' } as const)
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

const seedSession = (sessionId: SessionId = defaultSessionId): void => {
  store.append(sessionStream(sessionId), -1, [
    { at, opVersion: 1, operation: { v: 1, type: 'Session Started', sessionId, workshopId, at } },
  ])
  reserve(db, workshopId, sessionId, at)
}

const contribute = (body: string, id: string, sessionId: SessionId = defaultSessionId): void => {
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

const sessionEvents = (sessionId: SessionId = defaultSessionId): SessionEvent[] =>
  store.read(sessionStream(sessionId)).map((row) => SessionEvent.parse(row.operation))

const only = <T extends SessionEvent['type']>(
  type: T,
  sessionId: SessionId = defaultSessionId,
): Extract<SessionEvent, { type: T }>[] =>
  sessionEvents(sessionId).filter((event): event is Extract<SessionEvent, { type: T }> => event.type === type)

const proposalEvents = (id: string): ProposalEvent[] =>
  store.read({ context: 'session-facilitation', aggregate: 'proposal', id }).map((row) =>
    ProposalEvent.parse(row.operation),
  )

beforeEach(() => {
  const raw = new DatabaseSync(':memory:')
  applySessionFacilitationMigrations(raw)
  db = countingDb(raw)
  store = createMemoryEventStore()
  interpretCalls = 0
  markDerivedTrackRuns = 0
  store.append(workshopStream(workshopId), -1, [
    {
      at,
      opVersion: 1,
      operation: { v: 1, type: 'Workshop Started', workshopId, format: 'big-picture', creatorName: 'Dana', at },
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

describe('interpretContribution — the commit point + derivation', () => {
  it('proposes a building block per propose-building-block track, persisting bar and evidenceSpan', async () => {
    seedSession()
    contribute('a member borrowed a book', 'c_1')

    await interpretContribution(
      deps([turn([propose('domain-event', 'Book borrowed', { bar: 'lenient', evidenceSpan: 'borrowed a book' })])]),
    )

    const interpreted = sessionEvents().filter((event) => event.type === 'Contribution Interpreted')
    expect(interpreted).toHaveLength(1)

    expect(proposalEvents('p_1')).toEqual([
      {
        v: 1,
        type: 'Building Block Proposed',
        proposalId: 'p_1',
        sessionId: defaultSessionId,
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
    expect(phaseQ.map((question) => question.kind)).toEqual(['phase'])
    expect(phaseQ[0]?.text).toBe('Break "Acquisitions" into concrete events?')
    expect(only('Contribution Attributed To Another Format').map((event) => event.format)).toEqual(['policy'])
  })

  it('records an out-of-format notice per contribution, even when an earlier contribution had the same format and note', async () => {
    seedSession()
    contribute('acquisitions auto-places a hold', 'c_1')
    contribute('a hold gets placed when we acquire', 'c_2')

    const notice = {
      track: 'attribute-to-other-format',
      format: 'policy',
      note: '"auto-place a hold" is a policy.',
    } as const
    const dependencies = deps([turn([notice]), turn([notice])])

    await interpretContribution(dependencies)
    await interpretContribution(dependencies)

    expect(only('Contribution Attributed To Another Format').map((event) => event.contributionId)).toEqual([
      'c_1',
      'c_2',
    ])
  })

  it('keeps a distinct out-of-format notice per note, and suppresses an exact repeat', async () => {
    seedSession()
    contribute('acquisitions auto-places a hold and reserves a slot', 'c_1')

    await interpretContribution(
      deps([
        turn([
          { track: 'attribute-to-other-format', format: 'policy', note: '"auto-place a hold" is a policy.' },
          { track: 'attribute-to-other-format', format: 'policy', note: '"reserve a slot" is a policy.' },
          { track: 'attribute-to-other-format', format: 'policy', note: '"auto-place a hold" is a policy.' },
        ]),
      ]),
    )

    expect(only('Contribution Attributed To Another Format').map((event) => event.note)).toEqual([
      '"auto-place a hold" is a policy.',
      '"reserve a slot" is a policy.',
    ])
  })

  it('resolves an open question from an answer-question track', async () => {
    seedSession()
    // an open question q_open
    store.append(sessionStream(defaultSessionId), store.read(sessionStream(defaultSessionId)).length - 1, [
      {
        at,
        opVersion: 1,
        operation: {
          v: 1,
          type: 'Question Asked',
          sessionId: defaultSessionId,
          questionId: 'q_open',
          kind: 'free',
          text: 'What happens next?',
          at,
        },
      },
    ])
    contribute('then the book is shelved', 'c_1')

    await interpretContribution(deps([turn([{ track: 'answer-question', questionId: 'q_open' }])]))

    expect(only('Question Answered').map((event) => event.questionId)).toEqual(['q_open'])
  })

  it('drops an answer-question track naming an unknown questionId — no Question Answered', async () => {
    seedSession()
    contribute('mumble', 'c_1')

    await interpretContribution(deps([turn([{ track: 'answer-question', questionId: 'q_nope' }])]))

    expect(sessionEvents().some((event) => event.type === 'Question Answered')).toBe(false)
    expect(sessionEvents().some((event) => event.type === 'Contribution Interpreted')).toBe(true)
  })

  it('appends a free Question Asked when nextMove.move is "ask"', async () => {
    seedSession()
    contribute('a member joined', 'c_1')

    await interpretContribution(
      deps([turn([], { move: 'ask', questionText: 'What happens right after a member joins?' })]),
    )

    const question = only('Question Asked')
    expect(question).toHaveLength(1)
    expect(question[0]?.kind).toBe('free')
    expect(question[0]?.text).toBe('What happens right after a member joins?')
  })
})

describe('reconcilePendingDerivations — the derived_track skip is per-track', () => {
  it('re-derives only the track whose marker row was lost, skipping the already-marked ones', async () => {
    seedSession()
    contribute('a member borrowed a book and returned another', 'c_1')

    await interpretContribution(
      deps([turn([propose('domain-event', 'Book borrowed'), propose('domain-event', 'Book returned')])]),
    )

    expect(proposalEvents('p_1').map((event) => event.type)).toEqual(['Building Block Proposed'])
    expect(proposalEvents('p_2').map((event) => event.type)).toEqual(['Building Block Proposed'])
    expect(readDerivedTrackKeys(db)).toEqual(new Set(['c_1::0', 'c_1::1']))

    // a crash drops exactly one track's marker row
    db.prepare('DELETE FROM derived_track WHERE contribution_id = ? AND track_index = ?').run('c_1', 1)

    interpretCalls = 0
    markDerivedTrackRuns = 0
    reconcilePendingDerivations(deps([]))

    // only track 1 is re-derived + re-marked; track 0 is skipped outright
    expect(markDerivedTrackRuns).toBe(1)
    expect(readDerivedTrackKeys(db)).toEqual(new Set(['c_1::0', 'c_1::1']))
    // no second model call, no duplicate proposal births / question events
    expect(interpretCalls).toBe(0)
    expect(proposalEvents('p_1').map((event) => event.type)).toEqual(['Building Block Proposed'])
    expect(proposalEvents('p_2').map((event) => event.type)).toEqual(['Building Block Proposed'])
    expect(only('Contribution Interpreted')).toHaveLength(1)
  })
})

describe('interpretContribution — FIFO and one-in-flight', () => {
  it('interprets contributions oldest-first by stream position, one per call', async () => {
    seedSession()
    contribute('first', 'c_1')
    contribute('second', 'c_2')

    const dependencies = deps([
      turn([propose('domain-event', 'First happened')]),
      turn([propose('domain-event', 'Second happened')]),
    ])

    await interpretContribution(dependencies)
    expect(only('Contribution Interpreted').map((event) => event.contributionId)).toEqual(['c_1'])

    await interpretContribution(dependencies)
    expect(only('Contribution Interpreted').map((event) => event.contributionId)).toEqual(['c_1', 'c_2'])
  })

  it('skips a session already marked in flight', async () => {
    seedSession()
    contribute('first', 'c_1')

    const dependencies = deps([turn([])])
    dependencies.inFlight.mark(defaultSessionId, 'c_1' as ContributionId)

    await interpretContribution(dependencies)

    expect(sessionEvents().some((event) => event.type === 'Contribution Interpreted')).toBe(false)
    expect(interpretCalls).toBe(0)
  })
})

describe('interpretContribution — a later session sees prior summaries', () => {
  it('assembles prior closed sessions into the facilitation prompt', async () => {
    // two closed sessions, each with one contribution
    for (const [id, body] of [['s_a', 'first session line'], ['s_b', 'second session line']] as const) {
      const sid = id as SessionId
      store.append(sessionStream(sid), -1, [
        { at, opVersion: 1, operation: { v: 1, type: 'Session Started', sessionId: sid, workshopId, at } },
        { at, opVersion: 1, operation: { v: 1, type: 'Contribution Made', sessionId: sid, contributionId: `${id}_c`, speaker: 'Dana', body, source: 'typed', at } },
        { at, opVersion: 1, operation: { v: 1, type: 'Session Closed', sessionId: sid, workshopId, unresolvedQuestionIds: [], at } },
      ])
      reserve(db, workshopId, sid, at)
      closeIndexRow(db, sid, at)
    }

    seedSession()
    contribute('a member borrowed a book', 'c_1')

    let captured = ''
    const dependencies = deps([turn([])])
    dependencies.facilitator.interpret = (input) => {
      captured = input.prompt
      interpretCalls += 1
      return Promise.resolve(ok(turn([])))
    }

    await interpretContribution(dependencies)

    expect(captured).toContain('## Prior sessions')
    expect(captured).toContain('Session 1: 0 blocks added, 1 contributions, 0 questions left open.')
    expect(captured).toContain('Session 2: 0 blocks added, 1 contributions, 0 questions left open.')
  })
})

describe('interpretContribution — failure classes', () => {
  it('leaves a contribution un-interpreted on provider-down', async () => {
    seedSession()
    contribute('a member borrowed a book', 'c_1')

    await interpretContribution(deps([{ kind: 'provider-down' }]))

    expect(sessionEvents().some((event) => event.type === 'Contribution Interpreted')).toBe(false)
    expect(sessionEvents().some((event) => event.type === 'Contribution Interpretation Failed')).toBe(false)
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
