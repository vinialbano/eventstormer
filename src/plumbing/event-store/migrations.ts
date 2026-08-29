/**
 * Additive-only schema evolution for the operation log (ADR-004). A migration is
 * an id + a forward-only `up` statement; there is no `down`. "Additive-only" is a
 * review rule, not mechanically enforced — a test asserts no `up` string drops or
 * removes a column (S0-19).
 *
 * The DB handle is structural so this module never imports `node:sqlite` — every
 * real `node:sqlite` call lives in `sqlite-adapter.ts` (S0-11).
 */

type SqlValue = string | number | bigint | null | Uint8Array

export interface MigrationStatement {
  all(): unknown[]
  run(...params: SqlValue[]): unknown
}

export interface MigrationDb {
  exec(sql: string): void
  prepare(sql: string): MigrationStatement
}

export interface Migration {
  id: number
  up: string
}

export const MIGRATIONS: Migration[] = [
  {
    id: 1,
    up: `CREATE TABLE operation_log (
      context    TEXT NOT NULL,
      aggregate  TEXT NOT NULL,
      stream_id  TEXT NOT NULL,
      position   INTEGER NOT NULL,
      op_version INTEGER NOT NULL,
      at         TEXT NOT NULL,
      operation  TEXT NOT NULL,
      PRIMARY KEY (context, aggregate, stream_id, position)
    )`,
  },
]

/**
 * Apply every migration whose id is not yet in `_migrations`, in id order, in one
 * `BEGIN IMMEDIATE` transaction. Idempotent: a second call is a no-op.
 */
export const applyMigrations = (db: MigrationDb): void => {
  db.exec('BEGIN IMMEDIATE')
  try {
    db.exec(
      'CREATE TABLE IF NOT EXISTS _migrations (id INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)',
    )

    const applied = new Set(
      (db.prepare('SELECT id FROM _migrations').all() as { id: number }[]).map((row) => row.id),
    )

    for (const migration of [...MIGRATIONS].sort((a, b) => a.id - b.id)) {
      if (applied.has(migration.id)) continue
      db.exec(migration.up)
      db.prepare('INSERT INTO _migrations (id, applied_at) VALUES (?, ?)').run(
        migration.id,
        new Date().toISOString(),
      )
    }

    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}
