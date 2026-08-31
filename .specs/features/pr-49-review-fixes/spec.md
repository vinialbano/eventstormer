# Spec — PR #49 automated-review fixes

**Feature:** `pr-49-review-fixes`
**Branch:** `refactor/explicit-names` (PR #49)
**Source:** the posted automated review on PR #49 — 1 BLOCK, 1 WARN, 4 NOTE.
**Scope decision (user, 2026-08-31):** land everything, including the repo-wide `wm` → `writeModel`
rename; record the naming decision as an AD.

PR #49 is itself a pure-refactor PR ("spell out identifiers + lint rules that enforce it"). These
fixes stay in that character: one real behavioural regression the refactor introduced, plus
naming/guard consistency. No product behaviour changes except R1 (which restores base behaviour).

---

## Requirements

### R1 — the shadowing tautology must not drop a domain event  *(BLOCK)*

`src/session-facilitation/capabilities/interpret-contribution/interpret.ts`, `deriveTracks`,
`case 'attribute-to-other-format'`. The `.some(...)` callback param was renamed `e` → `event` and
now shadows the enclosing `deriveTracks(deps, event: Interpreted)` param, so
`event.contributionId === event.contributionId` is a constant `true`. The idempotency guard that
should suppress a **repeat** attribution *for the same contribution* instead suppresses any
attribution whose `format` + `note` match an **earlier, different** contribution's.

**AC1.1** — Within one session: contribution A interpreted with an `attribute-to-other-format`
track (`format = F`, `note = N`) writes one `Contribution Attributed To Another Format` event for
A. Then contribution B (B ≠ A) interpreted with an identical track (`format = F`, `note = N`)
writes its **own** `Contribution Attributed To Another Format` event for B. After both, the
session stream contains **two** such events — one `contributionId = A`, one `contributionId = B`.

**AC1.2** — The same-contribution idempotency guard still holds: re-running `deriveTracks` for a
contribution that already has an `attribute-to-other-format` event with the same `format` + `note`
writes **no** second event for that contribution. (This is `reconcilePendingDerivations` /
re-interpretation safety — already implicitly covered by the `derived_track` ledger, but the
`already` check is the cross-contribution-independent second line and must not regress.)

**AC1.3** — `pnpm check` green.

### R2 — a lint guard so this class of collision fails CI, not silently ships  *(review recommendation)*

**AC2.1** — `no-self-compare` (ESLint core) is `error` in `eslint.config.ts`. It flags an
`x === x` comparison — it would have caught R1.

**AC2.2** — `@typescript-eslint/no-shadow` is enabled (`error`) in `eslint.config.ts`. The two
pre-existing benign shadows it surfaces (`scripts/spike-structured-output.ts` `jsonSchema`,
`src/session-facilitation/domain/proposal/machine.property.test.ts` `command`) are resolved by
renaming the inner binding — no behaviour change.

**AC2.3** — `pnpm check` green with both rules active.

### R3 — `wm` → `writeModel` repo-wide  *(WARN — the owner flagged it in 5 inline comments)*

The refactor expands `o`→`operation`, `cmd`→`command`, `r`→`row`, `e`→`event` but left `wm`
(≈55 occurrences across 13 source files + tests) untouched — it clears `id-length: { min: 2 }`
and isn't an abbreviation `unicorn/name-replacements` knows, so the new rules don't enforce the
PR's own goal for it.

**AC3.1** — Every `wm` identifier (parameter, local, and destructured binding) in `src/` and its
tests is renamed `writeModel`. Type names, other identifiers, string literals, and any
persisted/wire shape are untouched.

**AC3.2** — No `\bwm\b` identifier remains in `src/` (verified by grep; matches inside comments or
unrelated words like `swm` don't count — there are none).

**AC3.3** — `pnpm check` green; test count unchanged from before R3 (pure rename).

### R4 — NOTE-level naming corrections  *(NOTE 1–3)*

**AC4.1** — `src/plumbing/model-call-log.test.ts`: the `ModelCallEntry` local renamed `event` →
`call` (matches `logModelCall` / the "one JSONL line per call" docstring; `entry` itself would
shadow the module-level `entry()` factory).

**AC4.2** — `src/app/capture-loop/dock/FacilitatorDock.test.ts`: `seed(value: SessionView, …)` →
`seed(sessionView: SessionView, …)` (`value` is contentless; bare `view` would shadow the
module-level `view()` factory).

**AC4.3** — `src/session-facilitation/infrastructure/facilitator/anthropic-adapter.ts`: the Zod
issue callback param `index` → `issue` (`parsed.error.issues.map((issue) => …)`).

**AC4.4** — `pnpm check` green.

### R5 — decision record  *(review follow-up; user asked for an AD)*

**AC5.1** — `.specs/STATE.md` Decisions table gains **AD-026** recording that project-abbreviation
identifiers are spelled out in full (`wm` → `writeModel`), with the rationale that the two lint
rules under-enforce sub-`min:2` / unknown abbreviations so the convention is carried by review +
this precedent, and dated `2026-08-31`.

### R6 — PR body accuracy  *(NOTE 4 — merge-record hygiene)*

**AC6.1** — The PR #49 description is updated: the test-count claim reflects the real number after
these fixes; the vacuous "`ts-morph` … has been removed from `package.json`" line is removed or
corrected (it was never in `package.json` / the lockfile on `main`); the "the brief suggested
`totalTokens` / `outputTokens`" sentence is corrected (no such text exists — the
`turnIndex`/`openingIndex` rename decision stands on its own: those index `turns[]` / `openings[]`).

---

## Out of scope

- Restacking PR #49 onto `main` after the base branch lands (tracked in STATE.md Handoff; not part
  of this fix batch).
- Any `op` / `bid` / `sid` / `pid` renames (review listed them as optional quick wins, not the
  WARN; the user's scope decision named only `wm`).
- The `#47` `package.json` merge-order coordination (noted in the review; a merge-time concern).

---

## Traceability

| Req | Tasks | Status |
| --- | ----- | ------ |
| R1  | T1    | ✅ Verified — `e0ee294`; AC1.2 gap closed by follow-up test `6eef50e` (guard `format`/`note` clauses now pinned) |
| R2  | T2    | ✅ Verified — `5987432` |
| R3  | T3    | ✅ Verified — `8191a00` |
| R4  | T4    | ✅ Verified — `ad96906` |
| R5  | T5    | ✅ Verified — `6215b1e` |
| R6  | T6    | ✅ Verified — PR #49 body edited |

Validation: `.specs/features/pr-49-review-fixes/validation.md` (2026-08-31) — PASS, gate green (381 tests, +2), sensor 3/3 killed.
