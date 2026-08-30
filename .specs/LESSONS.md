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

## Quarantined (failed when applied — ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
