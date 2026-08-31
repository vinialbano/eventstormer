# pr-51-review-fixes Validation

**Date**: 2026-08-31
**Spec**: `.specs/features/pr-51-review-fixes/spec.md`
**Diff range**: `8e149f7..HEAD` (eeabbf5, f12a3a0, 14d07da)
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

No `tasks.md` for this feature. Three commits map 1:1 to the three requirements:

| Task | Status | Notes |
| ---- | ------ | ----- |
| R1 — drop leftover live Vitest wrapper | ✅ Done | `eeabbf5` deletes `eval/eval.test.ts` |
| R2 — dock edit queries `input` | ✅ Done | `f12a3a0` |
| R3 — docs name jiti + workflow-fail | ✅ Done | `14d07da` |

---

## Spec-Anchored Acceptance Criteria

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| ------------------------- | -------------------- | ----------------------- | ------ |
| AC1.1 `eval/eval.test.ts` does not exist | File absent on the real tree | Filesystem: `test ! -f eval/eval.test.ts` (exit 0). `git grep -n runEval -- '*.test.ts'` on the real tree: no matches. Remaining `eval/*.test.ts` is only `eval/report.test.ts`. | ✅ PASS |
| AC1.2 `pnpm eval` remains `jiti eval/run.ts`; knip still lists `eval/run.ts` as an entry | Script is jiti, not Vitest; knip.json entry kept | `package.json:21` — `"eval": "JITI_TSCONFIG_PATHS=1 jiti eval/run.ts"`; `knip.json:6` — `"eval/run.ts"` in `entry`. `pnpm knip` green (hint only: redundant entry pattern). | ✅ PASS |
| AC1.3 `eval/report.test.ts` still exists and still runs only under the Vitest `eval` project (not under `pnpm test`) | Reporter tests exist; `pnpm test` is domain+app only | `eval/report.test.ts:14-46` — `expect(spliceEvalResults(…))` / `expect(markdown).toBe(\`\| Case \| Assertion \| Passed \|\`)` / `expect(markdown).not.toMatch(/%/)`. `vite.config.ts:80-84` — `name: 'eval'`, `include: ['eval/**/*.test.ts']`. `package.json:17` — `"test": "vitest run --project domain --project app"`. Verifier ran `pnpm exec vitest run --project eval` → 1 file / 4 tests passed (`report.test.ts` only). | ✅ PASS |
| AC1.4 `pnpm check` green; `ANTHROPIC_API_KEY= pnpm eval` exits non-zero | Gate green; eval fail-closed | Gate: 404 passed, 0 failed. `ANTHROPIC_API_KEY= pnpm eval` → exit 1, stderr `ANTHROPIC_API_KEY is not set — add it to .env.local before running \`pnpm eval\`.` (`eval/run.ts:93-96` throw; `:208-214` `process.exit(1)`). | ✅ PASS |
| AC2.1 FacilitatorDock “edit POSTs the new label” locates the draft field as an `input`, not `.pc__input` | Same query `ProposalCard.test.ts` already uses | `src/app/capture-loop/dock/FacilitatorDock.test.ts:326` — `await wrapper.get('input').setValue('Invoice sent')`. `ProposalCard.test.ts:62` — `const input = wrapper.get('input')`. `git grep` for `.pc__input` in `FacilitatorDock.test.ts`: no matches. | ✅ PASS |
| AC2.2 POST assertion unchanged: `POST /api/proposals/p1/edit` with `{ label: 'Invoice sent' }` | Exact URL + JSON body | `FacilitatorDock.test.ts:332-335` — `expect(fetchMock).toHaveBeenCalledWith('/api/proposals/p1/edit', expect.objectContaining({ method: 'POST', body: JSON.stringify({ label: 'Invoice sent' }) }))`. Diff vs `8e149f7`: selector line only. | ✅ PASS |
| AC2.3 `pnpm check` green | Same as AC1.4 | 404 passed, 0 failed, 0 skipped. | ✅ PASS |
| AC3.1 ADR-008 Eval section: live eval is `pnpm eval` (`jiti eval/run.ts`), out of CI; Vitest `eval` project hosts reporter unit tests only; `pnpm test` is `--project domain --project app`. Present tense — no “used to be Vitest” narration | Current-state wording | `docs/adr/008-testing-eval-and-observability.md:39` — `### Eval — \`jiti\` CLI + a hand-rolled reporter`. `:41-43` — “Live eval is `pnpm eval` (`jiti eval/run.ts`), **out of CI**. A third `test.projects` entry (`name: 'eval'`, node env) hosts reporter unit tests only; `pnpm test` is `vitest run --project domain --project app` so that project never joins the merge gate.” Grep for “used to be” / “previously” / “refactored” in that file: none. | ✅ PASS |
| AC3.2 `test-suite-hardening/design.md` Eval runner Decision matches AC3.1 | jiti CLI; Vitest `eval` project is `report.test.ts` only | `design.md:106-110` — “`pnpm eval` → `jiti eval/run.ts` (CLI so `--report` is on `argv`). A Vitest project `name: 'eval'` … hosts `eval/report.test.ts` only — not the live loop. `pnpm test` is `--project domain --project app`.” `design.md:189` — `\| Eval runner \| \`jiti eval/run.ts\`; Vitest \`eval\` project hosts reporter tests only \| ADR-008 \|`. | ✅ PASS |
| AC3.3 `test-suite-hardening/spec.md` Success Criteria says a failure in either CI `check` or `e2e` **fails the workflow** — not that GitHub required status checks exist | Workflow-fail wording | `spec.md:254` — “CI `check` and `e2e` both run on push/PR; a failure in either fails the workflow. `pnpm check` locally does not boot Playwright.” Diff vs `8e149f7` replaced “CI on this branch shows `check` and `e2e` both required”. Grep of Success Criteria for “required status”: none. | ✅ PASS |
| AC3.4 PR #51 body test-plan item matches AC3.3 | Workflow-fail, not “both required” | `gh pr view 51 --json body` Test plan: “CI `check` and `e2e` jobs both green (a failure in either fails the workflow)”. Not “both required”. | ✅ PASS |

**Status**: ✅ All ACs covered

---

## Discrimination Sensor

Scratch worktree: `git worktree add --detach /tmp/pr51-fix-verify HEAD` (HEAD `14d07da`). Discarded with `git worktree remove --force`. Real tree never mutated.

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ----------- | ------- |
| 1 (R2)   | `src/app/capture-loop/dock/ProposalCard.vue:86-93` | Draft field `<input v-model="draft">` → `<textarea v-model="draft">` (class kept). Ran `pnpm exec vitest run --project app src/app/capture-loop/dock/FacilitatorDock.test.ts`. | ✅ Killed — `FacilitatorDock.test.ts:326` `wrapper.get('input')` → `Error: Unable to get input` (DOM showed `<textarea class="pc__input">`). 1 failed / 20 passed. Exit 1. |
| 2 (R1)   | `eval/eval.test.ts` (recreated; imports `runEval`) | Confirm `pnpm test` (domain+app) still passes — expected. `rg -n runEval --glob '*.test.ts'` found `eval/eval.test.ts:2` and `:8`. `git grep -n runEval -- '*.test.ts'` on tracked files: no matches (file untracked). Real tree: `test ! -f eval/eval.test.ts`. | N/A-filesystem — `pnpm test` exit 0, 404 passed. Gate does not load `eval/`. AC1.1 is a filesystem invariant; no existing test kills re-adding the file. Did not invent a test. |
| 3        | — | Optional `package.json` eval script → `vitest run --project eval` (docs-staleness). | ⏭️ Skipped — docs AC; unhelpful vs R2/R1 |

**Sensor depth**: lightweight
**Result**: 1/1 killable mutants killed; R1 sensor N/A-filesystem as specified — PASS ✅

---

## Interactive UAT Results (if performed)

Not performed. Docs + delete leftover test + one selector; no user-facing product flow change.

---

## Code Quality

| Principle        | Status |
| ---------------- | ------ |
| Minimum code     | ✅     |
| Surgical changes | ✅     |
| No scope creep   | ✅     |
| Matches patterns | ✅     |
| Spec-anchored outcome check (asserted values match spec) | ✅ |
| Per-layer Coverage Expectation met (domain 1:1 ACs; routes happy+edge+error) | ✅ N/A — no domain/route code; selector + file-delete + docs |
| Every test maps to a spec requirement — no unclaimed tests | ✅ no new tests; dock edit maps to AC2.1/AC2.2; deleted `eval.test.ts` is AC1.1 |
| Documented guidelines followed: `docs/testing.md`, `AGENTS.md` (present tense; process ids out of code; no `--no-verify`) | ✅ |

Coding-principles.md: no extra features, no single-use abstractions, no unrelated cleanup, test assertion not weakened (selector strengthened from BEM class to element type; POST body identical).

---

## Edge Cases

Spec: remaining dimensions N/A for this scope (docs + delete one test file + one selector).

- [x] Out of scope left alone: `contentWords` tokenizer, Playwright Chromium cache, GitHub branch protection, `notFlagPhase` near-miss fixture — not in `8e149f7..HEAD`.

---

## Gate Check

- **Gate command**: `pnpm check` (no `tasks.md`; AGENTS.md / spec AC1.4 + AC2.3)
- **Result**: 404 passed, 0 failed, 0 skipped
- **Test count before feature**: 404 (`pnpm test` domain+app; prior test-suite-hardening validation)
- **Test count after feature**: 404
- **Delta**: 0 (`eval/eval.test.ts` was 1 live-wrapper test, never loaded by `pnpm test`)
- **Skipped tests**: none
- **Failures**: none
- **knip**: green. Hint only: `eval/run.ts` / `knip.json` “Remove redundant entry pattern” — entry still listed (AC1.2).
- **`ANTHROPIC_API_KEY= pnpm eval`**: exit 1 (expected). Message: `ANTHROPIC_API_KEY is not set — add it to .env.local before running \`pnpm eval\`.`

---

## Fix Plans (if issues found)

None.

---

## Requirement Traceability Update

Verifier writes only `validation.md` (orchestrator may update spec.md). Intended statuses:

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| R1 | Pending | ✅ Verified |
| R2 | Pending | ✅ Verified |
| R3 | Pending | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 11/11 ACs matched spec outcome | 0 spec-precision gaps
**Sensor**: 1/1 killable mutants killed; R1 N/A-filesystem
**Gate**: 404 passed; eval CLI exit 1

**What works**: leftover live Vitest wrapper gone; `pnpm eval` still jiti and fail-closed without a key; dock edit types into `input` and still POSTs `{ label: 'Invoice sent' }`; ADR-008 / design.md / spec Success Criteria / PR #51 test-plan agree on jiti + workflow-fail.

**Issues found**: none

**Next steps**: none — clean PASS. No `scripts/lessons.py` in this repo; lesson distillation skipped.
