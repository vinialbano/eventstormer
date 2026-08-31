# Test-suite hardening Specification

**Feature:** `test-suite-hardening`
**Branch:** `test/suite-hardening`
**Source:** testing-boss suite review (2026-08-31) + maintainer scope (eval = minimal live F11, E2E = CI-only).

The deterministic suite is strong; the merge gate does not run the one capture-loop E2E, two
persistence/replay tests compare a fold to itself, shipped Session/Proposal commands have no
domain tests, and F11 (facilitator eval) is promised by ADR-008 / the PRD but unbuilt while the
facilitator already runs in `pnpm dev`.

---

## Problem Statement

A green `pnpm check` can hide a broken capture loop (E2E is ungated), a broken `replay`/`project`
(both sides of the assertion share one fold), and a prompt/model regression (no eval). Domain
tests also miss `Start Session`, `Attribute Contribution`, closed-session `Ask Question`, and
named Proposal reject/apply sequences — HTTP covers some wiring, not the lowest layer.

## Goals

- [ ] The one Playwright spec is a CI merge gate; a broken capture loop fails the PR.
- [ ] Replay and persistence-roundtrip assertions pin independently stated snapshots.
- [ ] Every shipped Session/Proposal `decide` branch has a Given/When/Then domain test.
- [ ] Capture-loop reject/edit/hold/unhold and CreateWorkshop failure are asserted at the UI layer.
- [ ] Pre-push matches `pnpm check`; `docs/testing.md` and the README describe Slice 1, not the scaffold.
- [ ] `pnpm eval` runs 4 restaurant F11 cases × N=5 against the real model, reports k/N per assertion, and is **not** in CI.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Full ADR-008 8-case eval (phase flagged, deeper-format named, two integration cases) | Slice 5 expansion; this feature ships the PRD-named ACs only |
| `pnpm eval --replay` | Reducer-iteration mode is Slice 5; live run + canned-oracle unit tests are enough now |
| E2E on pre-push / `pnpm check` | Maintainer: CI-only so local Stop/pre-push stay fast |
| Extra E2E specs (reject, empty, error journeys) | ADR-008: one happy-path spec; negatives live at component/HTTP |
| Mutation testing, coverage ratchet numbers, axe | Later; coverage flashlight stays unseeded |
| Board cycle / insert-between / kind-permission properties | Operations still `not-implemented-in-slice` |
| Rewriting all FacilitatorDock BEM selectors | New tests + E2E use role/label; existing BEM tests stay |
| Host `createRoutes` full composition path | Slice tests already cover mounted routers; not in the agreed P1 |
| `derived-artifact-generation` tests | No `src/` yet |
| Dropping `anthropic-contract` snapshot | Sensor, not this feature |
| Changing facilitator prompt or model ladder | Eval *measures* them; it does not retune them |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Eval depth | 4 restaurant cases, N=5, k/N, out of CI | Maintainer chose “minimal live eval” over defer/scaffold | y |
| E2E gate | Separate CI job, not `pnpm check` / pre-push | Maintainer chose CI-only | y |
| Pre-push vs `pnpm check` | Pre-push runs `pnpm check` (adds lint) | AGENTS.md already claims they match; today lint is missing from pre-push | n — logged |
| Eval cases | kind · past tense on facilitator-supplied names · near-miss not flagged · awkward phrasing kept | The four behaviours PRD F11 ACs name; phase/deeper-format wait for Slice 5 | n — logged |
| Eval oracles | Pure helpers live under `src/…/facilitator/` and run in `pnpm test`; live loop is `eval/` + `pnpm eval` | Deterministic graders must not hide behind an out-of-CI project | n — logged |
| F11 README table | Empty `k/N` placeholders until someone runs `pnpm eval --report` with a key | CI must not call Anthropic; first report is a local maintainer action | n — logged |
| Playwright in CI | `pnpm exec playwright install --with-deps chromium` in a job parallel to `check` | Official install; Chromium only (matches `playwright.config.ts`) | n — logged |

**Open questions:** none — all resolved or logged above.

---

## User Stories

### P1: E2E is a CI merge gate ⭐ MVP

**User Story**: As a maintainer, I want the capture-loop Playwright spec to fail a PR so that a broken Vite+Hono+sqlite+SPA path cannot merge.

**Why P1**: Iron Law 4 — real systems gate the merge. This is the only test that boots the real server.

**Acceptance Criteria**:

1. WHEN CI runs on a push or pull_request THEN a job SHALL install Chromium and run `pnpm test:e2e`, and a failure SHALL fail the workflow.
2. WHEN that job starts the app THEN it SHALL use the existing `playwright.config.ts` env (`FACILITATOR_MODE=scripted`, empty `ANTHROPIC_API_KEY`, throwaway `DATA_DIR`) — no real Anthropic call.
3. WHEN the spec locates the scope card, active proposal cards, or backlog stickies THEN it SHALL use role, label, or visible text — not `.dock__scope`, `.pc--active`, or `.wall__backlog .sticky`.
4. WHEN `pnpm check` or the pre-push hook runs THEN they SHALL NOT run Playwright.

**Independent Test**: A CI log on this branch shows an `e2e` job green; locally `pnpm test:e2e` still passes.

---

### P1: Replay and persistence oracles are independent ⭐ MVP

**User Story**: As a domain author, I want replay/persistence tests to fail when `project`/`replay` regress, even if both folds move together.

**Why P1**: `docs/testing.md` already forbids self-referential fold comparison; L-001 (candidate) recorded the same failure mode. The tests still do it.

**Acceptance Criteria**:

1. WHEN `replay.test.ts` asserts a targeted log THEN the expected snapshot SHALL be a literal (blocks, labels, withdrawn, placement) — not `log.reduce(project, emptySnapshot())`.
2. WHEN the incremental-consistency property (`replay(log ++ [op]) === project(replay(log), op)`) remains THEN a comment SHALL state it is a consistency property, not an independent oracle.
3. WHEN `persistence-roundtrip.test.ts` asserts a restart THEN `fromDisk` SHALL equal the same literal snapshot as (1)’s targeted sequence (or an equally explicit literal), not `replay(ops)`.
4. WHEN `replay` is changed to ignore `withdraw` THEN (1) or (3) SHALL fail; a test that only compared two folds SHALL no longer be the sole net.

**Independent Test**: Read the two files — no `toEqual(replay(…))` / `toEqual(incremental)` oracle.

---

### P1: Shipped Session and Proposal commands have domain tests ⭐ MVP

**User Story**: As a domain author, I want Given/When/Then tests on every shipped `decide` branch so a handler-only regression is caught at the lowest layer.

**Why P1**: Iron Law 2. HTTP tests do not own aggregate invariants.

**Acceptance Criteria**:

1. WHEN `Start Session` is decided on an unstarted session THEN `decide` SHALL emit exactly one `Session Started` with the command’s `sessionId`, `workshopId`, and `at`.
2. WHEN `Start Session` is decided on an already-started session THEN `decide` SHALL return `err({ kind: 'already-started', classification: 'systemic' })`.
3. WHEN `Attribute Contribution` is decided on a started session THEN `decide` SHALL emit exactly one `Contribution Attributed To Another Format` with the command’s `contributionId`, `format`, `note`, and `at`.
4. WHEN `Ask Question` is decided on a closed session THEN `decide` SHALL return `err({ kind: 'session-closed', classification: 'systemic' })`.
5. WHEN `Reject Proposal` is decided on a `PROPOSED` proposal THEN `decide` SHALL emit exactly one `Proposal Rejected`.
6. WHEN `Record Operation Applied` is decided on an `ACCEPTED` proposal THEN `decide` SHALL emit `Operation Applied` carrying `resultingBuildingBlockId`; a second call SHALL return `ok([])`.
7. WHEN `Record Operation Rejected` is decided on an `ACCEPTED` proposal THEN `decide` SHALL emit `Operation Rejected` with the given reason; a second call SHALL return `ok([])`.

**Independent Test**: `pnpm test` — new cases in `session/decide.test.ts` and `proposal/decide.test.ts`.

---

### P1: Capture-loop negatives at the UI and accept HTTP layers ⭐ MVP

**User Story**: As a domain expert using the SPA, I want reject/edit/hold/unhold and a failed workshop create to be covered so a broken mutation or silent create failure is caught without a second E2E.

**Why P1**: E2E stays one happy path; these are the error/alternate paths it skips.

**Acceptance Criteria**:

1. WHEN FacilitatorDock rejects an active proposal THEN the test SHALL assert `POST /api/proposals/:id/reject` and the card leaves the active cluster (same refetch-simulation style as accept).
2. WHEN FacilitatorDock edits an active proposal THEN the test SHALL assert `POST /api/proposals/:id/edit` with the new `{ label }`.
3. WHEN FacilitatorDock holds then unholds THEN the test SHALL assert `POST …/hold` then `POST …/unhold`.
4. WHEN CreateWorkshop’s `POST /api/workshops` rejects THEN the screen SHALL show `role="alert"` with `Could not start the workshop. Try again.` and SHALL NOT navigate.
5. WHEN `POST /api/proposals/:id/accept` is called for an unknown id THEN the handler SHALL return 404 `{ error: 'unknown-proposal' }`.
6. WHEN `POST /api/proposals/:id/accept` is called for a `REJECTED` proposal THEN the handler SHALL return 409 and the board SHALL gain no building block.

**Independent Test**: `pnpm test` — FacilitatorDock, CreateWorkshop, `accept.test.ts`.

---

### P1: Gates and docs describe the same green ⭐ MVP

**User Story**: As a contributor, I want pre-push, `pnpm check`, CI, and the testing docs to agree, except for the documented extras (CI `build` + CI `e2e`).

**Why P1**: AGENTS.md currently claims identity that `lefthook.yml` and `docs/testing.md` contradict.

**Acceptance Criteria**:

1. WHEN pre-push runs THEN it SHALL execute the same steps as `pnpm check` (typecheck, lint, test, depcruise, knip) — lint included.
2. WHEN `docs/testing.md` is read THEN it SHALL describe the existing Playwright spec, `pnpm test:e2e`, scripted facilitator, and that CI (not `pnpm check`) runs it.
3. WHEN the README “Status” / “What is real vs stubbed” sections are read THEN they SHALL NOT claim the facilitator or the board are unbuilt; they SHALL name the capture loop and that eval is `pnpm eval` out of CI.
4. WHEN `AGENTS.md` Commands / CI wording is read THEN it SHALL state: local `pnpm check` = typecheck → lint → test → depcruise → knip; CI adds `build` and `test:e2e`.

**Independent Test**: Read the four files; pre-push config contains lint or `pnpm check`.

---

### P1: Minimal F11 eval (restaurant, N=5, out of CI) ⭐ MVP

**User Story**: As a maintainer changing the system prompt or model, I want `pnpm eval` to show k/N per F11 assertion so a judgment regression is visible before I ship.

**Why P1**: Maintainer chose live minimal eval; facilitator is already production-capable.

**Acceptance Criteria**:

1. WHEN `pnpm eval` runs with `ANTHROPIC_API_KEY` set THEN it SHALL call the real Anthropic facilitator (not the scripted double) on 4 restaurant/kitchen fixture cases, N=5 each, using `buildInstructions` / `buildTurnInput` + `Facilitator.interpret`.
2. WHEN those cases run THEN the four assertions SHALL be: (a) proposed `blockKind` matches the fixture, (b) a facilitator-supplied domain-event label is past tense, (c) a near-miss genuine event is **not** a `flag-phase` track, (d) a kept-phrasing label shares at least one content word with the contribution (fail even if `bar` claims `lenient`).
3. WHEN results are printed THEN each assertion SHALL appear as `k/5` with no headline aggregate pass-rate.
4. WHEN the fixture domain is restaurant/kitchen THEN the system prompt few-shot SHALL remain library lending (`prompt.test.ts` already locks that disjointness).
5. WHEN `ANTHROPIC_API_KEY` is unset THEN `pnpm eval` SHALL exit non-zero with a message to set the key — it SHALL NOT skip green.
6. WHEN `pnpm test` / CI run THEN they SHALL NOT invoke `pnpm eval` or the live Anthropic path.
7. WHEN `pnpm eval --report` runs after a live eval THEN it SHALL splice a Markdown table between `<!-- eval:results -->` / `<!-- /eval:results -->` in the README. Until a live report exists, those markers MAY wrap a placeholder row that says results are produced by `pnpm eval --report`.
8. WHEN the pure oracles (content-word overlap, past-tense check, “has flag-phase”, kind equality) are unit-tested THEN those tests SHALL run under `pnpm test` with canned turns — no network.

**Independent Test**: `pnpm test` covers oracles; `pnpm eval` without a key fails loudly; with a key, a local run prints 4× assertions as k/5.

---

### P2: `askOpening` retry ladder

**User Story**: As a session starter, I want opening-question provider failures to walk the same ladder as `interpret`, so a 5xx at session start is classified instead of hanging the UI.

**Why P2**: Interpret ladder is already thorough; openings are the other port method.

**Acceptance Criteria**:

1. WHEN `askOpening`’s `generate` returns a retryable 503 then a valid opening THEN the adapter SHALL succeed and SHALL have slept the same backoff as interpret.
2. WHEN `askOpening` exhausts the ladder on provider-down THEN it SHALL return `err({ kind: 'provider-down' })`.

**Independent Test**: `anthropic-adapter.test.ts` — two cases mirroring interpret.

---

## Edge Cases

- WHEN CI `e2e` and `check` run in parallel THEN a failure in either SHALL fail the workflow (no `continue-on-error`).
- WHEN Playwright browsers are missing on the CI runner THEN the e2e job SHALL install them in-job, not assume a cache from `check`.
- WHEN an eval fixture’s expected kind is `domain-event` and the model proposes only `flag-phase` THEN assertion (a) SHALL count as failed for that run.
- WHEN a kept-phrasing label is a synonym that shares no content word with the segment THEN assertion (d) SHALL fail (PRD: content words, not embedding similarity).
- WHEN `Start Session` is tested THEN the write model SHALL be `replay([])` / empty, not a closed session.
- WHEN accept 404 is tested THEN no workshop/session seed for that proposal id.

---

## Implicit-requirement dimensions

| Dimension | Resolution |
| --- | --- |
| Input validation & bounds | Eval fixtures are committed JSON with Zod-parsed expected kind/label/segment. N/A for gate YAML. |
| Failure / partial-failure | CI e2e fail-fast; eval without key fails (not skip); Playwright `retries: 0` unchanged. |
| Idempotency / retry / duplicate | N/A — no new product writes. Proposal second Applied/Rejected already `ok([])` (TSH-06/07). |
| Auth boundaries & rate limits | E2E empty API key; eval requires a real key locally only. No third-party UI. |
| Concurrency / ordering | E2E `workers: 1` unchanged. CI `e2e` job parallel with `check`. Eval cases sequential (cost + rate). |
| Data lifecycle / expiry | E2E throwaway `DATA_DIR` unchanged. `eval-runs/` gitignored. |
| Observability | Playwright `trace: retain-on-failure` unchanged. Eval prints k/N; model-call JSONL already exists. |
| External-dependency failure | Scripted E2E never hits Anthropic. Eval provider-down is a failed run in k/N, not a skip. |
| State-transition integrity | Domain tests cover Start / Attribute / closed Ask / Reject / Applied / Rejected. |

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| TSH-01 | P1: E2E CI job | Tasks T12 | In Tasks |
| TSH-02 | P1: E2E locators | Tasks T11 | Done |
| TSH-03 | P1: Replay literal oracle | Tasks T1 | Done |
| TSH-04 | P1: Persistence literal oracle | Tasks T2 | Done |
| TSH-05 | P1: Start Session | Tasks T3 | Done |
| TSH-06 | P1: Attribute Contribution | Tasks T4 | Done |
| TSH-07 | P1: Ask Question closed | Tasks T5 | Done |
| TSH-08 | P1: Reject Proposal | Tasks T6 | Done |
| TSH-09 | P1: Record Operation Applied | Tasks T6 | Done |
| TSH-10 | P1: Record Operation Rejected | Tasks T6 | Done |
| TSH-11 | P1: Dock reject/edit/hold/unhold | Tasks T8 | Done |
| TSH-12 | P1: CreateWorkshop alert | Tasks T9 | Done |
| TSH-13 | P1: Accept 404 | Tasks T7 | Done |
| TSH-14 | P1: Accept 409 | Tasks T7 | Done |
| TSH-15 | P1: Pre-push = pnpm check | Tasks T13 | In Tasks |
| TSH-16 | P1: docs/testing.md | Tasks T14 | In Tasks |
| TSH-17 | P1: README real vs stubbed | Tasks T15 | In Tasks |
| TSH-18 | P1: AGENTS.md gate wording | Tasks T16 | In Tasks |
| TSH-19 | P1: pnpm eval live 4×5 | Tasks T18–T19 | In Tasks |
| TSH-20 | P1: k/N, no aggregate | Tasks T19 | In Tasks |
| TSH-21 | P1: eval not in CI | Tasks T12, T19 | In Tasks |
| TSH-22 | P1: eval oracles in pnpm test | Tasks T17 | In Tasks |
| TSH-23 | P1: README eval markers | Tasks T15, T20 | In Tasks |
| TSH-24 | P2: askOpening ladder | Tasks T10 | Done |

**Coverage:** 24 total, 24 mapped to tasks, 0 unmapped.

---

## Success Criteria

- [ ] CI on this branch shows `check` and `e2e` both required; `pnpm check` locally does not boot Playwright.
- [ ] `pnpm test` fails if `replay` ignores withdraw, or if Start Session / Attribute / closed Ask / Reject / Applied / Rejected regressions land.
- [ ] `pnpm eval` without a key is red; with a key it prints four `k/5` rows and never a single % score.
- [ ] README and `docs/testing.md` describe the capture loop and the eval command as they exist after this feature.
