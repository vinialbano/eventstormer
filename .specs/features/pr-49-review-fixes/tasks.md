# Tasks — pr-49-review-fixes

6 tasks, one batch — executed inline. Order is dependency-driven: T1 before T2 (enabling
`no-self-compare` errors on the un-fixed tautology); T3 after T2 (the rename runs with
`no-shadow` active). T6 last (needs the final test count).

## Gate Check Commands

| Level | Command |
| ----- | ------- |
| quick | `pnpm test` |
| full  | `pnpm check` |
| build | `pnpm check` |

(`pnpm check` = typecheck → `eslint --max-warnings 0` → test → depcruise → knip. No e2e/Playwright
surface is touched by this batch.)

## Test Coverage Matrix

| Layer | Task | Coverage expectation |
| ----- | ---- | -------------------- |
| Capability (session-facilitation `interpret-contribution`) | T1 | New unit test in `interpret.test.ts`: two contributions, same `attribute-to-other-format` `format`+`note`, assert **two** `Contribution Attributed To Another Format` events with distinct `contributionId`. Assertion targets the event `contributionId` values, not a call count. |
| Config / lint | T2 | No new test — gate is `pnpm check` green with `no-self-compare` + `@typescript-eslint/no-shadow` at `error`. |
| Pure rename | T3, T4 | No new tests — pure identifier rename; gate is `pnpm check` green with the **same** test count as after T1. |
| Docs | T5 | No test — `.specs/STATE.md` AD-026 present. |
| External | T6 | No test — PR description updated via `gh pr edit`. |

---

## T1 — restore the cross-contribution attribution guard  *(R1)*

**Files:** `src/session-facilitation/capabilities/interpret-contribution/interpret.ts`,
`src/session-facilitation/capabilities/interpret-contribution/interpret.test.ts`
**Tests:** unit · **Gate:** full

**Done when:**
- The `.some(...)` callback in `case 'attribute-to-other-format'` uses a param name distinct from
  the outer `event` (e.g. `priorEvent`), and the identity check reads
  `priorEvent.contributionId === event.contributionId` — comparing each prior session event
  against the **current** interpreted contribution.
- New test (AC1.1): in one session, contribution `c_1` then `c_2` each interpreted with
  `{ track: 'attribute-to-other-format', format: F, note: N }` (same F, same N) → the session
  stream ends with two `Contribution Attributed To Another Format` events, `contributionId`
  values `['c_1', 'c_2']`.
- Existing `attribute-to-other-format` test (the multi-track turn) still passes (AC1.2).
- `pnpm check` green (AC1.3).

## T2 — lint guards for self-compare and shadowing  *(R2)*

**Files:** `eslint.config.ts`, `scripts/spike-structured-output.ts`,
`src/session-facilitation/domain/proposal/machine.property.test.ts`
**Tests:** none · **Gate:** build

**Done when:**
- `eslint.config.ts`: `'no-self-compare': 'error'` and `'@typescript-eslint/no-shadow': 'error'`
  added (with a one-line comment tying them to the class of bug they catch). If core `no-shadow`
  is on anywhere, it is off where `@typescript-eslint/no-shadow` is on (the TS rule supersedes it).
- `scripts/spike-structured-output.ts`: the inner `jsonSchema` (line ~86) renamed so it no longer
  shadows the outer one — pick a name that says what the inner value is.
- `machine.property.test.ts`: the inner `command` (line ~67) renamed so it no longer shadows the
  outer `command`.
- `pnpm check` green with both rules at `error` (AC2.3).

## T3 — `wm` → `writeModel` repo-wide  *(R3)*

**Files:** the 13 source files + their tests that contain `wm`:
`src/domain-model-capture/domain/board/{decide,evolve}.ts` (+ `decide.test.ts`, `evolve.test.ts`,
`replay.test.ts`), `src/session-facilitation/domain/proposal/{decide,evolve}.ts` (+ tests,
`machine.property.test.ts`), `src/session-facilitation/domain/session/{decide,evolve}.ts` (+ tests),
`src/session-facilitation/domain/workshop/{decide,evolve}.ts` (+ tests),
`src/session-facilitation/domain/read-models/proposals-view.ts` (+ test),
`src/session-facilitation/capabilities/interpret-contribution/interpret.ts`,
`src/session-facilitation/capabilities/review-proposal/accept.ts`,
`src/session-facilitation/capabilities/set-scope/http.ts` (+ `http.test.ts`),
`src/session-facilitation/infrastructure/session-close.ts`.
Discover the exact set with `git grep -lw wm -- 'src/**/*.ts'` before starting; rename in all of
them.
**Tests:** none new · **Gate:** build

**Done when:**
- Every `wm` identifier renamed to `writeModel` (params, locals, destructured/`let` rebinds).
- `git grep -nw wm -- 'src/**/*.ts'` returns nothing (AC3.2).
- `pnpm check` green; `pnpm test` count identical to the T1 count (AC3.3).

## T4 — NOTE naming corrections  *(R4)*

**Files:** `src/plumbing/model-call-log.test.ts`,
`src/app/capture-loop/dock/FacilitatorDock.test.ts`,
`src/session-facilitation/infrastructure/facilitator/anthropic-adapter.ts`
**Tests:** none new · **Gate:** build

**Done when:**
- `model-call-log.test.ts`: the `ModelCallEntry` local(s) named `event` → `call`.
- `FacilitatorDock.test.ts`: `seed` param `value` → `sessionView` (both the signature and
  `session.view = …`).
- `anthropic-adapter.ts`: `parsed.error.issues.map((index) => …)` → `((issue) => …)`.
- `pnpm check` green (AC4.4).

## T5 — record AD-026  *(R5)*

**Files:** `.specs/STATE.md` (Decisions table only — never the Handoff section here)
**Tests:** none · **Gate:** build

**Done when:** AD-026 row added per AC5.1 — spelled-out identifiers incl. `wm` → `writeModel`,
rationale (lint under-enforces sub-`min:2` / unknown abbreviations; convention carried by review +
this precedent), date `2026-08-31`, scope "PR #49 + all later code".

## T6 — correct the PR #49 description  *(R6)*

**Files:** none in-repo — `gh pr edit 49 --body-file …`
**Tests:** none · **Gate:** none (external)

**Done when:** the three inaccuracies in AC6.1 are fixed in the live PR body, test count reflects
the final `pnpm test` number, and a short "Review fixes" note lists R1–R5 with their commits.

---

## Execution Plan

1. T1 → interpret.ts + interpret.test.ts → `pnpm check` → `fix(session-facilitation): restore cross-contribution attribute-to-other-format guard`
2. T2 → eslint.config.ts + 2 shadow renames → `pnpm check` → `ci(lint): forbid self-compare and shadowed bindings`
3. T3 → wm→writeModel across ~17 files → `pnpm check` → `refactor: spell out wm as writeModel`
4. T4 → 3 NOTE renames → `pnpm check` → `refactor: clearer local names in model-call-log, dock, anthropic-adapter tests`
5. T5 → STATE.md AD-026 → `pnpm check` → `docs(specs): record AD-026 — spell out wm as writeModel`
6. T6 → `gh pr edit 49` → (no commit)
7. Verifier sub-agent → `.specs/features/pr-49-review-fixes/validation.md`
