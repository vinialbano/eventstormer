/**
 * Additive-only schema evolution for the operation log (ADR-004). A migration is
 * an id + a forward-only `up` statement; there is no `down`. "Additive-only" is a
 * review rule, not mechanically enforced — a test asserts no `up` string drops or
 * removes a column.
 *
 * The DB handle is structural so this module never imports `node:sqlite` — every
 * real `node:sqlite` call lives in `sqlite-adapter.ts`.
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
 * Apply every migration whose id is not yet in the tracking table, in id order,
 * in one `BEGIN IMMEDIATE` transaction. Idempotent: a second call is a no-op.
 *
 * `migrations` / `trackingTable` default to the operation-log set. A context that
 * owns projection tables in the same SQLite file (Slice 1: `session-facilitation`)
 * passes its own set and its own tracking table so the two id sequences never
 * collide. `trackingTable` is a closed set of internal constants — the type
 * keeps caller input out.
 */
export const applyMigrations = (
  db: MigrationDb,
  migrations: readonly Migration[] = MIGRATIONS,
  trackingTable: '_migrations' | '_sf_migrations' = '_migrations',
): void => {
  db.exec('BEGIN IMMEDIATE')
  try {
    db.exec(
      `CREATE TABLE IF NOT EXISTS ${trackingTable} (id INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)`,
    )

    const applied = new Set(
      (db.prepare(`SELECT id FROM ${trackingTable}`).all() as { id: number }[]).map((row) => row.id),
    )

    for (const migration of [...migrations].sort((first, second) => first.id - second.id)) {
      if (applied.has(migration.id)) continue
      db.exec(migration.up)
      db.prepare(`INSERT INTO ${trackingTable} (id, applied_at) VALUES (?, ?)`).run(
        migration.id,
        new Date().toISOString(),
      )
    }

    db.exec('COMMIT')
  } catch (error) {
    // A failed migration may have been auto-rolled-back already (SQLITE_FULL /
    // SQLITE_IOERR); guard the ROLLBACK so it cannot bury the real failure.
    try {
      db.exec('ROLLBACK')
    } catch {
      // transaction already gone — nothing to undo
    }
    throw error
  }
}
