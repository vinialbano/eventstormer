/**
 * The op log is append-only forever: an operation written under version 1 must
 * still replay after the schema changes. Every operation carries this tag from
 * the first commit, because versioning a log retroactively is the single most
 * expensive thing on the backlog.
 *
 * Bump on any change to an operation's shape. Never mutate an existing shape.
 */
export const OP_SCHEMA_VERSION = 1 as const

/** Versions this build knows how to replay. Append, never remove. */
export const REPLAYABLE_OP_SCHEMA_VERSIONS: readonly number[] = [OP_SCHEMA_VERSION]

export function canReplay(version: number): boolean {
  return REPLAYABLE_OP_SCHEMA_VERSIONS.includes(version)
}
