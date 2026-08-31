# Test-suite hardening Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `spec-driven-development` skill (plugin-qualified: `anoria-engineering:spec-driven-development`): **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Design**: `.specs/features/test-suite-hardening/design.md`
**Status**: Draft

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec — confirm before Execute. Guidelines found: `docs/testing.md`, `docs/adr/008-testing-eval-and-observability.md`, `AGENTS.md`, `vite.config.ts` (domain node / app jsdom), `lefthook.yml`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Domain deciders (`decide`) | unit | G/W/T through the command; 1:1 to TSH-05…10; pin full event or rejection structs | `src/**/domain/**/*.test.ts` | `pnpm test` |
| Replay / persistence oracles | unit + sqlite integration | Literal snapshots (not fold-vs-fold); roundtrip uses real sqlite temp db | `replay.test.ts`, `persistence-roundtrip.test.ts` | `pnpm test` |
| Capability HTTP (`accept`) | integration | 404 unknown-proposal + 409 rejected; Hono `.request()` / `testClient` | `**/accept.test.ts` | `pnpm test` |
| Vue components | unit (jsdom) | Observable UI: POST URLs, `role="alert"` text, no navigation | `src/app/**/*.test.ts` | `pnpm test` |
| Facilitator adapter | unit | `askOpening` ladder vs scripted `generate`; no live HTTP | `anthropic-adapter.test.ts` | `pnpm test` |
| F11 oracles (pure) | unit | Canned turns: kind, past tense, flag-phase, content-word overlap + negatives | `eval-oracles.test.ts` | `pnpm test` |
| Capture-loop E2E | e2e | Existing happy path; role/label locators | `e2e/capture-loop.spec.ts` | `pnpm test:e2e` |
| Eval live runner | eval (out of CI) | 4 cases × 5; fail without key; no aggregate % | `eval/` | `pnpm eval` |
| CI / lefthook / docs | none | Build/read gate | `.github/`, `lefthook.yml`, `docs/` | `pnpm check` |

## Gate Check Commands

> Generated from codebase — confirm before Execute.

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | After domain/app/unit tasks | `pnpm test` |
| Full | After E2E locator task | `pnpm test && pnpm test:e2e` |
| Build | After CI/lefthook/docs/vite config | `pnpm check && pnpm build` |
| Eval | After live runner (local, needs key) | `pnpm eval` (must exit 1 without key) |

---

## Execution Plan

Phases run sequentially. Tasks within a phase run in order.

### Phase 1: Independent oracles

```
T1 → T2
```

### Phase 2: Domain holes

```
T3 → T4 → T5 → T6
```

### Phase 3: HTTP / UI / adapter

```
T7 → T8 → T9 → T10
```

### Phase 4: Locators and merge gate

```
T11 → T12 → T13
```

### Phase 5: Docs identity

```
T14 → T15 → T16
```

### Phase 6: Minimal F11 eval

```
T17 → T18 → T19 → T20
```

---

## Task Breakdown

### T1: Pin replay targeted snapshot to a literal

**What**: Replace the AT-18a `replay(log) === log.reduce(project, …)` test with a literal-pinned snapshot; keep the fast-check consistency property and comment that it is not an independent oracle.
**Where**: `src/domain-model-capture/domain/board/replay.test.ts`
**Depends on**: None
**Reuses**: Existing `op()`, `emptySnapshot`, targeted-sequence test style (`produces the expected snapshot for a targeted sequence`)
**Requirement**: TSH-03

**Tools**: Skill `testing-boss` (literal oracles; do not compare two folds)

**Done when**:

- [x] No test uses `reduce(project, emptySnapshot())` as the expected value
- [x] Property test remains and states it is consistency-only
- [x] Gate: `pnpm test`
- [x] Test count does not drop by more than the one replaced case (rewritten, not deleted without replacement)

**Tests**: unit
**Gate**: quick
**Commit**: `test(board): pin replay snapshot to a literal`

---

### T2: Pin persistence round-trip to a literal snapshot

**What**: Assert `fromDisk` against an explicit snapshot literal (same withdraw sequence as T1), not `replay(ops)`.
**Where**: `src/domain-model-capture/persistence-roundtrip.test.ts`
**Depends on**: T1
**Reuses**: T1’s expected block shape (duplicated literal, no shared production helper)
**Requirement**: TSH-04

**Tools**: Skill `testing-boss`

**Done when**:

- [x] `expect(fromDisk).toEqual(replay(ops))` is gone
- [x] Empty-stream case still uses `emptySnapshot()` (factory, not a fold-vs-fold)
- [x] Gate: `pnpm test`

**Tests**: unit
**Gate**: quick
**Commit**: `test(capture): pin persistence round-trip to a literal snapshot`

---

### T3: Session `Start Session` G/W/T

**What**: Happy `Session Started` emission and `already-started` rejection.
**Where**: `src/session-facilitation/domain/session/decide.test.ts`
**Depends on**: None
**Reuses**: Existing `startedStream`, `at`, branded ids
**Requirement**: TSH-05

**Tools**: Skill `testing-boss`

**Done when**:

- [x] Unstarted → exactly one `Session Started` with sessionId, workshopId, at
- [x] Already started → `already-started` / systemic
- [x] Gate: `pnpm test`

**Tests**: unit
**Gate**: quick
**Commit**: `test(session): cover Start Session accept and already-started`

---

### T4: Session `Attribute Contribution` G/W/T

**What**: Started session emits one `Contribution Attributed To Another Format` with command fields.
**Where**: `src/session-facilitation/domain/session/decide.test.ts`
**Depends on**: T3
**Reuses**: T3 file; `startedStream`
**Requirement**: TSH-06

**Tools**: Skill `testing-boss`

**Done when**:

- [x] Event type, contributionId, format, note, at pinned to literals
- [x] Gate: `pnpm test`

**Tests**: unit
**Gate**: quick
**Commit**: `test(session): cover Attribute Contribution`

---

### T5: `Ask Question` on a closed session

**What**: Closed session → `session-closed` systemic rejection.
**Where**: `src/session-facilitation/domain/session/decide.test.ts`
**Depends on**: T3
**Reuses**: Existing Close Session stream setup in the same file
**Requirement**: TSH-07

**Tools**: Skill `testing-boss`

**Done when**:

- [x] `isErr` and `error.kind === 'session-closed'`
- [x] Gate: `pnpm test`

**Tests**: unit
**Gate**: quick
**Commit**: `test(session): reject Ask Question on a closed session`

---

### T6: Proposal reject / applied / rejected sequences

**What**: Named G/W/T: Reject from PROPOSED; Applied from ACCEPTED then `ok([])`; Rejected from ACCEPTED then `ok([])`.
**Where**: `src/session-facilitation/domain/proposal/decide.test.ts`
**Depends on**: None
**Reuses**: Existing `proposed`, `accept`, `replay`
**Requirement**: TSH-08, TSH-09, TSH-10

**Tools**: Skill `testing-boss`

**Done when**:

- [x] Three behaviours above, full event equality where the file already does that
- [x] Gate: `pnpm test`

**Tests**: unit
**Gate**: quick
**Commit**: `test(proposal): cover reject and operation applied/rejected`

---

### T7: Accept HTTP 404 and 409

**What**: Unknown proposal → 404 `unknown-proposal`; accept after reject → 409 and no board block.
**Where**: `src/session-facilitation/capabilities/review-proposal/accept.test.ts`
**Depends on**: None
**Reuses**: `seedWorkshopAndSession`, `recording` store, `readBuildingBlocks`
**Requirement**: TSH-13, TSH-14

**Tools**: Skill `testing-boss`

**Done when**:

- [x] 404 JSON body pinned
- [x] 409 path: board `readBuildingBlocks` empty (or unchanged empty)
- [x] Gate: `pnpm test`

**Tests**: integration
**Gate**: quick
**Commit**: `test(accept): cover unknown-proposal 404 and rejected 409`

---

### T8: FacilitatorDock reject / edit / hold / unhold POSTs

**What**: Three (or four) tests asserting the mutation URLs, matching the existing accept POST style.
**Where**: `src/app/capture-loop/dock/FacilitatorDock.test.ts`
**Depends on**: None
**Reuses**: `fetchMock`, store `seed`, `ProposalCard` emit → dock `run(...)`
**Requirement**: TSH-11

**Tools**: Skill `testing-boss`

**Done when**:

- [x] `POST /api/proposals/p1/reject` asserted
- [x] `POST /api/proposals/p1/edit` with `{ label }` body asserted
- [x] hold then unhold URLs asserted
- [x] Gate: `pnpm test`

**Tests**: unit
**Gate**: quick
**Commit**: `test(dock): cover reject, edit, hold and unhold POSTs`

---

### T9: CreateWorkshop failed POST shows alert

**What**: Fetch reject / non-2xx → `role="alert"` text `Could not start the workshop. Try again.` and path stays `/`.
**Where**: `src/app/capture-loop/screens/CreateWorkshop.test.ts`
**Depends on**: None
**Reuses**: Existing mount + router
**Requirement**: TSH-12

**Tools**: Skill `testing-boss`

**Done when**:

- [x] Alert text pinned to the production string in `CreateWorkshop.vue`
- [x] `router.currentRoute` still `/`
- [x] Gate: `pnpm test`

**Tests**: unit
**Gate**: quick
**Commit**: `test(app): show create-workshop error alert`

---

### T10: `askOpening` retry ladder

**What**: 503-then-success and ladder exhaustion for `askOpening`, mirroring interpret cases.
**Where**: `src/session-facilitation/infrastructure/facilitator/anthropic-adapter.test.ts`
**Depends on**: None
**Reuses**: `scripted`, `depsWith`, `VALID_OPENING`, existing interpret ladder tests
**Requirement**: TSH-24

**Tools**: Skill `testing-boss`

**Done when**:

- [x] Two cases as spec P2
- [x] Gate: `pnpm test`

**Tests**: unit
**Gate**: quick
**Commit**: `test(facilitator): cover askOpening retry ladder`

---

### T11: E2E locators by role / label / text

**What**: Remove `.dock__scope`, `.pc--active`, `.wall__backlog .sticky` from the spec.
**Where**: `e2e/capture-loop.spec.ts`
**Depends on**: None
**Reuses**: `getByRole` / `getByLabel` already used in the same file; BoardWall `aria-label`
**Requirement**: TSH-02

**Tools**: Skill `playwright-cli` if a locator needs a live check; else Playwright locators from production aria

**Done when**:

- [x] Those three CSS selectors are gone
- [x] Gate: `pnpm test && pnpm test:e2e`

**Tests**: e2e
**Gate**: full
**Commit**: `test(e2e): query capture loop by role and label`

---

### T12: CI e2e job

**What**: Parallel `e2e` job: same Node/pnpm as `check`, `playwright install --with-deps chromium`, `pnpm test:e2e`. Comment that it is not part of `pnpm check`.
**Where**: `.github/workflows/ci.yml`
**Depends on**: T11
**Reuses**: `check` job setup steps
**Requirement**: TSH-01, TSH-21 (eval still absent from this file)

**Tools**: NONE

**Done when**:

- [x] Job does not `continue-on-error`
- [x] Empty `ANTHROPIC_API_KEY` still comes from playwright.config (not CI secrets)
- [x] Gate: `pnpm check && pnpm build` (workflow YAML is not typechecked; `pnpm test:e2e` locally)

**Tests**: none
**Gate**: build
**Commit**: `ci: run capture-loop Playwright spec on every PR`

---

### T13: Pre-push runs `pnpm check`

**What**: Replace the typecheck/test/depcruise/knip pre-push list with `pnpm check` (adds lint). Keep changeset-reminder. Do not add e2e.
**Where**: `lefthook.yml`
**Depends on**: None
**Reuses**: `package.json` `"check"` script
**Requirement**: TSH-15

**Tools**: NONE

**Done when**:

- [x] Lint is on the pre-push path
- [x] No `test:e2e` in lefthook
- [x] Gate: `pnpm check`

**Tests**: none
**Gate**: build
**Commit**: `chore: run pnpm check on pre-push`

---

### T14: Rewrite `docs/testing.md` E2E section

**What**: Describe the existing spec, `pnpm test:e2e`, scripted facilitator, CI-only gate, literal-oracle rule (already there).
**Where**: `docs/testing.md`
**Depends on**: T12
**Reuses**: ADR-008 wording, `playwright.config.ts` comments
**Requirement**: TSH-16

**Tools**: NONE

**Done when**:

- [x] No “E2E — decided, not yet built”
- [x] Gate: `pnpm check`

**Tests**: none
**Gate**: build
**Commit**: `docs: describe the capture-loop Playwright spec`

---

### T15: README Status, real-vs-stubbed, eval markers

**What**: Stop claiming scaffold-only / facilitator unbuilt; add `<!-- eval:results -->` placeholder; mention `pnpm eval`.
**Where**: `README.md`
**Depends on**: T14
**Reuses**: ADR-008 marker names
**Requirement**: TSH-17, TSH-23

**Tools**: NONE

**Done when**:

- [x] “No model call happens anywhere” is gone
- [x] Eval markers present
- [x] Gate: `pnpm check`

**Tests**: none
**Gate**: build
**Commit**: `docs: describe the capture loop and eval command in the README`

---

### T16: AGENTS.md + ARCHITECTURE.md gate wording

**What**: Local `pnpm check` vs CI extras (`build`, `test:e2e`); `pnpm eval` out of CI. Align ARCHITECTURE.md `pnpm eval` sentence with the new script.
**Where**: `AGENTS.md`, `ARCHITECTURE.md`
**Depends on**: T12, T15
**Reuses**: AD-027
**Requirement**: TSH-18

**Tools**: NONE

**Done when**:

- [ ] No claim that CI and pre-push run *exactly* `pnpm check` with no extras
- [ ] Gate: `pnpm check`

**Tests**: none
**Gate**: build
**Commit**: `docs: distinguish pnpm check from CI e2e and eval`

---

### T17: F11 oracles + unit tests

**What**: `eval-oracles.ts` (content words, past tense, flag-phase, kinds) and canned-turn tests including negatives.
**Where**: `src/session-facilitation/infrastructure/facilitator/eval-oracles.ts`, `eval-oracles.test.ts`
**Depends on**: None
**Reuses**: `FacilitationTrack` shape as plain objects in tests (do not import Anthropic SDK)
**Requirement**: TSH-22

**Tools**: Skill `testing-boss`

**Done when**:

- [ ] Negative: no shared content word → `sharesContentWord` false
- [ ] Negative: `flag-phase` present → `hasFlagPhase` true
- [ ] Gate: `pnpm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(eval): deterministic F11 oracles`

---

### T18: Restaurant eval fixtures

**What**: Four JSON fixtures under `eval/fixtures/` (kind, past-tense, near-miss, kept-phrasing); restaurant/kitchen domain; no library lending words.
**Where**: `eval/fixtures/*.json`
**Depends on**: T17
**Reuses**: Design `EvalFixture` shape
**Requirement**: TSH-19

**Tools**: NONE

**Done when**:

- [ ] Four files; grep fixtures for `library` / `book` is empty
- [ ] Gate: `pnpm check` (JSON only — knip ignores `eval/` until T19)

**Tests**: none
**Gate**: build
**Commit**: `feat(eval): add four restaurant F11 fixtures`

---

### T19: Eval Vitest project + `pnpm eval`

**What**: Third Vitest project `eval`; `package.json` `"test"` runs `--project domain --project app` only; `"eval": "vitest run --project eval"`; runner calls real facilitator; exit 1 without key; N=5; print k/5 rows; no aggregate %.
**Where**: `vite.config.ts`, `package.json`, `eval/run.ts` (or `eval/eval.test.ts` driven by the project)
**Depends on**: T17, T18
**Reuses**: `createAnthropicFacilitator`, `buildInstructions`, `buildTurnInput`, `host/index.ts` env load order
**Requirement**: TSH-19, TSH-20, TSH-21

**Tools**: Skill `testing-boss` (Gate 6: do not assert a mock you just set — this path is live or fail-closed)

**Done when**:

- [ ] `pnpm test` does not execute `eval/`
- [ ] `pnpm eval` without `ANTHROPIC_API_KEY` exits non-zero
- [ ] knip clean (`knip.json` entry includes `eval/` runner if needed)
- [ ] Gate: `pnpm check && pnpm build`
- [ ] Do **not** require a live billed run to mark the task done; structure is the gate. A live run is a Success Criterion for the human.

**Tests**: eval
**Gate**: build
**Commit**: `feat(eval): run four F11 cases out of CI`

---

### T20: `pnpm eval --report` README splice

**What**: `--report` writes the k/N table between README markers; missing markers → exit 1. Unit-test the splicer with a fake table if it lives in src; if it lives only in `eval/`, a small `eval/report.test.ts` in the eval project is enough (not in `pnpm test`).
**Where**: `eval/report.ts`, `package.json` eval script args, `README.md` markers (from T15)
**Depends on**: T15, T19
**Reuses**: TSH-23 markers
**Requirement**: TSH-23

**Tools**: NONE

**Done when**:

- [ ] Splice is idempotent (running twice with the same table yields the same README)
- [ ] Gate: `pnpm check`

**Tests**: none
**Gate**: build
**Commit**: `feat(eval): splice k/N results into the README`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6

Phase 1:  T1 ──→ T2
Phase 2:  T3 ──→ T4 ──→ T5 ──→ T6
Phase 3:  T7 ──→ T8 ──→ T9 ──→ T10
Phase 4:  T11 ──→ T12 ──→ T13
Phase 5:  T14 ──→ T15 ──→ T16
Phase 6:  T17 ──→ T18 ──→ T19 ──→ T20
```

T4 and T5 both depend on T3 (T5 does not depend on T4). Diagram shows T3→T4→T5 for a single-agent order; T5’s body Depends on T3 only. **Single-agent execution still runs T4 then T5.** Cross-check uses sequential arrows inside the phase.

Execute packing (~7 tasks / batch, whole phases):

- **Batch 1:** Phase 1 + 2 (T1–T6)
- **Batch 2:** Phase 3 + 4 (T7–T13)
- **Batch 3:** Phase 5 + 6 (T14–T20)

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1 | 1 test file, rewrite oracle | ✅ |
| T2 | 1 test file | ✅ |
| T3 | 1 describe in existing file | ✅ |
| T4 | 1 describe | ✅ |
| T5 | 1 test | ✅ |
| T6 | 3 related cases, same file | ⚠️ cohesive |
| T7 | 2 HTTP cases, same file | ⚠️ cohesive |
| T8 | 3–4 tests, same file | ⚠️ cohesive |
| T9 | 1 test | ✅ |
| T10 | 2 tests, same file | ⚠️ cohesive |
| T11 | 1 spec file locators | ✅ |
| T12 | 1 workflow job | ✅ |
| T13 | 1 lefthook section | ✅ |
| T14 | 1 doc file | ✅ |
| T15 | 1 doc file | ✅ |
| T16 | 2 doc files, same wording | ⚠️ cohesive |
| T17 | 1 module + tests | ✅ |
| T18 | fixture JSON set | ✅ |
| T19 | vite + package.json + runner | ⚠️ wiring is one deliverable |
| T20 | reporter + splice | ✅ |

**Granularity check**: no task spans unrelated layers. T19 is the fattest (config + runner); splitting would leave `pnpm eval` unrunnable.

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | Phase 1 start | ✅ |
| T2 | T1 | T1 → T2 | ✅ |
| T3 | None | Phase 2 start | ✅ |
| T4 | T3 | T3 → T4 | ✅ |
| T5 | T3 | Sequential T4 → T5 (order only; dep is T3) | ✅ Match — see note |
| T6 | None | After T5 in phase order | ✅ |
| T7 | None | Phase 3 start | ✅ |
| T8 | None | T7 → T8 order | ✅ |
| T9 | None | T8 → T9 order | ✅ |
| T10 | None | T9 → T10 order | ✅ |
| T11 | None | Phase 4 start | ✅ |
| T12 | T11 | T11 → T12 | ✅ |
| T13 | None | T12 → T13 order | ✅ |
| T14 | T12 | Phase 5; T14 after T13 in map | ⚠️ Map shows T13 → T14 across phases; body depends on T12. Valid (backward). |
| T15 | T14 | T14 → T15 | ✅ |
| T16 | T12, T15 | T15 → T16 (T12 earlier) | ✅ |
| T17 | None | Phase 6 start | ✅ |
| T18 | T17 | T17 → T18 | ✅ |
| T19 | T17, T18 | T18 → T19 | ✅ |
| T20 | T15, T19 | T19 → T20 (T15 in phase 5) | ✅ |

T5/T6/T7–T10/T13 in-phase arrows are execution order, not extra hard deps. No forward-phase deps.

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 | Replay oracles | unit | unit | ✅ |
| T2 | Persistence oracles | unit + sqlite | unit | ✅ |
| T3–T6 | Domain deciders | unit | unit | ✅ |
| T7 | Capability HTTP | integration | integration | ✅ |
| T8–T9 | Vue components | unit | unit | ✅ |
| T10 | Facilitator adapter | unit | unit | ✅ |
| T11 | Capture-loop E2E | e2e | e2e | ✅ |
| T12–T16 | CI / lefthook / docs | none | none | ✅ |
| T17 | F11 oracles | unit | unit | ✅ |
| T18 | Eval fixtures | none | none | ✅ |
| T19 | Eval live runner | eval | eval | ✅ |
| T20 | Reporter / docs | none | none | ✅ |

No `Tests: none` on a layer that requires tests.

---

## Requirement mapping (after Tasks)

TSH-01 T12 · TSH-02 T11 · TSH-03 T1 · TSH-04 T2 · TSH-05 T3 · TSH-06 T4 · TSH-07 T5 · TSH-08/09/10 T6 · TSH-11 T8 · TSH-12 T9 · TSH-13/14 T7 · TSH-15 T13 · TSH-16 T14 · TSH-17 T15 · TSH-18 T16 · TSH-19 T18+T19 · TSH-20 T19 · TSH-21 T12+T19 · TSH-22 T17 · TSH-23 T15+T20 · TSH-24 T10.

**Coverage:** 24 total, 24 mapped, 0 unmapped.
