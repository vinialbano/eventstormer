import { applyMigrations, type Migration, type MigrationDb } from '~/plumbing/event-store/migrations.ts'

/**
 * `session-facilitation`'s projection tables. They live in the same SQLite file
 * as the operation log (transactional locality) but are this context's own — so
 * they carry their own id sequence, tracked in `_sf_migrations`, never colliding
 * with the operation-log set. Additive-only, same as ADR-004: no `up` string
 * drops a column.
 *
 * - `session_index` — one row per session; `UNIQUE(workshop_id) WHERE
 *   status='open'` doubles as the one-open-session-per-workshop constraint.
 * - `derived_track` — a marker table; a `(contribution_id, track_index)` row
 *   means that interpreted track has been derived, so `reconcile` can
 *   skip it.
 * - `hot_spot_sweep` — a marker table; a `sweep_key` row means the hot-spot
 *   reconciliation pass has already raised the hot spot that key stands for, so
 *   a later tick skips it.
 */
export const SESSION_FACILITATION_MIGRATIONS: readonly Migration[] = [
  {
    id: 1,
    up: `
      CREATE TABLE session_index (
        workshop_id TEXT    NOT NULL,
        session_id  TEXT    NOT NULL PRIMARY KEY,
        status      TEXT    NOT NULL CHECK (status IN ('open', 'closed')),
        started_at  TEXT    NOT NULL,
        closed_at   TEXT
      );
      CREATE UNIQUE INDEX session_index_one_open
        ON session_index (workshop_id) WHERE status = 'open';
      CREATE TABLE derived_track (
        contribution_id TEXT    NOT NULL,
        track_index     INTEGER NOT NULL,
        PRIMARY KEY (contribution_id, track_index)
      );
    `,
  },
  {
    id: 2,
    up: `
      CREATE TABLE hot_spot_sweep (
        sweep_key        TEXT NOT NULL PRIMARY KEY,
        building_block_id TEXT NOT NULL,
        at               TEXT NOT NULL
      );
    `,
  },
]

export const applySessionFacilitationMigrations = (db: MigrationDb): void => {
  applyMigrations(db, SESSION_FACILITATION_MIGRATIONS, '_sf_migrations')
}
