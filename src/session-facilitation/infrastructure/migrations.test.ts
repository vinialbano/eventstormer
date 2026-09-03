import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it } from 'vitest'
import {
  applySessionFacilitationMigrations,
  SESSION_FACILITATION_MIGRATIONS,
} from './migrations.ts'

const tableNames = (db: DatabaseSync): string[] =>
  (db.prepare(`SELECT name FROM sqlite_master WHERE type = 'table'`).all() as { name: string }[]).map(
    (row) => row.name,
  )

describe('SESSION_FACILITATION_MIGRATIONS', () => {
  it('is additive-only — no up string drops schema', () => {
    for (const migration of SESSION_FACILITATION_MIGRATIONS) {
      expect(migration.up).not.toMatch(/\bDROP\b/i)
    }
  })
})

describe('applySessionFacilitationMigrations', () => {
  it('creates session_index (with the partial unique index) and derived_track', () => {
    const db = new DatabaseSync(':memory:')
    applySessionFacilitationMigrations(db)

    expect(tableNames(db)).toEqual(expect.arrayContaining(['session_index', 'derived_track']))

    const indexes = (
      db.prepare(`SELECT name, "unique", partial FROM pragma_index_list('session_index')`).all() as {
        name: string
        unique: number
        partial: number
      }[]
    ).find((index) => index.name === 'session_index_one_open')
    expect(indexes).toMatchObject({ unique: 1, partial: 1 })
  })

  it('enforces one open session per workshop through the partial unique index', () => {
    const db = new DatabaseSync(':memory:')
    applySessionFacilitationMigrations(db)
    const ins = db.prepare(
      `INSERT INTO session_index (workshop_id, session_id, status, started_at) VALUES (?, ?, 'open', ?)`,
    )
    ins.run('w1', 's1', 't0')
    expect(() => { ins.run('w1', 's2', 't1') }).toThrow(/UNIQUE constraint failed/)
    // a second workshop is unaffected
    expect(() => { ins.run('w2', 's3', 't2') }).not.toThrow()
  })

  it('tracks applied ids in _sf_migrations, leaving _migrations to the operation log', () => {
    const db = new DatabaseSync(':memory:')
    applySessionFacilitationMigrations(db)
    expect(tableNames(db)).toContain('_sf_migrations')
    expect(tableNames(db)).not.toContain('_migrations')
  })

  it('adds hot_spot_sweep and tracks migration id 2 additively', () => {
    const db = new DatabaseSync(':memory:')
    applySessionFacilitationMigrations(db)
    expect(tableNames(db)).toContain('hot_spot_sweep')
    const applied = db.prepare(`SELECT id FROM _sf_migrations ORDER BY id`).all() as { id: number }[]
    expect(applied.map((row) => row.id)).toContain(2)

    const columns = (
      db.prepare(`SELECT name FROM pragma_table_info('hot_spot_sweep')`).all() as { name: string }[]
    ).map((row) => row.name)
    expect(columns).toEqual(['sweep_key', 'building_block_id', 'at'])
  })

  it('is idempotent — a second call is a no-op', () => {
    const db = new DatabaseSync(':memory:')
    applySessionFacilitationMigrations(db)
    expect(() => { applySessionFacilitationMigrations(db) }).not.toThrow()
    const applied = db.prepare(`SELECT id FROM _sf_migrations ORDER BY id`).all() as { id: number }[]
    expect(applied.map((row) => row.id)).toEqual(SESSION_FACILITATION_MIGRATIONS.map((migration) => migration.id))
  })
})
