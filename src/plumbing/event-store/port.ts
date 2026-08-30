import type { Result } from '../result.ts'

/**
 * A log stream, namespaced per bounded context + aggregate (ADR-003). No
 * context reads another's streams. Slice 0 uses
 * `domain-model-capture` / `board` / `<workshopId>`.
 */
export interface StreamKey {
  context: string
  aggregate: string
  id: string
}

/**
 * What the application layer hands `append`: the operation payload, the schema
 * version it was written under, and the `at` timestamp stamped from the Clock.
 * The store assigns `position`.
 */
export interface StoredOperationInput {
  at: string
  opVersion: number
  operation: unknown
}

export interface StoredOperation extends StoredOperationInput {
  position: number
}

/**
 * Optimistic-concurrency failure: the stream advanced past the position this
 * caller last saw. Transient — the handler reloads, re-decides, re-appends.
 */
export interface AppendConflict {
  kind: 'stale-position'
  actual: number
  classification: 'transient'
}

/**
 * Synchronous: every implementation is synchronous — `node:sqlite`'s
 * `DatabaseSync`, the `better-sqlite3` escape hatch, and the in-memory impl.
 * Slice 2+ handlers call it fine from inside async Hono routes.
 */
export interface EventStore {
  /**
   * Commit an ordered batch of ≥1 operations in one transaction. `expectedPosition`
   * is the caller's last-seen position (`-1` for a new stream); a mismatch returns
   * an `AppendConflict` and writes nothing. No partial batch is ever observable.
   */
  append(
    stream: StreamKey,
    expectedPosition: number,
    ops: StoredOperationInput[],
  ): Result<{ nextPosition: number }, AppendConflict>

  /** The stream's full operation list, in log order. */
  read(stream: StreamKey): StoredOperation[]
}
