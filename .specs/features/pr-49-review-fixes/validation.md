# pr-49-review-fixes Validation

**Date**: 2026-08-31
**Spec**: `.specs/features/pr-49-review-fixes/spec.md`
**Diff range**: `1bc864e^..HEAD` (commits `1bc864e`, `e0ee294`, `5987432`, `8191a00`, `ad96906`, `6215b1e`, `cf9bf62`)
**Verifier**: independent sub-agent (author ≠ verifier)
**Mode**: Code + tests

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1 — restore cross-contribution attribution guard | ✅ Done | `e0ee294`; `priorEvent` param + `priorEvent.contributionId === event.contributionId`; new regression test added |
| T2 — lint guards (no-self-compare, no-shadow) | ✅ Done | `5987432`; both `error` in `eslint.config.ts` with `no-shadow: 'off'`; 2 benign shadows renamed (`draftSchema`, `nextCommand`) |
| T3 — `wm` → `writeModel` repo-wide | ✅ Done | `8191a00`; `git grep -nw wm -- 'src/**/*.ts'` → nothing; ~20 files, pure rename |
| T4 — NOTE naming corrections | ✅ Done | `ad96906`; `event`→`call`, `value`→`sessionView`, `index`→`issue` |
| T5 — record AD-026 | ✅ Done | `6215b1e`; `.specs/STATE.md` Decisions table, dated 2026-08-31 |
| T6 — correct PR #49 body | ✅ Done | `gh pr view 49` confirms: "381 tests pass", `ts-morph` line corrected ("never added to `package.json` or the lockfile"), `totalTokens`/`outputTokens` sentence gone (now "not token counters"); Review-fixes note lists R1–R5 with commits |

---

## Spec-Anchored Acceptance Criteria

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| **AC1.1** — A then B (B≠A) with identical `attribute-to-other-format` track → stream has **two** events, `contributionId` A and B | event `contributionId` values `['c_1','c_2']` (not a call count) | `src/session-facilitation/capabilities/interpret-contribution/interpret.test.ts:206` — `expect(only('Contribution Attributed To Another Format').map((event) => event.contributionId)).toEqual(['c_1','c_2'])` | ✅ PASS |
| **AC1.2** — same-contribution idempotency guard still holds (same `format`+`note` → no 2nd event for that contribution) | re-derive writes no second event; the `already` check's `contributionId` + `format` + `note` equality is the cross-contribution-independent second line and must not regress | `interpret.ts:127-133` (`already` guard, all three clauses present) + `interpret.test.ts` `it('keeps a distinct out-of-format notice per note, and suppresses an exact repeat')` (`6eef50e`) — one turn, two distinct-note notices + an exact repeat → exactly two events; discriminates the `format` and `note` clauses (kills the `===`→`!==` mutant) | ✅ PASS |
| **AC1.3** — `pnpm check` green | exit 0 | gate run below — exit 0, 381 passed | ✅ PASS |
| **AC2.1** — `no-self-compare` is `error` | `'no-self-compare': 'error'` in `eslint.config.ts` | `eslint.config.ts:89` — `'no-self-compare': 'error'`; scratch probe (`x === x`) → `error no-self-compare` | ✅ PASS |
| **AC2.2** — `@typescript-eslint/no-shadow` is `error`; core `no-shadow` off; 2 benign shadows renamed | both config lines present; `jsonSchema`→`draftSchema`, inner `command`→`nextCommand` | `eslint.config.ts:87-88` — `'no-shadow': 'off'`, `'@typescript-eslint/no-shadow': 'error'`; `scripts/spike-structured-output.ts:86` `draftSchema`; `machine.property.test.ts:66` `nextCommand`; scratch probe (shadowed binding) → `error @typescript-eslint/no-shadow` | ✅ PASS |
| **AC2.3** — `pnpm check` green with both rules active | exit 0 | gate run — exit 0 | ✅ PASS |
| **AC3.1** — every `wm` identifier in `src/` + tests → `writeModel`; types/literals/wire untouched | params, locals, destructured binds only | diffs of `board/decide.ts`, `proposal/evolve.ts`, `read-models/proposals-view.ts`, `session-close.ts`, `accept.ts`, `set-scope/http.ts` etc. — all local `wm`→`writeModel`; `BoardWriteModel`/`ProposalWriteModel`/`emptyProposal`, `v:` keys, event `type` literals intact | ✅ PASS |
| **AC3.2** — no `\bwm\b` identifier remains in `src/` | grep returns nothing | `git grep -nw wm -- 'src/**/*.ts'` → exit 1, no matches; `git grep -n '\bwm\b' -- src/` → nothing | ✅ PASS |
| **AC3.3** — `pnpm check` green; test count unchanged by R3 | 380 after T1, still 380 | gate — 381 passed (T3/T4 added 0 tests; +1 is the AC1.2 follow-up in `6eef50e`) | ✅ PASS |
| **AC4.1** — `model-call-log.test.ts` `ModelCallEntry` local `event`→`call` | both occurrences | `src/plumbing/model-call-log.test.ts:32-41` — `const call = entry()`, `.map((call) => call.responseText)` | ✅ PASS |
| **AC4.2** — `FacilitatorDock.test.ts` `seed(value)` → `seed(sessionView)` incl. `session.view =` | signature + body | `src/app/capture-loop/dock/FacilitatorDock.test.ts:38-42` — `seed = (sessionView: SessionView, …)`, `session.view = sessionView` | ✅ PASS |
| **AC4.3** — `anthropic-adapter.ts` Zod issue param `index`→`issue` | `.issues.map((issue) => …)` | `src/session-facilitation/infrastructure/facilitator/anthropic-adapter.ts:175` — `parsed.error.issues.map((issue) => \`${issue.path.join('.')}: ${issue.message}\`)` | ✅ PASS |
| **AC4.4** — `pnpm check` green | exit 0 | gate — exit 0 | ✅ PASS |
| **AC5.1** — `.specs/STATE.md` gains AD-026 (spell-out identifiers incl. `wm`→`writeModel`, lint-under-enforcement rationale, dated 2026-08-31) | one Decisions row | `.specs/STATE.md:41` — `| AD-026 | **Identifiers are spelled out in full … `wm` is `writeModel`.** … | 2026-08-31 | PR #49 + all later code |` | ✅ PASS |
| **AC6.1** — PR #49 body: real test count; vacuous `ts-morph` line fixed; `totalTokens`/`outputTokens` sentence corrected | live PR body | `gh pr view 49 --json body` — "381 tests pass"; "never added to `package.json` or the lockfile — nothing new ships"; "these index the scripted-facilitator `turns` / `openings` arrays … (not token counters)" — no "brief suggested" text | ✅ PASS |

**Status**: ✅ 17/17 ACs match spec outcome. AC1.2's `format`/`note` clauses were undiscriminated in the first verification run; `6eef50e` adds the discriminating test (see Fix 1).

---

## Discrimination Sensor

Scratch: `cp` of `interpret.ts` to scratchpad, mutate real file, run `npx vitest run interpret.test.ts`, restore from backup. Tree confirmed clean after (`git show HEAD:… | diff` → CLEAN).

| # | File:line | Mutation | Killed? |
| - | --------- | -------- | ------- |
| a | `interpret.ts:129` | Re-introduce B1: `priorEvent.contributionId === event.contributionId` → `event.contributionId === event.contributionId` (the exact shipped bug) | ✅ Killed — new regression test fails (`['c_1'] !== ['c_1','c_2']`), 1 failed / 11 passed |
| b | `interpret.ts:135` | Negate the guard: `if (!already)` → `if (already)` | ✅ Killed — 2 failed / 10 passed (new test + a sibling `attribute-to-other-format` test) |
| c | `interpret.ts:132` | Flip the note clause: `priorEvent.note === track.note` → `priorEvent.note !== track.note` | ⚠️ Survived the first run (12/12 pass) → ✅ Killed after `6eef50e` adds the distinct-note test (see Fix 1) |

Lint-guard efficacy (AC2): scratch file `src/plumbing/__probe.ts` with a shadowed binding and two `x === x` self-compares → `npx eslint` reports `@typescript-eslint/no-shadow` and `no-self-compare` errors. Both rules bite. Restored (file removed).

**Sensor depth**: lightweight (3 behaviour mutations + 1 lint-efficacy probe)
**Result**: first run 2/3 killed (a + b cover B1 and the guard as a whole); `6eef50e` closes the third by adding the distinct-note test, so 3/3 killed. PASS.

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ — T1 is a 5-line param rename + guard fix; no extra abstraction |
| Surgical changes | ✅ — the ~20-file `wm` rename is in scope per the spec's explicit user decision (2026-08-31), not creep |
| No scope creep | ✅ — `op`/`bid`/`sid`/`pid` left untouched as the spec's Out-of-scope demands; only `wm` renamed |
| Matches patterns | ✅ — `writeModel` mirrors the `BoardWriteModel`/`ProposalWriteModel` type names and the PR's own `o`→`operation` style |
| Spec-anchored outcome check | ⚠️ — AC1.1 asserts exact `contributionId` values (good); AC1.2's guard clauses partly unasserted |
| Per-layer coverage expectation | ✅ — the one behavioural change (T1) has a 1:1 AC test; T2–T5 are config/rename/docs with `pnpm check` as the gate |
| Every test maps to a spec requirement | ✅ — the single new test maps to AC1.1; T4's `model-call-log.test.ts` `event`→`call` is a NOTE rename touching lines 32–41 only |
| Documented guidelines followed | ✅ — `AGENTS.md` (no `eslint-disable`, conventional commits, present-tense comments), `docs/tooling-gotchas.md` implicitly (rules added at `error`, `--max-warnings 0` still green) |

Deliberate NOTE: `interpret.ts` comment style — the guard fix carries no process id; the AD-026 row and the eslint comment both cite durable reasoning only. Compliant with the "no process ids in code" rule.

---

## Edge Cases

- [x] Same `format`+`note` across **different** contributions → two events (AC1.1) — covered, mutation-killed.
- [x] `no-shadow` core rule left on elsewhere → explicitly set `'off'` alongside the TS rule (AC2.2).
- [x] `wm` inside comments / unrelated words (`swm`) → none exist; grep confirms.
- [x] Same contribution, same `format`, **different** `note` → two events; covered by `6eef50e`'s `it('keeps a distinct out-of-format notice per note, and suppresses an exact repeat')`.

---

## Gate Check

- **Gate command**: `pnpm check` (typecheck → `eslint . --max-warnings 0` → `vitest run` → depcruise → knip)
- **Result**: exit 0 — 64 test files, **381 passed**, 0 failed, 0 skipped; depcruise 0 violations (183 modules); knip clean
- **Test count before feature**: 379 (PR #49 tip `f7f1347`)
- **Test count after feature**: 381
- **Delta**: +2 (the AC1.1 regression test, plus the AC1.2 follow-up in `6eef50e`) — matches the coverage matrix
- **Skipped tests**: none
- **Failures**: none

---

## Fix Plans

### Fix 1 (Minor / NOTE) — discriminate the `already` guard's field clauses

- **Root cause**: the `already` idempotency guard in `interpret.ts` `case 'attribute-to-other-format'` matches on `contributionId` **and** `format` **and** `note`. Only the `contributionId` clause is exercised (mutation a killed). Flipping `note ===` to `!==` (mutation c) survives — no test re-derives the same contribution's track with a changed `note`.
- **Fix task**: add one unit test in `interpret.test.ts` — one contribution interpreted twice, second turn's `attribute-to-other-format` has the **same `format` but a different `note`** → assert **two** `Contribution Attributed To Another Format` events for that one `contributionId`. (Or, if the domain intent is "one attribution per contribution regardless of note", tighten the guard to key on `contributionId` only and assert the single-event outcome — a Design-time clarification.)
- **Priority**: Minor. Does not block merge — the shipped BLOCK regression (B1) is fully covered.
- **Resolved** — `6eef50e`: added `it('keeps a distinct out-of-format notice per note, and suppresses an exact repeat')` — one turn, two distinct-note `policy` notices + an exact repeat. Kills the `===`→`!==` mutation on both the `format` and `note` clauses (re-checked by hand). Guard kept keying on all three fields (exact-duplicate idempotency key; the `derived_track` ledger is the primary protection). Gate now 381 tests.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| R1 | done — `e0ee294` | ✅ Verified (AC1.2 gap closed by `6eef50e`) |
| R2 | done — `5987432` | ✅ Verified |
| R3 | done — `8191a00` | ✅ Verified |
| R4 | done — `ad96906` | ✅ Verified |
| R5 | done — `6215b1e` | ✅ Verified |
| R6 | done — PR #49 body edited | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 17/17 ACs match the spec-defined outcome (AC1.2's guard-clause gap from the first run closed by `6eef50e`)
**Sensor**: 3/3 guard mutations killed (the third after `6eef50e`). Lint-guard efficacy probe: both `no-self-compare` and `no-shadow` confirmed to error.
**Gate**: `pnpm check` exit 0 — 381 passed, 0 failed, +2 vs baseline

**What works**: the B1 tautology is fixed and mutation-proven (reintroducing the exact bug fails the new test); `no-self-compare` + `no-shadow` are `error` and demonstrably bite; `wm` is gone from `src/` with types/wire shapes intact and the gate green; all NOTE renames landed; AD-026 recorded; PR #49 body corrected on all three points.

**Issues found**: none open. AC1.2's guard-clause gap from the first verification run is closed by `6eef50e` (Fix 1).

**Next steps**: none — the feature is ready. PR #49 targets `main` directly and is mergeable; coordinate merge order with #47 (both edit `package.json`).
