# Slice 1 — The Capture Loop · Tasks

## Execution Protocol (MANDATORY — do not skip)

Implement these tasks with the `spec-driven-development` skill (plugin-qualified:
`anoria-engineering:spec-driven-development`): **activate it by name and follow its Execute flow
and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of
truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier,
discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Spec**: `.specs/features/slice-1-capture-loop/spec.md` (~70 requirement IDs)
**Design**: `.specs/features/slice-1-capture-loop/design.md`
**Context**: `.specs/features/slice-1-capture-loop/context.md`
**Decisions**: `.specs/STATE.md` AD-001, AD-005…AD-024
**Status**: Approved — ready for Execute

Every task obeys the Execution Contract: tests derive from the spec's ACs (never mirror the
implementation); the gate passes before a task is done; one atomic commit per task; never weaken
or delete a test. A fresh Verifier runs after the final task.

---

## Test Coverage Matrix

> Generated from codebase + project guidelines + spec — confirm before Execute. Guidelines found:
> `AGENTS.md`, `docs/testing.md`, `docs/adr/008-testing-eval-and-observability.md`,
> `vite.config.ts` (`coverage.thresholds.autoUpdate: true`, no fixed number; hard
> `**/domain/** ≥ 90%` glob is Slice 6), `src/domain-model-capture/domain/AGENTS.md`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Domain deciders/`evolve` (`session-facilitation/domain/{workshop,session,proposal}/`) | unit (node) | Given(events)/When(command)/Then(events\|rejection) **through the operation**; 1:1 to spec ACs; every listed edge case; `fast-check` properties for the `Proposal` disposition machine | `src/session-facilitation/domain/**/*.test.ts` | `pnpm test` |
| Domain read-models + schema (`domain/read-models/`, `domain/schema/`) | unit (node) | all branches; **projected values pinned to literals the test spells out**, never compared to another projection (`docs/testing.md`) | `src/session-facilitation/domain/**/*.test.ts` | `pnpm test` |
| `domain-model-capture/capabilities/board-access/` | unit + integration (node) | apply happy + each `decide` rejection; internal `stale-position` retry; a **genuine two-accept race**; re-inflation → SSOT `.parse` | `src/domain-model-capture/**/*.test.ts` | `pnpm test` |
| `session-facilitation/infrastructure/` (facilitator adapter, session-index, migrations, ACL map) | unit + integration (node) | adapter: **`generateText` mocked at the `ai` boundary — no real HTTP** (S1-30); ladder + failure classification + one-schema-retry + `warnings` + JSONL line; session-index: reserve/close/`sessionIdsFor`/stale-open recovery; ACL: canned turn → `InterpretedTrack[]` + minted ids; schema-shape: optional count ≤ 24, no empty `z.toJSONSchema` subschema, `.max(12)`/`.max(200)` | `src/session-facilitation/infrastructure/**/*.test.ts` | `pnpm test` |
| `session-facilitation/capabilities/` (HTTP handlers via Hono `testClient` + tick functions) | integration (node) over the **in-memory `EventStore`** | every route: happy + every listed edge + error path; tick fns driven directly (no timers); **the cross-context accept-seam test lives here** (consumes the seam — `docs/testing.md`), asserting the two contexts never share a SQLite transaction | `src/session-facilitation/capabilities/**/*.test.ts` | `pnpm test` |
| `host/` (`scheduler.ts`, `config.ts`) | unit (node) | throwing-tick isolation (loop continues); missing `ANTHROPIC_API_KEY` → fail fast | `src/host/**/*.test.ts` | `pnpm test` |
| `plumbing/` (`model-call-log.ts`, `model-pricing.ts`, `ids.ts` `WorkshopId`) | unit (node) | JSONL line shape; cost = tokens × table; brand type-link compiles | `src/plumbing/**/*.test.ts` | `pnpm test` |
| `EventStore` contract (`plumbing/event-store/contract-test.ts`) | unit (node) | **new cases:** `append(stream, -1, ops)` on an existing stream → `stale-position`, nothing written; `append(stream, pos, [])` (empty batch) behaviour pinned | `src/plumbing/event-store/*.test.ts` | `pnpm test` |
| Vue SPA (`src/app/capture-loop/`) | unit (jsdom) + visual (`playwright-cli`) | store cold-load from one GET; `useInterpretationPoll` starts/stops on the **fully-derived** sub-state; server-confirmed (no optimistic board writes); scope card renders + submits; proposal card actions; dock/drawer collapse + parked dot; questions render as messages; **no board ghosts**; keyboard-reachable (WCAG 2.2 AA); `playwright-cli open` reports **zero** console errors/warnings | `src/app/**/*.test.ts` | `pnpm test` (unit); `playwright-cli` (visual — manual gate) |
| E2E (`@playwright/test`) | e2e | **ONE** flow (ADR-008 "one E2E"; `docs/testing.md` "add with the first real flow"): create workshop → set scope → 3 contributions (scripted facilitator via `FACILITATOR_MODE=scripted`) → accept proposals → building blocks in the backlog | `e2e/*.spec.ts` | `pnpm test:e2e` |
| depcruise architecture rules (`.dependency-cruiser.cjs`) | static gate | **every new or affected rule proven by a planted violation** (repo convention): `**/domain/** ↛ framework` (glob extended for `session-facilitation/domain/`), `cross-context-only-via-api`, `no-cross-slice-imports` (first real test — `session-facilitation` gets ≥ 2 caps), `host-imports-only-context-api` (new `host/scheduler.ts`), `ui-does-not-import-server-code` (new `src/app/capture-loop/`) | `.dependency-cruiser.cjs` | `pnpm depcruise` |
| SQL migrations / Zod schema / config entities | none (build gate only) | — | — | `pnpm check` |

## Gate Check Commands

> Generated from `package.json` + `.github/workflows` + lefthook — confirm before Execute.

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | after a task whose only tests are unit | `pnpm test` |
| Full | after a task with integration or e2e tests | `pnpm test && pnpm test:e2e` *(before `test:e2e` exists — T31 — Full == Quick)* |
| Build | phase completion; schema/config/migration-only tasks; any task touching `.dependency-cruiser.cjs`, `vite.config.ts`, `knip.json`, `package.json` | `pnpm check && pnpm build` |

`pnpm check` = `typecheck → lint → test → depcruise → knip`, fail-fast (CI + the pre-push hook run
exactly this). A red tree at task end is a failed task — the `Stop` hook enforces it.

---

## Execution Plan

Phases are ordered and run sequentially. Tasks within a phase run in order. At Execute the
orchestrator packs consecutive whole phases into ~7-task batches and offers batch sub-agents.

### Phase 1 — Foundations: ids, context skeleton, schema, plumbing
```
T1 → T2 → T3 → T4 → T5
```
### Phase 2 — The three aggregates (domain deciders)
```
T6 → T7 → T8 → T9
```
### Phase 3 — domain-model-capture: apply + board read
```
T10 → T11
```
### Phase 4 — The facilitator (infrastructure)
```
T12 → T13 → T14
```
### Phase 5 — Write capabilities (simple)
```
T15 → T16 → T17 → T18
```
### Phase 6 — The interpretation loop + proposal review
```
T19 → T20 → T21 → T22
```
### Phase 7 — close-session + host wiring
```
T23 → T24 → T25
```
### Phase 8 — The capture screen (SPA)
```
T26 → T27 → T28 → T29 → T30
```
### Phase 9 — E2E + release
```
T31 → T32
```

### Phase Execution Map
```
P1 → P2 → P3 → P4 → P5 → P6 → P7 → P8 → P9

P1: T1 → T2 → T3 → T4 → T5
P2: T6 → T7 → T8 → T9
P3: T10 → T11
P4: T12 → T13 → T14
P5: T15 → T16 → T17 → T18
P6: T19 → T20 → T21 → T22
P7: T23 → T24 → T25
P8: T26 → T27 → T28 → T29 → T30
P9: T31 → T32
```
Batch plan (confirmed 2026-08-30): **B1** P1 (5) · **B2** P2+P3 (6) · **B3** P4+P5 (7) ·
**B4** P6+P7 (7) · **B5** P8 (5) · **B6** P9 (2). ~6 workers — foundations get their own worker so
the aggregate workers cold-start against a settled schema.

---

## Task Breakdown

### T1: Promote `WorkshopId` to canonical `plumbing/ids.ts`
**What**: Move the canonical Zod `WorkshopId` brand into `plumbing/ids.ts`; refactor
`domain-model-capture/domain/schema/ids.ts` to import/re-export it; drop the speculative
`SessionId` export from `domain-model-capture/api.ts` if `knip`/usage shows it unused; confirm
`domain/schema/author.ts` accepts a plain string for `proposer`/`accepter`.
**Where**: `src/plumbing/ids.ts`, `src/domain-model-capture/domain/schema/ids.ts`,
`src/domain-model-capture/api.ts`
**Depends on**: None
**Reuses**: the Slice-0 `z.$brand` + `plumbing/ids.ts` mirror pattern
**Requirement**: S1-69
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [x] `WorkshopId` is defined once (in `plumbing/ids.ts`), re-exported by `domain-model-capture`
- [x] `Author` schema verified — SPEC_DEVIATION: parties are `{ name }` refs, not plain strings; the frozen Slice-0 schema is unchanged, accept path wraps names (`author.test.ts` + `author.ts` comment)
- [x] `pnpm check && pnpm build` green; test count 101 (≥ 99)
**Tests**: unit (brand type-link) · **Gate**: build — ✅ done, commit `T1`

### T2: `session-facilitation` context skeleton + framework-free rule
**What**: Create `src/session-facilitation/{domain,capabilities,infrastructure}/`, a path-scoped
`src/session-facilitation/domain/AGENTS.md` (mirroring `domain-model-capture/domain/AGENTS.md` —
the framework-free rule + this context's invariants), an empty chained `api.ts`; register the new
paths in `vite.config.ts` vitest globs, `knip.json` entries, and `.dependency-cruiser.cjs`;
**extend the `**/domain/** ↛ framework` glob to cover `session-facilitation/domain/` and prove it
with a planted `import { Hono }` violation**.
**Where**: `src/session-facilitation/**`, `vite.config.ts`, `knip.json`, `.dependency-cruiser.cjs`
**Depends on**: T1
**Reuses**: `domain-model-capture/domain/AGENTS.md`, the Slice-0 depcruise rule set
**Requirement**: S1-68, S1-69
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [x] `session-facilitation/domain/AGENTS.md` present, path-scoped
- [x] planted `import { Hono }` in `session-facilitation/domain/` fails `pnpm depcruise` (`domain-imports-no-framework`); reverted
- [x] `pnpm check && pnpm build` green
**Tests**: none (build gate) · **Gate**: build — ✅ done, commit `T2`

DEVIATION: the generic `domain-imports-no-framework` rule (`^src/[^/]+/domain/`) and the
`CONTEXTS` const already covered `session-facilitation` — no glob extension needed. vite.config
`src/**/*.test.ts` and knip `src/*/api.ts` already cover the new context. Only change to
`.dependency-cruiser.cjs`: a `no-orphans` `pathNot` for `src/*/api.ts` (an entry-by-design public
surface, unimported until T24/T25). `api.ts` is a placeholder (`export {}`) until T24.

### T3: `session-facilitation/domain/schema/` — ids, `InterpretedTrack`, event SSOTs
**What**: Branded ids (`SessionId`, `ContributionId`, `ProposalId`, `QuestionId`) + their
`plumbing/ids.ts` type mirrors; the stored `InterpretedTrack` discriminated union; the frozen
per-aggregate event unions (`v: z.literal(1)` on every event — Workshop / Session / Proposal),
including `Contribution Interpretation Failed` as its **own** event and `Question Asked` with a
`.refine` (`scopeStatement` present ⟺ `kind === 'scope'`).
**Where**: `src/session-facilitation/domain/schema/`
**Depends on**: T2
**Reuses**: `domain-model-capture/domain/schema/` (ADR-004 `v:1` discipline; frozen-union pattern)
**Requirement**: event SSOT; S1-64
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [x] every event schema has `v: z.literal(1)`; `InterpretedTrack` has no `z.unknown()` (toJSONSchema `{}` sensor + per-field rejection)
- [x] `Question Asked` `.refine` rejects a `scope` event with no `scopeStatement` and a `phase`/`free` event with one — tested (5 cases)
- [x] `pnpm check && pnpm build` green (131 tests)
**Tests**: unit (schema parse/refine branches) · **Gate**: build — ✅ done, commit `T3`

NOTE: no `schema/index.ts` barrel yet (knip flags an unimported barrel) — consumers import
`./events.ts` / `./interpreted-track.ts` / `./ids.ts` directly; add the barrel when it earns a
consumer. Id generators (`newContributionId` etc.) deferred to the tasks that mint. `at` is an
`z.iso.datetime()` field on every event (design), stamped from the Clock by the app layer.

### T4: `plumbing/model-call-log.ts` + `plumbing/model-pricing.ts`
**What**: A JSONL appender (`logModelCall(entry)` → `${DATA_DIR}/model-calls.jsonl`) writing
`{ at, model, requestMessages, responseText, parseResult, warnings, usage, costEstimateUsd }`;
an owned price table (`claude-sonnet-5`, `claude-haiku-4-5`) with `estimateCost(model, usage)`.
**Where**: `src/plumbing/model-call-log.ts`, `src/plumbing/model-pricing.ts`
**Depends on**: T2
**Reuses**: `plumbing/clock.ts` for `at`
**Requirement**: S1-31, S1-50
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [x] one call appends exactly one valid JSON line (temp dir; round-trips + append-not-overwrite + creates missing dir)
- [x] `estimateCost` matches hand-computed literals (sonnet $2/$10, haiku $1/$5, cache-read 0.1×, realistic turn)
- [x] `pnpm check && pnpm build` green (140 tests)
**Tests**: unit · **Gate**: quick — ✅ done, commit `T4`

NOTE: prices from the `claude-api` skill's model table (sonnet-5 $2/$10 per MTok, haiku-4-5
$1/$5); cache-read at Anthropic's standard 0.1× input. `logModelCall(dataDir, entry)` — dir
injected (plumbing is a leaf, no config import); the adapter (T13) assembles the entry incl.
`costEstimateUsd` via `estimateCost`.

### T5: `session-facilitation/infrastructure/` — migrations + `session-index` + `derived_track`
**What**: `migrations.ts` extending the Slice-0 set with `session_index(workshop_id, session_id
PK, status, started_at, closed_at)` + `UNIQUE(workshop_id) WHERE status='open'` and
`derived_track(contribution_id, track_index, PK(...))`; `session-index.ts` with `reserve`,
`close`, `sessionIdsFor`, `staleOpenRow` (an `open` row whose session stream has no
`Session Started`).
**Where**: `src/session-facilitation/infrastructure/{migrations,session-index}.ts`
**Depends on**: T3
**Reuses**: `plumbing/event-store/migrations.ts` (structural `MigrationDb`), the `node:sqlite`
`BEGIN IMMEDIATE` discipline
**Requirement**: S1-04, S1-57, S1-67
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [x] `reserve` twice for one workshop → the 2nd returns `session-already-open` (partial unique index is the guard)
- [x] `close` frees the slot; `staleOpenRow` returns the id when the stream lacks `Session Started`, `undefined` otherwise — `describe.each` over the in-memory + sqlite stores; `deleteRow` clears a stale slot
- [x] `pnpm check && pnpm build` green (159 tests)
**Tests**: unit + integration · **Gate**: build — ✅ done, commit `T5`

DEVIATION: `applyMigrations` (plumbing) gained two additive default params
(`migrations`, `trackingTable`) so `session-facilitation` runs its own id sequence in
`_sf_migrations` without duplicating the transactional loop and without putting its projection
tables in `plumbing/event-store`. Backward compatible — the Slice-0 call and its tests are
unchanged. `derived_track` table is created here; its marker helpers land with T19.

### T6: `session-facilitation/domain/workshop/`
**What**: `decide`/`evolve` for `Start Workshop` (name 1–80, non-blank) and `Set Scope`
(statement non-blank, ≤ 10 000; **repeatable — no lock argument**); write model `{ format,
creatorName }`.
**Where**: `src/session-facilitation/domain/workshop/`
**Depends on**: T3
**Reuses**: `domain-model-capture/domain/board/{decide,evolve}.ts` shape; `Result`
**Requirement**: S1-01, S1-02, S1-09
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [x] G/W/T tests: blank name rejected; 3 successive `Set Scope` all emit `Scope Set`; over-length rejected
- [x] `pnpm check` green (169 tests)
**Tests**: unit · **Gate**: quick — ✅ done, commit `T6`

### T7: `session-facilitation/domain/session/`
**What**: `decide`/`evolve` for `Make Contribution` (reject if `CLOSED`; trimmed non-empty;
≤ 10 000), `Ask Question`, `Answer Question` (**rejects an unknown or already-`Resolved`
`questionId`**), `Interpret Contribution` (2nd call for a seen `contributionId` → `ok([])`),
`Fail Interpretation` (→ `Contribution Interpretation Failed`; ledgered), `Close Session`
(idempotent; emits `{ unresolvedQuestionIds, closedAt }` only). Holds `Map<QuestionId,
Open|Resolved>` + the interpret-once `Set<ContributionId>`.
**Where**: `src/session-facilitation/domain/session/`
**Depends on**: T3
**Reuses**: as T6; modeling-uncertainty ledger-as-invariant
**Requirement**: S1-06, S1-12, S1-13, S1-14, S1-15, S1-26, S1-59
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [x] G/W/T: contribution on a `CLOSED` session rejected; empty rejected; interpret-once (2nd → `ok([])`); `Answer Question` on an unknown id rejected; `Close Session` twice → 2nd `ok([])`
- [x] `Session Closed` payload carries **no** summary struct
- [x] `pnpm check` green (187 tests)
**Tests**: unit · **Gate**: quick — ✅ done, commit `T7`

### T8: `session-facilitation/domain/proposal/`
**What**: `decide`/`evolve` — disposition machine `PROPOSED ⇄ EDITED → ACCEPTED →
APPLIED|APPLY_FAILED`, `REJECTED` terminal, `APPLY_FAILED` re-acceptable; `Held`/`Unheld`
orthogonal marker; `Accept Proposal` **mints + carries `buildingBlockId`, idempotent while
`ACCEPTED`/`APPLIED`**; `Edit` label ≤ 200; `Lapse Proposal` idempotent on a terminal proposal;
no `overflow` field on `Building Block Proposed`.
**Where**: `src/session-facilitation/domain/proposal/`
**Depends on**: T3
**Reuses**: `fast-check` (Slice-0 devDep); G/W/T pattern
**Requirement**: S1-38, S1-39, S1-44, S1-45, S1-47, S1-52
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [x] `fast-check` property: no command sequence reaches an illegal transition
- [x] G/W/T: accept twice → one `Proposal Accepted`, same `buildingBlockId`; edit after `REJECTED` rejected; hold/unhold reversible; lapse on `APPLIED` → `ok([])`
- [x] `pnpm check` green (199 tests)
**Tests**: unit (+ fast-check properties) · **Gate**: quick — ✅ done, commit `T8`

### T9: `session-facilitation/domain/read-models/`
**What**: pure functions — `sessionView` (transcript, open questions, scope status, per-contribution
interpretation status incl. a **fully-derived** sub-state), `sessionProposalIds`, `sessionSummary`
(**read-time**; `blocksAdded` from `Operation Applied` counts, `recentTurns` = last 8),
`priorSessionHistory`, `facilitationContext`, `facilitationAgenda` (open questions ∪ phase-name-
looking blocks — **no stakeholder input**).
**Where**: `src/session-facilitation/domain/read-models/`
**Depends on**: T7, T8
**Reuses**: `domain-model-capture/domain/board/project.ts` (fold pattern)
**Requirement**: S1-35, S1-36, S1-37, S1-60
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [x] every projected value asserted against a **literal** the test spells out (not another projection — `docs/testing.md`)
- [x] `sessionSummary` over a canned stream matches a hand-written expected struct
- [x] `pnpm check && pnpm build` green (216 tests)
**Tests**: unit · **Gate**: build (last in Phase 2) — ✅ done, commit `T9`

### T10: `domain-model-capture/capabilities/board-access/` — `applyOperation` + `readBuildingBlocks`
**What**: `applyOperation(deps, workshopId, operation)` — **no `expectedPosition`**: read current
board position → `decide` → `append`, bounded internal retry on `stale-position`; returns
`{ resultingBuildingBlockId, nextPosition }` or a merits `Rejection`. `readBuildingBlocks(deps,
workshopId) → {id,kind,label}[]`. Export both from `domain-model-capture/api.ts`. **Re-verify
`cross-context-only-via-api` with a planted `session-facilitation`→`domain-model-capture/domain`
import.**
**Where**: `src/domain-model-capture/capabilities/board-access/`, `src/domain-model-capture/api.ts`,
`.dependency-cruiser.cjs`
**Depends on**: T1
**Reuses**: `domain-model-capture/domain/board/{decide,replay,replayWriteModel,project}.ts`
**Requirement**: S1-20, S1-42, S1-47, S1-66, S1-68
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [x] apply happy path; `duplicate-id` and `unknown-target` → merits `Rejection`
- [x] a **genuine two-accept race** (two `applyOperation` calls, same board stream) → both apply, no `APPLY_FAILED` (internal retry)
- [x] planted cross-context import fails `pnpm depcruise` (`cross-context-only-via-api` + `domain-imports-nothing-above`); reverted
- [x] `pnpm check && pnpm build` green (221 tests)
**Tests**: unit + integration · **Gate**: build — ✅ done, commit `T10`

### T11: `GET /workshops/:id/board` route + `EventStore` contract-test additions
**What**: A chained Hono router for `GET /workshops/:id/board` (returns `BoardSnapshot`); mount in
`src/host/routes.ts`. Add `EventStore` contract-test cases: `append(stream, -1, ops)` on an
existing stream → `stale-position`, nothing written; `append(stream, pos, [])` behaviour pinned.
**Where**: `src/domain-model-capture/capabilities/board-access/http.ts`, `src/host/routes.ts`,
`src/plumbing/event-store/contract-test.ts`
**Depends on**: T10
**Reuses**: `src/host/health.ts` (chained-router pattern); the shared contract-test suite
**Requirement**: S1-07, S1-46, S1-48
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [x] route returns the snapshot for a workshop rebuilt from its log; 404 for an unknown id
- [x] both new contract-test cases pass for the in-memory **and** sqlite impls
- [x] `pnpm check && pnpm build` green (227 tests)
**Tests**: integration · **Gate**: build — ✅ done, commit `T11`

### T12: `FacilitationTurnSchema` + the ACL map to `InterpretedTrack`
**What**: The Anthropic-shaped `Output.object({ interpretation: z.array(Track).max(12), nextMove })`
(AD-015: no `z.unknown()`; `v`/`author`/`id` absent; `label` `.max(200)`; every constraint
mirrored into `.describe()`); a `mapTurn(turn, mintId) → { tracks: InterpretedTrack[],
askQuestionId? }` that maps + mints per-track ids.
**Where**: `src/session-facilitation/infrastructure/facilitator/turn-schema.ts`, `.../map.ts`
**Depends on**: T3
**Reuses**: `research/research-aisdk.md` (the two AD-015 limits); `z.toJSONSchema`
**Requirement**: S1-19, S1-40, S1-62
**Tools**: MCP: `context7` (AI SDK `Output` API) · Skill: NONE
**Done when**:
- [x] a test counts optional parameters ≤ 24 and asserts `z.toJSONSchema(FacilitationTurnSchema)` has no empty (`{}`) subschema
- [x] `mapTurn` over a canned multi-track turn → the expected `InterpretedTrack[]` with stable minted ids; a 13-track turn is rejected by the schema
- [x] `pnpm check` green (235 tests)
**Tests**: unit · **Gate**: quick — ✅ done, commit `T12`

NOTE: `FacilitationTrack` is the model-output projection (no minted ids); `mapTurn(turn, mint)`
takes an injected id mint for stable test ids. `OpeningQuestionSchema` deferred to T13 (its consumer
is `askOpening`).

### T13: The `Facilitator` port + Anthropic adapter
**What**: `Facilitator` port (`interpret`, `askOpening`) + its adapter: `generateText` +
`Output.object`, `instructions`, `structuredOutputMode:'outputFormat'`, `effort:'low'`, no
`temperature`; model ladder `claude-sonnet-5` → backoff → `claude-haiku-4-5`; classify
5xx/timeout → `provider-down`, Zod/`NoObjectGeneratedError` → `schema-invalid` (**one retry
total**); log `result.warnings`; one `model-call-log` line per call; register `@ai-sdk/otel`.
Promote `ai` + `@ai-sdk/anthropic` to `dependencies`; add `@ai-sdk/otel` (verify pin via
`context7`/npm).
**Where**: `src/session-facilitation/infrastructure/facilitator/{port,anthropic-adapter}.ts`,
`package.json`
**Depends on**: T4, T12
**Reuses**: `scripts/spike-structured-output.ts`; `docs/ai-harness-gotchas.md`
**Requirement**: S1-17, S1-18, S1-27, S1-28, S1-30, S1-31
**Tools**: MCP: `context7` (`ai`, `@ai-sdk/anthropic`, `@ai-sdk/otel`) · Skill: NONE
**Done when**:
- [x] `generateText` mocked at the `ai` boundary (`deps.generate` seam) — **no test makes a real HTTP call**
- [x] tests: ladder walks primary→haiku on `provider-down`; `schema-invalid` retried once then returned; `warnings` logged; a JSONL line written; usage + cost recorded
- [x] `knip` clean after the devDep→dep promotion (`ai` + `@ai-sdk/anthropic` → deps; `@ai-sdk/otel@1.0.77` added)
- [x] `pnpm check && pnpm build` green (242 tests)
**Tests**: unit + integration · **Gate**: build — ✅ done, commit `T13`

NOTE: `@ai-sdk/otel` registered lazily inside `defaultGenerate` (`ensureTelemetry`) so knip sees a
real consumer; `config.ts` (T24) needs no separate registration call. `effort: 'low'` passed via
`providerOptions.anthropic`. Port takes pre-assembled `{ instructions, prompt }` strings (T14 builds
them).

### T14: `prompt.ts` — system instructions + few-shot + context assembly
**What**: `buildInstructions()` (role + asymmetric bar + Big-Picture legend + phase rule + move
menu + output-contract prose + **5–6 few-shot examples in the library-lending domain**);
`buildTurnInput({ scopeStatement, priorSummaries, buildingBlocks, facilitationContext, segment })`
— assembles the message array, **using `readBuildingBlocks` (not the op-log)**.
**Where**: `src/session-facilitation/infrastructure/facilitator/prompt.ts`
**Depends on**: T13
**Reuses**: ADR-005 (prompt structure); `domain/read-models/facilitationContext`
**Requirement**: S1-35 (assembly), few-shot
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [x] a test asserts the assembled input contains the scope, the block list, the prior summaries, and the new segment in order; few-shot domain = library lending, not restaurant/kitchen
- [x] `pnpm check` green (248 tests)
**Tests**: unit · **Gate**: quick — ✅ done, commit `T14`

NOTE: `buildTurnInput(context: FacilitationContext, segment)` — the assembled `facilitationContext`
already carries scope / blocks / priors / open questions / transcript, so it is the single input
rather than re-passing each; the caller (T19) builds it from `readBuildingBlocks`.

### T15: `capabilities/start-workshop/`
**What**: `POST /workshops` — Zod-parse `{ creatorName }` → `Workshop.decide(Start Workshop)` →
`append` → `201 { workshopId, url }` (nanoid slug). Chained router.
**Where**: `src/session-facilitation/capabilities/start-workshop/`
**Depends on**: T6, T5
**Reuses**: `nanoid`; the thin-handler pattern (AD-009)
**Requirement**: S1-01, S1-03
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] `testClient` test: valid name → 201 + a nanoid slug; blank name → 400 typed body
- [ ] a workshop GET (via T11's board route or a session GET) rebuilds identically from the log
- [ ] `pnpm check && pnpm build` green
**Tests**: integration · **Gate**: build

### T16: `capabilities/set-scope/` + `no-cross-slice-imports` re-verify
**What**: `POST /workshops/:id/scope` — `{ statement }` → **precondition
`readBuildingBlocks(workshopId).length === 0`** (else 409 systemic, scope unchanged) →
`Workshop.decide(Set Scope)` → `append` → `200`. **Re-verify `no-cross-slice-imports` by planting
a `set-scope` → `start-workshop` import** (first time `session-facilitation` has ≥ 2 caps).
**Where**: `src/session-facilitation/capabilities/set-scope/`, `.dependency-cruiser.cjs`
**Depends on**: T15, T10
**Reuses**: `domain-model-capture` `api.ts` `readBuildingBlocks`
**Requirement**: S1-09, S1-10, S1-68
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] test: 0 blocks → scope replaced (3× in a row); ≥ 1 applied block → 409, scope unchanged
- [ ] planted cross-slice import fails `pnpm depcruise`; reverted
- [ ] `pnpm check && pnpm build` green
**Tests**: integration · **Gate**: build

### T17: `capabilities/start-session/`
**What**: `POST /workshops/:id/sessions` — `staleOpenRow` → `DELETE` if stale → `sessionIndex.reserve`
→ `Session.decide(Start Session)` → `append` → `INSERT session_index` (on race → compensate,
409) → `202 { sessionId }`.
**Where**: `src/session-facilitation/capabilities/start-session/`
**Depends on**: T7, T5
**Reuses**: `session-index.ts`
**Requirement**: S1-04, S1-05, S1-67
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] test: 2nd start while one open → 409; after `close`, a new session starts; a stale `open` row (no `Session Started`) is recovered and the start succeeds
- [ ] `pnpm check && pnpm build` green
**Tests**: integration · **Gate**: build

### T18: `capabilities/make-contribution/` + `GET /workshops/:id/session`
**What**: `POST /sessions/:id/contributions` — trim; reject empty pre-`decide`; `Session.decide
(Make Contribution)` → `append` → `202 { contributionId }`. `GET /workshops/:id/session` →
`sessionView`.
**Where**: `src/session-facilitation/capabilities/make-contribution/`
**Depends on**: T7, T9, T17
**Reuses**: `sessionView`
**Requirement**: S1-12, S1-13, S1-14, S1-15, S1-16
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] test: non-empty → 202 + segment carries session id / speaker / `at` / `source:'typed'`; `"   "` → no segment, 200/204 no-op; closed session → 409
- [ ] `GET /session` reflects the contribution with status `pending`
- [ ] `pnpm check && pnpm build` green
**Tests**: integration · **Gate**: build

### T19: `capabilities/interpret-contribution/` — `interpretContribution` + `deriveTracks`
**What**: `interpretContribution(deps)` — select the oldest un-interpreted `Contribution Made`
**by `Session` stream position** in an open session not in the injected in-flight guard → assemble
input → `facilitator.interpret` → on success `Session.decide(Interpret Contribution)` (commit
point, minted ids) → `deriveTracks`; on `provider-down` leave it; on `schema-invalid` →
`Fail Interpretation`. `deriveTracks(interpretedEvent, deps)` — per unmarked track: `propose-building-block`
→ `Proposal` birth (`expectedPosition:-1`); `flag-phase` → `Question Asked{phase}`;
`answer-question` → `Session.decide(Answer Question)` (reject unknown → log); `attribute` →
`Contribution Attributed…`; once per event with `askQuestionId` → `Question Asked{free}`; mark
`derived_track`.
**Where**: `src/session-facilitation/capabilities/interpret-contribution/`
**Depends on**: T13, T14, T9, T18, T8
**Reuses**: `facilitationContext`; `sessionProposalIds`; `derived_track`
**Requirement**: S1-14, S1-23, S1-24, S1-25, S1-29, S1-59, S1-63, S1-64
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] scripted-double tests: each track kind → the right events/proposals; multi-track turn; `nextMove.ask` → `Question Asked{free}`; unknown `questionId` dropped; `bar`/`evidenceSpan` persisted
- [ ] FIFO by stream position (two contributions, order asserted); one in flight per session
- [ ] `provider-down` → no `Contribution Interpreted`; `schema-invalid` → `Contribution Interpretation Failed`
- [ ] `pnpm check` green
**Tests**: integration · **Gate**: quick

### T20: `capabilities/interpret-contribution/` — `askOpeningQuestion` + `reconcilePendingDerivations` + crash-consistency
**What**: `askOpeningQuestion(deps)` — open session with no `Question Asked{scope}` (or a rejected,
not-re-asked one) → `facilitator.askOpening` → `Question Asked{scope, scopeStatement}`; same retry
posture. `reconcilePendingDerivations(deps)` — per open session, re-run `deriveTracks` over any
`Contribution Interpreted` track with **no `derived_track` row**, and sweep "`Session Closed`
present, `session_index` still `open`".
**Where**: `src/session-facilitation/capabilities/interpret-contribution/`
**Depends on**: T19, T5
**Reuses**: `deriveTracks` (T19)
**Requirement**: S1-08, S1-11, S1-33, S1-56, S1-58, S1-65
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] test: opening scope question produced on a fresh session, and after a `provider-down` window
- [ ] **crash-consistency**: kill after the ledger append (skip `deriveTracks`) → `reconcile` restores every proposal with **zero** extra `facilitator.interpret` calls (asserted by a call counter)
- [ ] at-most-once pre-ledger-crash window documented in a test comment citing the accepted-risk spec row
- [ ] `pnpm check` green
**Tests**: integration · **Gate**: quick

### T21: `capabilities/review-proposal/` — edit / reject / hold / unhold + `GET /sessions/:id/proposals`
**What**: `POST /proposals/:id/{edit,reject,hold,unhold}` → the matching `Proposal.decide` →
`append` (skip on `ok([])`). `GET /sessions/:id/proposals` → pending + terminal proposals of the
session, disposition + `APPLY_FAILED` reason + held flag + the ">7 among this contribution"
grouping (read-model computed).
**Where**: `src/session-facilitation/capabilities/review-proposal/`
**Depends on**: T8, T9, T19
**Reuses**: `sessionProposalIds`
**Requirement**: S1-40, S1-45, S1-52, S1-53
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] test: edit → `EDITED`; reject → `REJECTED` + nothing else; hold/unhold reversible; `GET /proposals` groups the 8th+ proposal under overflow
- [ ] `pnpm check && pnpm build` green
**Tests**: integration · **Gate**: build

### T22: `capabilities/review-proposal/` — the synchronous accept chain + seam test
**What**: `POST /proposals/:id/accept` → `Proposal.decide(Accept)` (mint+store `buildingBlockId`;
idempotent while `ACCEPTED`/`APPLIED`) → build + `.parse` the `Operation` → `applyOperation`
(no `expectedPosition`) → `Proposal.decide(Record Operation Applied|Rejected)` → `200
{ boardPosition, proposal }`. **Each context commits its own stream — never one transaction.**
**Where**: `src/session-facilitation/capabilities/review-proposal/accept.ts`
**Depends on**: T21, T10
**Reuses**: `domain-model-capture` `api.ts` `applyOperation`; AD-016 / AD-022
**Requirement**: S1-41, S1-42, S1-43, S1-44, S1-46, S1-47
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] seam integration test (in `session-facilitation`): happy apply → block in the backlog; `Operation Rejected` → `APPLY_FAILED` + reason → edit + re-accept succeeds
- [ ] **double-accept → exactly one building block** (stored id reused); the two contexts' appends are asserted to be separate transactions
- [ ] applied operation records `proposer:'facilitator'` + `accepter:creatorName`
- [ ] `pnpm check && pnpm build` green
**Tests**: integration · **Gate**: build

### T23: `capabilities/close-session/`
**What**: `POST /sessions/:id/close` — every step unconditional + idempotent: `Session.decide
(Close Session)` → `append`; `sessionIndex.close`; for each `sessionProposalIds` non-terminal
proposal → `Proposal.decide(Lapse Proposal, {cause})` (`PROPOSED`/`EDITED`/held → `undisposed`;
`APPLY_FAILED` → `apply-failed`); `ACCEPTED` left alone.
**Where**: `src/session-facilitation/capabilities/close-session/`
**Depends on**: T7, T8, T9, T20
**Reuses**: `sessionProposalIds`; the reconcile sweep (T20) for the half-closed case
**Requirement**: S1-06, S1-07, S1-37
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] test: close lapses `PROPOSED`/`EDITED`/held quietly + `APPLY_FAILED`; `ACCEPTED` in-flight survives; re-running close → no-op; a 3rd session's `facilitationContext` carries the first two `sessionSummary`s
- [ ] crash-mid-close (skip step 2/3) → `reconcile` completes it
- [ ] `pnpm check && pnpm build` green
**Tests**: integration · **Gate**: build

### T24: `session-facilitation/api.ts` + `host/config.ts`
**What**: `api.ts` re-exports every capability's Hono router **and** `interpretContribution` /
`reconcilePendingDerivations` / `askOpeningQuestion` + the in-flight-guard factory type.
`host/config.ts` — `ANTHROPIC_API_KEY` (**fail fast** on `pnpm dev` when unset), `FACILITATOR_MODEL`
(default `claude-sonnet-5`), `INTERPRETATION_INTERVAL_MS`, `DATA_DIR`; builds the in-flight guard;
wires `EventStore`, `Clock`, the `Facilitator` adapter (or a scripted double when
`FACILITATOR_MODE=scripted`).
**Where**: `src/session-facilitation/api.ts`, `src/host/config.ts`
**Depends on**: T22, T23
**Reuses**: existing `host/` wiring
**Requirement**: S1-32
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] test: missing `ANTHROPIC_API_KEY` → `config` throws with a one-line fix message
- [ ] `knip` clean (every `api.ts` export consumed by `host/`)
- [ ] `pnpm check && pnpm build` green
**Tests**: unit · **Gate**: build

### T25: `host/scheduler.ts` + route mounting + `host-imports-only-context-api` re-verify
**What**: `scheduler.ts` — recursive `setTimeout` (default 750 ms); each cycle **awaits in
sequence** `askOpeningQuestion`, `interpretContribution`, `reconcilePendingDerivations`, each
wrapped so a throw is logged and the loop continues; started by `host/index.ts`, not in tests.
Mount all `session-facilitation` routers in `host/routes.ts` via `api.ts`. **Re-verify
`host-imports-only-context-api` by planting a `host/scheduler.ts` → `session-facilitation/domain`
import.**
**Where**: `src/host/{scheduler,routes,index}.ts`, `.dependency-cruiser.cjs`
**Depends on**: T24
**Reuses**: `host/routes.ts` composition
**Requirement**: S1-27, S1-29, S1-68
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] test: a throwing tick fn does not stop the loop (next cycle still fires)
- [ ] planted `host` → context-`domain` import fails `pnpm depcruise`; reverted
- [ ] `pnpm check && pnpm build` green; `pnpm dev` boots and serves `/api/*`
**Tests**: unit · **Gate**: build

### T26: SPA — deps, 3 Pinia stores, `useInterpretationPoll`
**What**: Install `vue-router@5.2.0`, `reka-ui` (verify pin), `@playwright/test` (dev); add the
`test:e2e` script. Three Pinia stores (`session`, `proposals`, `board`) each cold-loadable from
one GET, no store importing another; `useInterpretationPoll` — polls `session` + `proposals`
while any contribution is `interpreting` or not-fully-`derived` or the scope is unset; stops
otherwise; refetches after any POST; `board` refetches only after an accept.
**Where**: `src/app/capture-loop/stores/`, `src/app/capture-loop/composables/`, `package.json`
**Depends on**: T18, T21
**Reuses**: `pinia`, `@vue/devtools-api` (already deps)
**Requirement**: S1-16, S1-48, S1-49
**Tools**: MCP: `context7` (`vue-router` v5, `reka-ui`) · Skill: NONE
**Done when**:
- [ ] jsdom tests: each store hydrates from one mocked GET; `useInterpretationPoll` starts on `interpreting`, **keeps polling on `interpreted`-not-`derived`**, stops when fully derived
- [ ] no store imports another (lint/depcruise)
- [ ] `pnpm check && pnpm build` green
**Tests**: unit (jsdom) · **Gate**: build

### T27: SPA — the board wall renderer + backlog
**What**: A framework-free board renderer module (layout is a pure function, swappable per
ADR-006) rendering the **backlog area only** (no timeline, no arrows, no `place`); a Vue wrapper;
the backlog list of building blocks; **pending proposals never render here as ghost stickies**.
**Where**: `src/app/capture-loop/board/`
**Depends on**: T26
**Reuses**: the `board` store; `impeccable` brief §3 "the board"
**Requirement**: S1-46, S1-48
**Tools**: MCP: NONE · Skill: `impeccable` (visual refinement / DESIGN.md)
**Done when**:
- [ ] jsdom test: N applied blocks render as N backlog stickies; zero blocks → the empty framed wall
- [ ] the layout function is pure and unit-tested against a literal
- [ ] `pnpm check && pnpm build` green
**Tests**: unit (jsdom) · **Gate**: build

### T28: SPA — the facilitator dock + proposal cards
**What**: The floating dock (conversation column: per-participant avatars, plain-language turns,
inline proposal cards welded to the facilitator turn); card actions Accept / Edit / Reject / Hold
+ `Accept all` per cluster; collapse to a `Facilitator · n` pill (with a parked dot if anything
is held); facilitator questions + out-of-format notices render as **messages, not error states**;
the card-to-sticky flight + one-line transcript receipt; the quiet "catching up" state.
**Where**: `src/app/capture-loop/dock/`
**Depends on**: T26, T27
**Reuses**: `reka-ui` primitives; `session` + `proposals` stores; `impeccable` brief §3
**Requirement**: S1-52, S1-53, S1-54, S1-55
**Tools**: MCP: `context7` (`reka-ui`) · Skill: `impeccable`
**Done when**:
- [ ] jsdom tests: accept → card collapses to a receipt + the board refetches (server-confirmed, no optimistic write); reject → `✕ Dismissed`; hold → moves to `Parked by you`; a question renders as a message; `prefers-reduced-motion` respected
- [ ] `pnpm check && pnpm build` green
**Tests**: unit (jsdom) · **Gate**: build

### T29: SPA — the pending drawer + the scope card
**What**: The in-dock pending drawer (slides right; `Parked by you` / `Awaiting review` groups;
rows = kind pill + label + jump chevron; `Accept all remaining`; collapse to a `Pending ● n`
handle); the **scope card** — the facilitator's first dock turn rendered as an accept / edit /
reject card (same component as a proposal card, submit `POST /workshops/:id/scope`);
pre-`askOpeningQuestion` "getting started" placeholder.
**Where**: `src/app/capture-loop/dock/`
**Depends on**: T28
**Reuses**: the proposal-card component; `session` store `scope` state
**Requirement**: S1-08, S1-11, S1-61
**Tools**: MCP: NONE · Skill: `impeccable`
**Done when**:
- [ ] jsdom tests: drawer widen/collapse; a drawer row click scrolls to + pulses the inline card; scope card accept → `POST /scope` → scope status `set`; reject → card clears
- [ ] `pnpm check && pnpm build` green
**Tests**: unit (jsdom) · **Gate**: build

### T30: SPA — workshop-create + start-session screens, routing, visual check
**What**: A minimal create form (`creatorName`) → `POST /workshops` → route to
`/workshops/:id`; a "Start session" affordance when no session is open; `vue-router` v5 manual
routes; wire the full flow. **Re-verify `ui-does-not-import-server-code` by planting a
`src/app/` → capability `http.ts` import.** Run `playwright-cli open` against `pnpm dev` and
confirm zero console errors/warnings + keyboard reachability.
**Where**: `src/app/capture-loop/`, `src/app/main.ts`, `.dependency-cruiser.cjs`
**Depends on**: T29, T25
**Reuses**: `vue-router@5`; `playwright-cli` skill
**Requirement**: S1-01, S1-03, S1-55, S1-68
**Tools**: MCP: NONE · Skill: `playwright-cli`, `impeccable`
**Done when**:
- [ ] planted UI→server import fails `pnpm depcruise`; reverted
- [ ] `playwright-cli open http://localhost:5173` → 0 console errors/warnings; the create→scope→contribution flow is keyboard-operable
- [ ] `pnpm check && pnpm build` green
**Tests**: unit (jsdom) + visual (`playwright-cli`) · **Gate**: build

### T31: E2E — the one end-to-end flow
**What**: `@playwright/test` spec: boot `pnpm dev` with `FACILITATOR_MODE=scripted` (canned turns
from a fixture) → create workshop → accept the scope card → submit 3 contributions → accept the
proposed building blocks → assert they appear in the backlog. Add `pnpm test:e2e`.
**Where**: `e2e/capture-loop.spec.ts`, `playwright.config.ts`, `package.json`
**Depends on**: T30
**Reuses**: `docs/testing.md` (E2E decision); the scripted `Facilitator` double
**Requirement**: spec Success Criteria; S1-46
**Tools**: MCP: `context7` (`@playwright/test`) · Skill: `playwright-cli`
**Done when**:
- [ ] `pnpm test:e2e` passes headless; the flow reaches "block in the backlog"
- [ ] `pnpm check && pnpm build && pnpm test:e2e` all green
**Tests**: e2e · **Gate**: full

### T32: Changeset, version bump, doc obligations
**What**: A `minor` changeset; `package.json` → `0.2.0`; **update `docs/domain/open-questions.md`
#63** with the scope resolution (S1-51a); update `ARCHITECTURE.md`'s route table with the new
routes + the `host/` scheduler; add the Slice-6 reconciliation list to `.specs/STATE.md` handoff
(S1-51b — a note only, not the edits).
**Where**: `.changeset/*.md`, `package.json`, `docs/domain/open-questions.md`, `ARCHITECTURE.md`,
`.specs/STATE.md`
**Depends on**: T31
**Reuses**: the Slice-0 changeset (bootstrap exception is over — AD-004)
**Requirement**: S1-51a, S1-51b
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] `open-questions.md` #63 records: revisable-until-first-block, scope is a dock turn not a screen, diverges from canvas "set once" + brief "set elsewhere"
- [ ] a `minor` changeset present; `pnpm check && pnpm build` green; CI changeset-guard satisfied
**Tests**: none (doc + release) · **Gate**: build

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1 | ids refactor (1 concept across 3 files) | ✅ cohesive |
| T2 | context skeleton + 1 depcruise rule | ✅ cohesive |
| T3 | 1 schema module | ✅ |
| T4 | 2 tiny plumbing files (logger + table) | ✅ cohesive |
| T5 | 1 infra module + its migration | ✅ cohesive |
| T6–T8 | 1 aggregate each | ✅ |
| T9 | 1 read-models module | ✅ (all pure, one file-set) |
| T10 | 1 capability (2 exported fns) | ✅ |
| T11 | 1 route + contract-test cases | ✅ cohesive |
| T12 | 1 schema + its map fn | ✅ cohesive |
| T13 | 1 port + 1 adapter | ✅ cohesive |
| T14 | 1 prompt module | ✅ |
| T15–T18 | 1 capability each | ✅ |
| T19 | `interpretContribution` + `deriveTracks` (1 file-set, 1 flow) | ✅ cohesive |
| T20 | `askOpeningQuestion` + `reconcile` (same file-set) | ✅ cohesive |
| T21 | review routes + 1 GET | ✅ cohesive |
| T22 | the accept chain (1 handler) | ✅ |
| T23 | 1 capability | ✅ |
| T24 | `api.ts` + `config.ts` | ✅ cohesive (wiring pair) |
| T25 | `scheduler.ts` + route mount | ✅ cohesive |
| T26 | deps + stores + 1 composable | ⚠️ 3 stores + 1 composable — cohesive (all "client state from GETs"), kept together |
| T27–T29 | 1 UI region each | ✅ |
| T30 | create/start screens + routing wire-up | ✅ cohesive |
| T31 | 1 e2e spec | ✅ |
| T32 | changeset + docs | ✅ cohesive |

No ❌. T26 is the only ⚠️ — the three stores are a single "cold-loadable client state" concept
(ADR-007) and share the poll composable; splitting them creates three trivial tasks that can't be
tested independently of the composable.

## Diagram-Definition Cross-Check

| Task | Depends on (body) | Diagram arrows | Status |
| --- | --- | --- | --- |
| T1 | None | (P1 head) | ✅ |
| T2 | T1 | T1→T2 | ✅ |
| T3 | T2 | T2→T3 | ✅ |
| T4 | T2 | T2→T4 (via P1 chain T3→T4) | ✅ (same phase, order preserved) |
| T5 | T3 | T3→…→T5 | ✅ |
| T6 | T3 | P2 head; back to P1 T3 | ✅ |
| T7 | T3 | ✅ | ✅ |
| T8 | T3 | ✅ | ✅ |
| T9 | T7, T8 | T7→T9, T8→T9 | ✅ |
| T10 | T1 | P3 head → P1 T1 | ✅ |
| T11 | T10 | T10→T11 | ✅ |
| T12 | T3 | P4 head → P1 T3 | ✅ |
| T13 | T4, T12 | T4→T13, T12→T13 | ✅ |
| T14 | T13 | T13→T14 | ✅ |
| T15 | T6, T5 | P5 head → P2 T6, P1 T5 | ✅ |
| T16 | T15, T10 | T15→T16, T10→T16 | ✅ |
| T17 | T7, T5 | → P2 T7, P1 T5 | ✅ |
| T18 | T7, T9, T17 | T17→T18, → T7/T9 | ✅ |
| T19 | T13, T14, T9, T18, T8 | P6 head → P4 T13/T14, P2 T8/T9, P5 T18 | ✅ |
| T20 | T19, T5 | T19→T20 | ✅ |
| T21 | T8, T9, T19 | T19→T21 (+ P2 T8/T9) | ✅ |
| T22 | T21, T10 | T21→T22, T10→T22 | ✅ |
| T23 | T7, T8, T9, T20 | P7 head → T20 (+ P2) | ✅ |
| T24 | T22, T23 | T22→…→T24, T23→T24 | ✅ |
| T25 | T24 | T24→T25 | ✅ |
| T26 | T18, T21 | P8 head → P5 T18, P6 T21 | ✅ |
| T27 | T26 | T26→T27 | ✅ |
| T28 | T26, T27 | T27→T28 | ✅ |
| T29 | T28 | T28→T29 | ✅ |
| T30 | T29, T25 | T29→T30, P7 T25→T30 | ✅ |
| T31 | T30 | P9 head → T30 | ✅ |
| T32 | T31 | T31→T32 | ✅ |

No task depends on a later phase. All ✅.

## Test Co-location Validation

| Task | Layer created/modified | Matrix requires | Task says | Status |
| --- | --- | --- | --- | --- |
| T1 | plumbing ids | unit | unit | ✅ |
| T2 | context skeleton + depcruise | none (build gate) / static gate | none | ✅ |
| T3 | domain schema | unit | unit | ✅ |
| T4 | plumbing | unit | unit | ✅ |
| T5 | infrastructure | unit + integration | unit + integration | ✅ |
| T6–T8 | domain deciders | unit (+ fast-check) | unit | ✅ |
| T9 | domain read-models | unit | unit | ✅ |
| T10 | dmc capability | unit + integration | unit + integration | ✅ |
| T11 | route + contract test | integration | integration | ✅ |
| T12 | infrastructure (schema/map) | unit | unit | ✅ |
| T13 | infrastructure (adapter) | unit + integration | unit + integration | ✅ |
| T14 | infrastructure (prompt) | unit | unit | ✅ |
| T15–T18 | sf capabilities | integration | integration | ✅ |
| T19–T20 | sf capability (tick fns) | integration | integration | ✅ |
| T21–T23 | sf capabilities | integration | integration | ✅ |
| T24 | host + api.ts | unit | unit | ✅ |
| T25 | host scheduler | unit | unit | ✅ |
| T26–T29 | Vue SPA | unit (jsdom) | unit (jsdom) | ✅ |
| T30 | Vue SPA + routing | unit (jsdom) + visual | unit + visual | ✅ |
| T31 | e2e | e2e | e2e | ✅ |
| T32 | changeset + docs | none | none | ✅ |

No ❌ VIOLATION. Every task that creates a tested layer carries its tests.

---

## Tools per task — confirmed 2026-08-30

**Available MCP:** `context7` — **allowed on any task where a library/API is genuinely in play**
(not just the flagged ones): `ai`/`@ai-sdk/*` (T12, T13), `vue-router` v5 / `reka-ui` (T26, T28,
T29), `@playwright/test` (T31), and also Hono `testClient` typing, `node:sqlite` edges, and
zod-4 specifics wherever a task hits them. Prefer codebase + `docs/*-gotchas.md` first; reach for
`context7` when they don't resolve it.
**Available Skills:** `impeccable` — **mandatory for T27–T30** (working agreement: visual work
goes through `impeccable`, don't hand-design `src/app/`; the capture-loop brief is settled, so
these *build from the brief*). `playwright-cli` — T30 (visual/console check) + T31 (e2e drive).
`spec-driven-development` — the execution skill, always.

## E2E model seam — confirmed

T31 boots the real server with **`FACILITATOR_MODE=scripted`**: `host/config.ts` wires a scripted
`Facilitator` double (canned turns from a fixture) when the env var is set. Real server, real DB,
fake model — the same seam `pnpm seed` (Slice 5) will reuse. Built in **T24** (`config.ts`),
exercised in **T31**.
