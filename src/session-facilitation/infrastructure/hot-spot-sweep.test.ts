import { DatabaseSync } from 'node:sqlite'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryEventStore } from '~/plumbing/event-store/memory-store.ts'
import type { EventStore } from '~/plumbing/event-store/port.ts'
import type { SessionId, WorkshopId } from '~/plumbing/ids.ts'
import { readBoardSnapshot } from '../../domain-model-capture/api.ts'
import { applySessionFacilitationMigrations } from './migrations.ts'
import { markSwept, readSweptKeys, reconcileHotSpots } from './hot-spot-sweep.ts'
import { sessionStream, workshopStream } from './streams.ts'

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
