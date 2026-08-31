# Test-suite hardening Context

**Gathered:** 2026-08-31
**Spec:** `.specs/features/test-suite-hardening/spec.md`
**Status:** Ready for design

---

## Feature Boundary

Harden the existing test harness and add the minimal F11 eval: CI-gated capture-loop E2E,
independent replay/persistence oracles, domain tests for shipped Session/Proposal branches,
SPA/HTTP negatives the one E2E skips, gate/docs alignment, and `pnpm eval` (4 restaurant cases,
N=5, k/N, out of CI). No product behaviour change except what a failing test forces.

---

## Implementation Decisions

### Eval

- Minimal live eval, not a scaffold and not deferred to Slice 5.
- Four restaurant/kitchen cases covering the PRD-named F11 ACs only.
- N=5, per-assertion `k/5`, no headline aggregate.
- Out of CI. Fail loud without `ANTHROPIC_API_KEY`.
- Few-shot stays library lending.

### E2E gate

- Separate CI job, Chromium only, existing `playwright.config.ts`.
- Not part of `pnpm check` or pre-push.

### Agent's Discretion

- Pre-push = `pnpm check` (adds lint).
- Eval oracles as pure functions under the facilitator infrastructure folder, unit-tested in `pnpm test`.
- README eval markers wrap a placeholder until a live `--report` run.
- Playwright install in-job via `pnpm exec playwright install --with-deps chromium`.
- New UI tests use role/label; existing BEM assertions are left alone.

### Declined / Undiscussed Gray Areas → Assumptions

See spec Assumptions table (pre-push, oracle placement, README placeholder, Playwright install). Logged, not silent.

---

## Specific References

- testing-boss report 2026-08-31 (ranked: E2E gate, eval, self-referential oracles, Session/Proposal holes, gate/docs).
- ADR-008 eval shape (Vitest project, restaurant domain, N=5, k/N, out of CI, README markers).
- PRD F11 ACs (near-miss, kept phrasing vs transcript content words).
- `docs/testing.md`: pin literals, not `replay` vs `project`.
- L-001 candidate (fold vs fold stays green).

---

## Deferred Ideas

- Full 8-case eval + `--replay` + `pnpm seed` (Slice 5 / ADR-010).
- Mutation probe, coverage glob ≥90%, axe on the E2E spec.
- Host `createRoutes` contribution→accept→board GET.
- Board relation property tests when `sequence` / `insert-between` ship.
