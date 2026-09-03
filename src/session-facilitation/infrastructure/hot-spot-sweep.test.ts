import { DatabaseSync } from 'node:sqlite'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryEventStore } from '~/plumbing/event-store/memory-store.ts'
import type { EventStore } from '~/plumbing/event-store/port.ts'
import * as ids from '~/plumbing/ids.ts'
import type { SessionId, WorkshopId } from '~/plumbing/ids.ts'
import { readBoardSnapshot } from '../../domain-model-capture/api.ts'
import { SessionEvent } from '../domain/schema/events.ts'
import { decide as decideSession } from '../domain/session/decide.ts'
import { replay as replaySession } from '../domain/session/replay.ts'
import { applySessionFacilitationMigrations } from './migrations.ts'
import { markSwept, readSweptKeys, reconcileHotSpots } from './hot-spot-sweep.ts'
import { proposalStream, sessionStream, workshopStream } from './streams.ts'

vi.mock('~/plumbing/ids.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof ids>()
  return { ...actual, newBuildingBlockId: vi.fn(actual.newBuildingBlockId) }
})

let db: DatabaseSync

beforeEach(() => {
  db = new DatabaseSync(':memory:')
  applySessionFacilitationMigrations(db)
})

const at = '2026-09-03T00:00:00.000Z'
const clock = () => at
const workshopId = 'w_1' as WorkshopId
const sessionId = 's_1' as SessionId

const op = (operation: Record<string, unknown>) => ({ at, opVersion: 1, operation: { v: 1, at, ...operation } })

const seed = (store: EventStore, judgments: Record<string, unknown>[]): void => {
  store.append(workshopStream(workshopId), -1, [
    op({ type: 'Workshop Started', workshopId, format: 'big-picture', creatorName: 'Dana' }),
  ])
  store.append(sessionStream(sessionId), -1, [
    op({ type: 'Session Started', sessionId, workshopId }),
    op({ type: 'Question Asked', sessionId, questionId: 'q_1', kind: 'stakeholder', text: 'Who else?' }),
    ...judgments.map((judgment) => op(judgment)),
  ])
}

const hotSpotLabels = (store: EventStore): string[] =>
  readBoardSnapshot({ store }, workshopId)
    .blocks.filter((block) => block.kind === 'hot-spot')
    .map((block) => block.label)

const sweptQuestionIds = (): string[] =>
  [...readSweptKeys(db)].filter((key) => key.startsWith('q:')).map((key) => key.slice(2))

describe('hot_spot_sweep markers', () => {
  it('readSweptKeys is empty before any raise', () => {
    expect(readSweptKeys(db)).toEqual(new Set())
  })

  it('markSwept then readSweptKeys round-trips the key', () => {
    markSwept(db, 'kg:q_1', 'b_1', '2026-09-03T00:00:00.000Z')
    expect(readSweptKeys(db)).toEqual(new Set(['kg:q_1']))
  })

  it('a duplicate markSwept is INSERT OR IGNORE — the first building_block_id and at stay', () => {
    markSwept(db, 'kg:q_1', 'b_1', '2026-09-03T00:00:00.000Z')
    markSwept(db, 'kg:q_1', 'b_2', '2026-09-03T01:00:00.000Z')
    const rows = db
      .prepare('SELECT sweep_key, building_block_id, at FROM hot_spot_sweep')
      .all() as { sweep_key: string; building_block_id: string; at: string }[]
    expect(rows).toEqual([
      { sweep_key: 'kg:q_1', building_block_id: 'b_1', at: '2026-09-03T00:00:00.000Z' },
    ])
  })

  it('holds many distinct keys', () => {
    markSwept(db, 'kg:q_1', 'b_1', 't')
    markSwept(db, 'absent:q_1:ops-lead', 'b_2', 't')
    markSwept(db, 'q:q_2', 'b_3', 't')
    expect(readSweptKeys(db)).toEqual(new Set(['kg:q_1', 'absent:q_1:ops-lead', 'q:q_2']))
  })
})

describe('reconcileHotSpots — knowledge gaps and absent stakeholders', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  })

  it('raises one hot spot per named absent stakeholder', () => {
    const store = createMemoryEventStore()
    seed(store, [
      { type: 'Absent Stakeholder Named', sessionId, questionId: 'q_1', byContributionId: 'c_1', personName: 'ops lead' },
      { type: 'Absent Stakeholder Named', sessionId, questionId: 'q_1', byContributionId: 'c_1', personName: 'finance partner' },
    ])

    reconcileHotSpots({ store, db, clock }, sessionId)

    expect(hotSpotLabels(store).toSorted()).toEqual(['Absent: finance partner', 'Absent: ops lead'])
    expect(readSweptKeys(db)).toEqual(
      new Set(['absent:q_1:ops-lead', 'absent:q_1:finance-partner']),
    )
  })

  it('raises a knowledge-gap hot spot labelled with the question text', () => {
    const store = createMemoryEventStore()
    seed(store, [
      { type: 'Knowledge Gap Revealed', sessionId, questionId: 'q_1', byContributionId: 'c_1' },
    ])

    reconcileHotSpots({ store, db, clock }, sessionId)

    expect(hotSpotLabels(store)).toEqual(['Who else?'])
  })

  it('is idempotent — a second pass raises nothing new', () => {
    const store = createMemoryEventStore()
    seed(store, [
      { type: 'Knowledge Gap Revealed', sessionId, questionId: 'q_1', byContributionId: 'c_1' },
    ])

    reconcileHotSpots({ store, db, clock }, sessionId)
    reconcileHotSpots({ store, db, clock }, sessionId)

    expect(hotSpotLabels(store)).toEqual(['Who else?'])
  })

  it('raises one hot spot per absent stakeholder named on an incomplete workshop check', () => {
    const store = createMemoryEventStore()
    seed(store, [])
    store.append(workshopStream(workshopId), 0, [
      op({
        type: 'Stakeholder Check Recorded',
        workshopId,
        complete: false,
        absentNames: ['ops lead', 'the auditor'],
      }),
    ])

    reconcileHotSpots({ store, db, clock }, sessionId)

    expect(hotSpotLabels(store).toSorted()).toEqual([
      'Absent stakeholder: ops lead',
      'Absent stakeholder: the auditor',
    ])
    expect([...readSweptKeys(db)].filter((key) => key.startsWith('absent-sc:')).toSorted()).toEqual([
      'absent-sc:ops-lead',
      'absent-sc:the-auditor',
    ])

    reconcileHotSpots({ store, db, clock }, sessionId)
    expect(hotSpotLabels(store)).toHaveLength(2)
  })

  it('raises no hot spot when the workshop stakeholder check is complete', () => {
    const store = createMemoryEventStore()
    seed(store, [])
    store.append(workshopStream(workshopId), 0, [
      op({ type: 'Stakeholder Check Recorded', workshopId, complete: true, absentNames: [] }),
    ])

    reconcileHotSpots({ store, db, clock }, sessionId)

    expect(hotSpotLabels(store)).toEqual([])
  })

  it('rewrites the marker with no duplicate board block when the re-raise returns duplicate-id', () => {
    const store = createMemoryEventStore()
    seed(store, [
      { type: 'Knowledge Gap Revealed', sessionId, questionId: 'q_1', byContributionId: 'c_1' },
    ])
    vi.mocked(ids.newBuildingBlockId)
      .mockReturnValueOnce('b_fixed_kg' as ReturnType<typeof ids.newBuildingBlockId>)
      .mockReturnValueOnce('b_fixed_kg' as ReturnType<typeof ids.newBuildingBlockId>)

    reconcileHotSpots({ store, db, clock }, sessionId)
    expect(hotSpotLabels(store)).toEqual(['Who else?'])
    expect(readSweptKeys(db)).toEqual(new Set(['kg:q_1']))

    // A crash after applyOperation committed the raise but before markSwept ran:
    // the block is on the board, the marker table is empty.
    db.prepare('DELETE FROM hot_spot_sweep').run()
    expect(readSweptKeys(db)).toEqual(new Set())

    reconcileHotSpots({ store, db, clock }, sessionId)

    // The re-raise reuses the same id, the board rejects it as duplicate-id, and
    // that counts as success — the marker is rewritten, no second hot spot appears.
    expect(hotSpotLabels(store)).toEqual(['Who else?'])
    expect(readSweptKeys(db)).toEqual(new Set(['kg:q_1']))
  })

  it('leaves the key unmarked when the board append throws — retried on the next pass', () => {
    const inner = createMemoryEventStore()
    let failNext = true
    const store: EventStore = {
      read: (stream) => inner.read(stream),
      append: (stream, expected, ops) => {
        if (failNext && stream.aggregate === 'board') throw new Error('transient board failure')
        return inner.append(stream, expected, ops)
      },
    }
    seed(inner, [
      { type: 'Knowledge Gap Revealed', sessionId, questionId: 'q_1', byContributionId: 'c_1' },
    ])

    reconcileHotSpots({ store, db, clock }, sessionId)
    expect(readSweptKeys(db)).toEqual(new Set())
    expect(hotSpotLabels(inner)).toEqual([])

    failNext = false
    reconcileHotSpots({ store, db, clock }, sessionId)
    expect(readSweptKeys(db)).toEqual(new Set(['kg:q_1']))
    expect(hotSpotLabels(inner)).toEqual(['Who else?'])
  })
})

describe('reconcileHotSpots — the close sweep', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  })

  const seedClosed = (
    store: EventStore,
    options: { unresolved: string[]; interpreted?: Record<string, unknown>[]; extra?: Record<string, unknown>[] },
  ): void => {
    store.append(workshopStream(workshopId), -1, [
      op({ type: 'Workshop Started', workshopId, format: 'big-picture', creatorName: 'Dana' }),
    ])
    store.append(sessionStream(sessionId), -1, [
      op({ type: 'Session Started', sessionId, workshopId }),
      op({ type: 'Question Asked', sessionId, questionId: 'q_1', kind: 'phase', text: 'What is Q1?' }),
      op({ type: 'Question Asked', sessionId, questionId: 'q_2', kind: 'phase', text: 'What is Q2?' }),
      op({ type: 'Question Answered', sessionId, questionId: 'q_1', byContributionId: 'c_1' }),
      ...(options.interpreted ?? []).map((event) => op(event)),
      ...(options.extra ?? []).map((event) => op(event)),
      op({ type: 'Session Closed', sessionId, workshopId, unresolvedQuestionIds: options.unresolved }),
    ])
  }

  it('raises exactly one hot spot for the still-open question (test 43)', () => {
    const store = createMemoryEventStore()
    seedClosed(store, { unresolved: ['q_2'] })

    reconcileHotSpots({ store, db, clock }, sessionId)

    expect(hotSpotLabels(store)).toEqual(['What is Q2?'])
    expect(sweptQuestionIds()).toEqual(['q_2'])
  })

  it('sweeps a question left open by an off-topic contribution that produced a proposal (tests 5, 34)', () => {
    const store = createMemoryEventStore()
    store.append(proposalStream('p_1' as never), -1, [
      op({ type: 'Building Block Proposed', proposalId: 'p_1', sessionId, contributionId: 'c_2', blockKind: 'domain-event', label: 'Loan recorded', bar: 'strict' }),
    ])
    seedClosed(store, {
      unresolved: ['q_2'],
      interpreted: [
        {
          type: 'Contribution Interpreted',
          sessionId,
          contributionId: 'c_2',
          tracks: [{ track: 'propose-building-block', proposalId: 'p_1', blockKind: 'domain-event', label: 'Loan recorded', bar: 'strict' }],
        },
      ],
    })

    reconcileHotSpots({ store, db, clock }, sessionId)

    // the open question is swept; the still-PROPOSED proposal is not
    expect(hotSpotLabels(store)).toEqual(['What is Q2?'])
  })

  it('raises a hot spot for a proposal left in APPLY_FAILED at close (test 36)', () => {
    const store = createMemoryEventStore()
    store.append(proposalStream('p_1' as never), -1, [
      op({ type: 'Building Block Proposed', proposalId: 'p_1', sessionId, contributionId: 'c_2', blockKind: 'domain-event', label: 'Loan recorded', bar: 'strict' }),
      op({ type: 'Proposal Accepted', proposalId: 'p_1', accepter: 'Dana', buildingBlockId: 'b_1' }),
      op({ type: 'Operation Rejected', proposalId: 'p_1', reason: 'withdrawn-target' }),
    ])
    seedClosed(store, {
      unresolved: [],
      interpreted: [
        {
          type: 'Contribution Interpreted',
          sessionId,
          contributionId: 'c_2',
          tracks: [{ track: 'propose-building-block', proposalId: 'p_1', blockKind: 'domain-event', label: 'Loan recorded', bar: 'strict' }],
        },
      ],
    })

    reconcileHotSpots({ store, db, clock }, sessionId)

    expect(hotSpotLabels(store)).toEqual(['Could not apply: Loan recorded'])
    expect(readSweptKeys(db)).toEqual(new Set(['proposal:p_1']))
  })

  it('raises no close-sweep hot spot when the only open question is the scope question', () => {
    const store = createMemoryEventStore()
    store.append(workshopStream(workshopId), -1, [
      op({ type: 'Workshop Started', workshopId, format: 'big-picture', creatorName: 'Dana' }),
    ])
    const priorRows = [
      op({ type: 'Session Started', sessionId, workshopId }),
      op({
        type: 'Question Asked',
        sessionId,
        questionId: 'q_scope',
        kind: 'scope',
        text: 'What business are we mapping?',
        scopeStatement: 'A public library.',
      }),
    ]
    const model = replaySession(priorRows.map((row) => SessionEvent.parse(row.operation)))
    const closed = decideSession(model, { type: 'Close Session', sessionId, workshopId, at })
    if (!closed.ok) throw new Error('expected Close Session to succeed')
    store.append(sessionStream(sessionId), -1, [
      ...priorRows,
      ...closed.value.map((event) => ({ at, opVersion: 1, operation: event })),
    ])

    reconcileHotSpots({ store, db, clock }, sessionId)

    expect(hotSpotLabels(store)).toEqual([])
    expect(sweptQuestionIds()).toEqual([])
  })

  it('the set of questions swept equals Session Closed.unresolvedQuestionIds (test 43 consistency)', () => {
    const store = createMemoryEventStore()
    seedClosed(store, { unresolved: ['q_1', 'q_2'] })

    reconcileHotSpots({ store, db, clock }, sessionId)
    reconcileHotSpots({ store, db, clock }, sessionId)

    expect(sweptQuestionIds().toSorted()).toEqual(['q_1', 'q_2'])
    expect(hotSpotLabels(store).toSorted()).toEqual(['What is Q1?', 'What is Q2?'])
  })
})
