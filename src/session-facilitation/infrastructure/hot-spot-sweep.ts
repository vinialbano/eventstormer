/**
 * The `hot_spot_sweep` marker table — a `sweep_key` row means the hot-spot
 * reconciliation pass has already raised the hot spot that key stands for
 * (`kg:<questionId>` | `absent:<questionId>:<slug>` | `q:<questionId>` |
 * `proposal:<proposalId>`), so a later tick skips it.
 *
 * The DB handle is structural so this module never imports `node:sqlite`.
 */
interface Statement {
  all(...params: (string | number)[]): unknown[]
  run(...params: (string | number)[]): unknown
}
export interface HotSpotSweepDb {
  prepare(sql: string): Statement
}

interface Row {
  sweep_key: string
}

/** Every raised sweep key. */
export const readSweptKeys = (db: HotSpotSweepDb): Set<string> => {
  const rows = db.prepare('SELECT sweep_key FROM hot_spot_sweep').all() as Row[]
  return new Set(rows.map((row) => row.sweep_key))
}

/** Record that the hot spot for one sweep key is on the board. Idempotent. */
export const markSwept = (
  db: HotSpotSweepDb,
  key: string,
  buildingBlockId: string,
  at: string,
): void => {
  db.prepare(
    'INSERT OR IGNORE INTO hot_spot_sweep (sweep_key, building_block_id, at) VALUES (?, ?, ?)',
  ).run(key, buildingBlockId, at)
}
