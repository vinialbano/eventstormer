# Test-suite hardening Validation

**Date**: 2026-08-31
**Spec**: `.specs/features/test-suite-hardening/spec.md`
**Diff range**: `fb8b54a..cdc9279` (`main...HEAD`)
**Verifier**: independent sub-agent (author ≠ verifier)

**Isolation**: `git rev-parse HEAD` = `cdc92793d62d1fdabc045415add16e513c4ca2c1` on `test/suite-hardening`. `node_modules` present. Real tree not mutated; sensors ran in `/tmp/tsh-sensor` worktree (removed). Uncommitted spec/skill artifacts left untouched.

---

## Task Completion

| Task | Status  | Notes |
| ---- | ------- | ----- |
| T1   | ✅ Done | Replay targeted snapshot is a literal; consistency property kept with comment |
| T2   | ✅ Done | Persistence `fromDisk` equals the same withdraw-sequence literal; empty stream still uses `emptySnapshot()` |
| T3   | ✅ Done | Start Session accept + already-started |
| T4   | ✅ Done | Attribute Contribution full event |
| T5   | ✅ Done | Ask Question on closed session |
| T6   | ✅ Done | Reject / Applied / Rejected + second-call `ok([])` |
| T7   | ✅ Done | Accept 404 + 409 |
| T8   | ✅ Done | Dock reject / edit / hold / unhold POSTs |
| T9   | ✅ Done | CreateWorkshop alert + stay on `/` |
| T10  | ✅ Done | `askOpening` 503-ladder + exhaustion |
| T11  | ✅ Done | E2E locators are role/label/text |
| T12  | ✅ Done | CI `e2e` job; no `continue-on-error` |
| T13  | ✅ Done | Pre-push is `pnpm check` |
| T14  | ✅ Done | `docs/testing.md` describes the existing spec |
| T15  | ✅ Done | README Status / real-vs-stubbed + eval markers |
| T16  | ✅ Done | AGENTS.md local vs CI extras |
| T17  | ✅ Done | F11 oracles + canned tests under `pnpm test` |
| T18  | ✅ Done | Four restaurant fixtures; no `library`/`book` |
| T19  | ✅ Done | `pnpm eval` via `jiti eval/run.ts`; `pnpm test` is `--project domain --project app` |
| T20  | ✅ Done | `--report` splice; idempotent; missing markers throw |

All T1–T20 Done-when checkboxes in `tasks.md` are `[x]`. None blocked or partial.

---

## Spec-Anchored Acceptance Criteria

### P1: E2E is a CI merge gate

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| ------------------------- | -------------------- | ----------------------- | ------ |
| WHEN CI runs on a push or pull_request THEN a job SHALL install Chromium and run `pnpm test:e2e`, and a failure SHALL fail the workflow | Sibling `e2e` job; `playwright install --with-deps chromium`; `pnpm test:e2e`; no `continue-on-error` | `.github/workflows/ci.yml:113-131` — job `e2e` steps `install Chromium` + `test:e2e`; grep of `.github/` for `continue-on-error` is empty | ✅ PASS |
| WHEN that job starts the app THEN it SHALL use `playwright.config.ts` env (`FACILITATOR_MODE=scripted`, empty `ANTHROPIC_API_KEY`, throwaway `DATA_DIR`) — no real Anthropic call | Config env, not CI secrets | `playwright.config.ts:40-47` — `FACILITATOR_MODE: 'scripted'`, `ANTHROPIC_API_KEY: ''`, `DATA_DIR: dataDirectory`; `ci.yml:110-112` comment that env comes from playwright.config | ✅ PASS |
| WHEN the spec locates the scope card, active proposal cards, or backlog stickies THEN it SHALL use role, label, or visible text — not `.dock__scope`, `.pc--active`, or `.wall__backlog .sticky` | Those three CSS selectors absent from the Playwright spec | `e2e/capture-loop.spec.ts:21-47` — `getByText`, `getByRole('button', { name: 'Accept' })`, `getByRole('list', { name: 'Backlog' })`, `backlog.getByLabel(\`event: ${label}\`)`; grep of `e2e/` for those selectors is empty | ✅ PASS |
| WHEN `pnpm check` or the pre-push hook runs THEN they SHALL NOT run Playwright | `check` = typecheck→lint→test→depcruise→knip; lefthook has no `test:e2e` | `package.json:27` — `"check": "pnpm typecheck && pnpm lint && pnpm test && pnpm depcruise && pnpm knip"`; `lefthook.yml:28-32` — `run: pnpm check`; no `test:e2e` in lefthook | ✅ PASS |

### P1: Replay and persistence oracles are independent

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| ------------------------- | -------------------- | ----------------------- | ------ |
| WHEN `replay.test.ts` asserts a targeted log THEN the expected snapshot SHALL be a literal (blocks, labels, withdrawn, placement) — not `log.reduce(project, emptySnapshot())` | Literal `withdrawn: true` / labels / placement | `replay.test.ts:35-59` — `expect(replay(log)).toEqual({ position: 3, blocks: new Map([… withdrawn: true …]) })`; `replay.test.ts:69-76` — `expect(snap.blocks.get(bid('e1'))).toEqual({ kind: 'domain-event', label: 'placed', withdrawn: true, placement: 'backlog', provenance: author })` | ✅ PASS |
| WHEN the incremental-consistency property remains THEN a comment SHALL state it is a consistency property, not an independent oracle | Comment present; both sides still share `project` | `replay.test.ts:95-100` — comment `Consistency property only — not an independent oracle`; `expect(replay([...log, next])).toEqual(project(replay(log), next))` | ✅ PASS |
| WHEN `persistence-roundtrip.test.ts` asserts a restart THEN `fromDisk` SHALL equal the same literal snapshot as (1), not `replay(ops)` | Explicit Map literal with `withdrawn: true` on e2 | `persistence-roundtrip.test.ts:56-80` — `expect(fromDisk).toEqual({ position: 3, blocks: new Map([… withdrawn: true …]) })`; empty stream `persistence-roundtrip.test.ts:86-88` still uses `emptySnapshot()` | ✅ PASS |
| WHEN `replay` is changed to ignore `withdraw` THEN (1) or (3) SHALL fail | Literal oracles discriminate; fold-vs-fold is not the sole net | Sensor mutation 2: withdraw no-op killed `replay.test.ts:35` and `:70` **and** `persistence-roundtrip.test.ts:56` (`withdrawn: true` vs `false`). Consistency property did not fail (as designed) | ✅ PASS |

Repo grep for `toEqual(replay(` / `reduce(project` as an expected value: only production `replay.ts:11` (`log.reduce(project, emptySnapshot())`).

### P1: Shipped Session and Proposal commands have domain tests

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| ------------------------- | -------------------- | ----------------------- | ------ |
| WHEN `Start Session` is decided on an unstarted session THEN `decide` SHALL emit exactly one `Session Started` with the command’s `sessionId`, `workshopId`, and `at` | Exactly one event; fields pinned | `session/decide.test.ts:29-39` — `decide(replay([]), …)` then `expect(result.value).toEqual([{ v: 1, at, type: 'Session Started', sessionId, workshopId }])` | ✅ PASS |
| WHEN `Start Session` is decided on an already-started session THEN `decide` SHALL return `err({ kind: 'already-started', classification: 'systemic' })` | Exact error struct | `session/decide.test.ts:50-52` — `expect(result.error).toEqual({ kind: 'already-started', classification: 'systemic' })` | ✅ PASS |
| WHEN `Attribute Contribution` is decided on a started session THEN `decide` SHALL emit exactly one `Contribution Attributed To Another Format` with `contributionId`, `format`, `note`, and `at` | Full event equality | `session/decide.test.ts:140-150` — `expect(result.value).toEqual([{ v: 1, at, type: 'Contribution Attributed To Another Format', sessionId, contributionId: 'c_attr', format: 'process-modelling', note: 'belongs in process modelling' }])` | ✅ PASS |
| WHEN `Ask Question` is decided on a closed session THEN `decide` SHALL return `err({ kind: 'session-closed', classification: 'systemic' })` | Exact error struct | `session/decide.test.ts:354-356` — `expect(result.error).toEqual({ kind: 'session-closed', classification: 'systemic' })` | ✅ PASS |
| WHEN `Reject Proposal` is decided on a `PROPOSED` proposal THEN `decide` SHALL emit exactly one `Proposal Rejected` | Exactly one event | `proposal/decide.test.ts:180-183` — `expect(result.value).toEqual([{ v: 1, at, type: 'Proposal Rejected', proposalId }])` | ✅ PASS |
| WHEN `Record Operation Applied` is decided on an `ACCEPTED` proposal THEN `decide` SHALL emit `Operation Applied` carrying `resultingBuildingBlockId`; a second call SHALL return `ok([])` | Event then empty | `proposal/decide.test.ts:196-207` — `expect(first.value).toEqual([{ v: 1, at, type: 'Operation Applied', proposalId, resultingBuildingBlockId: bb }])`; `expect(second.value).toEqual([])` | ✅ PASS |
| WHEN `Record Operation Rejected` is decided on an `ACCEPTED` proposal THEN `decide` SHALL emit `Operation Rejected` with the given reason; a second call SHALL return `ok([])` | Event then empty | `proposal/decide.test.ts:219-230` — `expect(first.value).toEqual([{ v: 1, at, type: 'Operation Rejected', proposalId, reason: 'unknown-target' }])`; `expect(second.value).toEqual([])` | ✅ PASS |

### P1: Capture-loop negatives at the UI and accept HTTP layers

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| ------------------------- | -------------------- | ----------------------- | ------ |
| WHEN FacilitatorDock rejects an active proposal THEN the test SHALL assert `POST /api/proposals/:id/reject` and the card leaves the active cluster (refetch-simulation) | POST URL + post-refetch collapse | `FacilitatorDock.test.ts:310` — `expect(fetchMock).toHaveBeenCalledWith('/api/proposals/p1/reject', expect.objectContaining({ method: 'POST' }))`; `:315-316` after `disposition: 'REJECTED'` — Reject button gone, `expect(wrapper.text()).toContain('Dismissed')` | ✅ PASS |
| WHEN FacilitatorDock edits an active proposal THEN the test SHALL assert `POST /api/proposals/:id/edit` with the new `{ label }` | Exact body | `FacilitatorDock.test.ts:332-335` — `toHaveBeenCalledWith('/api/proposals/p1/edit', expect.objectContaining({ method: 'POST', body: JSON.stringify({ label: 'Invoice sent' }) }))` | ✅ PASS |
| WHEN FacilitatorDock holds then unholds THEN the test SHALL assert `POST …/hold` then `POST …/unhold` | Sequential URLs | `FacilitatorDock.test.ts:346` — `'/api/proposals/p1/hold'`; `:355` — `'/api/proposals/p1/unhold'` | ✅ PASS |
| WHEN CreateWorkshop’s `POST /api/workshops` rejects THEN the screen SHALL show `role="alert"` with `Could not start the workshop. Try again.` and SHALL NOT navigate | Exact alert text; path `/` | `CreateWorkshop.test.ts:65-66` — `expect(wrapper.get('[role="alert"]').text()).toBe('Could not start the workshop. Try again.')`; `expect(router.currentRoute.value.path).toBe('/')` | ✅ PASS |
| WHEN `POST /api/proposals/:id/accept` is called for an unknown id THEN the handler SHALL return 404 `{ error: 'unknown-proposal' }` | Status + JSON body | `accept.test.ts:163-164` — `expect(response.status).toBe(404)`; `expect(await response.json()).toEqual({ error: 'unknown-proposal' })` | ✅ PASS |
| WHEN `POST /api/proposals/:id/accept` is called for a `REJECTED` proposal THEN the handler SHALL return 409 and the board SHALL gain no building block | 409 + empty board | `accept.test.ts:171-172` — `expect(response.status).toBe(409)`; `expect(readBuildingBlocks(deps(), workshopId)).toEqual([])` | ✅ PASS |

### P1: Gates and docs describe the same green

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| ------------------------- | -------------------- | ----------------------- | ------ |
| WHEN pre-push runs THEN it SHALL execute the same steps as `pnpm check` (typecheck, lint, test, depcruise, knip) — lint included | `lefthook.yml` runs `pnpm check` | `lefthook.yml:31-32` — `name: check` / `run: pnpm check`; `package.json:27` includes lint | ✅ PASS |
| WHEN `docs/testing.md` is read THEN it SHALL describe the existing Playwright spec, `pnpm test:e2e`, scripted facilitator, and that CI (not `pnpm check`) runs it | Present-tense E2E section; no “not yet built” | `docs/testing.md:24-35` — names `e2e/capture-loop.spec.ts`, `pnpm test:e2e`, `FACILITATOR_MODE=scripted`, CI sibling job, not part of `pnpm check` | ✅ PASS |
| WHEN the README “Status” / “What is real vs stubbed” sections are read THEN they SHALL NOT claim the facilitator or the board are unbuilt; they SHALL name the capture loop and that eval is `pnpm eval` out of CI | Capture loop real; eval out of CI | `README.md:12-14` Status; `README.md:53-56` capture loop + `pnpm eval` (out of CI). Grep for “No model call happens anywhere” / “unbuilt” / “scaffold” in README is empty | ✅ PASS |
| WHEN `AGENTS.md` Commands / CI wording is read THEN it SHALL state: local `pnpm check` = typecheck → lint → test → depcruise → knip; CI adds `build` and `test:e2e` | Exact identity | `AGENTS.md:28-30` — that wording; `pnpm eval` is out of CI | ✅ PASS |

**NOTE (not a FAIL):** `README.md:103-104` still says “CI runs exactly `pnpm check` on push and PR”. That paragraph is outside the sections named by TSH-17. Status / real-vs-stubbed / AGENTS.md / testing.md agree. Leftover, not an unmet AC.

### P1: Minimal F11 eval (restaurant, N=5, out of CI)

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| ------------------------- | -------------------- | ----------------------- | ------ |
| WHEN `pnpm eval` runs with `ANTHROPIC_API_KEY` set THEN it SHALL call the real Anthropic facilitator (not the scripted double) on 4 restaurant/kitchen fixture cases, N=5 each, using `buildInstructions` / `buildTurnInput` + `Facilitator.interpret` | Live `createAnthropicFacilitator` (default `generate`); 4 fixtures; `RUNS = 5` | `eval/run.ts:17-19` `RUNS = 5`, `FIXTURE_FILES` length 4; `:172-176` `createAnthropicFacilitator` with no `generate` override (real `makeDefaultGenerate`); `:176-190` `buildInstructions()` / `buildTurnInput` / `facilitator.interpret`. Live billed run not executed (T19 + verifier brief) | ✅ PASS |
| WHEN those cases run THEN the four assertions SHALL be: (a) kind matches, (b) domain-event label past tense, (c) near-miss **not** `flag-phase`, (d) kept-phrasing shares a content word (fail even if `bar` claims `lenient`) | One assertion per fixture; (d) ignores `bar` | Fixtures `eval/fixtures/{kind,past-tense,near-miss,kept-phrasing}.json`; scorer `eval/run.ts:128-162` — `proposedKinds(tracks).includes(expectedKind)`, `domainEventLabels(tracks).some(isPastTenseLabel)`, `!hasFlagPhase(tracks)`, `sharesContentWord(label, segment)` with no `bar` read | ✅ PASS |
| WHEN results are printed THEN each assertion SHALL appear as `k/5` with no headline aggregate pass-rate | `passed/runs`; no `%` | `eval/run.ts:119-120` — `` `${row.caseId} ${row.assertion}: ${String(row.passed)}/${String(row.runs)}` ``; `eval/report.test.ts:36-45` — `expect(markdown).toBe(… 4/5 …)`; `expect(markdown).not.toMatch(/%/)` | ✅ PASS |
| WHEN the fixture domain is restaurant/kitchen THEN the system prompt few-shot SHALL remain library lending | Disjointness locked | `prompt.test.ts:27-32` — `expect(instructions).toContain('library lending')`; `.not.toContain('restaurant'|'kitchen'|'waiter')`. Fixtures grep `library`/`book` empty | ✅ PASS |
| WHEN `ANTHROPIC_API_KEY` is unset THEN `pnpm eval` SHALL exit non-zero with a message to set the key — it SHALL NOT skip green | Exit 1 + message | `eval/run.ts:93-96` throws; `:208-213` `process.exit(1)`. Verifier: `ANTHROPIC_API_KEY= pnpm eval` → exit 1, stdout `ANTHROPIC_API_KEY is not set — add it to .env.local before running \`pnpm eval\`.` | ✅ PASS |
| WHEN `pnpm test` / CI run THEN they SHALL NOT invoke `pnpm eval` or the live Anthropic path | `test` = domain+app only; CI has no eval | `package.json:17` — `"test": "vitest run --project domain --project app"`; CI `check` runs `pnpm test`; grep of `.github/` for `pnpm eval` empty. Gate run: 65 files / 404 tests, no `eval/` files | ✅ PASS |
| WHEN `pnpm eval --report` runs after a live eval THEN it SHALL splice a Markdown table between `<!-- eval:results -->` / `<!-- /eval:results -->`. Until a live report exists, those markers MAY wrap a placeholder | Markers + splice + placeholder | `README.md:63-65` placeholder “Results are produced by `pnpm eval --report`.”; `eval/run.ts:198-200` splice on `--report`; `eval/report.test.ts:15-26` splice + idempotence; `:28-31` missing markers throw | ✅ PASS |
| WHEN the pure oracles are unit-tested THEN those tests SHALL run under `pnpm test` with canned turns — no network | Colocated under `src/` (domain project) | `eval-oracles.test.ts:24` share-word true; `:28` share-word false; `:34` past tense `ed`; `:38` irregular `built` false; `:44` `hasFlagPhase` true; `:48` false; `:55-60` `proposedKinds` | ✅ PASS |

**NOTE (not SPEC_DEVIATION):** Design Decision said `pnpm eval` = `vitest run --project eval`. Implementer used `jiti eval/run.ts` so `--report` forwards on `argv`. Spec TSH-19/20/21 are met (live runner, k/N, not in CI). A Vitest `eval` project still exists (`vite.config.ts:77-86`, `eval/eval.test.ts`) but is not what `pnpm eval` runs.

### P2: `askOpening` retry ladder

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| ------------------------- | -------------------- | ----------------------- | ------ |
| WHEN `askOpening`’s `generate` returns a retryable 503 then a valid opening THEN the adapter SHALL succeed and SHALL have slept the same backoff as interpret | Success; models sonnet→sonnet→haiku; `slept === [2000, 4000]` | `anthropic-adapter.test.ts:260-262` — `expect(isOk(outcome)).toBe(true)`; `expect(models).toEqual(['claude-sonnet-5', 'claude-sonnet-5', 'claude-haiku-4-5'])`; `expect(slept).toEqual([2_000, 4_000])` (mirrors interpret `:115-117`) | ✅ PASS |
| WHEN `askOpening` exhausts the ladder on provider-down THEN it SHALL return `err({ kind: 'provider-down' })` | Exact error | `anthropic-adapter.test.ts:271-273` — `expect(outcome.error).toEqual({ kind: 'provider-down' })`; models three rungs | ✅ PASS |

**Status**: ✅ All ACs covered (41/41 numbered + edge mapped). 0 spec-precision gaps. Design Decision unmet is a NOTE, not a spec miss.

---

## Discrimination Sensor

Scratch: `git worktree add /tmp/tsh-sensor HEAD` at `cdc9279`; `node_modules` symlinked; mutations discarded; worktree removed. Real `git status` unchanged (only the allowed uncommitted spec/skill files).

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ----------- | ------- |
| 1        | `eval-oracles.ts:12-15` | `sharesContentWord` always returns `true` | ✅ Killed — `eval-oracles.test.ts:28` `expected true to be false` |
| 2        | `project.ts:42-44` | `withdraw` no-op (does not set `withdrawn`) | ✅ Killed — `replay.test.ts:35` and `:70`; `persistence-roundtrip.test.ts:56` (`withdrawn: true` vs `false`). Consistency property still passed (fold-vs-fold is not the sole net) |
| 3        | `eval/run.ts:93-96` | Missing API key → `process.exit(0)` (skip-green) | ✅ Killed by CLI oracle — `ANTHROPIC_API_KEY= pnpm eval` exited **0** in the worktree vs **1** on the real tree. `pnpm test` stayed 404 green (fail-closed is not a Vitest case; spec Independent Test *is* the CLI) |

**Sensor depth**: lightweight (3 targeted)
**Result**: 3/3 killed — PASS ✅

---

## Interactive UAT Results (if performed)

Skipped — harness/CI/docs/eval, not a new user-facing product flow (verifier brief).

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ |
| Surgical changes | ✅ |
| No scope creep | ✅ |
| Matches patterns | ✅ G/W/T through `decide`; dock fetch-mock; Hono `.request()` |
| Spec-anchored outcome check (asserted values match spec) | ✅ |
| Per-layer Coverage Expectation met (domain 1:1 ACs; routes happy+edge+error) | ✅ Domain TSH-05…10; accept 404/409; UI reject/edit/hold/unhold + create alert; E2E still one happy path |
| Every test maps to a spec requirement — no unclaimed tests | ✅ New cases map to TSH-03…24 / T20 splice. Pre-existing tests in touched files are out of this feature’s AC set (not unclaimed *new* tests) |
| Documented guidelines followed | ✅ `docs/testing.md` (literal oracles; E2E one happy path); ADR-008 (k/N, out of CI, restaurant fixtures, README markers) |

Guidelines: `docs/testing.md`, `docs/adr/008-testing-eval-and-observability.md`, `AGENTS.md`.

**NOTE:** `eval/eval.test.ts` would call `runEval` if someone ran `vitest run --project eval`. `pnpm eval` does not. Harmless leftover of the unused design alternative.

**NOTE:** knip printed `eval/run.ts — Remove redundant entry pattern` (hint only; knip exit 0).

---

## Edge Cases

- [x] WHEN CI `e2e` and `check` run in parallel THEN a failure in either SHALL fail the workflow (no `continue-on-error`) — `.github/workflows/ci.yml` has no `continue-on-error`; both jobs required on push/PR
- [x] WHEN Playwright browsers are missing on the CI runner THEN the e2e job SHALL install them in-job — `ci.yml:127-128` `pnpm exec playwright install --with-deps chromium`
- [x] WHEN an eval fixture’s expected kind is `domain-event` and the model proposes only `flag-phase` THEN assertion (a) SHALL count as failed — `proposedKinds` skips tracks without `blockKind`; `includes(expectedKind)` is false (`eval/run.ts:133`, `eval-oracles.ts:25-26`)
- [x] WHEN a kept-phrasing label is a synonym that shares no content word THEN assertion (d) SHALL fail — `eval-oracles.test.ts:28`; live scorer uses `sharesContentWord` (`eval/run.ts:159`)
- [x] WHEN `Start Session` is tested THEN the write model SHALL be `replay([])` / empty, not a closed session — `session/decide.test.ts:29` `decide(replay([]), …)`
- [x] WHEN accept 404 is tested THEN no workshop/session seed **for that proposal id** — `accept.test.ts:161-164` `accept('no-such')` with no `seedProposal`; beforeEach seeds a generic workshop/session only, not proposal `no-such`

---

## Gate Check

- **Gate command**: `pnpm check && pnpm build` (Build gate from tasks.md)
- **Result**: 404 passed, 0 failed, 0 skipped (typecheck, lint, test, depcruise, knip, build all exit 0)
- **Test count before feature**: ~356–369 domain+app (slice-1-capture-loop validation recorded 357; brief ~356–369)
- **Test count after feature**: **404** (65 files) — matches Batch 3 report
- **Delta**: about **+35 to +48** new tests; no silent deletion
- **Skipped tests**: none
- **Failures**: none
- **`ANTHROPIC_API_KEY= pnpm eval`**: exit 1, message to set the key. Live billed eval **not** run
- **`pnpm test:e2e`**: not part of the Build gate. Attempted locally: Playwright Chromium executable missing (`playwright install` not run in this environment). CI `e2e` job installs Chromium in-job. Locators verified by reading `e2e/capture-loop.spec.ts`

---

## Fix Plans (if issues found)

None. No surviving mutants, no uncovered ACs, no SPEC_DEVIATION vs spec.md.

Optional follow-ups (not fix tasks; do not start T21):

1. Align `README.md` “The gate” paragraph (`:103-104`) with AGENTS.md (CI adds `build` + `test:e2e`).
2. Design Decision used Vitest as `pnpm eval`; jiti is what shipped — update design.md if that artifact is kept.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status  |
| ----------- | --------------- | ----------- |
| TSH-01      | Done            | ✅ Verified |
| TSH-02      | Done            | ✅ Verified |
| TSH-03      | Done            | ✅ Verified |
| TSH-04      | Done            | ✅ Verified |
| TSH-05      | Done            | ✅ Verified |
| TSH-06      | Done            | ✅ Verified |
| TSH-07      | Done            | ✅ Verified |
| TSH-08      | Done            | ✅ Verified |
| TSH-09      | Done            | ✅ Verified |
| TSH-10      | Done            | ✅ Verified |
| TSH-11      | Done            | ✅ Verified |
| TSH-12      | Done            | ✅ Verified |
| TSH-13      | Done            | ✅ Verified |
| TSH-14      | Done            | ✅ Verified |
| TSH-15      | Done            | ✅ Verified |
| TSH-16      | Done            | ✅ Verified |
| TSH-17      | Done            | ✅ Verified |
| TSH-18      | Done            | ✅ Verified |
| TSH-19      | Done            | ✅ Verified |
| TSH-20      | Done            | ✅ Verified |
| TSH-21      | Done            | ✅ Verified |
| TSH-22      | Done            | ✅ Verified |
| TSH-23      | Done            | ✅ Verified |
| TSH-24      | Done            | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 41/41 ACs matched spec outcome | 0 spec-precision gaps
**Sensor**: 3/3 mutations killed
**Gate**: 404 passed, 0 failed

**What works**:
- Capture-loop Playwright spec is a CI merge gate; local `pnpm check` / pre-push stay browser-free
- Replay and persistence pin independent literals; a withdraw no-op is killed by both files
- Session/Proposal shipped `decide` branches have G/W/T tests
- Dock reject/edit/hold/unhold, CreateWorkshop alert, accept 404/409
- Docs/gates identity (AGENTS.md, testing.md, README Status / real-vs-stubbed, lefthook)
- F11 oracles in `pnpm test`; `pnpm eval` fail-closed without a key; `--report` splice + placeholder
- `askOpening` ladder matches interpret backoff

**Issues found**: none that fail the feature. Leftover README “The gate” sentence still equates CI with `pnpm check` only. Design Decision (`pnpm eval` = Vitest project) unused; spec holds via jiti.

**Next steps**: Orchestrator may treat the feature as verified. Do not start T21. Leave `validation.md` uncommitted for the orchestrator. Optional doc tidy of README “The gate” is out of verifier scope.
