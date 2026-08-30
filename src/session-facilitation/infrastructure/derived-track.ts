/**
 * The `derived_track` marker table — a `(contribution_id, track_index)` row means
 * that interpreted track has been derived (AD-021), so `reconcile` skips it and
 * `sessionView` can tell `interpreted` from `derived`.
 *
 * The DB handle is structural so this module never imports `node:sqlite`.
 */
interface Statement {
  all(...params: (string | number)[]): unknown[]
  run(...params: (string | number)[]): unknown
}
export interface DerivedTrackDb {
  prepare(sql: string): Statement
}

interface Row {
  contribution_id: string
  track_index: number
}

/** Every derived-track marker as a `${contributionId}::${trackIndex}` key set. */
export const readDerivedTrackKeys = (db: DerivedTrackDb): Set<string> => {
  const rows = db.prepare('SELECT contribution_id, track_index FROM derived_track').all() as Row[]
  return new Set(rows.map((r) => `${r.contribution_id}::${String(r.track_index)}`))
}

/** Mark one interpreted track derived (AD-021). Idempotent — a repeat is a no-op. */
export const markDerivedTrack = (
  db: DerivedTrackDb,
  contributionId: string,
  trackIndex: number,
): void => {
  db.prepare(
    'INSERT OR IGNORE INTO derived_track (contribution_id, track_index) VALUES (?, ?)',
  ).run(contributionId, trackIndex)
}
