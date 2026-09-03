# Slice 4 — Hot Spots + Close · Tasks

## Execution Protocol (MANDATORY — do not skip)

Implement these tasks with the `spec-driven-development` skill (plugin-qualified:
`anoria-engineering:spec-driven-development`): **activate it by name and follow its Execute flow
and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source
of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier,
discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Spec**: `.specs/features/slice-4-hot-spots-close/spec.md` (S4-01…S4-43)
**Design**: `.specs/features/slice-4-hot-spots-close/design.md`
**Context**: `.specs/features/slice-4-hot-spots-close/context.md`
**Decisions**: `.specs/STATE.md` AD-005, AD-006, AD-008, AD-009, AD-013, AD-014, AD-015,
AD-016, AD-017, AD-018, AD-021, AD-022, AD-023, AD-024, AD-026, AD-028, AD-029, **AD-032**,
**AD-033**, **AD-034**
**Status**: Draft — awaiting approval

Create branch `slice-4-hot-spots-close` off `main` before T1. Do not edit `package.json`
`version` (ADR-009); T51 adds a `minor` changeset only (target 0.5.0).

Do not cite `.specs/` process ids (`S4-…`, `AD-…`) in `src/**` or `e2e/**` comments,
docstrings, or test names — keep the durable reasoning, drop the tag (`check:process-ids` +
the `PostToolUse` hook reject them).

The **event bus is NOT built** (AD-032). `FacilitationTurnSchema` gains only hot-spot /
resolution / question-track strands (AD-033) — net +2 optionals, ≤ 24 (AD-015).

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec — confirm before Execute. Guidelines
> found: `AGENTS.md`, `docs/testing.md`, `docs/adr/008-testing-eval-and-observability.md`,
> `vite.config.ts` (`coverage.thresholds` `src/**/domain/**` ≥ 90 %, `autoUpdate` local-only),
> `.dependency-cruiser.cjs`, `knip.json`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Domain — board `decide`/`evolve`/`project`/`replay`, `Resolution`/`Session`/`Workshop` deciders, read models | unit (Vitest `node`) | All branches; 1:1 to spec ACs + `docs/domain/acceptance-tests.md` (1,2,4,5,9,10,11,17,19,19a,21,34,36,39,40,43,44,48); every listed edge case; ≥ 90 % domain coverage; ADR-008 property #3 fold-consistency; assert against an independently-stated literal (L-001/L-002) | `src/**/domain/**/*.test.ts` | `pnpm test` |
| Domain schema / event SSOT / id brands | none (build gate) | — build + `knip` + `depcruise` only | `src/**/domain/schema/**` | build gate |
| Capability HTTP routes (`http.ts`, `accept.ts`) | integration (Vitest, Hono `testClient`, in-memory store) | Every route in scope: happy + every listed edge + error/rejection paths; cross-context accept chain incl. acceptance test 39 | `src/**/capabilities/**/*.test.ts` | `pnpm test` |
| Infrastructure — `hot-spot-sweep.ts`, `session-close.ts`, migrations, `apply-operation` | integration (Vitest, real SQLite adapter or in-memory) | Idempotency (re-run = no-op), crash-between-steps self-heal, `duplicate-id`-as-success, marker-table gating | `src/**/infrastructure/**/*.test.ts` | `pnpm test` |
| App — Pinia stores, transport, `board-view`, composables | unit (Vitest `jsdom` `app` project) | Happy + edge; `.integration.test.ts` for shell↔Pinia seams; a discrimination sensor row added to `docs/testing.md` M-table for each new orchestration branch | `src/app/**/*.test.ts`, `*.integration.test.ts` | `pnpm test` |
| App — Vue SFCs (cards, callouts, ceremony) | unit (`@vue/test-utils`) | Render + prop + interaction paths; keyboard reachability (DESIGN §8) | `src/app/**/*.test.ts` | `pnpm test` |
| E2E — capture-loop flow | e2e (Playwright, scripted facilitator) | One extended macro path: flag → resolve → close ceremony → CLOSED + callout/count | `e2e/*.spec.ts` | `pnpm test:e2e` |
| `.impeccable/surfaces/*.md`, changeset, STATE/spec status | none | build gate + `check:process-ids` | — | build gate |

Provenance: matrix conforms to `docs/adr/008` (named properties, real-model eval out of
`check`), `docs/testing.md` (co-location, independently-stated expectation, sensor worktree
rule), `AGENTS.md` (`pnpm check` order, domain purity, planted-violation for every new
depcruise rule).

## Gate Check Commands

> Generated from codebase — confirm before Execute.

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | A task that only edits existing `.ts` with no new type surface | `pnpm test` |
| Full | **Any task that adds a new `.ts` file, changes a type/export surface, or adds a capability/route** (the common case) | `pnpm check` (runs `check:process-ids → typecheck → lint → test → depcruise → knip`) |
| Build | After a phase, or a schema/config/docs-only task | `pnpm check && pnpm build` |
| E2E | After the E2E task (T50) and before final sign-off | `pnpm check && pnpm build && pnpm test:e2e` |

> **`pnpm test` does NOT run `vue-tsc` or `knip`.** A task that adds a file or an export MUST gate on `pnpm check` or a latent typecheck/unused-export error ships to the next task (this bit T11 — its `.request()` return type slipped past `pnpm test`). When in doubt, gate on `pnpm check`.

`pnpm check` = `check:process-ids → typecheck → lint → test → depcruise → knip`. Every new
`depcruise` rule is proven by a planted violation (repo convention). `pnpm test` is
`--project domain --project app`; never add an `eval` project to it (AD-027).

---

## Execution Plan

Phases run sequentially; tasks within a phase run in order. ~51 tasks / 10 phases →
sub-agent delegation offer at Execute (~7 batches).

### Phase 1 — Board: raise-hot-spot + annotate (domain-model-capture)
```
T1 → T2 → T3 → T4 → T5
```
### Phase 2 — Board: resolve + reopen + withdraw cascades
```
T6 → T7 → T8 → T9
```
### Phase 3 — Board: snapshot HTTP + direct flag capability
```
T10 → T11 → T12
```
### Phase 4 — Resolution aggregate + review-resolution (session-facilitation)
```
T13 → T14 → T15 → T16 → T17 → T18 → T19
```
### Phase 5 — Hot-spot proposal track (session-facilitation)
```
T20 → T21 → T22 → T23 → T24 → T25
```
### Phase 6 — Question-track judgments (session-facilitation)
```
T26 → T27 → T28 → T29 → T30
```
### Phase 7 — Hot-spot choreography sweep (session-facilitation infra)
```
T31 → T32 → T33 → T34 → T35
```
### Phase 8 — F09 workshop state + close-ceremony capabilities
```
T36 → T37 → T38 → T39 → T40 → T40b → T41
```
### Phase 9 — App: hot-spot rendering + direct flag + resolution cards
```
T42 → T43 → T44 → T45 → T46
```
### Phase 10 — App: close ceremony + impeccable + changeset
```
T47 → T48 → T49 → T50 → T51
```

---

## Task Breakdown

> Each task obeys the Execution Contract: tests derive from the spec's ACs (never mirror the
> implementation); the gate passes before the task is done; one atomic commit per task; never
> weaken or delete a test. A fresh Verifier runs after T51.

### Phase 1 — Board: raise-hot-spot + annotate

### T1: Extend board write model + snapshot + `Rejection` for hot spots
**What**: Add `annotates: Map<BuildingBlockId,BuildingBlockId>` and `hotSpotResolved: Map<BuildingBlockId,boolean>` to `BoardWriteModel`; add `modelAffecting?`/`annotates?`/`resolved?`/`reference?` to `SnapshotBlock`; add `hotSpotCount: number` to `BoardSnapshot`; add `already-resolved` / `not-resolved` to `Rejection`; update `emptyWriteModel`/`emptySnapshot`.
**Where**: `src/domain-model-capture/domain/board/model.ts`
**Depends on**: None
**Reuses**: existing `BoardWriteModel`/`BoardSnapshot` shape (AD-005)
**Requirement**: S4-01, S4-05
**Tools**: MCP NONE · Skill `anoria-commons:domain-modeling` (slim write model — only what invariants read)
**Done when**:
- [x] Types compile; `emptySnapshot().hotSpotCount === 0`
- [x] `reference` is NOT on the write model (no invariant reads it)
- [x] `pnpm check && pnpm build` green
**Tests**: none (schema/types — build gate) · **Gate**: build

### T2: `evolve` — raise-hot-spot / annotate / unannotate
**What**: Fill the three `evolve` arms: `raise-hot-spot` adds a `{kind:'hot-spot',withdrawn:false}` write block + `hotSpotResolved=false`; `annotate` sets `annotates[hotSpot]=target`; `unannotate` deletes `annotates[hotSpot]`.
**Where**: `src/domain-model-capture/domain/board/evolve.ts`
**Depends on**: T1
**Reuses**: `cloneWriteModel`, the existing arm pattern
**Requirement**: S4-01, S4-02
**Tools**: Skill `anoria-commons:domain-modeling`
**Done when**:
- [x] Given a raise then annotate, `writeModel.annotates` holds exactly that edge, asserted against a spelled-out literal (L-001)
- [x] `unannotate` on a hot spot annotating nothing leaves `annotates` unchanged
- [x] `pnpm test` green; domain coverage ≥ 90 %; test count recorded
**Tests**: unit · **Gate**: quick

### T3: `project` — raise-hot-spot / annotate / unannotate + `hotSpotCount`
**What**: Fill the three `project` arms: `raise-hot-spot` adds a `hot-spot` `SnapshotBlock` (`modelAffecting`, `annotates:null`, `resolved:false`, `reference:null`, backlog, not pivotal, provenance); `annotate`/`unannotate` set/clear `annotates`; compute `hotSpotCount` (non-withdrawn `hot-spot` blocks) in the returned snapshot.
**Where**: `src/domain-model-capture/domain/board/project.ts`
**Depends on**: T1
**Reuses**: `patchBlock`, `CAPTURE_BLOCK_KIND` pattern
**Requirement**: S4-05, S4-04 (F08 count)
**Tools**: Skill `anoria-commons:domain-modeling`
**Done when**:
- [x] `project` over `[raise, annotate]` yields a snapshot whose hot-spot block `.annotates` equals the literal target id and `hotSpotCount === 1`
- [x] `pnpm test` green; domain coverage ≥ 90 %
**Tests**: unit · **Gate**: quick

### T4: `decide` — raise-hot-spot / annotate / unannotate
**What**: Replace the `not-implemented-in-slice` arm for these three. `decideRaiseHotSpot`: `duplicate-id` guard. `decideAnnotate`: `unknown-target`/`withdrawn-target` on either id; `kind-permission` when `hotSpot` is not a hot spot OR `target` **is** a hot spot. `decideUnannotate`: `missing-edge` when the hot spot annotates nothing, else `ok`.
**Where**: `src/domain-model-capture/domain/board/decide.ts`
**Depends on**: T2
**Reuses**: `lookupActive`, `requireDomainEvent` pattern; each kind gets its own `decideX` helper (keep `decide` a dispatch switch — cognitive-complexity ≤ 15)
**Requirement**: S4-01, S4-02
**Tools**: Skill `anoria-commons:domain-modeling`
**Done when**:
- [x] G/W/T tests through the operation for: duplicate hot-spot id → `duplicate-id`; annotate unknown/withdrawn target → matching rejection, log unchanged; annotate targeting a hot spot → `kind-permission`; unannotate with no annotation → `missing-edge`
- [x] `switch-exhaustiveness-check` still green (the three kinds now have real arms)
- [x] cognitive-complexity lint green on `decide.ts`
- [x] `pnpm test` green
**Tests**: unit · **Gate**: quick

### T5: Reword preserves annotation + fold-consistency property covers the new kinds
**What**: Add a test that rewording an annotated building block leaves its hot spot's `annotates` unchanged (acceptance test coverage for S4-07). Extend the ADR-008 property-#3 `fast-check` operation arbitrary in the existing `replay.test.ts` to emit `raise-hot-spot`/`annotate`/`unannotate` so `replay(log ++ [op]) === evolve(replay(log), op)` covers them.
**Where**: `src/domain-model-capture/domain/board/*.test.ts`
**Depends on**: T3, T4
**Reuses**: existing `replay.test.ts` property + arbitrary
**Requirement**: S4-07, S4-05 (S4 success criterion — fold invariant)
**Tools**: Skill `testing-boss` (discrimination — a non-writing fold must fail a distinct-value assertion)
**Done when**:
- [x] Reword-after-annotate test asserts the annotation survives, against a literal
- [x] Property test emits the 3 new kinds and passes
- [x] `pnpm test` green; domain coverage ≥ 90 %
**Tests**: unit · **Gate**: quick

### Phase 2 — Board: resolve + reopen + withdraw cascades

### T6: `evolve` + `project` — resolve / reopen
**What**: `evolve`: `resolve` sets `hotSpotResolved[target]=true`; `reopen` sets `false`. `project`: `resolve` sets `resolved:true, reference:<op.reference>`; `reopen` sets `resolved:false` (keeps `reference` value on the snapshot); `reinstate` on a hot spot returns it naked (`annotates:null, resolved:false, reference:null`).
**Where**: `src/domain-model-capture/domain/board/{evolve,project}.ts`
**Depends on**: T1
**Reuses**: `patchBlock`
**Requirement**: S4-03, S4-04
**Tools**: Skill `anoria-commons:domain-modeling`
**Done when**:
- [x] `project` over `[raise, resolve(ref='B fixed it'), reopen]` yields `resolved:false` with `reference` still `'B fixed it'` (acceptance test 19a — value retained), asserted against literals
- [x] `reinstate` after `withdraw` on a hot spot → naked block (acceptance test 17)
- [x] `pnpm test` green; domain coverage ≥ 90 %
**Tests**: unit · **Gate**: quick

### T7: `decide` — resolve / reopen (+ reference-present guard, Zod research)
**What**: `decideResolve`: target is a live hot spot (`unknown-target`/`withdrawn-target`/`kind-permission`); `already-resolved` when `hotSpotResolved[target]`; **the `reference` key must be present** — RESEARCH: verify whether `z.unknown()` on the `resolve` schema's `reference` fails `.parse` when the key is absent (design §Research: likely NOT). Fix at the schema (`.superRefine`/`z.custom`) AND re-check in `decide` (`err('schema')`). `decideReopen`: `not-resolved` when the hot spot is open.
**Where**: `src/domain-model-capture/domain/board/decide.ts`, `src/domain-model-capture/domain/schema/operations.ts`
**Depends on**: T6
**Reuses**: `lookupActive`; the belt-and-suspenders re-parse already in `decide`
**Requirement**: S4-03, S4-04
**Tools**: MCP `context7` (Zod v4 object-key optionality) · Skill `anoria-commons:software-design` (error contract — classify by retry behaviour)
**Done when**:
- [x] A `resolve` payload with **no** `reference` key is rejected (`schema`), snapshot unchanged — tested for both absent and `undefined`
- [x] A `resolve` with `reference: null` is **accepted** (a recorded value, F08)
- [x] resolve non-hot-spot → `kind-permission`; resolve already-resolved → `already-resolved` (acceptance test 39 half); reopen an open hot spot → `not-resolved`
- [x] The frozen `v:1` `Operation` shape is not otherwise mutated (append-only)
- [x] `pnpm test` green
**Tests**: unit · **Gate**: quick

### T8: Withdraw cascades — annotated block → hot spots; hot spot → unannotate
**What**: Extend `decideWithdraw`: withdrawing block `B` returns `[withdraw(B), ...withdraw(H) for each live hot spot H where annotates[H]===B]` (batch-atomic, sorted). Withdrawing a hot spot `H` with `annotates[H]` set returns `[withdraw(H), unannotate(H)]`. Extend `evolve`/`project` withdraw arms to drop the annotation edge when the withdrawn block is a hot spot.
**Where**: `src/domain-model-capture/domain/board/{decide,evolve,project}.ts`
**Depends on**: T7
**Reuses**: `decideWithdraw` `[withdraw, ...unlink-cause]` cascade shape (AD-006/AD-028), `referencingEffects` pattern
**Requirement**: S4-06
**Tools**: Skill `anoria-commons:domain-modeling`
**Done when**:
- [x] Given `H` annotates `E`, `withdraw(E)` → `[withdraw(E), withdraw(H)]`; no dangling annotation in the snapshot (acceptance test 21), asserted against a literal event list
- [x] `withdraw(H)` where `H` annotates `E` → `[withdraw(H), unannotate(H)]`; `E` untouched
- [x] Two hot spots annotating one block → both withdrawn, deterministic order
- [x] `pnpm test` green; domain coverage ≥ 90 %
**Tests**: unit · **Gate**: quick

### T9: Full-fold replay consistency incl. hot-spot state
**What**: Extend the whole-log replay test (acceptance test 18a analogue) so a log containing raise/annotate/resolve/reopen/withdraw-cascade folds from empty to a snapshot identical to the incremental projection — hot-spot `annotates`/`resolved`/`reference`/`hotSpotCount` included. Extend the property arbitrary to emit resolve/reopen.
**Where**: `src/domain-model-capture/domain/board/replay.test.ts`
**Depends on**: T8
**Reuses**: existing `replay.test.ts`
**Requirement**: S4 success criterion (fold invariant), acceptance test 18a
**Tools**: Skill `testing-boss`
**Done when**:
- [x] A hand-built log with every hot-spot op replays to a snapshot pinned to a spelled-out literal (not compared to another projection — `docs/testing.md`)
- [x] Property test green with resolve/reopen in the arbitrary
- [x] `pnpm check && pnpm build` green (Phase 2 close)
**Tests**: unit · **Gate**: build

### Phase 3 — Board: snapshot HTTP + direct flag capability

### T10: `GET /workshops/:id/board` carries hot-spot fields + count
**What**: Extend `PublishedBoardSnapshot` and `readBoardSnapshot` to serialise per-hot-spot `modelAffecting`/`annotates`/`resolved`/`reference` and top-level `hotSpotCount`. `http.ts` unchanged (returns `readBoardSnapshot` verbatim).
**Where**: `src/domain-model-capture/capabilities/board-access/read-board-snapshot.ts`
**Depends on**: T9
**Reuses**: `readBoardSnapshot`, `replay`
**Requirement**: S4-12
**Tools**: NONE
**Done when**:
- [x] `testClient` GET on a board with one annotated resolved hot spot returns the block with `resolved:true`, the reference value, and `hotSpotCount:1`
- [x] Existing board-access tests still green (no key removed)
- [x] `pnpm test` green
**Tests**: integration · **Gate**: full

### T11: `flag-hot-spot` capability — direct create + reopen
**What**: New `capabilities/flag-hot-spot/{http,deps}.ts`. `POST /workshops/:id/board/hot-spots` `{label, modelAffecting?, annotatesTargetId?}` → mint `BuildingBlockId`, `applyOperation(raise-hot-spot)` (author `{accepter:{name:creatorName}}`), then if `annotatesTargetId` set & live `applyOperation(annotate)` (failure logged, not fatal). `POST /workshops/:id/board/hot-spots/:blockId/reopen` → `applyOperation(reopen)`.
**Where**: `src/domain-model-capture/capabilities/flag-hot-spot/`
**Depends on**: T10
**Reuses**: `accept.ts` creatorName-lookup pattern, `applyOperation`, `Operation` SSOT
**Requirement**: S4-10, S4-11
**Tools**: Skill `anoria-commons:code-architecture` (slice owns its entry point; no slice→slice import)
**Done when**:
- [x] Happy: flag with a live target → 200, GET /board shows the callout + `hotSpotCount:1`
- [x] Flag targeting a hot spot / unknown / withdrawn id → 422 with the reason, board unchanged
- [x] Flag with no target → 200, hot spot in the unannotated set
- [x] Reopen a resolved hot spot → 200 `resolved:false`; reopen an open one → 422 `not-resolved`
- [x] `pnpm test` green
**Tests**: integration · **Gate**: full

### T12: Wire `flag-hot-spot` into `api.ts` + `host/routes.ts` + host integration test
**What**: Export `flagHotSpotRoutes` from `domain-model-capture/api.ts`; mount in `host/routes.ts`. `knip.json` entry already covers `api.ts`.
**Where**: `src/domain-model-capture/api.ts`, `src/host/routes.ts`
**Depends on**: T11
**Reuses**: the `createRoutes` mount pattern
**Requirement**: S4-10
**Tools**: NONE
**Done when**:
- [x] Host integration test: create workshop → capture a domain event → flag a hot spot annotating it → GET /board shows callout + count 1
- [x] `pnpm check && pnpm build` green (Phase 3 close); `depcruise` + `knip` clean
**Tests**: integration · **Gate**: build

### Phase 4 — Resolution aggregate + review-resolution

### T13: `ResolutionId` brand + `resolutionStream`
**What**: Add `type ResolutionId = string & z.$brand<'ResolutionId'>` + `newResolutionId` to `plumbing/ids.ts`; mirror the schema in `session-facilitation/domain/schema/ids.ts`; add `resolutionStream(id)` to `session-facilitation/infrastructure/streams.ts`.
**Where**: `src/plumbing/ids.ts`, `src/session-facilitation/domain/schema/ids.ts`, `src/session-facilitation/infrastructure/streams.ts`
**Depends on**: None
**Reuses**: `ProposalId` brand + `proposalStream` pattern
**Requirement**: S4-17
**Tools**: NONE
**Done when**:
- [x] `newResolutionId()` returns a 21-char nanoid; brand types align across the seam with no cast
- [x] `pnpm check && pnpm build` green; `knip` clean (used by T14+)
**Tests**: none (id brand — build gate) · **Gate**: build

### T14: `ResolutionEvent` SSOT
**What**: Add the `Resolution` event union to `session-facilitation/domain/schema/events.ts`: `Resolution Proposed {resolutionId, sessionId, contributionId, hotSpotId, reference}`, `Resolution Edited {reference}`, `Resolution Accepted {accepter}`, `Resolution Rejected`, `Resolution Lapsed`, `Hot Spot Resolved`, `Hot Spot Resolution Rejected {reason}`. `v:1`, `at` on every one.
**Where**: `src/session-facilitation/domain/schema/events.ts`
**Depends on**: T13
**Reuses**: `ProposalEvent` union shape
**Requirement**: S4-17
**Tools**: Skill `anoria-commons:distributed-systems` (small explicit event surface; tolerant reader)
**Done when**:
- [x] Union parses each event; `reference` is `z.string().min(1)` (the edited/proposed text)
- [x] `pnpm check && pnpm build` green
**Tests**: none (event SSOT — build gate) · **Gate**: build

### T15: `Resolution` aggregate — model / decide / evolve / replay
**What**: New `session-facilitation/domain/resolution/{model,decide,evolve,replay}.ts`. State machine `PROPOSED ⇄ EDITED → ACCEPTED → APPLIED | LAPSED`; `REJECTED` terminal; no `APPLY_FAILED`; every apply bounce terminal (canvas). Commands: Propose / Edit / Accept / Reject Resolution, Record Hot Spot Resolved, Record Resolution Rejected, Lapse Resolution.
**Where**: `src/session-facilitation/domain/resolution/`
**Depends on**: T14
**Reuses**: `Proposal` `decide`/`evolve`/`replay` skeleton (copy the shape, not the file — `domain/` sharing only)
**Requirement**: S4-17
**Tools**: Skill `anoria-commons:domain-modeling` (event-sourced Decider; G/W/T through commands)
**Done when**:
- [x] G/W/T: Propose → Accept → Record Hot Spot Resolved ⇒ `APPLIED`; Propose → Reject ⇒ `REJECTED`, hot spot untouched (acceptance test 40 / 10); Accept → Record Resolution Rejected('already-resolved') ⇒ `LAPSED`, no retry (acceptance test 39)
- [x] Edit after terminal ⇒ `bad-transition`; second Accept while `ACCEPTED`/`APPLIED` ⇒ `ok([])` (idempotent)
- [x] `pnpm test` green; domain coverage ≥ 90 %
**Tests**: unit · **Gate**: quick

### T16: `resolutionsView` / `resolutionCard` read model
**Task-plan correction (Batch 2):** `sessionResolutionIds` folds over a `propose-resolution`
`Contribution Interpreted` track that the breakdown never assigned to a task, yet S4-18/S4-19
require "propose (derive)" for the `Resolution` aggregate to be reachable end to end. Built in
Phase 4 alongside T16: `InterpretedTrack` + `FacilitationTrack` `propose-resolution` strand (0
new optionals — AD-015 budget unchanged), the `map.ts` ACL mint (`TrackIdMint.resolutionId`),
and `deriveProposeResolution` in `interpret.ts`. **Phase 5 (T21/T28) must keep the
`FacilitationTurnSchema` optional count consistent** — they also touch `turn-schema.ts`.
**What**: New `session-facilitation/domain/read-models/resolutions-view.ts` — per-resolution card (hotSpotId, reference, disposition, reject/lapsed reason) + `sessionResolutionIds(events)` fold over `Contribution Interpreted` resolution tracks.
**Where**: `src/session-facilitation/domain/read-models/resolutions-view.ts`
**Depends on**: T15
**Reuses**: `proposals-view.ts` / `sessionProposalIds` pattern
**Requirement**: S4-19, S4-38
**Tools**: Skill `anoria-commons:code-architecture` (reads bypass the domain — CQRS-lite)
**Done when**:
- [x] `resolutionCard` returns the disposition + reference for each state, asserted against literals
- [x] `pnpm test` green; domain coverage ≥ 90 %
**Tests**: unit · **Gate**: quick

### T17: `review-resolution` capability — edit / reject routes
**What**: New `capabilities/review-resolution/{http,deps}.ts`. `POST /resolutions/:id/edit {reference}`, `POST /resolutions/:id/reject`. One `Resolution.decide` each, appended only when it emits. `GET /sessions/:id/resolutions` → `resolutionsView`.
**Where**: `src/session-facilitation/capabilities/review-resolution/`
**Depends on**: T16
**Reuses**: `review-proposal/http.ts` `act` helper pattern
**Requirement**: S4-19
**Tools**: Skill `anoria-commons:code-architecture`
**Done when**:
- [x] Edit a proposed resolution's reference → 200; edit after terminal → 409
- [x] Reject → 200, `GET /sessions/:id/resolutions` shows `REJECTED`
- [x] `pnpm test` green
**Tests**: integration · **Gate**: full

### T18: `review-resolution/accept.ts` — synchronous resolve chain
**What**: `POST /resolutions/:id/accept` — (1) `Resolution.decide(Accept Resolution)` → ACCEPTED (idempotent while ACCEPTED/APPLIED); (2) build `resolve` `Operation` `{target: hotSpotId, reference, author: {proposer:{name:'facilitator'}, accepter:{name:creatorName}}}`; (3) `applyOperation(io, workshopId, op)` — its own transaction; (4) ok → `Record Hot Spot Resolved`; `err(kind-permission|withdrawn-target)` → `Record Resolution Rejected(reason)`; `err(already-resolved)` → `Record Resolution Rejected('already-resolved')`.
**Where**: `src/session-facilitation/capabilities/review-resolution/accept.ts`
**Depends on**: T17
**Reuses**: `review-proposal/accept.ts` structure verbatim; `applyOperation` from `domain-model-capture/api.ts`
**Requirement**: S4-20
**Tools**: Skill `anoria-commons:distributed-systems` (per-context transactions — never one; AD-016)
**Done when**:
- [x] Accept → hot spot `resolved:true` on GET /board, reference recorded; `Resolution` `APPLIED` (acceptance test 9)
- [x] Two resolutions for one hot spot: first `APPLIED`, second Accept → `LAPSED` 'already-resolved', hot spot carries exactly one reference (acceptance test 39)
- [x] The two appends are never one transaction (assert board + resolution stream commit independently)
- [x] `pnpm test` green
**Tests**: integration · **Gate**: full

### T19: Wire `review-resolution` into `api.ts` + `host/routes.ts` + integration test
**What**: Export `reviewResolutionRoutes` from `session-facilitation/api.ts`; mount in `host/routes.ts`.
**Where**: `src/session-facilitation/api.ts`, `src/host/routes.ts`
**Depends on**: T18
**Reuses**: `createRoutes` mount
**Requirement**: S4-19, S4-20
**Tools**: NONE
**Done when**:
- [x] Host integration test: raise a hot spot → POST accept a resolution → GET /board resolved
- [x] `pnpm check && pnpm build` green (Phase 4 close); `depcruise` + `knip` clean
**Tests**: integration · **Gate**: build

### Phase 5 — Hot-spot proposal track

### T20: `hot-spot` block kind + additive proposal fields
**What**: `InterpretedBlockKind` enum += `'hot-spot'`. `interpreted-track.ts` `proposeBuildingBlock` += `modelAffecting: z.boolean().default(true)` + `annotatesTargetId: BuildingBlockId.optional()`. `Building Block Proposed` event += the same two (additive — `v:1` unchanged).
**Where**: `src/session-facilitation/domain/schema/{interpreted-track,events}.ts`
**Depends on**: None (parallel to Phase 4, but keep sequential)
**Reuses**: the discriminated-union additive pattern
**Requirement**: S4-13
**Tools**: Skill `anoria-commons:distributed-systems` (backward-compatible event evolution)
**Done when**:
- [x] A `Building Block Proposed` with neither new field parses as a plain capture (`modelAffecting` defaults, `annotatesTargetId` absent)
- [x] `pnpm check && pnpm build` green
**Tests**: none (schema — build gate) · **Gate**: build

### T21: `turn-schema.ts` hot-spot fields + ACL mapping + optional-count guard
**What**: `turn-schema.ts` `proposeBuildingBlock` += `modelAffecting?` + `annotatesTargetId?` (described inline; a label the model names → mapped to an id in `map.ts`, dropped if unresolvable). Update the schema-walk optional-parameter test's expected count (≤ 24 — fails at 25).
**Where**: `src/session-facilitation/infrastructure/facilitator/{turn-schema,map}.ts` + its test
**Depends on**: T20
**Reuses**: `map.ts` mint-fn ACL; the existing schema-walk test
**Requirement**: S4-14, AD-015
**Tools**: MCP `context7` (Anthropic structured-output limits — `docs/agents/ai-harness-gotchas.md` first) · Skill `testing-boss`
**Done when**:
- [x] Optional-parameter count test asserts the new total and is ≤ 24
- [x] `mapTurn` maps a `annotatesTargetId` label to a live block id and drops an unknown one
- [x] No `z.unknown()` anywhere in `turn-schema.ts`
- [x] `pnpm test` green
**Tests**: unit · **Gate**: quick

### T22: `Proposal` — `Set Proposal Kind` command + `Proposal Kind Set` event
**What**: Add `Set Proposal Kind {proposalId, modelAffecting}` → `Proposal Kind Set` to `Proposal` `model`/`decide`/`evolve` + `ProposalEvent` SSOT. Legal only in `REVIEWABLE`. `evolve` tracks the current `modelAffecting`.
**Where**: `src/session-facilitation/domain/proposal/{model,decide,evolve}.ts`, `domain/schema/events.ts`
**Depends on**: T20
**Reuses**: `Hold Proposal` / `Proposal Held` marker pattern
**Requirement**: S4-16
**Tools**: Skill `anoria-commons:domain-modeling`
**Done when**:
- [x] Set kind on a `PROPOSED`/`EDITED`/`APPLY_FAILED` proposal → event; on a terminal one → `bad-transition`
- [x] `evolve` exposes the last-set `modelAffecting` (default from birth)
- [x] `pnpm test` green; domain coverage ≥ 90 %
**Tests**: unit · **Gate**: quick

### T23: `interpret.ts` carries hot-spot fields into `Propose Building Block`
**What**: `deriveProposeBuildingBlock` passes `blockKind:'hot-spot'`, `modelAffecting`, `annotatesTargetId` through to the `Propose Building Block` command when the track carries them.
**Where**: `src/session-facilitation/capabilities/interpret-contribution/interpret.ts`
**Depends on**: T21, T22
**Reuses**: `deriveProposeBuildingBlock`
**Requirement**: S4-13
**Tools**: NONE
**Done when**:
- [x] A `propose-building-block` track with `blockKind:'hot-spot'` derives a `Building Block Proposed` carrying the kind + fields
- [x] Existing capture-derivation tests unaffected
- [x] `pnpm test` green
**Tests**: integration · **Gate**: full

### T24: `accept.ts` — hot-spot proposal → raise-hot-spot (+ follow-on annotate)
**What**: `OP_KIND['hot-spot'] = 'raise-hot-spot'`. When `birth.blockKind === 'hot-spot'`: build `raise-hot-spot` with `modelAffecting` from the last `Proposal Kind Set` (else birth default); `applyOperation(raise-hot-spot)`; then if `annotatesTargetId` set & live, `applyOperation(annotate)` (a second board transaction; failure logged, `Proposal` still `APPLIED`).
**Where**: `src/session-facilitation/capabilities/review-proposal/accept.ts`
**Depends on**: T23
**Reuses**: the whole capture accept chain
**Requirement**: S4-15
**Tools**: Skill `anoria-commons:distributed-systems`
**Done when**:
- [x] Accept a hot-spot proposal annotating a live event → GET /board shows a hot-spot block annotating it, `Proposal` `APPLIED` (acceptance test 4 — indistinguishable from a directly-flagged one)
- [x] One contribution yielding a hot-spot proposal **and** a building-block proposal: rejecting one leaves the other (acceptance test 11)
- [x] A failed follow-on annotate leaves the hot spot unannotated, `Proposal` still `APPLIED`
- [x] `pnpm test` green
**Tests**: integration · **Gate**: full

### T25: `POST /proposals/:id/kind` route + `proposalsView` carries `modelAffecting`
**What**: Add the `kind` route to `review-proposal/http.ts` (one `Proposal.decide(Set Proposal Kind)`). `proposalsView`/`proposalCard` surface `modelAffecting` for hot-spot proposals.
**Where**: `src/session-facilitation/capabilities/review-proposal/http.ts`, `domain/read-models/proposals-view.ts`
**Depends on**: T24
**Reuses**: the `act` helper
**Requirement**: S4-16
**Tools**: NONE
**Done when**:
- [x] Flip a hot-spot proposal's kind via the route → `GET /sessions/:id/proposals` shows the new `modelAffecting`
- [x] `pnpm check && pnpm build` green (Phase 5 close)
**Tests**: integration · **Gate**: build

### Phase 6 — Question-track judgments

### T26: `SessionEvent` += the three judgment events
**What**: Add `Knowledge Gap Revealed {sessionId, questionId, byContributionId, detail?}`, `Absent Stakeholder Named {sessionId, questionId, byContributionId, personName}`, `Complete Perspective Confirmed {sessionId, questionId, byContributionId}` to the `SessionEvent` union.
**Where**: `src/session-facilitation/domain/schema/events.ts`
**Depends on**: None
**Reuses**: `Question Answered` shape
**Requirement**: S4-21, S4-22, S4-23
**Tools**: Skill `anoria-commons:distributed-systems`
**Done when**:
- [x] Each event parses; the union refine still holds
- [x] `pnpm check && pnpm build` green
**Tests**: none (event SSOT — build gate) · **Gate**: build

### T27: `Session` decide/evolve — the three judgment commands
**What**: Add `Reveal Knowledge Gap`, `Name Absent Stakeholder`, `Confirm Complete Perspective` to `Session` `model`/`decide`/`evolve`. Each requires the question `open` (`unknown-question` / `question-already-resolved` → `ok([])` idempotent), marks it `resolved`. `Name Absent Stakeholder` is once per `(questionId, personName)`.
**Where**: `src/session-facilitation/domain/session/{model,decide,evolve}.ts`
**Depends on**: T26
**Reuses**: `decideAnswerQuestion`, the `questions` map + `evolve`
**Requirement**: S4-21, S4-22, S4-23
**Tools**: Skill `anoria-commons:domain-modeling` (idempotency as a model invariant)
**Done when**:
- [x] G/W/T: reveal-knowledge-gap on an open question → event + question resolved; a second → `ok([])`
- [x] Two `Name Absent Stakeholder` for different people on one question → two events; same person twice → one (acceptance test 2 shape at the Session level)
- [x] Judgment on a resolved/unknown question → `ok([])`
- [x] `pnpm test` green; domain coverage ≥ 90 %
**Tests**: unit · **Gate**: quick

### T28: `interpreted-track.ts` + `turn-schema.ts` — the three judgment strands
**What**: `InterpretedTrack` += `reveal-knowledge-gap {questionId, detail?}`, `name-absent-stakeholder {questionId, personName}`, `confirm-complete-perspective {questionId}`. `turn-schema.ts` matching strands (reuse the `answer-question` shape — one `questionId` each). Update the optional-count test.
**Where**: `src/session-facilitation/domain/schema/interpreted-track.ts`, `infrastructure/facilitator/turn-schema.ts` + test
**Depends on**: T27
**Reuses**: `answerQuestion` track/strand
**Requirement**: S4-24, AD-015
**Tools**: MCP `context7` · Skill `testing-boss`
**Done when**:
- [x] Optional-parameter count still ≤ 24, test asserts the exact total
- [x] Each strand round-trips through the union
- [x] `pnpm test` green
**Tests**: unit · **Gate**: quick

### T29: `map.ts` + `interpret.ts` — derive the three judgments
**What**: `map.ts` maps the 3 new tracks. `interpret.ts` `deriveTracks` switch += 3 cases (`decideSession` + `appendSession`). `confirm-complete-perspective` additionally appends `Stakeholder Check Recorded {complete:true}` on the workshop (same context, same tick, idempotent).
**Where**: `src/session-facilitation/infrastructure/facilitator/map.ts`, `capabilities/interpret-contribution/interpret.ts`
**Depends on**: T28, T37 (needs the `Workshop` command from Phase 8) — **see Cross-check note**
**Reuses**: `deriveAnswerQuestion`, `deriveFlagPhase`
**Requirement**: S4-24, S4-23 (acceptance test 44)
**Tools**: NONE
**Done when**:
- [x] A contribution interpreted as `confirm-complete-perspective` resolves the question. **REDUCED (batch 4): the `Stakeholder Check Recorded {complete:true}` workshop append is deferred to T40b — it needs the `Record Stakeholder Check` Workshop command from Phase 8.**
- [x] `name-absent-stakeholder` / `reveal-knowledge-gap` tracks resolve the question; the hot-spot raise is NOT done here (left to the sweep)
- [x] `pnpm test` green
**Tests**: integration · **Gate**: full

### T30: `Question Asked.kind` += `'stakeholder'` + `sessionView` surfaces it
**What**: `Question Asked` `kind` enum += `'stakeholder'`. `session-view.ts` includes the stakeholder question in the transcript/open-questions view like `phase`/`free`.
**Where**: `src/session-facilitation/domain/schema/events.ts`, `domain/read-models/session-view.ts`
**Depends on**: T29
**Reuses**: the `phase`/`free` handling
**Requirement**: S4-23 (AD-034)
**Tools**: NONE
**Done when**:
- [x] A `Question Asked {kind:'stakeholder'}` parses and appears in `sessionView.openQuestions`
- [x] `pnpm check && pnpm build` green (Phase 6 close)
**Tests**: unit · **Gate**: build

### Phase 7 — Hot-spot choreography sweep

### T31: Migration `id:2` — `hot_spot_sweep` + marker helpers
**What**: Add migration `{id:2, up: CREATE TABLE hot_spot_sweep (sweep_key TEXT PRIMARY KEY, building_block_id TEXT NOT NULL, at TEXT NOT NULL)}` to `SESSION_FACILITATION_MIGRATIONS`. New `infrastructure/hot-spot-sweep.ts` — `readSweptKeys(db): Set<string>`, `markSwept(db, key, buildingBlockId, at)`. Structural `db` handle (no `node:sqlite` import).
**Where**: `src/session-facilitation/infrastructure/{migrations,hot-spot-sweep}.ts`
**Depends on**: None
**Reuses**: `derived-track.ts` marker helpers verbatim
**Requirement**: S4-25 (marker infra), S4-27
**Tools**: Skill `anoria-commons:distributed-systems` (idempotency key / dedup store)
**Done when**:
- [x] Migration applies additively; `_sf_migrations` tracks id 2; a re-apply is a no-op
- [x] `markSwept` then `readSweptKeys` round-trips; duplicate `markSwept` is `INSERT OR IGNORE`
- [x] `pnpm test` green
**Tests**: integration · **Gate**: full

### T32: `reconcileHotSpots` — knowledge-gap / absent-stakeholder facts → hot spots
**What**: New `reconcileHotSpots(deps, sessionId): void` in `hot-spot-sweep.ts`. Read the `Session` stream; for each `Knowledge Gap Revealed` (key `kg:<qId>`) and `Absent Stakeholder Named` (key `absent:<qId>:<slug(name)>`) not in `hot_spot_sweep`: mint a `BuildingBlockId`, `applyOperation(raise-hot-spot, {label, modelAffecting:true})`; on `ok` **or** `duplicate-id` → `markSwept`; on any other rejection → log, leave unmarked.
**Where**: `src/session-facilitation/infrastructure/hot-spot-sweep.ts`
**Depends on**: T31, T27
**Reuses**: `finishClose` read loop; `applyOperation` from `domain-model-capture/api.ts`
**Requirement**: S4-26, S4-27
**Tools**: Skill `anoria-commons:distributed-systems` (effectively-once; `duplicate-id` as success; reconcile don't blind-retry)
**Done when**:
- [x] A contribution naming two absent stakeholders → after `reconcileHotSpots`, two hot-spot blocks on the board (acceptance test 2)
- [x] Re-running `reconcileHotSpots` raises nothing new (idempotent — marker + `duplicate-id`)
- [x] A transient board failure leaves the key unmarked (retried next call)
- [x] `pnpm test` green
**Tests**: integration · **Gate**: full

### T33: `reconcileHotSpots` — close sweep (unresolved questions + apply-failed proposals)
**What**: Extend `reconcileHotSpots`: once `Session Closed` is on the stream, for each `unresolvedQuestionIds` entry (key `q:<qId>`, label = the question text) and each `Proposal` in `APPLY_FAILED` (key `proposal:<pId>`, label from the proposal), raise a hot spot idempotently.
**Where**: `src/session-facilitation/infrastructure/hot-spot-sweep.ts`
**Depends on**: T32
**Reuses**: `sessionProposalIds`, `replayProposal`
**Requirement**: S4-27, S4-28 (acceptance tests 1, 5, 34, 36, 43)
**Tools**: Skill `anoria-commons:distributed-systems`
**Done when**:
- [x] Close with Q1 answered, Q2 open → exactly one hot spot, for Q2 (acceptance test 43)
- [x] A question left open by an off-topic contribution that produced a proposal → still swept (acceptance test 5 / 34)
- [x] A `Proposal` in `APPLY_FAILED` at close → a hot spot referencing it (acceptance test 36)
- [x] The set swept == `Session Closed.unresolvedQuestionIds` (acceptance test 43 consistency)
- [x] `pnpm test` green
**Tests**: integration · **Gate**: full

### T34: Wire `reconcileHotSpots` into `finishClose` + `reconcilePendingDerivations`
**What**: `finishClose` calls `reconcileHotSpots` after lapsing proposals (so `APPLY_FAILED` lapse + hot-spot raise are consistent). `reconcilePendingDerivations` calls `reconcileHotSpots` per open session each tick. Thread the `db` handle (`hot_spot_sweep`) through `SessionCloseDeps` / `InterpretContributionDeps` — both already carry `db`.
**Where**: `src/session-facilitation/infrastructure/session-close.ts`, `capabilities/interpret-contribution/interpret.ts`
**Depends on**: T33
**Reuses**: `finishClose` idempotent-tail pattern (AD-021)
**Requirement**: S4-26, S4-27
**Tools**: Skill `anoria-commons:distributed-systems`
**Done when**:
- [x] A crash simulated between `Session Closed` append and the sweep → the next `reconcilePendingDerivations`/`finishClose` raises the missing hot spots
- [x] `finishClose` remains idempotent (re-run raises nothing new)
- [x] `pnpm test` green
**Tests**: integration · **Gate**: full

### T35: Close report — "no hot spots is a signal"
**What**: `close-session/http.ts` response (and later `readArtifactSource`) carries `hotSpotCount` + `noHotSpotsIsASignal: boolean` (true iff count 0 at close) — a flag, not prose (acceptance: distinct from a pass/failure).
**Where**: `src/session-facilitation/capabilities/close-session/http.ts`
**Depends on**: T34
**Reuses**: `readBoardSnapshot` (via `domain-model-capture/api.ts`)
**Requirement**: S4-30
**Tools**: NONE
**Done when**:
- [x] Close a session with zero hot spots → response `{noHotSpotsIsASignal:true, hotSpotCount:0}`
- [x] Close with hot spots → `{noHotSpotsIsASignal:false, hotSpotCount:n}`
- [x] `pnpm check && pnpm build` green (Phase 7 close); `depcruise` planted-violation check for any new cross-context edge
**Tests**: integration · **Gate**: build

### Phase 8 — F09 workshop state + close-ceremony capabilities

### T36: `WorkshopEvent` += stakeholder-check + chosen-problem events
**What**: Add `Stakeholder Check Recorded {workshopId, complete, absentNames}`, `Problem Chosen {workshopId, problemHotSpotId, qualification}`, `Problem Choice Skipped {workshopId, reason}` to `WorkshopEvent`.
**Where**: `src/session-facilitation/domain/schema/events.ts`
**Depends on**: None
**Reuses**: `ScopeSet` shape
**Requirement**: S4-31, S4-32
**Tools**: Skill `anoria-commons:distributed-systems`
**Done when**:
- [x] Each event parses; `qualification` is `z.enum(['firm','provisional'])`; `reason` is `z.enum(['none-chosen','no-impediments-yet'])`
- [x] `pnpm check && pnpm build` green
**Tests**: none (event SSOT — build gate) · **Gate**: build

### T37: `Workshop` decide/evolve — stakeholder check + choose/skip problem
**What**: Add `Record Stakeholder Check`, `Choose Problem`, `Skip Problem Choice` to `Workshop` `model`/`decide`/`evolve`. `stakeholderCheckRun`/`stakeholderComplete`/`problemDecided` write-model fields + idempotency guards (`ok([])` on a repeat). `qualification` derived: `provisional` iff `stakeholderComplete === false`.
**Where**: `src/session-facilitation/domain/workshop/{model,decide,evolve}.ts`
**Depends on**: T36
**Reuses**: `Set Scope` / `Scope Set` decider shape
**Requirement**: S4-31, S4-32 (acceptance test 44)
**Tools**: Skill `anoria-commons:domain-modeling`
**Done when**:
- [x] Record check `complete:false` then Choose Problem → `Problem Chosen {qualification:'provisional'}`; `complete:true` → `firm` (acceptance test 44)
- [x] Second `Record Stakeholder Check` → `ok([])`; Choose after Skip (or vice versa) → `ok([])` (pinned rule: a repeat once `problemDecided` emits nothing — the distinct `Problem Chosen` vs `Problem Choice Skipped` events keep the log discriminable)
- [x] `pnpm test` green; domain coverage ≥ 90 %
**Tests**: unit · **Gate**: quick

### T38: `record-stakeholder-check` capability
**What**: New `capabilities/record-stakeholder-check/{http,deps}.ts` — `POST /workshops/:id/stakeholder-check {complete, absentNames?}` → `Workshop.decide(Record Stakeholder Check)`. `absentNames` are carried on the event; the sweep (T40) turns them into hot spots.
**Where**: `src/session-facilitation/capabilities/record-stakeholder-check/`
**Depends on**: T37
**Reuses**: `set-scope/http.ts` shape
**Requirement**: S4-33 (F09 stakeholder answer)
**Tools**: Skill `anoria-commons:code-architecture`
**Done when**:
- [x] `complete:true` → 200, workshop stream has the event; `complete:false` with two names → event carries both
- [x] Re-post → 200 idempotent, no duplicate event
- [x] `pnpm test` green
**Tests**: integration · **Gate**: full

### T39: `choose-problem` capability
**What**: New `capabilities/choose-problem/{http,deps}.ts` — `POST /workshops/:id/chosen-problem` `{problemHotSpotId} | {skipReason}`. For a chosen id: read `readBoardSnapshot`, filter to **open** hot spots, reject `unknown-open-hot-spot` (409) if absent; else `Choose Problem`. For a skip: `Skip Problem Choice`.
**Where**: `src/session-facilitation/capabilities/choose-problem/`
**Depends on**: T38
**Reuses**: `readBoardSnapshot` via `domain-model-capture/api.ts`
**Requirement**: S4-32 (candidates = open hot spots)
**Tools**: Skill `anoria-commons:code-architecture` (sync query-back is allowed; a sync command is not)
**Done when**:
- [x] Choose an open hot spot → 200 `Problem Chosen`; choose a resolved/unknown one → 409 `unknown-open-hot-spot`
- [x] Skip with `no-impediments-yet` → 200 `Problem Choice Skipped`
- [x] `pnpm test` green
**Tests**: integration · **Gate**: full

### T40: Wire F09 capabilities + `reconcileHotSpots` reads `absentNames`
**What**: Export both capabilities from `session-facilitation/api.ts`; mount in `host/routes.ts`. Extend `reconcileHotSpots` to also read `Stakeholder Check Recorded.absentNames` off the workshop stream (key `absent-sc:<slug(name)>`) → one hot spot per name.
**Where**: `src/session-facilitation/api.ts`, `src/host/routes.ts`, `infrastructure/hot-spot-sweep.ts`
**Depends on**: T39, T34
**Reuses**: `reconcileHotSpots` sweep pattern
**Requirement**: S4-33 (one absent-stakeholder hot spot per person)
**Tools**: Skill `anoria-commons:distributed-systems`
**Done when**:
- [x] Host integration test: `stakeholder-check {complete:false, absentNames:['ops lead']}` → after a reconcile tick, one hot spot "Absent stakeholder: ops lead" on the board
- [x] `pnpm test` green
**Tests**: integration · **Gate**: full

### T40b: `interpret.ts` — complete-perspective records the workshop stakeholder check
**What**: In `interpret.ts` `deriveConfirmCompletePerspective`, after resolving the question, also append `Workshop.decide(Record Stakeholder Check {complete:true, absentNames:[]})` on the session's workshop stream (same context, same tick, idempotent). Completes the half of T29 that was reduced in batch 4 (it needed the `Record Stakeholder Check` command from T37). Owns acceptance test 44.
**Where**: `src/session-facilitation/capabilities/interpret-contribution/interpret.ts`
**Depends on**: T40, T37
**Reuses**: `deriveConfirmCompletePerspective`, `appendSession` pattern
**Requirement**: S4-23 (acceptance test 44)
**Tools**: NONE
**Done when**:
- [x] A contribution interpreted as `confirm-complete-perspective` resolves the question AND the workshop stream carries `Stakeholder Check Recorded {complete:true, absentNames:[]}`; a later `Choose Problem` yields `firm` (acceptance test 44)
- [x] Repeated confirmations record the workshop check exactly once
- [x] `pnpm check` green
**Tests**: integration · **Gate**: full

### T41: `readArtifactSource` extension for #42
**What**: Add `stakeholderCheck: {run:false} | {run:true, complete, absentNames}`, `chosenProblem: {notRun:true} | {skipped:true, reason} | {chosen:true, hotSpotId, label, qualification}`, `openModelAffectingHotSpots: {id,label}[]` to `readArtifactSource` + `artifact-source.ts`.
**Where**: `src/session-facilitation/infrastructure/read-artifact-source.ts`, `domain/read-models/artifact-source.ts`
**Depends on**: T40
**Reuses**: existing artifact-source assembly; `readBoardSnapshot` for the hot-spot filter
**Requirement**: S4-35 (acceptance test 25 — "not run" distinct from "run, found nothing")
**Tools**: NONE
**Done when**:
- [x] Source with no stakeholder check → `{run:false}`; with `complete:true` → `{run:true, complete:true, absentNames:[]}`
- [x] `openModelAffectingHotSpots` excludes informational and resolved hot spots
- [x] `pnpm check && pnpm build` green (Phase 8 close)
**Tests**: unit · **Gate**: build

### Phase 9 — App: hot-spot rendering + direct flag + resolution cards

### T42: Board store + transport + `board-view` carry hot spots
**What**: `transport/board.ts` + `stores/board.ts` carry the new snapshot fields. `view-state/board-view.ts` derives `hotSpots: {annotated: Map<targetId, Callout[]>, unannotated: Callout[], count}`.
**Where**: `src/app/capture-loop/{transport/board.ts, stores/board.ts, view-state/board-view.ts}`
**Depends on**: T10 (server side)
**Reuses**: `board-view.ts` derivation pattern
**Requirement**: S4-36
**Tools**: Skill `anoria-commons:code-architecture` (reads bypass domain)
**Done when**:
- [x] `boardView` groups callouts by target and lists unannotated ones; `count` matches the snapshot, asserted against a literal fixture
- [x] `pnpm test` green (`app` project)
**Tests**: unit · **Gate**: full

### T43: Render callouts + count on the wall
**What**: `board/layout.ts` returns callout anchor rects (pure, no pixels cross the API). `BoardWall.vue` + `board/presentation/` render a callout on each annotated sticky (resolved shows reference, open does not), an unannotated list, and the running count.
**Where**: `src/app/capture-loop/board/{layout.ts, BoardWall.vue, presentation/}`
**Depends on**: T42
**Reuses**: sticky renderer, `use-fresh-sticky-highlight`
**Requirement**: S4-36 (P2 story: live board)
**Tools**: Skill `impeccable` (Operate — callout + count treatment on the existing capture-loop brief)
**Done when**:
- [x] `@vue/test-utils`: an annotated resolved hot spot renders its reference; an open one does not; the count renders
- [x] Keyboard-reachable per DESIGN §8; no console warnings (`playwright-cli` spot check — skipped, no dev server)
- [x] `pnpm test` green
**Tests**: unit · **Gate**: full

### T44: Direct "flag hot spot" affordance
**What**: `board/interactions/select-block/` gains a "flag hot spot" action on the selected block (and a board-level "flag with no target"). New `dock/interactions/flag-hot-spot/use-flag-hot-spot.ts` + `transport/hot-spots.ts` → `POST /workshops/:id/board/hot-spots`. A discrimination-sensor row for the new orchestration branch added to `docs/testing.md`.
**Where**: `src/app/capture-loop/{board/interactions/select-block/, dock/interactions/flag-hot-spot/, transport/hot-spots.ts}`
**Depends on**: T43, T12 (server)
**Reuses**: `use-select-block.ts`, `use-relate-blocks.ts` transport pattern
**Requirement**: S4-37
**Tools**: Skill `impeccable` · Skill `testing-boss`
**Done when**:
- [x] Selecting a block and flagging → POST fires with the target id; flagging with none → POST with no target
- [x] After the board refetch, the callout/list/count update (no reload)
- [x] `docs/testing.md` M-table has the new sensor row
- [x] `pnpm test` green
**Tests**: unit (+ `.integration.test.ts` for the orchestration seam) · **Gate**: full

### T45: Resolution review cards
**What**: `dock/interactions/review-resolution/use-review-resolution.ts` (mirror `use-review-proposal.ts`) + `transport/resolutions.ts` + a resolution card component (mirror `ProposalCard.vue` — reference field editable, Accept/Edit/Reject).
**Where**: `src/app/capture-loop/dock/interactions/review-resolution/`, `transport/resolutions.ts`, `dock/ResolutionCard.vue`
**Depends on**: T19 (server), T43
**Reuses**: `use-review-proposal.ts`, `ProposalCard.vue`
**Requirement**: S4-38
**Tools**: Skill `impeccable`
**Done when**:
- [x] Accept posts to `/resolutions/:id/accept`; edit posts the reference; reject posts reject
- [x] Card shows resolved/`already-resolved` collapsed states
- [x] `pnpm test` green
**Tests**: unit · **Gate**: full

### T46: Pending drawer + poll pick up resolutions
**What**: `use-interpretation-poll` also refetches `/sessions/:id/resolutions` while any resolution is pending. `PendingDrawer.vue` groups resolutions alongside proposals.
**Where**: `src/app/capture-loop/{shell/composables/use-interpretation-poll.ts, dock/PendingDrawer.vue, stores/}`
**Depends on**: T45
**Reuses**: `use-interpretation-poll.ts` (AD-018), `PendingDrawer.vue`
**Requirement**: S4-38
**Tools**: Skill `testing-boss`
**Done when**:
- [x] A pending resolution keeps the poll active; it stops when none pending (sensor: poll `resolutions` not `board`)
- [x] Drawer renders resolutions with a jump chevron
- [x] `pnpm check && pnpm build` green (Phase 9 close)
**Tests**: unit · **Gate**: build

### Phase 10 — App: close ceremony + impeccable + changeset

### T47: `/impeccable shape` the close-ceremony surface
**What**: Run `/impeccable shape src-app-capture-loop-close` (or the impeccable-chosen slug) to produce `.impeccable/surfaces/src-app-capture-loop-close.md` — the confirmed UX/UI brief for the in-dock stakeholder-question → problem-picker → confirm flow, the "no hot spots is a signal" message, and reduced-motion behaviour.
**Where**: `.impeccable/surfaces/`
**Depends on**: None (can run any time in Phase 10 before T48)
**Reuses**: the existing capture-loop brief as the visual world
**Requirement**: S4-40
**Tools**: Skill `impeccable`
**Done when**:
- [x] The brief exists, is internally consistent with `DESIGN.md`, and covers all F09 states
- [x] `pnpm check` green (no code — `check:process-ids` + doc-link)
**Tests**: none (design artifact) · **Gate**: build

### T48: Close-ceremony composable + transport
**What**: `dock/interactions/close-ceremony/use-close-ceremony.ts` — drives: person clicks Close → POST a "start closing" (a `Question Asked {kind:'stakeholder'}` is asked by the facilitator tick; the composable waits/polls) → person answers via the normal composer → interpreted → `record-stakeholder-check` (via the interpretation, T29) → problem picker reads open hot spots → `choose-problem` → `POST /sessions/:id/close`. `transport/close.ts`.
**Where**: `src/app/capture-loop/dock/interactions/close-ceremony/`, `transport/close.ts`
**Depends on**: T47, T35 + T40 (server)
**Reuses**: `use-contribute.ts`, `use-interpretation-poll.ts`
**Requirement**: S4-39 (AD-034 — session stays OPEN until confirm)
**Tools**: Skill `impeccable` · Skill `testing-boss`
**Done when**:
- [x] The ceremony holds the session OPEN through the Q&A + picker; `/sessions/:id/close` fires only on final confirm
- [x] Skipping the problem posts `{skipReason}`
- [x] `.integration.test.ts` for the orchestration seam; sensor row added
- [x] `pnpm test` green
**Tests**: unit (+ `.integration.test.ts`) · **Gate**: full

### T49: Close-ceremony components + FacilitatorDock wiring
**What**: The stakeholder-question card, the problem picker (equal-sized choose/skip per F09), the "no hot spots is a signal" line, the CLOSED confirmation — all per the T47 brief, wired into `FacilitatorDock.vue`.
**Where**: `src/app/capture-loop/dock/close-ceremony/*.vue`, `dock/FacilitatorDock.vue`
**Depends on**: T48
**Reuses**: `ProposalCard.vue` chrome, dock feed
**Requirement**: S4-39
**Tools**: Skill `impeccable`
**Done when**:
- [x] `@vue/test-utils`: the picker offers only open hot spots; choose and skip are the same size (F09); reduced-motion presents without motion
- [x] Keyboard-reachable; no console warnings
- [x] `pnpm test` green
**Tests**: unit · **Gate**: full

### T50: E2E — flag → resolve → close ceremony
**What**: Extend `e2e/capture-loop.spec.ts` with a fourth serial macro stage (or a new spec): flag a hot spot on an event → the scripted facilitator proposes a resolution → accept it → the board shows resolved + count → run the close ceremony (answer the stakeholder question "nobody else", pick a problem) → session CLOSED, callout + count persist on reload. Add the scripted turns to `e2e/fixtures/facilitator.json`.
**Where**: `e2e/capture-loop.spec.ts`, `e2e/fixtures/facilitator.json`
**Depends on**: T49
**Reuses**: the serial-stage harness, `FACILITATOR_MODE=scripted`
**Requirement**: S4 success criterion (demoable end to end)
**Tools**: Skill `playwright-cli`
**Done when**:
- [x] `pnpm test:e2e` green (both specs); the new stage names its failing phase on failure
- [x] Real server, real SQLite, real SPA — no Anthropic call
**Tests**: e2e · **Gate**: e2e

### T51: `minor` changeset + STATE/spec status + slice-6 list
**What**: Add `.changeset/*.md` (`minor`, target 0.5.0) describing F08/F09/F18. Flip `spec.md`/`design.md`/`tasks.md` Status to done. Append to `.specs/STATE.md` the Slice-6 reconciliation items: ADR-004's "kind changeable by a reword-style operation" has no frozen home (v2 additive or strike); `Question Asked.kind` gained `'stakeholder'` (doc the canvas); the `#41→#42` facilitator-track move (already commented). Update the Handoff snapshot.
**Where**: `.changeset/`, `.specs/features/slice-4-hot-spots-close/*.md`, `.specs/STATE.md`
**Depends on**: T50
**Reuses**: ADR-009 changeset discipline
**Requirement**: S4-41, S4-42, S4-43
**Tools**: NONE
**Done when**:
- [ ] `.changeset/*.md` present, `minor`, `package.json` `version` untouched
- [ ] `pnpm check && pnpm build && pnpm test:e2e` all green
- [ ] `git log` shows one atomic commit per task, `slice-4-hot-spots-close` branch
**Tests**: none (release/docs — build gate) · **Gate**: e2e

**Commit** (per task): `feat(...): ...` for behaviour, `test(...)`/`chore(...)`/`docs(...)` as
apt. Conventional prefix required (commitlint). Commits are SSH-signed.

---

## Phase Execution Map

```
Phase 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10

P1  (board raise/annotate)     T1 → T2 → T3 → T4 → T5
P2  (board resolve/reopen/casc) T6 → T7 → T8 → T9
P3  (board HTTP + flag)         T10 → T11 → T12
P4  (Resolution + review)       T13 → T14 → T15 → T16 → T17 → T18 → T19
P5  (hot-spot proposal track)   T20 → T21 → T22 → T23 → T24 → T25
P6  (question-track judgments)  T26 → T27 → T28 → T29 → T30
P7  (choreography sweep)        T31 → T32 → T33 → T34 → T35
P8  (F09 workshop state)        T36 → T37 → T38 → T39 → T40 → T40b → T41
P9  (app: hot spots + cards)    T42 → T43 → T44 → T45 → T46
P10 (app: close + changeset)    T47 → T48 → T49 → T50 → T51
```

Strictly sequential — no intra-phase parallelism. Expected batch packing (~7 tasks):
B1 = P1+P2 (9) · B2 = P3+P4 (10) · B3 = P5 (6) · B4 = P6+P7 (10) · B5 = P8 (6) ·
B6 = P9 (5) · B7 = P10 (5). ~7 workers.

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1 | 1 file (model types) | ✅ |
| T2–T4, T6–T8 | 1 fold/decider file each | ✅ |
| T5, T9 | test extension | ✅ |
| T11, T17, T38, T39 | 1 capability | ✅ |
| T15 | 1 aggregate (model+decide+evolve+replay, one cohesive unit) | ⚠️ OK — one aggregate, the repo's established task unit (cf. slice 1) |
| T24, T29, T32, T33, T48 | 1 handler/function change | ✅ |
| T43, T49 | render layer for one surface | ⚠️ OK — cohesive, one brief |
| T47 | 1 skill run (design artifact) | ✅ |

No task creates multiple unrelated files. T15 and T27/T37 bundle the four Decider files of one
aggregate — the same granularity slice 1 used (`T10 applyOperation`, `T15 replay+streams`).

---

## Diagram-Definition Cross-Check

| Task | Depends On (body) | Diagram | Status |
| --- | --- | --- | --- |
| T1 | None | — | ✅ |
| T2 | T1 | T1→T2 | ✅ |
| T3 | T1 | T1→T3 (T2→T3 sequential in-phase) | ✅ |
| T4 | T2 | T2→T4 | ✅ |
| T5 | T3, T4 | in-phase after T4 | ✅ |
| T6 | T1 | in-phase (P2 after P1) | ✅ |
| T7 | T6 | T6→T7 | ✅ |
| T8 | T7 | T7→T8 | ✅ |
| T9 | T8 | T8→T9 | ✅ |
| T10 | T9 | P3 after P2 | ✅ |
| T11 | T10 | T10→T11 | ✅ |
| T12 | T11 | T11→T12 | ✅ |
| T13 | None | P4 start | ✅ |
| T14 | T13 | T13→T14 | ✅ |
| T15 | T14 | T14→T15 | ✅ |
| T16 | T15 | T15→T16 | ✅ |
| T17 | T16 | T16→T17 | ✅ |
| T18 | T17 | T17→T18 | ✅ |
| T19 | T18 | T18→T19 | ✅ |
| T20 | None | P5 start | ✅ |
| T21 | T20 | T20→T21 | ✅ |
| T22 | T20 | T20→T22 (T21→T22 in-phase) | ✅ |
| T23 | T21, T22 | T22→T23 | ✅ |
| T24 | T23 | T23→T24 | ✅ |
| T25 | T24 | T24→T25 | ✅ |
| T26 | None | P6 start | ✅ |
| T27 | T26 | T26→T27 | ✅ |
| T28 | T27 | T27→T28 | ✅ |
| T29 | T28, **T37** | T28→T29; **cross-phase back-edge to T37 (P8)** | ⚠️ see note |
| T30 | T29 | T29→T30 | ✅ |
| T31 | None | P7 start | ✅ |
| T32 | T31, T27 | T31→T32; T27 (P6) earlier | ✅ |
| T33 | T32 | T32→T33 | ✅ |
| T34 | T33 | T33→T34 | ✅ |
| T35 | T34 | T34→T35 | ✅ |
| T36 | None | P8 start | ✅ |
| T37 | T36 | T36→T37 | ✅ |
| T38 | T37 | T37→T38 | ✅ |
| T39 | T38 | T38→T39 | ✅ |
| T40 | T39, T34 | T39→T40; T34 (P7) earlier | ✅ |
| T40b | T40, T37 | T40→T40b (resolves the T29 back-edge — see note) | ✅ |
| T41 | T40b | T40b→T41 | ✅ |
| T42 | T10 | P9 after P3 | ✅ |
| T43 | T42 | T42→T43 | ✅ |
| T44 | T43, T12 | T43→T44; T12 earlier | ✅ |
| T45 | T19, T43 | earlier + T43 | ✅ |
| T46 | T45 | T45→T46 | ✅ |
| T47 | None | P10 start | ✅ |
| T48 | T47, T35, T40 | T47→T48; earlier | ✅ |
| T49 | T48 | T48→T49 | ✅ |
| T50 | T49 | T49→T50 | ✅ |
| T51 | T50 | T50→T51 | ✅ |

**⚠️ T29 back-edge note (MUST resolve before Execute):** T29 (`confirm-complete-perspective`
also records `Stakeholder Check Recorded`) needs the `Record Stakeholder Check` command from
T37 (Phase 8). Two options: **(a)** move `Record Stakeholder Check` command+event (T36 event +
T37 decider, stakeholder-check half only) earlier into Phase 6 as a new T26.5/T27.5; **(b)**
split T29 — derive the question resolution in Phase 6, add the `Stakeholder Check Recorded`
append in a Phase 8 task after T37. **Recommendation: (b)** — it keeps Phase 6 about the
`Session` and Phase 8 about the `Workshop`, and the acceptance-test-44 assertion moves to the
Phase 8 task. Apply (b) at Execute: T29 does only the three `deriveSession` cases; a new
**T40.5** (after T40) adds the complete-perspective → `Stakeholder Check Recorded` append and
owns acceptance test 44. Renumber at Execute.

---

## Test Co-location Validation

| Task | Layer created/modified | Matrix requires | Task says | Status |
| --- | --- | --- | --- | --- |
| T1, T13, T14, T20, T26, T36 | Domain schema / id brand / event SSOT | none (build gate) | none | ✅ |
| T2, T3, T4, T6, T7, T8, T22, T27, T37 | Domain decider/fold | unit (all branches, 1:1 AC) | unit | ✅ |
| T5, T9 | Domain test extension | unit | unit | ✅ |
| T15 | `Resolution` aggregate | unit | unit | ✅ |
| T16, T30, T41 | Domain read model | unit | unit | ✅ |
| T10, T11, T17, T18, T23, T24, T29, T38, T39, T40 | Capability HTTP / accept chain | integration | integration | ✅ |
| T12, T19, T25, T35 | api.ts + host wiring | integration | integration/build | ✅ |
| T21, T28 | Turn schema (infra) + test | unit | unit | ✅ |
| T31, T32, T33, T34 | Infrastructure sweep / migration | integration | integration | ✅ |
| T42, T43, T44, T45, T46, T48, T49 | App stores/composables/SFC | unit (+ `.integration.test.ts` for seams) | unit | ✅ |
| T47 | `.impeccable/` brief | none | none | ✅ |
| T50 | E2E | e2e | e2e | ✅ |
| T51 | changeset / docs | none (build gate) | none | ✅ |

No `Tests: none` where the matrix requires a test type. No test deferral — every task that
adds a decider/fold/capability writes its tests in the same task.

---

## MCPs and Skills per task — confirm before Execute

**Proposed mapping** (see each task's Tools field):

| Skill | Tasks | Why |
| --- | --- | --- |
| `anoria-commons:domain-modeling` | T1–T9, T15, T22, T27, T37 | board folds/deciders, `Resolution`/`Session`/`Workshop` aggregates — slim write model, event-sourced Decider, G/W/T |
| `anoria-commons:distributed-systems` | T14, T18, T20, T24, T26, T31–T34, T36, T40 | choreography sweep, idempotency/effectively-once, per-context transactions, backward-compatible event evolution |
| `anoria-commons:code-architecture` | T11, T16, T17, T38, T39 | slice ownership, reads-bypass-domain, sync query-back vs command |
| `anoria-commons:software-design` | T7 | the `resolve` error contract (classify by retry behaviour) |
| `impeccable` | T43, T44, T45, T47, T48, T49 | callout/count treatment (Operate) + the close-ceremony brief (Shape) |
| `testing-boss` | T5, T9, T21, T28, T44, T46, T48 | discrimination sensors, independently-stated expectations, sensor-table rows |
| `playwright-cli` | T50 | drive the running app for the E2E stage |
| MCP `context7` | T7, T21, T28 | Zod v4 object-key optionality; Anthropic structured-output limits (docs first) |

**Question for the user before Execute:** confirm this skill/MCP mapping, and whether to
dispatch the ~7 batch sub-agents or execute inline.
