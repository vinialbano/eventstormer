/**
 * A source of the current time as an ISO-8601 UTC string. The application layer
 * holds one and stamps `at` on an operation before it is written; it is
 * never reached into the domain. Tests pass a fixed clock.
 */
export type Clock = () => string

export const systemClock: Clock = () => new Date().toISOString()
