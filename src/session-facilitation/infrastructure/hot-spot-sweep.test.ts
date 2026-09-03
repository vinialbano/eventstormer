import { DatabaseSync } from 'node:sqlite'
import { beforeEach, describe, expect, it } from 'vitest'
import { applySessionFacilitationMigrations } from './migrations.ts'
import { markSwept, readSweptKeys } from './hot-spot-sweep.ts'

let db: DatabaseSync

beforeEach(() => {
  db = new DatabaseSync(':memory:')
  applySessionFacilitationMigrations(db)
})

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
