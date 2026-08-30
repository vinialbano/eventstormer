/**
 * The sole cross-context surface for session-facilitation (ADR-002). Other
 * contexts and the composition root reach this context only through here —
 * never its `domain/`, `capabilities/`, or `infrastructure/`.
 *
 * Capability routers (`start-workshop`, `set-scope`, `start-session`,
 * `make-contribution`, `review-proposal`, `close-session`) and the
 * interpretation tick functions (`interpretContribution`,
 * `reconcilePendingDerivations`, `askOpeningQuestion`) are re-exported here as
 * their slices land — wired into `host/` in T24.
 */
export {}
