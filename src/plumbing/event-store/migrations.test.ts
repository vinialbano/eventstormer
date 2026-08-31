import { describe, expect, it } from 'vitest'
import {
  applyMigrations,
  MIGRATIONS,
  type MigrationDb,
  type MigrationStatement,
} from './migrations.ts'

/** A minimal in-memory stand-in for the `_migrations` bookkeeping. */
class FakeDb implements MigrationDb {
  readonly execLog: string[] = []
  private readonly appliedIds: number[] = []
  failOn: RegExp | null = null

  exec(sql: string): void {
    this.execLog.push(sql)
    if (this.failOn?.test(sql)) throw new Error(`sqlite error on: ${sql}`)
  }

  prepare(sql: string): MigrationStatement {
    if (sql.includes('SELECT id FROM _migrations')) {
      return { all: () => this.appliedIds.map((id) => ({ id })), run: () => ({}) }
    }
    if (sql.includes('INSERT INTO _migrations')) {
      return {
        all: () => [],
        run: (id) => {
          if (typeof id === 'number') this.appliedIds.push(id)
          return {}
        },
      }
    }
    return { all: () => [], run: () => ({}) }
  }

  countExec(pattern: RegExp): number {
    return this.execLog.filter((sql) => pattern.test(sql)).length
  }
}

describe('MIGRATIONS', () => {
  it('no migration up removes schema (no DROP / ALTER … DROP) — additive only', () => {
    for (const migration of MIGRATIONS) {
      expect(migration.up).not.toMatch(/\bDROP\b/i)
    }
  })

  it('migration 001 creates operation_log with the 3-column stream key and op_version', () => {
    const first = MIGRATIONS.find((migration) => migration.id === 1)
    expect(first).toBeDefined()
    const up = first?.up ?? ''
    expect(up).toMatch(/CREATE TABLE operation_log/)
    for (const column of ['context', 'aggregate', 'stream_id', 'position', 'op_version', 'at', 'operation']) {
      expect(up).toMatch(new RegExp(`\\b${column}\\b`))
    }
    expect(up.replace(/\s+/g, ' ')).toContain('PRIMARY KEY (context, aggregate, stream_id, position)')
  })
})

describe('applyMigrations', () => {
  it('runs each migration up once, wrapped in BEGIN IMMEDIATE … COMMIT', () => {
    const db = new FakeDb()

    applyMigrations(db)

    for (const migration of MIGRATIONS) {
      expect(db.countExec(new RegExp(migration.up.slice(0, 25).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))).toBe(1)
    }
    expect(db.execLog[0]).toBe('BEGIN IMMEDIATE')
    expect(db.execLog.at(-1)).toBe('COMMIT')
    expect(db.countExec(/ROLLBACK/)).toBe(0)
  })

  it('is idempotent — a second call re-runs no migration up', () => {
    const db = new FakeDb()

    applyMigrations(db)
    applyMigrations(db)

    for (const migration of MIGRATIONS) {
      const head = migration.up.slice(0, 25).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      expect(db.countExec(new RegExp(head))).toBe(1)
    }
  })

  it('rolls back and rethrows when a migration up fails', () => {
    const db = new FakeDb()
    db.failOn = /CREATE TABLE operation_log/

    expect(() => { applyMigrations(db) }).toThrow(/sqlite error/)
    expect(db.countExec(/ROLLBACK/)).toBe(1)
    expect(db.countExec(/COMMIT/)).toBe(0)
  })
})
