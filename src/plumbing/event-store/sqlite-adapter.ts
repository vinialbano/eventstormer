import { DatabaseSync } from 'node:sqlite'
import { err, ok } from '../result.ts'
import { applyMigrations } from './migrations.ts'
import type { AppendConflict, EventStore, StoredOperation, StreamKey } from './port.ts'

/**
 * The one module that touches `node:sqlite` (S0-11) — every other layer sees
 * only the `EventStore` port. `DatabaseSync` is synchronous, so this whole
 * adapter is synchronous (AD-013): no `async`, no `Promise`.
 *
 * `node:sqlite` has no `db.transaction(fn)` wrapper, so a batch append is driven
 * by `BEGIN IMMEDIATE` / `COMMIT` / `ROLLBACK` directly. Rows come back as
 * null-prototype objects — property access is fine, `row.hasOwnProperty` is not,
 * so it is never used here.
 *
 * `timeout` gives `BEGIN IMMEDIATE` a busy-wait window instead of failing a
 * contended write lock instantly. Slice 0 has one in-process writer, so this is
 * belt-and-suspenders; mapping a residual lock error onto a transient
 * `AppendConflict` (the second loss mode of optimistic concurrency) is a
 * follow-up for the slice that first runs more than one connection.
 */

const BUSY_TIMEOUT_MS = 5_000

const dbPathFromEnv = (): string => process.env.EVENTSTORMER_DB ?? './data/eventstormer.db'

interface MaxPositionRow {
  max: number | null
}

interface OperationRow {
  position: number
  op_version: number
  at: string
  operation: string
}

export const createSqliteEventStore = (path: string = dbPathFromEnv()): EventStore => {
  const db = new DatabaseSync(path, { timeout: BUSY_TIMEOUT_MS })

  // Close the handle before any construction error escapes — otherwise it leaks
  // with no reference left to close it (e.g. a `:memory:` path, where the WAL
  // PRAGMA reports 'memory', or a failing migration).
  try {
    // WAL is a PRAGMA, not a constructor option; `db.exec` discards rows, so the
    // mode is set and read back through a prepared statement to assert it took.
    const journal = db.prepare('PRAGMA journal_mode=WAL').get() as { journal_mode: string }
    if (journal.journal_mode !== 'wal') {
      throw new Error(`sqlite: expected WAL journal mode, got '${journal.journal_mode}'`)
    }

    applyMigrations(db)
  } catch (error) {
    db.close()
    throw error
  }

  const maxPosition = db.prepare(
    'SELECT MAX(position) AS max FROM operation_log WHERE context = ? AND aggregate = ? AND stream_id = ?',
  )
  const insert = db.prepare(
    `INSERT INTO operation_log
       (context, aggregate, stream_id, position, op_version, at, operation)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
  const readStream = db.prepare(
    `SELECT position, op_version, at, operation FROM operation_log
     WHERE context = ? AND aggregate = ? AND stream_id = ?
     ORDER BY position`,
  )

  return {
    append(stream: StreamKey, expectedPosition, ops) {
      if (ops.length < 1) {
        throw new RangeError('append requires a batch of at least one operation')
      }

      db.exec('BEGIN IMMEDIATE')
      try {
        const row = maxPosition.get(
          stream.context,
          stream.aggregate,
          stream.id,
        ) as unknown as MaxPositionRow
        const currentPosition = row.max ?? -1

        if (currentPosition !== expectedPosition) {
          db.exec('ROLLBACK')
          return err<AppendConflict>({
            kind: 'stale-position',
            actual: currentPosition,
            classification: 'transient',
          })
        }

        for (const [i, op] of ops.entries()) {
          insert.run(
            stream.context,
            stream.aggregate,
            stream.id,
            expectedPosition + 1 + i,
            op.opVersion,
            op.at,
            JSON.stringify(op.operation),
          )
        }

        db.exec('COMMIT')
        return ok({ nextPosition: expectedPosition + ops.length })
      } catch (error) {
        // SQLite auto-rolls-back on SQLITE_FULL / SQLITE_IOERR / SQLITE_NOMEM, so
        // an explicit ROLLBACK here can itself throw ("no transaction is active")
        // and bury the actionable error. The original error is the one to raise.
        try {
          db.exec('ROLLBACK')
        } catch {
          // transaction already gone — nothing to undo
        }
        throw error
      }
    },

    read(stream: StreamKey) {
      const out: StoredOperation[] = []
      for (const raw of readStream.iterate(stream.context, stream.aggregate, stream.id)) {
        const row = raw as unknown as OperationRow
        out.push({
          position: row.position,
          opVersion: row.op_version,
          at: row.at,
          operation: JSON.parse(row.operation) as unknown,
        })
      }
      return out
    },
  }
}
