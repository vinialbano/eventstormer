# Slice 3 — Relations + the Board · Tasks

## Execution Protocol (MANDATORY — do not skip)

Implement these tasks with the `spec-driven-development` skill (plugin-qualified:
`anoria-engineering:spec-driven-development`): **activate it by name and follow its Execute flow
and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of
truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier,
discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Spec**: `.specs/features/slice-3-relations-board/spec.md` (S3-01…S3-32)
**Design**: `.specs/features/slice-3-relations-board/design.md`
**Context**: `.specs/features/slice-3-relations-board/context.md`
**Decisions**: `.specs/STATE.md` AD-005, AD-006, AD-008, AD-009, AD-022, AD-024, AD-026,
AD-028, AD-029, AD-030, **AD-031**
**Status**: In Progress — T1 complete

Every task obeys the Execution Contract: tests derive from the spec's ACs (never mirror the
implementation); the gate passes before a task is done; one atomic commit per task; never weaken
or delete a test. A fresh Verifier runs after the final task.

Create branch `slice-3-relations-board` off `main` (or off merged Slice 2) before T1. Do not
edit `package.json` `version` (ADR-009); T22 adds a `minor` changeset only.

Do not cite `.specs/` process ids (`S3-…`, `AD-…`) in `src/**` or `e2e/**` comments, docstrings,
or test names. Keep the durable reasoning; drop the tag.

`FacilitationTurnSchema` is **untouched** this slice (AD-031).

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec — confirm before Execute. Guidelines
> found: `AGENTS.md`, `docs/testing.md`, `docs/adr/008-testing-eval-and-observability.md`,
> `vite.config.ts` (`coverage.thresholds` `src/**/domain/**` ≥ 90%, `autoUpdate` local-only),
> `src/domain-model-capture/domain/AGENTS.md`, `src/derived-artifact-generation/domain/AGENTS.md`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Domain deciders (`domain/board/decide`) | unit (node) | Given(ops)/When(op)/Then(ops\|rejection) **through the operation**; 1:1 to S3-01…S3-16, S3-23; cycle path pinned as **id literals**; kind-permission + already-related + missing-edge; withdraw actor with two causes → `withdraw` + two `unlink-cause`; event withdraw with follows → `[withdraw]` only, neighbours not rejoined | `src/domain-model-capture/domain/board/*.test.ts` | `pnpm test` |
| Domain folds (`evolve` / `project` / `replay`) | unit (node) | projected values **pinned to literals** (`docs/testing.md`); sequence sets both events `placement: 'timeline'` with **no** extra `place` in the log; unplace → backlog; reinstate naked; incremental `replay(log ++ [op]) === project(replay(log), op)` over the new kinds | `src/domain-model-capture/domain/board/*.test.ts` | `pnpm test` |
| `computeTimelineLayout` | unit (node) | two tracks; a branch (one event, two distinct successors); orphan placed event; actor in `attachments` never `eventIds`; withdrawn omitted unless `includeWithdrawn`; **no pixel field**; no Vue/DOM | `src/domain-model-capture/domain/timeline/*.test.ts` | `pnpm test` |
| Property tests (ADR-008) | unit (node, `fast-check`) | no accepted op sequence yields a `follows` cycle (Kahn on snapshot); no op targeting a forbidden kind is accepted; replay/evolve incremental over new kinds | `src/domain-model-capture/domain/board/*.test.ts` | `pnpm test` |
| `applyOperation` | unit + integration (node) | `sequence` / `insert-between` / `link-cause` do **not** throw; `resultingBuildingBlockId` mapping per design; actor-withdraw batch appends N+1 ops in one `append`; stale-position retry unchanged | `src/domain-model-capture/infrastructure/**/*.test.ts` | `pnpm test` |
| `edit-model` / `board-access` HTTP | integration (node) via Hono `testClient` | allow-list kinds 200; hot-spot kinds still 422; cycle 422 + `path`; GET `/board` still 404 on empty stream; published snapshot has `follows` / `causedBy` / `placement` / `pivotal` | `src/domain-model-capture/capabilities/**/*.test.ts` | `pnpm test` |
| DAG render + `listReferences` | unit (node) | follows-order walk pinned; coverage line no longer "not run"; relation sites id-stable across a label change; quotes byte-identical; building-blocks site still present | `src/derived-artifact-generation/domain/**/*.test.ts` | `pnpm test` |
| Vue SPA | unit (jsdom) + visual (`playwright-cli`) | `nodes-draggable` false; backlog vs timeline split; hide-withdrawn default; semantic drop/connect POSTs the right kind; `playwright-cli open` **zero** console errors on the new beats | `src/app/**/*.test.ts` | `pnpm test`; `playwright-cli` on UI tasks |
| E2E | e2e | **ONE** spec (ADR-008): extend `e2e/capture-loop.spec.ts` after reinstate — place/sequence two events, assert timeline + a `follows` reference site | `e2e/*.spec.ts` | `pnpm test:e2e` |
| depcruise | static gate | plant: `src/app/` ↛ `domain/board/decide.ts`; app → `domain/timeline/**` allowed; `**/domain/**` still ↛ Vue | `.dependency-cruiser.cjs` | `pnpm depcruise` |
| Frozen `v:1` op schema | none (build gate) | **do not** change operation shapes; only `decide`/`evolve`/`project` behaviour | — | `pnpm check` |

## Gate Check Commands

> Generated from `package.json` + `AGENTS.md` + lefthook — confirm before Execute.
> Hono `testClient` integration tests live in Vitest (`pnpm test`), not Playwright. **Full** is
> the Playwright spec only.

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | after a task whose tests are Vitest (unit **or** Hono integration) | `pnpm test` |
| Full | after a task that extends the Playwright spec | `pnpm test && pnpm test:e2e` |
| Build | phase completion; `package.json`; `.dependency-cruiser.cjs`; Vue Flow install | `pnpm check && pnpm build` |

`pnpm check` = `process-ids → typecheck → lint → test → depcruise → knip`, fail-fast. Record the
`pnpm test` count in each commit message so silent deletions are visible.

---

## Execution Plan

Phases run sequentially. Tasks within a phase run in order. At Execute the orchestrator packs
consecutive whole phases into ~7-task batches and offers batch sub-agents.

### Phase 1 — Write model + snapshot folds
```
T1 → T2 → T3
```
### Phase 2 — `decide` remaining kinds
```
T4 → T5 → T6 → T7 → T8 → T9
```
### Phase 3 — Layout leaf, sole writer, HTTP
```
T10 → T11 → T12 → T13
```
### Phase 4 — Readable account + references
```
T14 → T15
```
### Phase 5 — Capture-loop wall
```
T16 → T17 → T18 → T19 → T20
```
### Phase 6 — E2E + release
```
T21 → T22
```

### Phase Execution Map
```
P1 → P2 → P3 → P4 → P5 → P6

P1: T1 → T2 → T3
P2: T4 → T5 → T6 → T7 → T8 → T9
P3: T10 → T11 → T12 → T13
P4: T14 → T15
P5: T16 → T17 → T18 → T19 → T20
P6: T21 → T22
```

**Batch plan (proposed at Execute):** **B1** P1+P2 (9) · **B2** P3+P4 (6) · **B3** P5+P6 (7).
22 tasks > ~8 → sub-agent offer is mandatory before any T1.

---

## Task Breakdown

### T1: Write-model struct + snapshot topology fields

**What**: Change `BoardWriteModel` from `Map` to `{ blocks, follows, causedBy }` (all Maps/Sets
empty at start). Widen `SnapshotBlock.placement` to `'backlog' | 'timeline'`, add `pivotal:
boolean` (default false), add `follows` / `causedBy` arrays on `BoardSnapshot`. Update every
`.get` / `.size` / `new Map(writeModel)` caller so the existing suite compiles and passes.
**Where**: `src/domain-model-capture/domain/board/{model.ts,evolve.ts,project.ts,*.test.ts}`
**Depends on**: None
**Reuses**: existing empty factories; do **not** yet fold sequence/place in `decide`
**Requirement**: S3-06 (unplaced events stay `backlog`); AD-005
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [x] `emptyWriteModel()` has empty `blocks`, `follows`, `causedBy`; two calls are not the same object
- [x] `emptySnapshot()` has `follows: []`, `causedBy: []`; every capture still `placement: 'backlog'`, `pivotal: false`
- [x] existing capture/reword/withdraw/reinstate tests pass without treating the write model as a Map
- [x] Gate check passes: `pnpm test`
**Tests**: unit · **Gate**: quick
**Commit**: `refactor(board): slim write model carries follows and causedBy adjacency`

---

### T2: `evolve` — adjacency + withdraw drops incident edges

**What**: Fold `sequence` / `unsequence` / `insert-between` / `link-cause` / `unlink-cause` onto
the write model. `withdraw` sets withdrawn **and removes every follows/causedBy edge incident
to that id**. `reinstate` clears withdrawn only. `place` / `unplace` / `mark-pivotal` do not
touch the write model.
**Where**: `src/domain-model-capture/domain/board/evolve.ts`, `evolve.test.ts`
**Depends on**: T1
**Reuses**: clone-then-set pattern already in `evolve`
**Requirement**: S3-02, S3-04, S3-14, S3-15, S3-16
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [x] `sequence` A→B then A→C yields two successors of A (pinned literals)
- [x] `insert-between(A,C,B)` yields A→C and C→B and **not** A→B; a third successor of A remains
- [x] withdraw of an event with follows on both sides leaves **no** edge between the neighbours
- [x] withdraw of an actor that caused two events leaves those events with empty causes
- [x] Gate check passes: `pnpm test`
**Tests**: unit · **Gate**: quick
**Commit**: `feat(board): evolve follows and causedBy; withdraw severs incident edges`

---

### T3: `project` — placement, pivotal, published edges

**What**: Snapshot fold: `place` / `sequence` / `insert-between` set participating events
`placement: 'timeline'` (no extra `place` op). `unplace` sets backlog. `mark-pivotal` /
`unmark-pivotal` flip `pivotal`. Snapshot `follows` / `causedBy` match the write-model
adjacency after the same op (no withdrawn endpoints). `reinstate` → backlog, `pivotal: false`.
Extend the incremental-replay property POOL with the new kinds; pin at least one targeted
sequence snapshot as **literals** (not only replay≡project).
**Where**: `src/domain-model-capture/domain/board/{project.ts,project.test.ts,replay.test.ts}`
**Depends on**: T2
**Reuses**: existing `project` capture/reword/withdraw arms
**Requirement**: S3-01, S3-07, S3-16, S3-23, S3-28
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [x] log `[capture A, capture B, sequence A→B]` snapshot: both `placement: 'timeline'`; log does **not** contain `place`
- [x] `unplace A` after that → A `backlog`, no follows involving A
- [x] `mark-pivotal A` then `unmark-pivotal A` pins `pivotal` false→true→false with a **distinct** middle assertion
- [x] `replay(log ++ [op]) === project(replay(log), op)` still holds on the enlarged POOL
- [x] Gate check passes: `pnpm test`
**Tests**: unit · **Gate**: quick
**Commit**: `feat(board): project placement and pivotal from relation operations`

---

### T4: `decide` — place / unplace + kind-permission

**What**: Accept `place` / `unplace` for a non-withdrawn domain event. `unplace` returns
`[...unsequence for each incident follows edge, unplace]`. Actor/system/hot-spot/missing/
withdrawn → `kind-permission` / `unknown-target` / `withdrawn-target`. Duplicate `place` of
an already-timeline event is **accepted** (idempotent project). Remove `place`/`unplace` from
the not-implemented list. Add a `fast-check` (or exhaustive finite) property: no accepted op
assigns `follows` / pivotal / `place` to a non-event.
**Where**: `src/domain-model-capture/domain/board/{decide.ts,model.ts,decide.test.ts}`
**Depends on**: T3
**Reuses**: G/W/T harness; new `Rejection` variants from design
**Requirement**: S3-07, S3-08, S3-09, S3-28
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [x] `place` event → `ok([place])`; `place` actor → `kind-permission`
- [x] `unplace` of A with A→B and C→A → batch contains two `unsequence` then `unplace`; neighbours not sequenced to each other
- [x] kind-permission property (or exhaustive loop) green
- [x] Gate check passes: `pnpm test`
**Tests**: unit · **Gate**: quick
**Commit**: `feat(board): decide place and unplace; unplace severs follows`

---

### T5: `decide` — sequence / unsequence + cycle

**What**: Accept event→event `sequence` / `unsequence`. Duplicate edge → `already-related`.
Self-loop or successor already reaches predecessor → `cycle` with `path` as **ordered id
literals**. Adding A→B cycles iff B reaches A on current `follows`. `fast-check`: no
accepted sequence of ops leaves a snapshot with a `follows` cycle (Kahn).
**Where**: `src/domain-model-capture/domain/board/{decide.ts,decide.test.ts}` (+ property file
if the file would exceed cohesion)
**Depends on**: T4
**Reuses**: write-model `follows`
**Requirement**: S3-01, S3-02, S3-03, S3-05, S3-28
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [x] A→B then A→C both accepted; both successors retained
- [x] C→A after A→B→C rejected `{ kind: 'cycle', path }` matching a pinned id list; graph unchanged
- [x] duplicate A→B → `already-related`; unsequence of a missing pair → `missing-edge`
- [x] cycle property green
- [x] Gate check passes: `pnpm test`
**Tests**: unit · **Gate**: quick
**Commit**: `feat(board): decide sequence with whole-graph cycle rejection`

---

### T6: `decide` — insert-between

**What**: `insert-between(A,C,B)` requires existing A→B (`missing-edge` else). Cycle check as
if A→B removed and A→C, C→B added. One op in the returned array. Other successors of A
untouched (asserted via evolve/project, already T2/T3).
**Where**: `src/domain-model-capture/domain/board/{decide.ts,decide.test.ts}`
**Depends on**: T5
**Reuses**: cycle helper from T5
**Requirement**: S3-04, S3-05
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [x] A→B plus extra A→D, insert C between A and B → decide returns `[insert-between]`; snapshot has A→C, C→B, A→D, not A→B
- [x] insert when A→B absent → `missing-edge`; C that can reach A → `cycle`
- [x] Gate check passes: `pnpm test`
**Tests**: unit · **Gate**: quick
**Commit**: `feat(board): decide insert-between as one cycle-checked operation`

---

### T7: `decide` — link-cause / unlink-cause

**What**: `link-cause` only actor|system → event; duplicate → `already-related`; other
pairings → `kind-permission`. `unlink-cause` of a missing pair → `missing-edge`.
**Where**: `src/domain-model-capture/domain/board/{decide.ts,decide.test.ts}`
**Depends on**: T6
**Reuses**: endpoint existence helpers from T4
**Requirement**: S3-11, S3-12, S3-13
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [x] actor→event accepted; event→event, actor→actor, event→actor rejected `kind-permission`
- [x] duplicate link → `already-related`; unlink of unknown pair → `missing-edge`
- [x] withdrawn/missing endpoints rejected with existing kinds
- [x] Gate check passes: `pnpm test`
**Tests**: unit · **Gate**: quick
**Commit**: `feat(board): decide causedBy only from actor or system to event`

---

### T8: `decide` — mark-pivotal / unmark-pivotal

**What**: Event-only, not withdrawn. Exactly `[mark-pivotal]` / `[unmark-pivotal]`. Non-event
→ `kind-permission`. Marking already-pivotal still `ok` (like same-label reword).
**Where**: `src/domain-model-capture/domain/board/{decide.ts,decide.test.ts}`
**Depends on**: T7
**Reuses**: T4 target guards
**Requirement**: S3-23
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [x] mark/unmark event → one-op arrays; actor → `kind-permission`; withdrawn → `withdrawn-target`
- [x] remaining not-implemented list is only hot-spot kinds (`raise-hot-spot` `annotate`
      `unannotate` `resolve` `reopen`)
- [x] Gate check passes: `pnpm test`
**Tests**: unit · **Gate**: quick
**Commit**: `feat(board): decide mark-pivotal and unmark-pivotal on events only`

---

### T9: `decide` — withdraw cascade for actor/system

**What**: `decide(withdraw)` on an actor or system returns `[withdraw, ...unlink-cause per
referencing event]` (order: withdraw first). Event withdraw stays `[withdraw]` (edges already
dropped in evolve). Pin the two-event actor test from the #40 comment.
**Where**: `src/domain-model-capture/domain/board/{decide.ts,decide.test.ts}`
**Depends on**: T8
**Reuses**: T2 adjacency; AD-006 batch
**Requirement**: S3-14, S3-15
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [x] actor causing E1 and E2 → array length 3, kinds `withdraw`, `unlink-cause`, `unlink-cause`; both effect ids present
- [x] event with follows, no causes → `[withdraw]` only
- [x] Gate check passes: `pnpm test`
**Tests**: unit · **Gate**: quick
**Commit**: `feat(board): withdraw of a cause batch-unlinks referencing events`

---

### T10: `computeTimelineLayout` + depcruise

**What**: Pure `computeTimelineLayout(snapshot, { includeWithdrawn? })` in
`domain-model-capture/domain/timeline/`. No pixels. Tracks = connected components of placed
non-withdrawn events; ranks = longest-path; order within rank = id string sort. Attachments =
causedBy causes under each event. Plant: app ↛ `domain/board/decide.ts`; confirm app →
`domain/timeline/**` is allowed; domain still ↛ Vue.
**Where**: `src/domain-model-capture/domain/timeline/`, `.dependency-cruiser.cjs`
**Depends on**: T9
**Reuses**: snapshot shape from T3; ADR-006 contract
**Requirement**: S3-17, S3-18, S3-19
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [x] goldens: two tracks; one event with two **distinct** successors; orphan placed event; actor not in `eventIds`
- [x] withdrawn event omitted unless `includeWithdrawn: true`
- [x] planted `src/app` import of `decide.ts` fails depcruise; reverted
- [x] Gate check passes: `pnpm check && pnpm build`
**Tests**: unit · **Gate**: build
**Commit**: `feat(board): framework-free timeline ranks and follows edges`

---

### T11: `applyOperation` id mapping + batch append

**What**: Exhaustive `resultingBuildingBlockId`: `id` → `target` → `successor` → `inserted` →
`effect`. Never throw on a successful relation decide. Assert actor-withdraw results in one
`append` whose operation list length is 3 when two causes exist.
**Where**: `src/domain-model-capture/infrastructure/{apply-operation.ts,apply-operation.test.ts}`
**Depends on**: T10
**Reuses**: existing retry loop; accept path still uses capture `id`
**Requirement**: S3-14, S3-31
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [x] `applyOperation(sequence)` succeeds and does not throw (test that would 500 today)
- [x] `applyOperation(insert-between)` / `link-cause` succeed
- [x] actor-withdraw with two effects: store log gains 3 ops in one append
- [x] capture kinds still return `operation.id`
- [x] Gate check passes: `pnpm test`
**Tests**: unit + integration · **Gate**: quick
**Commit**: `fix(capture): applyOperation maps relation ops without throwing`

---

### T12: Publish `follows` / `causedBy` / placement / pivotal on GET `/board`

**What**: `readBoardSnapshot` and the HTTP DTO include topology + `placement` + `pivotal`. Empty
log helper still `{ position: -1, blocks: [], follows: [], causedBy: [] }`. GET still **404**
on an empty stream.
**Where**: `src/domain-model-capture/capabilities/board-access/{read-board-snapshot.ts,http.ts,*.test.ts}`,
`src/app/capture-loop/types.ts` (types only if the SPA would not compile — prefer T16 if
isolated; **this task updates the server DTO tests**; SPA types in T16)
**Depends on**: T11
**Reuses**: T3 snapshot
**Requirement**: S3-10, S3-20
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [x] GET board after sequence returns the follows pair and both `placement: 'timeline'`
- [x] empty-stream GET still 404; `readBoardSnapshot` empty log has empty follows/causedBy
- [x] Gate check passes: `pnpm test`
**Tests**: integration · **Gate**: quick
**Commit**: `feat(capture): board snapshot publishes relations and placement`

---

### T13: Widen `edit-model` allow-list

**What**: Accept the Slice-3 F06 kinds. Hot-spot kinds stay 422 `not-implemented-in-slice`.
Cycle → 422 `{ error: 'cycle', classification: 'systemic', path }`. Replace the existing
"sequence → 422" test with accept-sequence + reject-raise-hot-spot.
**Where**: `src/domain-model-capture/capabilities/edit-model/{http.ts,http.test.ts}`
**Depends on**: T12
**Reuses**: `F06_KINDS`, `testClient` pattern
**Requirement**: S3-05, S3-29
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [x] POST `sequence` 200 + position bump; GET board shows the edge
- [x] POST `raise-hot-spot` 422 `not-implemented-in-slice`
- [x] POST cycling sequence 422 `cycle` with `path`
- [x] Gate check passes: `pnpm check && pnpm build`
**Tests**: integration · **Gate**: build
**Commit**: `feat(capture): accept relation operations on the board POST`

---

### T14: Readable account walks `follows` order

**What**: `AccountInput` carries placement + follows. Template: placed events walked per
track in follows order; coverage line "Timeline and relations" is a real walk, not
"not run". Backlog remainder still listed. Quotes unchanged. Pin Markdown literals.
**Where**: `src/derived-artifact-generation/domain/{model.ts,render-readable-account.ts,*.test.ts}`,
`src/derived-artifact-generation/capabilities/readable-account/http.ts` (pass new snapshot fields)
**Depends on**: T13
**Reuses**: existing `renderReadableAccount`; DAG `toAccountBlocks`
**Requirement**: S3-27
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [x] two sequenced events appear in follows order in the Markdown (pinned string)
- [x] coverage does not contain `Timeline and relations: not run`
- [x] quoted evidence byte-identical when only a label in `blocks` changes
- [x] Gate check passes: `pnpm test`
**Tests**: unit · **Gate**: quick
**Commit**: `feat(artifacts): readable account walks placed events in follows order`

---

### T15: `listReferences` includes relation sites

**What**: Register `{ kind: 'follows', path: '${predId}>${succId}' }` on both endpoints and
`{ kind: 'caused-by', path: '${causeId}>${effectId}' }` on both, **in addition** to the
building-blocks site. Path is ids (set stable across reword). Substring AC: rewording `Order`
does not add/remove sites for `Order placed`.
**Where**: `src/derived-artifact-generation/domain/{render-readable-account.ts,list-references.ts,*.test.ts}`
**Depends on**: T14
**Reuses**: existing map lookup
**Requirement**: S3-26
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [x] sequenced A→B: A's references include a `follows` site and `readable-account`; B likewise
- [x] after changing A's label in the input, the site **set** (kind+path) is unchanged; displayed
      labels are not part of `path`
- [x] nested-label substring fixture from Slice 2 still passes
- [x] Gate check passes: `pnpm test`
**Tests**: unit · **Gate**: quick
**Commit**: `feat(artifacts): reference list names follows and causedBy endpoints`

---

### T16: App board types, mutations, `showWithdrawn`

**What**: Mirror the GET DTO on `BoardSnapshot` / `BoardBlock`. Widen `BoardEdit`. Add
`showWithdrawn` (default `false`) on the board store — client-only, not POSTed. Call
`computeTimelineLayout` from the store or a small composable when snapshot or the flag
changes.
**Where**: `src/app/capture-loop/{types.ts,stores/board.ts,dock/mutations.ts}`
**Depends on**: T15
**Reuses**: store load/refetch/404 pattern
**Requirement**: S3-20, S3-25
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [x] store test: default `showWithdrawn === false`; toggling does not call fetch
- [x] `postBoardOperation` type-checks `sequence` / `link-cause` bodies
- [x] layout is invoked with `includeWithdrawn` matching the flag
- [x] Gate check passes: `pnpm test`
**Tests**: unit · **Gate**: quick
**Commit**: `feat(app): board store carries relations and a hide-withdrawn filter`

---

### T17: Timeline pane (Vue Flow, drag off) + 1h reflow spike

**What**: Install `@vue-flow/core@1.48.2` and `@dagrejs/dagre@3.1.1` (no `@types/dagre`, no
default theme CSS unless it does not fight DESIGN.md). `TimelinePane.vue`: custom event
nodes (sticky look + attachment chips + pivotal bar), `nodes-draggable=false`, pan/zoom on,
dagre `rankdir: 'LR'` from `computeTimelineLayout` edges, fixed sticky width (`CELL`).
**Spike (~1h):** reword a long label on a placed event; if the whole board jumps, **switch
this task** to CSS-grid-by-rank (same domain layout) and do not ship Vue Flow. Backlog stays
`layoutBoard`. Remove unused `placed`/`arrows` from `layout.ts` or fill only from layout
output — do not compute topology there.
**Where**: `src/app/capture-loop/board/{TimelinePane.vue,use-dagre-layout.ts,layout.ts}`,
`package.json`, `docs/agents/framework-gotchas.md` (drop the two "not installed yet" lines
if Vue Flow ships)
**Depends on**: T16
**Reuses**: sticky CSS; `--color-pivotal`
**Requirement**: S3-17, S3-18, S3-21, S3-24
**Tools**: MCP: `plugin-context7-plugin-context7` (Vue Flow 1.48) · Skill: `impeccable`
**Done when**:
- [x] two sequenced events render left-to-right; a branch shows two successors
- [x] actor chips sit on the event node, not on the time axis
- [x] Vue Flow `nodes-draggable` is false (component test or DOM assertion)
- [x] spike outcome recorded in the commit message (Vue Flow kept **or** grid fallback)
- [x] `playwright-cli open` on a board with two placed events: **zero** console errors
- [x] Gate check passes: `pnpm check && pnpm build`
**Tests**: unit · **Gate**: build
**Commit**: `feat(app): render the timeline from domain ranks` (note fallback in body if used)

---

### T18: Semantic place / sequence / insert / link + keyboard

**What**: HTML5 drop: backlog → empty timeline = `place`; onto an event = `sequence` (event)
or `link-cause` (actor/system); onto a `follows` edge = `insert-between`. Vue Flow
`onConnect` between two events → POST `sequence` (prevent local edge). Keyboard: selected
event Place / Unplace; sequence-after last-selected placed event. Cycle 422 shown inline
with labels resolved from the snapshot. Selected-sticky **Mark pivotal** / **Unmark**.
**Where**: `src/app/capture-loop/board/{BoardWall.vue,TimelinePane.vue}`, tests
**Depends on**: T17
**Reuses**: `postBoardOperation`, `board-dirty`
**Requirement**: S3-22, S3-10, S3-23, S3-11
**Tools**: MCP: NONE · Skill: `impeccable` · `playwright-cli`
**Done when**:
- [x] jsdom: drop/connect helpers POST the pinned kinds (mock `postBoardOperation`)
- [x] pan/zoom does not call POST
- [x] `playwright-cli`: place one event from backlog onto the timeline; **zero** console errors
- [x] Gate check passes: `pnpm test`
**Tests**: unit · **Gate**: quick
**Commit**: `feat(app): semantic drag and connect append relation operations`

---

### T19: Hide-withdrawn toggle

**What**: Wall control toggles `showWithdrawn`. Default hidden. Revealed withdrawn stickies
use Slice 2 ghost treatment at last placement. Snapshot still contains them (reinstate).
**Where**: `src/app/capture-loop/board/BoardWall.vue`, `stores/board.ts` tests
**Depends on**: T18
**Reuses**: Slice 2 `data-withdrawn` ghosts
**Requirement**: S3-25
**Tools**: MCP: NONE · Skill: `impeccable`
**Done when**:
- [x] default: withdrawn event not in the timeline/backlog DOM
- [x] toggle on: ghost appears; reinstate still works
- [x] Gate check passes: `pnpm test`
**Tests**: unit · **Gate**: quick
**Commit**: `feat(app): hide withdrawn building blocks by default`

---

### T20: Capture-loop brief — timeline is this sitting

**What**: Patch `.impeccable/surfaces/src-app-capture-loop.md` §3–§7: timeline + arrows +
pivotal bars are real; drag is semantic; hide-withdrawn default; Place/Unplace/Sequence/Link
cause; keyboard pan/zoom. Do **not** rewrite `DESIGN.md`'s visual world. `--color-pivotal`
already reserved.
**Where**: `.impeccable/surfaces/src-app-capture-loop.md`
**Depends on**: T19
**Reuses**: Operate brief structure
**Requirement**: S3-30
**Tools**: MCP: NONE · Skill: `impeccable`
**Done when**:
- [x] brief no longer says the timeline is a slice-3 future; hide-withdrawn and semantic drop are documented
- [x] Gate check passes: `pnpm check && pnpm build`
**Tests**: none · **Gate**: build
**Commit**: `docs(app): capture-loop brief covers the timeline wall`

---

### T21: Extend the one E2E spec

**What**: After the existing reinstate beat: place/sequence two accepted events, assert they
leave the backlog and appear on the timeline, open the account, reword one through confirm,
assert a `follows` site / follows-order walk, quoted contribution unchanged.
**Where**: `e2e/capture-loop.spec.ts`
**Depends on**: T20
**Reuses**: scripted facilitator fixture; one spec only (ADR-008)
**Requirement**: S3-20, S3-26, S3-27
**Tools**: MCP: NONE · Skill: `playwright-cli`
**Done when**:
- [ ] `pnpm test:e2e` green
- [ ] still **one** spec file
- [ ] Gate check passes: `pnpm test && pnpm test:e2e`
**Tests**: e2e · **Gate**: full
**Commit**: `test(e2e): place and sequence events on the capture-loop wall`

---

### T22: `minor` changeset + #40 note if Design diverged

**What**: Add a `minor` changeset (target 0.4.0). Do not edit `package.json` `version`.
Comment on #40 that `sequence` of an unplaced event is **one op** (`project` sets
placement) — not extra `place` follow-ons — so the Specify cut comment stays accurate.
S3-32: #41/#42/#43 comments already match AD-031; only comment again if this sitting
diverged further.
**Where**: `.changeset/*.md`; GitHub #40
**Depends on**: T21
**Reuses**: ADR-009; existing parked comments
**Requirement**: S3-29, S3-32
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] `minor` changeset present; `package.json` version untouched
- [ ] #40 has the sequence-placement clarification
- [ ] Gate check passes: `pnpm check && pnpm build`
**Tests**: none · **Gate**: build
**Commit**: `chore(release): minor changeset for relations and the board`

---

## Phase Execution Map

```
P1 → P2 → P3 → P4 → P5 → P6

P1: T1 → T2 → T3
P2: T4 → T5 → T6 → T7 → T8 → T9
P3: T10 → T11 → T12 → T13
P4: T14 → T15
P5: T16 → T17 → T18 → T19 → T20
P6: T21 → T22
```

Execution is strictly sequential. **Batch plan:** B1 = P1+P2 (9) · B2 = P3+P4 (6) · B3 =
P5+P6 (7). 22 tasks > ~8 → offer sub-agents before T1.

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1 write-model struct | 1 type + callers | ✅ cohesive |
| T2 evolve adjacency | 1 function | ✅ |
| T3 project placement | 1 function | ✅ |
| T4–T9 decide arms | 1 command family each | ✅ |
| T10 layout + depcruise | 1 module + one rule | ⚠️ 2 related, same sitting |
| T11 applyOperation map | 1 function | ✅ |
| T12 GET DTO | 1 read + HTTP | ✅ |
| T13 edit-model allow-list | 1 endpoint | ✅ |
| T14 account walk | 1 renderer | ✅ |
| T15 reference sites | 1 function | ✅ |
| T16 store/types | 3 files, one contract | ⚠️ cohesive |
| T17 TimelinePane + spike | 1 component + install | ✅ |
| T18 gestures | 1 interaction surface | ✅ |
| T19 hide toggle | 1 control | ✅ |
| T20 brief | 1 doc | ✅ |
| T21 e2e | 1 spec | ✅ |
| T22 changeset | 1 release file | ✅ |

**Granularity check**: no task is "implement the board". T10/T16 are ⚠️ cohesive, not a split.

---

## Diagram-Definition Cross-Check

| Task | Depends On (body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | P1 start | ✅ |
| T2 | T1 | T1 → T2 | ✅ |
| T3 | T2 | T2 → T3 | ✅ |
| T4 | T3 | T3 → T4 | ✅ |
| T5 | T4 | T4 → T5 | ✅ |
| T6 | T5 | T5 → T6 | ✅ |
| T7 | T6 | T6 → T7 | ✅ |
| T8 | T7 | T7 → T8 | ✅ |
| T9 | T8 | T8 → T9 | ✅ |
| T10 | T9 | T9 → T10 | ✅ |
| T11 | T10 | T10 → T11 | ✅ |
| T12 | T11 | T11 → T12 | ✅ |
| T13 | T12 | T12 → T13 | ✅ |
| T14 | T13 | T13 → T14 | ✅ |
| T15 | T14 | T14 → T15 | ✅ |
| T16 | T15 | T15 → T16 | ✅ |
| T17 | T16 | T16 → T17 | ✅ |
| T18 | T17 | T17 → T18 | ✅ |
| T19 | T18 | T18 → T19 | ✅ |
| T20 | T19 | T19 → T20 | ✅ |
| T21 | T20 | T20 → T21 | ✅ |
| T22 | T21 | T21 → T22 | ✅ |

No forward dependencies. No phase-skip.

---

## Test Co-location Validation

| Task | Code Layer | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 | domain folds | unit | unit | ✅ |
| T2 | domain folds | unit | unit | ✅ |
| T3 | domain folds + property | unit | unit | ✅ |
| T4–T9 | domain decider | unit | unit | ✅ |
| T10 | layout + depcruise | unit + static | unit, build gate | ✅ |
| T11 | applyOperation | unit + integration | unit + integration | ✅ |
| T12 | board-access HTTP | integration | integration | ✅ |
| T13 | edit-model HTTP | integration | integration | ✅ |
| T14 | DAG render | unit | unit | ✅ |
| T15 | listReferences | unit | unit | ✅ |
| T16 | Vue store | unit | unit | ✅ |
| T17 | Vue + visual | unit + playwright-cli | unit + visual | ✅ |
| T18 | Vue + visual | unit + playwright-cli | unit + visual | ✅ |
| T19 | Vue | unit | unit | ✅ |
| T20 | surface brief | none | none | ✅ |
| T21 | e2e | e2e | e2e | ✅ |
| T22 | changeset | none | none | ✅ |

No `Tests: none` on a layer that requires tests. No deferred "tested in another task".

---

## Requirement mapping

| IDs | Tasks |
| --- | --- |
| S3-01, S3-02, S3-03, S3-05 | T3, T5, T13 |
| S3-04 | T2, T6 |
| S3-06, S3-07, S3-08, S3-09 | T1, T4 |
| S3-10 | T12, T18 |
| S3-11, S3-12, S3-13 | T7, T18 |
| S3-14, S3-15, S3-16 | T2, T9, T11 |
| S3-17, S3-18, S3-19, S3-21 | T10, T17 |
| S3-20 | T12, T16, T21 |
| S3-22 | T18 |
| S3-23, S3-24 | T3, T8, T17, T18 |
| S3-25 | T16, T19 |
| S3-26, S3-27 | T14, T15, T21 |
| S3-28 | T3, T4, T5 |
| S3-29, S3-32 | T13, T22 |
| S3-30 | T20 |
| S3-31 | T11 |
