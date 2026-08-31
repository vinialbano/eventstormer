/**
 * The explicit-outcome type the domain returns instead of throwing for a
 * rejection (ADR-003). Kept minimal — extend on use, not on spec; `neverthrow`
 * is held in reserve if the combinator set ever grows past what is earned.
 */
export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E }

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value })

export const err = <E>(error: E): Result<never, E> => ({ ok: false, error })

export const isOk = <T, E>(result: Result<T, E>): result is { ok: true; value: T } => result.ok

export const isErr = <T, E>(result: Result<T, E>): result is { ok: false; error: E } => !result.ok

/** Transform the value of an `ok`; an `err` passes through untouched. */
export const map = <T, E, U>(result: Result<T, E>, transform: (value: T) => U): Result<U, E> =>
  result.ok ? ok(transform(result.value)) : result

/** Chain a fallible step; an `err` short-circuits without calling `transform`. */
export const andThen = <T, E, U, F>(
  result: Result<T, E>,
  transform: (value: T) => Result<U, F>,
): Result<U, E | F> => (result.ok ? transform(result.value) : result)
