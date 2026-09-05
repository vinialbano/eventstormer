# Slice 5 — Artifacts + Facilitator Tracks Tasks

## Execution Protocol (MANDATORY — do not skip)

Implement these tasks with the `spec-driven-development` skill (plugin-qualified:
`anoria-engineering:spec-driven-development`): **activate it by name and follow its Execute
flow and Critical Rules.** Do not search for skill files by filesystem path.

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Design**: `.specs/features/slice-5-artifacts-facilitator-tracks/design.md`
**Status**: Draft (revised 2026-09-05 after the four-lens adversarial review)

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec — confirm before Execute. Guidelines
> found: `AGENTS.md` (+ `docs/testing.md`, `docs/adr/008`, per-context `domain/AGENTS.md`),
> `vite.config.ts`, `package.json` scripts, `.github/workflows` (`pnpm check` + `pnpm build`
> + `pnpm test:e2e` merge gate, AD-027).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Domain pure fns & read models (`src/*/domain/**` — deciders, `evolve`, `replay`, `mapTurn` seam, `model-readiness`, read models, `serialise`/`deserialise`, `render-*`, `graph`) | unit | All branches; 1:1 to spec ACs; every listed edge case; `fast-check` property where the design names one | `src/**/domain/**/*.test.ts`, `*.property.test.ts` | `pnpm test` |
| Zod schemas & contracts (`turn-schema`, `interpreted-track`, `events`, `model-json`, `SessionTranscript`) | unit + contract | Every variant parses; rejection cases; `turn-schema` optional-count + no-empty-sub-schema; `SessionTranscript` contract test | co-located `*.test.ts` | `pnpm test` |
| Facilitator prompt (`infrastructure/facilitator/prompt.ts`) | unit | Menu names every strand; turn input renders topology for a fixture board | `*.test.ts` | `pnpm test` |
| Capability HTTP routes + `accept.ts` (`src/*/capabilities/**`) | integration (Hono `testClient`) | Every route: happy + every edge case + error/failure (404 shapes, `APPLY_FAILED`, 409, render-throw → 500, no-side-effect) | `src/**/capabilities/**/*.test.ts` | `pnpm test` |
| App transport/store seam (`src/app/capture-loop/**`) | integration | Store↔transport seam driven end-to-end; re-fetch orchestration; error state | `src/app/**/*.integration.test.ts` | `pnpm test` |
| App components (`src/app/capture-loop/**`) | unit (component, `@vue/test-utils`) | Renders returned bytes; download action; focus order; reduced-motion | `src/app/**/*.test.ts` | `pnpm test` |
| End-to-end (`e2e/**`) | e2e (Playwright, `FACILITATOR_MODE=scripted`) | The full contribution → `propose-relation` → accept → board edge path; then an artifact fetched from the real route | `e2e/*.spec.ts` | `pnpm test:e2e` |
| Cross-context architecture rules | depcruise | `pnpm depcruise` green (no new *rule* this slice — DAG↔SF / →Capture `api.ts` edges pre-exist) | `.dependency-cruiser.cjs` | `pnpm depcruise` |
| `docs/testing.md` sensor rows | doc | New M-row(s) for the app live-panel orchestration branch (slice-4 M7/M8 precedent) | `docs/testing.md` | `pnpm check` |
| Config / route-mount / changeset / ARCHITECTURE.md / README | none | build gate only | — | `pnpm check` |
| Live model smoke (`scripts/`) | manual (out of CI, AD-027) | Assembled `FacilitationTurnSchema` accepted by the real structured-output path | `scripts/*.ts` | `pnpm <script>` |

**Provenance:** sampled `src/session-facilitation/domain/proposal/{decide,machine.property}.test.ts`,
`.../read-models/*.test.ts`, `.../infrastructure/facilitator/{map,prompt,turn-schema}.test.ts`,
`src/derived-artifact-generation/domain/render-readable-account.test.ts`,
`src/domain-model-capture/domain/board/decide.test.ts`,
`src/session-facilitation/capabilities/review-proposal/accept.test.ts`,
`src/**/capabilities/**/http.test.ts`, `e2e/capture-loop.spec.ts`,
`src/app/capture-loop/**/*.{test,integration.test}.ts`.

## Gate Check Commands

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Mid-task check on a pure-function task | `pnpm test` |
| Full | **Default for every task** (AGENTS.md — `pnpm test` skips typecheck/lint/depcruise/knip/process-ids) | `pnpm check` |
| Build | App / e2e tasks, route mounts, phase completion | `pnpm check && pnpm build && pnpm test:e2e` |

---

## Execution Plan

Phases ordered, run sequentially; tasks within a phase in order.

### Phase 1: Facilitator schema + prompt + anticorruption seam (Track B foundation)

```
T1 → T1a → T1b → T2 → T3 → T3a → T4
```

### Phase 2: Proposal generalisation + board idempotency (Track B core)

```
T5 → T6 → T7 → T8 → T8a
```

### Phase 3: Accept chain + facilitation read models (Track B integration)

```
T9 → T10 → T11 → T12
```

### Phase 4: SF → DAG transcript contract

```
T13
```

### Phase 5: JSON export + graph extraction (Track A)

```
T14 → T15 → T16 → T17 → T18
```

### Phase 6: Summary + transcript renders (Track A)

```
T19 → T20 → T21 → T22
```

### Phase 7: App live panel, live smoke, release

```
T23 → T24a → T24b → T25 → T26 → T27
```

---

## Task Breakdown

### T1: Add the three new `FacilitationTrack` strands

**What**: `propose-relation` / `propose-pivotal` / `propose-reword` discriminated members, all fields required, constraints mirrored into `.describe()`.
**Where**: `src/session-facilitation/infrastructure/facilitator/turn-schema.ts` (+ `.test.ts`)
**Depends on**: None · **Reuses**: the file's union + `.describe()` pattern
**Requirement**: FREL-01, FREL-04, FPIV-01, FREW (schema shape)

**Done when**:
- [ ] the three members per design §1 (`endpoints: array(string).min(1).max(3)` on relation; all else required)
- [ ] `turn-schema.test.ts`: optional count **== 5**; each member parses; `z.toJSONSchema` has no empty `{}`
- [ ] Gate `pnpm check` green; test count recorded

**Tests**: unit · **Gate**: full

---

### T1a: Teach `prompt.ts` the three strands

**What**: `buildInstructions()` strand menu + per-strand when-to-use guidance (relation: implied order/cause/placement, name endpoints by exact board label; pivotal: only on a board with a spine; reword: only when structure exists, keep the person's wording).
**Where**: `src/session-facilitation/infrastructure/facilitator/prompt.ts` (+ `prompt.test.ts`)
**Depends on**: T1 · **Reuses**: the existing instruction-string builders
**Requirement**: FREL-08, FREL-01

**Done when**:
- [ ] the menu names `propose-relation` / `propose-pivotal` / `propose-reword` with guidance; the "never more than 12 strands" line preserved
- [ ] `prompt.test.ts` asserts each strand name + one guidance phrase appears
- [ ] Gate `pnpm check` green

**Tests**: unit · **Gate**: full

---

### T1b: Surface board topology in the turn input

**What**: `buildTurnInput()` renders, per placed event, its `follows`/`causedBy` links and a `pivotal` marker, plus a "N events on the timeline" line — from `readBoardSnapshot`.
**Where**: `src/session-facilitation/infrastructure/facilitator/prompt.ts`, `assembleFacilitationContext` / the interpret capability (`interpret.ts`, `deps.ts`) (+ `prompt.test.ts`, context test)
**Depends on**: T1a · **Reuses**: the board-read the interpret capability already does (widen `readBuildingBlocks` → `readBoardSnapshot`)
**Requirement**: FREL-08

**Done when**:
- [ ] turn input for a fixture board with one `follows` edge + one pivotal shows both
- [ ] the interpret capability reads `readBoardSnapshot` once (the same read T4 uses); no second board query
- [ ] tests cover the rendered topology + the widened read
- [ ] Gate `pnpm check` green

**Tests**: unit · **Gate**: full

---

### T2: Add the three stored `InterpretedTrack` strands (named id fields)

**What**: id-resolved stored shapes; relation carries **named** `BuildingBlockId` fields matching the `Operation`, not a positional array.
**Where**: `src/session-facilitation/domain/schema/interpreted-track.ts` (+ `.test.ts`)
**Depends on**: T1 · **Reuses**: `z.discriminatedUnion`, `BuildingBlockId`/`ProposalId` schemas
**Requirement**: FREL-01, FPIV-01, FREW-01

**Done when**:
- [ ] `propose-relation { track, proposalId, relationKind, predecessor?, successor?, inserted?, cause?, effect?, target? }` + a `.refine` matching the field set to `relationKind`
- [ ] `propose-pivotal { track, proposalId?, pivotalKind, target?, heldBack, eventLabel }`; `propose-reword { track, proposalId?, target?, newLabel, heldBack, targetLabel }` — `proposalId`/`target` present iff `!heldBack`
- [ ] `.test.ts` covers each variant + both invariants both ways
- [ ] Gate `pnpm check` green

**Tests**: unit · **Gate**: full

---

### T3: `Intent` + `Model Change Proposed` / `Model Change Edited` events

**What**: the second `Proposal` birth event, its edit event (mutable fields only), and the frozen named-field `Intent` union.
**Where**: `src/session-facilitation/domain/schema/events.ts` (+ `events.test.ts`)
**Depends on**: T2 · **Reuses**: the `ProposalEvent` union; `BuildingBlockId` schema
**Requirement**: FREL-02, FPIV-03, AD-035

**Done when**:
- [ ] `Intent` per design §3 (named id fields per `kind`)
- [ ] `Model Change Proposed { type, proposalId, sessionId, contributionId, intent, at }` + `Model Change Edited { type, proposalId, changed, at }` (`changed` = mutable fields only, no `kind`)
- [ ] every existing fold/switch over `ProposalEvent` updated for exhaustiveness (compile gate)
- [ ] `events.test.ts`: both parse; `intent` variants validated; `at` is `z.iso.datetime()`
- [ ] Gate `pnpm check` green

**Tests**: unit · **Gate**: full

---

### T3a: `model-readiness` domain predicates

**What**: named pure predicates for the F04/F07 gates.
**Where**: `src/session-facilitation/domain/model-readiness.ts` (+ `.test.ts`)
**Depends on**: None · **Reuses**: the `BoardSnapshot` type (no framework import)
**Requirement**: FREW-05, AD-036

**Done when**:
- [ ] `hasModelStructure(snapshot)` = ≥ 1 `follows`/`causedBy` edge OR ≥ 1 `pivotal` block
- [ ] `pivotalProposable(snapshot)` = placed-domain-event count ≥ `PIVOTAL_MIN_PLACED_EVENTS` (`= 5`, named const + one-line F07 rationale comment)
- [ ] `.test.ts`: `hasModelStructure` on one edge / one pivotal / bare captures; `pivotalProposable` at 4 vs 5
- [ ] Gate `pnpm check` green

**Tests**: unit · **Gate**: full

---

### T4: Extend `mapTurn` + wire the interpret caller

**What**: `mapTurn` gains a `boardState` arg, becomes a `flatMap` applying resolution + the readiness predicates; the interpret capability builds `boardState` from one post-`await` `readBoardSnapshot` and threads it through.
**Where**: `src/session-facilitation/infrastructure/facilitator/map.ts` (+ `map.test.ts`), `src/session-facilitation/` interpret path (`interpret.ts`, `deps.ts`)
**Depends on**: T2, T3, T3a · **Reuses**: `resolveBlockId`, the per-track `switch`
**Requirement**: FREL-01, FREL-03, FPIV-01, FPIV-02, FREW-01, FREW-03, FREW-05, FREW-06, AD-036

**Done when**:
- [ ] `mapTurn(turn, mint, resolveBlockId, boardState)` — `boardState = { placedEventCount, hasStructure, isPlacedDomainEvent, labelsProposedThisTurn }`
- [ ] `propose-relation`: dropped on unresolved/ambiguous label, wrong arity, or equal endpoints; else named id fields set
- [ ] `propose-pivotal`: `heldBack: true` unless `isPlacedDomainEvent && pivotalProposable`
- [ ] `propose-reword`: `heldBack = !hasStructure && !labelsProposedThisTurn.has(targetLabel)`
- [ ] `boardState` read from one `readBoardSnapshot` **after** the model call; `labelsProposedThisTurn` accumulates `propose-building-block` labels in turn order
- [ ] a held track is not re-surfaced by a later contribution (FREW-06 — nothing queues it)
- [ ] `map.test.ts`: one case per branch + same-turn-label carve-out + a released reword + stale-snapshot guard (gate uses the post-`await` read); interpret-path test asserts a real `readBoardSnapshot` drives it
- [ ] Gate `pnpm check` green

**Tests**: unit + integration · **Gate**: full

---

### T5: `Proposal` model + `decide` — model-change birth & edit

**What**: `ProposalWriteModel` gains `birthKind`; `decide` gains `Propose Model Change` / `Edit Model Change`; model-change `Accept` mints no `buildingBlockId`.
**Where**: `src/session-facilitation/domain/proposal/{model,evolve,decide}.ts` (+ `decide.test.ts`)
**Depends on**: T3 · **Reuses**: `REVIEWABLE`/`TERMINAL`, the disposition machine — unchanged
**Requirement**: AD-035, FREL-02, FREW-02

**Done when**:
- [ ] `ProposalWriteModel.birthKind: 'block' | 'model-change'` (no full `Intent` in the model)
- [ ] `decide(Propose Model Change)` → `[Model Change Proposed]`, `born`, `PROPOSED`
- [ ] `decide(Edit Model Change)` legal only in `REVIEWABLE` → `Model Change Edited`
- [ ] `decide(Accept Proposal)` for `birthKind:'model-change'` succeeds with no `buildingBlockId`
- [ ] `evolve` folds both new events; `decide.test.ts` Given/When/Then per the above
- [ ] Gate `pnpm check` green

**Tests**: unit · **Gate**: full

---

### T6: `replay` branch + machine property

**Where**: `src/session-facilitation/domain/proposal/replay.ts`, `.../machine.property.test.ts`
**Depends on**: T5 · **Reuses**: the `replay` fold, the `fast-check` model
**Requirement**: AD-035 (ADR-008 replay property)

**Done when**:
- [ ] `replay` on a `Model Change Proposed`-born stream gives the same disposition transitions; neither birth → `not-born`
- [ ] `machine.property.test.ts` generator includes `Propose/Edit Model Change` + accept→apply / apply-failed / reject / lapse; `replay(log ++ [e]) === evolve(replay(log), e)` holds
- [ ] Gate `pnpm check` green

**Tests**: unit (property) · **Gate**: full

---

### T7: `deriveTracks` — model-change births

**Where**: the interpret-path derivation module that births `Building Block Proposed` (+ its `.test.ts`)
**Depends on**: T5 · **Reuses**: AD-021 commit-point + `derived_track` marker
**Requirement**: FREL-02, FPIV-03, FREW-01, FREW-04, FREW-06

**Done when**:
- [ ] each non-`heldBack` model-change track → one `Model Change Proposed` (seam `proposalId`, `derived_track` marked); a `heldBack` track → nothing
- [ ] re-run idempotent (marked tracks skipped); a held track is never surfaced later
- [ ] test covers all cases + idempotent re-run
- [ ] Gate `pnpm check` green

**Tests**: unit · **Gate**: full

---

### T8: Generalise `sessionProposalIds` + close-time lapse sweep

**Where**: `src/session-facilitation/domain/read-models/session-summary.ts`, `src/session-facilitation/infrastructure/session-close.ts` (+ `.test.ts`)
**Depends on**: T3 · **Reuses**: `finishClose` lapse loop
**Requirement**: AD-035

**Done when**:
- [ ] `sessionProposalIds` returns ids from `propose-building-block` **and** model-change tracks
- [ ] `session-summary.test.ts` covers a mixed stream; `session-close` test: a `PROPOSED` relation proposal is `LAPSED` by `finishClose`
- [ ] Gate `pnpm check` green

**Tests**: unit · **Gate**: full

---

### T8a: `domain-model-capture` board decider — AD-038 idempotency

**What**: an already-satisfied relation / pivotal / `resolve` effect returns `ok([])`; `applyOperation` returns `ok` + current position for an empty decision.
**Where**: `src/domain-model-capture/domain/board/decide.ts` (+ `decide.test.ts`), `src/domain-model-capture/infrastructure/apply-operation.ts` (+ `.test.ts`)
**Depends on**: None · **Reuses**: the decider `switch`, the `fast-check` replay property
**Requirement**: FREL-07, FPIV-04, AD-038

**Done when**:
- [ ] `decide(sequence | link-cause)` on an existing edge → `ok([])`; `decide(mark-pivotal | unmark-pivotal)` on a no-op → `ok([])`; `decide(resolve)` on an already-resolved hot spot → `ok([])`
- [ ] `insert-between` / `unsequence` / `unlink-cause` / `unplace` on a missing edge → unchanged `missing-edge` failure
- [ ] `applyOperation` empty decision → `ok({ resultingBuildingBlockId, nextPosition: current })`, no append
- [ ] `decide.test.ts` covers each; the replay `fast-check` property still green
- [ ] Gate `pnpm check` green

**Tests**: unit · **Gate**: full

---

### T9: `review-proposal` accept — model-change branch + closed-session guard

**Where**: `src/session-facilitation/capabilities/review-proposal/accept.ts` (+ `accept.test.ts`)
**Depends on**: T5, T6, T8a · **Reuses**: `recordApplyOutcome`, `applyOperation` (AD-016), `Operation.parse`
**Requirement**: FREL-02, FREL-05, FREL-06, FREL-07, FPIV-03, FPIV-04, FREW-02

**Done when**:
- [ ] closed-session guard (`replaySession(session).closed` → 409 `session-closed`, Proposal re-lapsable) — on both birth branches
- [ ] model-change branch builds the `Operation` from the birth event + last `Model Change Edited.changed`, field-to-field, no id minting
- [ ] `accept.test.ts`: accept `sequence` → `follows` edge; accept `link-cause` → `causedBy`; accept `mark-pivotal` → `pivotal:true`; accept `reword` → label changed; **reject** → model unchanged + `REJECTED`; **planted cycle** → `APPLY_FAILED` + surfaced; **`insert-between` no edge** → `APPLY_FAILED`; **already-satisfied** (re-accept after apply / second track same pair) → `APPLIED`, one edge; **crash-window shape** (apply, drop the outcome commit, re-accept) → `APPLIED`; **accept on closed session** → 409
- [ ] Gate `pnpm check && pnpm build && pnpm test:e2e` green

**Tests**: integration · **Gate**: build

---

### T10: `proposalCard` / proposals-view — intent card

**Where**: `src/session-facilitation/domain/read-models/proposals-view.ts`, `src/session-facilitation/capabilities/review-proposal/http.ts` (+ `.test.ts`)
**Depends on**: T5 · **Reuses**: `proposalCard`, the capability's board-snapshot read
**Requirement**: FREL-02, FPIV-03

**Done when**:
- [ ] card DTO `+ intent?: { kind; summary; endpoints?: {id,label}[]; target?: {id,label}; newLabel? }`
- [ ] `proposals-view.test.ts` covers each intent kind + a withdrawn endpoint (label → id fallback)
- [ ] `http.test.ts`: `GET /sessions/:id/proposals` returns the intent card
- [ ] Gate `pnpm check` green

**Tests**: integration · **Gate**: full

---

### T11: `sessionView` — held-track notices

**Where**: `src/session-facilitation/domain/read-models/session-view.ts` (+ `session-view.test.ts`)
**Depends on**: T2 · **Reuses**: the existing `notice` turn kind
**Requirement**: FREW-01, FPIV-02

**Done when**:
- [ ] a `heldBack` reword track → `notice` turn "Reword of \"<label>\" held until the model has structure"
- [ ] a `heldBack` pivotal track → `notice` turn "Pivotal mark for \"<label>\" held — not enough events yet"
- [ ] a released track → no notice; `session-view.test.ts` covers all three
- [ ] Gate `pnpm check` green

**Tests**: unit · **Gate**: full

---

### T12: `review-proposal` edit endpoint for a model-change proposal

**Where**: `src/session-facilitation/capabilities/review-proposal/http.ts` + edit handler (+ `http.test.ts`)
**Depends on**: T5, T10 · **Reuses**: the existing block-proposal edit route
**Requirement**: FREL-02

**Done when**:
- [ ] edit resolves a new endpoint label → `Model Change Edited { changed }`; unknown label → 422; the kind is immutable (no field to change it)
- [ ] `http.test.ts`: happy + unknown-label 422 + edit-then-accept applies the edited intent
- [ ] Gate `pnpm check` green

**Tests**: integration · **Gate**: full

---

### T13: `readSessionTranscript` + `SessionTranscript` versioned contract

**What**: the SF read model behind F19, with its own Zod contract; DAG's renderer does zero derivation over it.
**Where**: `src/session-facilitation/domain/read-models/session-transcript.ts`, `.../session-transcript-contract.ts` (Zod), `src/session-facilitation/infrastructure/read-session-transcript.ts`, `src/session-facilitation/api.ts` (+ tests)
**Depends on**: T8, T10 · **Reuses**: `sessionView` transcript fold, `proposalCard` disposition logic, `sessionProposalIds`
**Requirement**: TX-01, TX-02, TX-04, TX-06

**Done when**:
- [ ] `readSessionTranscript(deps, workshopId, sessionId): Result<SessionTranscript, {kind:'workshop-not-found'|'session-not-found'}>` with the design §11 shape
- [ ] `SessionTranscript` Zod schema + a contract test asserting the shape
- [ ] turns verbatim in order; each contribution turn lists its proposals with `disposition` + `resultingBuildingBlockId`; `contributorCounts` speaker-asc; a `heldBack` track → `notice` turn, no count
- [ ] `session-transcript.test.ts` (2 speakers, mixed dispositions incl. `lapsed`/`apply-failed`) + `read-session-transcript.test.ts` (both 404 kinds)
- [ ] `api.ts` exports `readSessionTranscript` + `SessionTranscript`; `depcruise` green
- [ ] Gate `pnpm check` green

**Tests**: unit + contract + integration · **Gate**: full

---

### T14: Extract graph helpers to `derived-artifact-generation/domain/graph.ts`

**Where**: `src/derived-artifact-generation/domain/graph.ts` (new), `render-readable-account.ts` (modify), `graph.test.ts` (new)
**Depends on**: None · **Reuses**: the functions verbatim — pure move
**Requirement**: SUM-03 (enabler)

**Done when**:
- [ ] `undirectedNeighbours` / `connectedComponents` / `longestPathRanks` / `byId` moved; readable-account re-imports; no behaviour change
- [ ] `render-readable-account.test.ts` byte-identical before/after (run, diff, confirm)
- [ ] `graph.test.ts` covers each helper (chain, branch, disconnected, ranks)
- [ ] Gate `pnpm check` green (test count = old + new)

**Tests**: unit · **Gate**: full

---

### T15: `ModelJson` schema + `ArtifactSource` type re-exports

**Where**: `src/derived-artifact-generation/domain/model-json.ts` (+ `.test.ts`), `src/session-facilitation/api.ts` (add `export type { ArtifactSource, StakeholderCheck, ChosenProblem }`)
**Depends on**: None · **Reuses**: the `artifact-source.ts` types (through the new `api.ts` re-export — never a deep import)
**Requirement**: JSON-03, AD-037

**Done when**:
- [ ] `session-facilitation/api.ts` re-exports the three types; `depcruise` green
- [ ] `ModelJson` per design Data Models (`format:'eventstormer.model'`, `formatVersion:1`, `renderedAt`, `boardPosition`, `sessionRecordPosition`, `workshop{…}`, `buildingBlocks[]`, `follows[]`, `causedBy[]`); no contribution-body / rationale / evidence-span field
- [ ] `.test.ts`: a full document parses; foreign JSON → `err`; `formatVersion:2` → `err`; over the block/edge cap → `err`
- [ ] Gate `pnpm check` green

**Tests**: unit · **Gate**: full

---

### T16: `serialise` — deterministic snapshot → `ModelJson`

**Where**: `src/derived-artifact-generation/domain/serialise.ts` (+ `serialise.test.ts`)
**Depends on**: T15 · **Reuses**: `BoardSnapshot` type, `ArtifactSource`
**Requirement**: JSON-01, JSON-02, JSON-04, JSON-07

**Done when**:
- [ ] `serialise({ snapshot, source, boardPosition, sessionRecordPosition, renderedAt }): ModelJson` — fixed key order; `buildingBlocks` by id, `follows` by `(predecessor,successor)`, `causedBy` by `(cause,effect)`; `boardPosition` normalised `-1 → 0`; no external-toolchain string anywhere
- [ ] `serialise.test.ts`: golden (rich); **determinism** — serialise a snapshot and a shuffled copy, assert `JSON.stringify` byte-equal; assert no contribution-body substring; empty board → `boardPosition:0`
- [ ] Gate `pnpm check` green

**Tests**: unit · **Gate**: full

---

### T17: `deserialise` + round-trip property

**Where**: `src/derived-artifact-generation/domain/deserialise.ts` (+ `deserialise.test.ts`)
**Depends on**: T16 · **Reuses**: `ModelJson.parse`, `fast-check`
**Requirement**: JSON-03

**Done when**:
- [ ] `deserialise(json): Result<{ snapshot; source }, {kind:'invalid-model-json', issues}>`
- [ ] `deserialise.test.ts`: `fast-check` property `deserialise(serialise({...})).value` deep-equals `{snapshot, source}` over generated snapshots (blocks, both edge kinds, hot spots w/ annotation+resolved+reference, pivotal, placement, provenance, workshop-record fields); malformed / oversized → `err`
- [ ] Gate `pnpm check` green

**Tests**: unit (property) · **Gate**: full

---

### T18: `model-export` capability + route mount

**Where**: `src/derived-artifact-generation/capabilities/model-export/{http,deps}.ts`, `.../api.ts`, `src/host/routes.ts` (+ `http.test.ts`)
**Depends on**: T16, T17 · **Reuses**: the copied 404 shape (not imported from a sibling slice), `Clock`
**Requirement**: JSON-01, JSON-05, JSON-06, JSON-07

**Done when**:
- [ ] `GET /workshops/:id/artifacts/model` returns the `ModelJson` (composite stamp embedded) on a known workshop; unknown → 404 `workshop-not-found`, nothing written; a render-throw → 500, no partial body
- [ ] `http.test.ts`: happy + 404 + 500 + "two calls byte-identical bar `renderedAt` (fixed clock)" + "no summary/transcript produced"; reads stay synchronous (no `await` between the two reads)
- [ ] `api.ts` exports `modelExportRoutes` + deps; `host/routes.ts` mounts it; `depcruise` green
- [ ] Gate `pnpm check && pnpm build && pnpm test:e2e` green

**Tests**: integration · **Gate**: build

---

### T19: `render-summary` — deterministic model outline

**Where**: `src/derived-artifact-generation/domain/render-summary.ts` (+ `render-summary.test.ts`)
**Depends on**: T14 · **Reuses**: `graph.ts`, `list-references`, `kindWord`, `ArtifactSource`
**Requirement**: SUM-01..SUM-05, SUM-07, SUM-08, SUM-09

**Done when**:
- [ ] sections per design §13; every section renders an explicit empty / "not run" line on an empty model
- [ ] spine + branch-point list ordered `(rank, id)` — a total order
- [ ] no external-toolchain claim string
- [ ] `render-summary.test.ts`: golden (rich) + golden (empty) + determinism (two renders byte-equal bar the stamp) + **shuffled-snapshot determinism** + "no contribution-body substring" + spine-order assertion
- [ ] Gate `pnpm check` green

**Tests**: unit · **Gate**: full

---

### T20: `summary` capability + route mount

**Where**: `.../capabilities/summary/{http,deps}.ts`, `.../api.ts`, `src/host/routes.ts` (+ `http.test.ts`)
**Depends on**: T19 · **Reuses**: the copied 404 shape, `Clock`
**Requirement**: SUM-01, SUM-06

**Done when**:
- [ ] `GET /workshops/:id/artifacts/summary` returns `{ markdown, boardPosition, sessionRecordPosition }`; 404 on unknown; render-throw → 500; requesting it produces no other artifact
- [ ] `http.test.ts`: happy + 404 + 500 + determinism (fixed clock) + no-side-effect
- [ ] `api.ts` + `host/routes.ts` wired; `depcruise` green
- [ ] Gate `pnpm check && pnpm build && pnpm test:e2e` green

**Tests**: integration · **Gate**: build

---

### T21: `render-transcript` — verbatim annotated transcript (pure formatting)

**Where**: `src/derived-artifact-generation/domain/render-transcript.ts` (+ `render-transcript.test.ts`)
**Depends on**: T13 · **Reuses**: `quoteLine`
**Requirement**: TX-01, TX-02, TX-03, TX-04, TX-05, TX-07

**Done when**:
- [ ] header (format, scope, session-record position, `renderedAt`); every turn verbatim in order with proposal / disposition / resulting-block annotation; a **Contributions** table (speaker asc) + the "counts only, no judgement" line
- [ ] **zero derivation** — the function only formats `SessionTranscript` (asserted: no disposition/count computation in the module)
- [ ] `render-transcript.test.ts`: golden + determinism (bar the stamp) + shuffled-input determinism + `lapsed`/`apply-failed` cases + held-track notice appears, excluded from counts
- [ ] Gate `pnpm check` green

**Tests**: unit · **Gate**: full

---

### T22: `session-transcript` capability + route mount

**Where**: `.../capabilities/session-transcript/{http,deps}.ts`, `.../api.ts`, `src/host/routes.ts` (+ `http.test.ts`)
**Depends on**: T21 · **Reuses**: `readSessionTranscript` (SF api), `readArtifactSource`, `Clock`
**Requirement**: TX-01, TX-05, TX-06, TX-07

**Done when**:
- [ ] `GET /workshops/:id/sessions/:sessionId/artifacts/transcript` returns `{ position, markdown }`; unknown workshop → 404 `workshop-not-found`; unknown session → 404 `session-not-found`; render-throw → 500
- [ ] `http.test.ts`: happy + both 404s + 500 + determinism + no-side-effect
- [ ] `api.ts` + `host/routes.ts` wired; `depcruise` green
- [ ] Gate `pnpm check && pnpm build && pnpm test:e2e` green

**Tests**: integration · **Gate**: build

---

### T23: Shape the artifacts panel brief

**Where**: `.impeccable/surfaces/src-app-artifacts.md` (new)
**Depends on**: None · **Reuses**: `.impeccable/surfaces/src-app-capture-loop.md`, `DESIGN.md` §5–6
**Requirement**: "viewable = live panel" (spec assumption)

**Tools**: Skill: `impeccable` (`/impeccable shape src-app-artifacts`)

**Done when**:
- [ ] brief committed: entry point on the capture screen, the three artifacts, live re-render on applied operation, a stamped download action, empty/loading/catching-up/error states, keyboard + focus order per DESIGN.md §8
- [ ] Gate `pnpm check` green (docs-only)

**Tests**: none · **Gate**: full

---

### T24a: App artifact transport + store

**Where**: `src/app/capture-loop/` (transport module + store per T23) (+ `*.integration.test.ts`), `docs/testing.md` (M-row)
**Depends on**: T18, T20, T22, T23 · **Reuses**: the existing transport + store patterns
**Requirement**: F10/F19 "viewable in the app"

**Tools**: Skill: `impeccable` (build per brief)

**Done when**:
- [ ] transport calls the three routes; store holds the selected artifact + re-fetches on an applied-operation signal (same trigger as the readable account)
- [ ] `*.integration.test.ts` drives the store↔transport seam: select → fetch → applied-op → re-fetch → error path
- [ ] `docs/testing.md` gains an M-row for the re-fetch orchestration branch
- [ ] Gate `pnpm check && pnpm build` green

**Tests**: integration · **Gate**: build

---

### T24b: App artifact live panel component

**Where**: `src/app/capture-loop/` (component + dock wiring per T23) (+ `*.test.ts`)
**Depends on**: T24a · **Reuses**: `reka-ui` primitives, the dock component patterns
**Requirement**: F10/F19 "viewable in the app and downloadable"

**Tools**: Skill: `impeccable` (build per brief)

**Done when**:
- [ ] panel lists the artifacts; selecting one shows the current bytes and re-renders on model change; a download action produces the stamped file; catching-up + error states per brief
- [ ] component tests: renders returned bytes; download action present; error state on a 404; focus order; reduced-motion
- [ ] Gate `pnpm check && pnpm build` green

**Tests**: unit (component) · **Gate**: build

---

### T25: Full-pipe scripted-facilitator e2e

**What**: one contribution → a scripted `propose-relation` turn → seam → accept → board edge; then fetch the model artifact and assert a known id + the stamp.
**Where**: `e2e/artifacts-and-relations.spec.ts` (new) or extend `e2e/capture-loop.spec.ts`
**Depends on**: T24b · **Reuses**: `FACILITATOR_MODE=scripted`, the macro-stage fixture
**Requirement**: FREL-01/FREL-02 (real-path proof), JSON-01

**Tools**: Skill: `playwright-cli` (local verification)

**Done when**:
- [ ] the scripted facilitator emits a `propose-relation` strand; the person accepts; the board shows the `follows` edge; the artifact panel's model export contains that edge's endpoint ids + the composite stamp
- [ ] existing e2e specs unaffected
- [ ] Gate `pnpm check && pnpm build && pnpm test:e2e` green

**Tests**: e2e · **Gate**: build

---

### T26: Live structured-output smoke check of the assembled turn schema

**Where**: `scripts/smoke-facilitation-schema.ts` + a `package.json` script; result noted in `research/research-aisdk.md` ("SLICE 5" section)
**Depends on**: T1 · **Reuses**: `scripts/spike-structured-output.ts` setup
**Requirement**: FREL-04

**Done when**:
- [ ] script builds `Output.object({ interpretation, nextMove })` with the new members, makes one real call, prints PASS / the 400 body
- [ ] `research/research-aisdk.md` records the run + date + outcome
- [ ] if it fails: STOP, reshape the schema, re-run (bounded)
- [ ] Gate `pnpm check` green (script outside `src/`; `tsconfig` `include` already covers `scripts/**`)

**Tests**: none (manual/live) · **Gate**: full

---

### T27: Changeset, issue reconciliation, docs, handoff

**Where**: `.changeset/slice-5-artifacts-facilitator-tracks.md`, `README.md` (ADR-008 list), `ARCHITECTURE.md` (§5), `.specs/STATE.md` (Handoff), GitHub (issues)
**Depends on**: T25, T26 · **Reuses**: `.changeset/slice-4-hot-spots-close.md` as the template
**Requirement**: REL-01, REL-02, REL-03

**Done when**:
- [ ] `.changeset/*.md` = `minor` (→ 0.6.0), body names F10 (rest) / F19 + the F04/F07 facilitator tracks, links #42, notes AD-035/036/037/038
- [ ] issue #42 retitled + re-scoped; new issue filed (child of #9, blocked by #42, blocks #43) for F11 eval + `pnpm seed` + demo recording; #43 blocked-by updated
- [ ] `README.md` ADR-008 "deliberately untested" list gains the precise line from design §17
- [ ] `ARCHITECTURE.md` §5 `/api` list gains `GET /workshops/:id/artifacts/model | /artifacts/summary` and `/sessions/:sessionId/artifacts/transcript`
- [ ] `.specs/STATE.md` Handoff updated (feature, phase, branch, next step)
- [ ] `package.json` `version` untouched (ADR-009)
- [ ] Gate `pnpm check && pnpm build && pnpm test:e2e` green

**Tests**: none · **Gate**: build

---

## Phase Execution Map

```
Phase 1: T1 → T1a → T1b → T2 → T3 → T3a → T4
Phase 2: T5 → T6 → T7 → T8 → T8a
Phase 3: T9 → T10 → T11 → T12
Phase 4: T13
Phase 5: T14 → T15 → T16 → T17 → T18
Phase 6: T19 → T20 → T21 → T22
Phase 7: T23 → T24a → T24b → T25 → T26 → T27
```

32 tasks. Packs into **~5 batches** (P1 · P2+P3 · P4+P5 · P6 · P7, or similar) → sub-agent
delegation offered at Execute. A fresh Verifier runs automatically after T27.

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1 / T1a / T1b | schema members / prompt menu / turn topology — 1 concern each | ✅ |
| T2 / T3 / T3a | stored strands / events+Intent / domain predicates | ✅ |
| T4 | seam fn + its one caller (cohesive — the signature change forces both) | ✅ |
| T5 | 1 aggregate's model+decide+evolve (one concept, mirrors slice-4 T15) | ✅ |
| T6 / T7 / T8 / T8a | replay / derivation / read-model+sweep / board decider | ✅ |
| T9 | 1 handler branch + the guard (cohesive) | ✅ |
| T10 / T11 / T12 | intent card / held notices / edit endpoint | ✅ |
| T13 | 1 read model + its contract + infra + api export (one deliverable) | ✅ |
| T14–T22 | 1 move / 1 schema / 1 fn / 1 fn / 1 route each | ✅ |
| T23 | 1 brief | ✅ |
| T24a / T24b | transport+store / component+wiring — split per slice-4 T48/T49 | ✅ |
| T25 / T26 | 1 e2e / 1 script | ✅ |
| T27 | release close-out (conventional last task) | ⚠️ OK |

---

## Diagram-Definition Cross-Check

| Task | Depends On (body) | Diagram | Status |
| --- | --- | --- | --- |
| T1 | None | P1 head | ✅ |
| T1a | T1 | T1→T1a | ✅ |
| T1b | T1a | T1a→T1b | ✅ |
| T2 | T1 | (within P1, after T1b in order; dep is T1) | ✅ |
| T3 | T2 | T2→T3 | ✅ |
| T3a | None | (within P1; independent, runs in order) | ✅ |
| T4 | T2, T3, T3a | T3a→T4 chain | ✅ |
| T5 | T3 | P2 head, backward to P1 | ✅ |
| T6 | T5 | T5→T6 | ✅ |
| T7 | T5 | T6→T7 order; dep T5 | ✅ |
| T8 | T3 | backward to P1 | ✅ |
| T8a | None | P2 tail; independent | ✅ |
| T9 | T5, T6, T8a | P3 head, backward to P2 | ✅ |
| T10 | T5 | backward | ✅ |
| T11 | T2 | backward to P1 | ✅ |
| T12 | T5, T10 | T10→T12 | ✅ |
| T13 | T8, T10 | P4 head, backward to P2/P3 | ✅ |
| T14 | None | P5 head | ✅ |
| T15 | None | within P5, in order | ✅ |
| T16 | T15 | T15→T16 | ✅ |
| T17 | T16 | T16→T17 | ✅ |
| T18 | T16, T17 | T17→T18 | ✅ |
| T19 | T14 | P6 head, backward to P5 | ✅ |
| T20 | T19 | T19→T20 | ✅ |
| T21 | T13 | backward to P4 | ✅ |
| T22 | T21 | T21→T22 | ✅ |
| T23 | None | P7 head | ✅ |
| T24a | T18, T20, T22, T23 | backward | ✅ |
| T24b | T24a | T24a→T24b | ✅ |
| T25 | T24b | T24b→T25 | ✅ |
| T26 | T1 | backward (far) — noted | ✅ |
| T27 | T25, T26 | T25→T26→T27 | ✅ |

All dependencies point backward or within-phase. No forward deps.

---

## Test Co-location Validation

| Task | Layer | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 / T2 / T3 | Zod schema (domain/infra) | unit | unit | ✅ |
| T1a / T1b | facilitator prompt | unit | unit | ✅ |
| T3a | domain predicate | unit | unit | ✅ |
| T4 | domain seam + interpret caller | unit + integration | unit + integration | ✅ |
| T5 / T6 / T7 | domain decider / replay / derivation | unit (+ property T6) | unit | ✅ |
| T8 | domain read model + infra | unit | unit | ✅ |
| T8a | domain decider (`domain-model-capture`) | unit | unit | ✅ |
| T9 | capability handler | integration | integration | ✅ |
| T10 | read model + capability | integration | integration | ✅ |
| T11 | domain read model | unit | unit | ✅ |
| T12 | capability route | integration | integration | ✅ |
| T13 | domain read model + contract + infra + api | unit + contract + integration | unit + contract + integration | ✅ |
| T14 / T16 / T17 / T19 / T21 | domain pure fn | unit | unit | ✅ |
| T15 | Zod schema + api re-export | unit | unit | ✅ |
| T18 / T20 / T22 | capability route + mount | integration | integration | ✅ |
| T23 | docs (brief) | none | none | ✅ |
| T24a | app transport/store seam | integration | integration | ✅ |
| T24b | app component | unit (component) | unit | ✅ |
| T25 | e2e | e2e | e2e | ✅ |
| T26 | script (live smoke) | none (manual) | none | ✅ |
| T27 | changeset / docs / issues | none | none | ✅ |

No violations. No "tested in a later task" deferral.

---

## Requirement-ID → Task Coverage

| ID | Tasks | ID | Tasks |
| --- | --- | --- | --- |
| JSON-01 | T16, T18, T25 | TX-05 | T21, T22 |
| JSON-02 | T16 | TX-06 | T13, T22 |
| JSON-03 | T15, T17 | TX-07 | T21, T22 |
| JSON-04 | T16 | FREL-01 | T1, T2, T4, T25 |
| JSON-05 | T18 | FREL-02 | T3, T5, T9, T10, T12 |
| JSON-06 | T18 | FREL-03 | T4 |
| JSON-07 | T16, T18 | FREL-04 | T1, T26 |
| SUM-01 | T19, T20 | FREL-05 | T9 |
| SUM-02 | T19 | FREL-06 | T9 |
| SUM-03 | T14, T19 | FREL-07 | T8a, T9 |
| SUM-04 | T19 | FREL-08 | T1a, T1b |
| SUM-05 | T19 | FPIV-01 | T1, T2, T4 |
| SUM-06 | T20 | FPIV-02 | T4, T11 |
| SUM-07 | T19 | FPIV-03 | T3, T7, T9, T10 |
| SUM-08 | T16, T19 | FPIV-04 | T8a, T9 |
| SUM-09 | T19 | FREW-01 | T2, T4, T7, T11 |
| TX-01 | T13, T21, T22 | FREW-02 | T5, T9 |
| TX-02 | T13, T21 | FREW-03 | T4 |
| TX-03 | T21, T22 | FREW-04 | T7 |
| TX-04 | T13, T21 | FREW-05 | T3a, T4 |
| | | FREW-06 | T4, T7 |
| REL-01 | T27 | REL-02 | T27 |
| REL-03 | T27 | | |

Every requirement ID maps to ≥ 1 task. No task lacks a requirement (T14 is a SUM-03 enabler;
T23/T26 trace to spec assumptions / FREL-04).

---

## Open Items for Execute

- **Tools per task** — `impeccable` T23/T24a/T24b; `playwright-cli` T25; `context7` available
  broadly if an API detail is uncertain. No MCPs otherwise. (Confirmed 2026-09-05.)
- **Branch**: create `slice-5-artifacts-facilitator-tracks` off `main` before T1.
- **FREL-04's live-smoke half (T26) is out of CI (AD-027)** — the Verifier handoff must flag it
  as gated by a manual step, not the discrimination sensor.
- **SSH signing** has a confirm-prompt timeout — retry 2–3× (slice-4 handoff note).
