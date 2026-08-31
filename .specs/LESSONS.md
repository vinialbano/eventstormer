# LESSONS — auto-maintained by scripts/lessons.py

> Machine-owned. Do NOT hand-edit. Changes are overwritten on the next `lessons.py` write.
> Canonical state lives in `.specs/lessons.json`. Edit lessons only via the script.
> promote_threshold=2 distinct features · window_days=45 · quarantine_threshold=2

## Confirmed (load these at Specify/Design)

Corroborated across multiple features. Safe to apply as guidance.

_none_

## Candidates (under observation — do NOT load as guidance yet)

Seen once or not yet corroborated. Tracked, not trusted.

### L-001 — When testing a reducer/fold that sets a field, assert against a value distinct from the input state's prior value — asserting the block's label 'same' after rewording it to 'same', or comparing replay(log) only to a project-built incremental, lets a fold that stops writing the field pass green.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `domain/fold-tests` · harmful: 0
- features: slice-0-skeleton-irreversibles
- evidence: src/domain-model-capture/domain/board/project.test.ts:38 (domain/fold-tests)
- last seen: 2026-08-29T21:53:38Z

### L-002 — Spec AC listing row/record fields ('each row SHALL include the author') is satisfiable two ways — a dedicated column or a field inside the serialized payload; the implementation chose the latter (author lives in operation JSON). Flag which one the AC means at Design time.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `plumbing/event-store` · harmful: 0
- features: slice-0-skeleton-irreversibles
- evidence: S0-11 AC4 (plumbing/event-store)
- last seen: 2026-08-29T21:53:44Z

### L-003 — When idempotency has a dedicated ledger/marker AND redundant downstream no-op guards, add a test that removes the marker and asserts the effect re-derives — otherwise a regression that drops the marker check passes CI.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `session-facilitation/capabilities;idempotency;tests` · harmful: 0
- features: slice-1-capture-loop
- evidence: src/session-facilitation/capabilities/interpret-contribution/interpret.ts:89 (session-facilitation/capabilities;idempotency;tests)
- last seen: 2026-08-30T22:37:18Z

### L-004 — For a 'SHALL NOT call X again' idempotency edge case, spy on X and assert call-count == 1 across retries; asserting only the end-state (one entity, reused id) passes even when the guard is removed.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `cross-context;accept-chain;tests` · harmful: 0
- features: slice-1-capture-loop
- evidence: src/session-facilitation/capabilities/review-proposal/accept.ts:75 (cross-context;accept-chain;tests)
- last seen: 2026-08-30T22:37:18Z

### L-005 — When a test asserts an error CLASSIFICATION, drive the input so only the correct branch reaches the asserted outcome (e.g. an always-failing 429 forces the retry ladder to exhaust); a short script where the schema-retry and ladder-walk paths both succeed proves nothing.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `src/session-facilitation/infrastructure/facilitator` · harmful: 0
- features: slice-1-review-fixes
- evidence: mutant-1: anthropic-adapter.ts classifyThrown RETRYABLE_STATUS (src/session-facilitation/infrastructure/facilitator)
- last seen: 2026-08-31T05:47:22Z

## Quarantined (failed when applied — ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
