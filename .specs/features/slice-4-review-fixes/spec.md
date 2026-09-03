# Slice 4 — PR #90 review fixes

**Status**: In progress — Execute.
**Parent**: `.specs/features/slice-4-hot-spots-close/` (same unreleased slice; no separate changeset).
**Scope**: the automated review on PR #90 — 2 BLOCK, 2 doc-hygiene WARN, 1 doc NOTE. W1 taken at
the soft-default tier; quick-win #1 (retry escalation) deferred — needs a marker-table migration
and only triggers under contract drift that cannot happen at v1 single-user scale.

## Requirements

| ID | Requirement | Acceptance |
| --- | --- | --- |
| RF-1 (B1) | The close/fact hot-spot sweep is idempotent across a lost marker write. A retry after the board append committed but `markSwept` did not must re-attempt with the **same** building-block id, so the board answers `duplicate-id` and no second hot spot is raised. | `reconcileHotSpots` run twice with the `hot_spot_sweep` row deleted between runs leaves exactly one hot spot on the board for the key; the id is derived from `workshopId` + sweep key, not random. |
| RF-2 (B2) | A partial `finishClose` is retried. The `session_index` row flips to `closed` only after the proposal-lapse loop and `reconcileHotSpots` have both run, so `reconcilePendingDerivations` (open sessions only) re-runs a close that failed partway. | With a board append that fails on the first pass, `finishClose` leaves the index row `open`; the next `reconcilePendingDerivations` tick completes the close (hot spots raised, row `closed`). A fully successful `finishClose` still ends with the row `closed`. |
| RF-3 (W1) | `Workshop.decide(Choose Problem)` qualifies the chosen problem `firm` only when a completed stakeholder check is on record; absent or incomplete check → `provisional`. | `Choose Problem` with no `Stakeholder Check Recorded` yields `qualification: 'provisional'`; with a complete check → `firm`; with an incomplete check → `provisional`. |
| RF-4 (W2) | No `domain/` comment narrates a divergence from a `.specs/` doc. The `modelAffecting` field comments on `interpreted-track.ts` and `events.ts` keep the durable type-widening rationale and drop the `SPEC_DEVIATION` / "design says" framing. | `grep -R "SPEC_DEVIATION\|design says" src/` returns nothing; the type reason is still documented. |
| RF-5 (W3 + NOTE3) | `spec.md`, `context.md`, `design.md`, `tasks.md` for the parent slice describe the shipped AD-032 choreography, not the abandoned AD-019 event bus, and carry a done Verifier status. `design.md` field name matches the code (`detail?`, not `absentDetail?`). | No "event bus" / "AD-019 built here" / "Verifier pending" / "absentDetail" left in the four docs except where explicitly marked superseded. |

## Out of scope (tracked, not fixed here)

- Quick win #1 — retry-forever escalation on a permanent board rejection (needs a migration).
- NOTE 1, NOTE 2 — sub-millisecond synchronous windows, low priority at v1.
- NOTE 4 / PR-body follow-ups — already queued for slice 6 in `STATE.md`.
- W1 hard-reject tier — ordering stays enforced by the ceremony UI + sensor, not the aggregate.
