# Spec — PR #51 automated-review fixes

**Feature:** `pr-51-review-fixes`
**Branch:** `test/suite-hardening` (PR #51)
**Source:** the posted automated review on PR #51 — 0 BLOCK, 1 WARN, 4 NOTE, 3 quick wins.
**Scope decision (user, 2026-08-31):** land the WARN, the actionable NOTEs, and the cheap quick
wins. Skip the Playwright Chromium cache (conflicts with #48 on `ci.yml`) and do not change the
`contentWords` length>2 tokenizer (NOTE 3 matches the design.md Tech Decision).

---

## Requirements

### R1 — live Anthropic must not sit on a Vitest `*.test.ts`  *(WARN W1)*

`eval/eval.test.ts` wraps `runEval` (4×5 live `interpret`, 600s, no k/N assertion). `pnpm test`
and CI `check` are safe (`--project domain --project app`), but bare `vitest run` loads every
project. Open PRs #47 (`"test": "vitest run"`) and #48 (CI `vitest run --coverage` with no
`--project`) would put live Anthropic on a gate this PR promised to keep off.

**AC1.1** — `eval/eval.test.ts` does not exist.

**AC1.2** — `pnpm eval` remains `jiti eval/run.ts`. `knip.json` still lists `eval/run.ts` as an
entry (the CLI is otherwise an unused file).

**AC1.3** — `eval/report.test.ts` still exists and still runs only under the Vitest `eval`
project (not under `pnpm test`).

**AC1.4** — `pnpm check` green. `ANTHROPIC_API_KEY= pnpm eval` still exits non-zero.

### R2 — dock edit types into the textbox, not a BEM class  *(NOTE 4 + QW)*

**AC2.1** — `FacilitatorDock.test.ts` “edit POSTs the new label” locates the draft field as an
`input` (same query `ProposalCard.test.ts` already uses), not `.pc__input`.

**AC2.2** — The POST assertion is unchanged: `POST /api/proposals/p1/edit` with
`{ label: 'Invoice sent' }`.

**AC2.3** — `pnpm check` green.

### R3 — docs name the shipped eval runner  *(NOTE 1, NOTE 2 + QW)*

**AC3.1** — ADR-008 Eval section states: live eval is `pnpm eval` (`jiti eval/run.ts`), out of
CI; a Vitest `eval` project hosts reporter unit tests only; `pnpm test` is
`--project domain --project app`. Present tense, current state — no “used to be Vitest” narration.

**AC3.2** — `test-suite-hardening/design.md` Eval runner Decision matches AC3.1 (jiti CLI; Vitest
`eval` project is `report.test.ts` only).

**AC3.3** — `test-suite-hardening/spec.md` Success Criteria says a failure in either CI `check`
or `e2e` **fails the workflow** — not that GitHub required status checks exist.

**AC3.4** — PR #51 body test-plan item matches AC3.3 (workflow-fail, not “both required”).

---

## Out of scope

| Item | Reason |
| --- | --- |
| `contentWords` English stoplist (NOTE 3) | design.md Tech Decision is tokens length > 2; Slice 5 owns the fuller grader |
| Playwright Chromium cache on the `e2e` job | quick win tagged high conflict vs #48 `ci.yml` |
| GitHub branch protection / required checks | repo never required `check` either; not this PR’s job |
| Re-exporting facilitator internals through `api.ts` | REFUTED — `eval/` is not a bounded context |
| Changing `notFlagPhase` empty-track semantics or the near-miss fixture | REFUTED against ADR-008’s named example |

**Remaining dimensions N/A for this scope** (docs + delete one test file + one selector).

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| NOTE 3 left unchanged | keep length>2 tokenizer | Matches written design; user said fix notes, not re-litigate the v1 heuristic | y — user: fix warns/notes + consider QWs; review itself downgraded this |
| Chromium cache | skip | #48 conflict; review said defer | y — review |

**Open questions:** none.

---

## Requirement Traceability

| Req | Status |
| --- | --- |
| R1 | ✅ Verified |
| R2 | ✅ Verified |
| R3 | ✅ Verified |

---

## Success Criteria

- [x] No `eval/**/*.test.ts` file calls `runEval`.
- [x] Dock edit test does not mention `.pc__input`.
- [x] ADR-008, design.md, spec Success Criteria, and the PR #51 test plan agree: `pnpm eval` is
  jiti; CI `check`/`e2e` fail the workflow when red.
