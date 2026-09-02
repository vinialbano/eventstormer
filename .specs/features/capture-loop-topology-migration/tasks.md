# Capture-loop topology migration — Tasks

**Design**: `.specs/features/capture-loop-topology-migration/design.md`
**Status**: Draft

---

## Execution Protocol (MANDATORY -- do not skip)

Implement with `anoria-engineering:spec-driven-development` Execute flow: one atomic commit per
task, gate must pass before done, Verifier after last task.

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec — confirm before Execute.
> Guidelines: `AGENTS.md`, `docs/testing.md`, `src/app/capture-loop/AGENTS.md`, ADR-008/012.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Shell orchestration (framework-free) | unit | 1:1 to TOPO-01..05; mock ports; no Vue mount | `src/app/capture-loop/shell/orchestration/*.test.ts` | `pnpm test -- src/app/capture-loop/shell/orchestration` |
| Shell composables | unit | Poll + orchestration wiring; fake timers for poll | `src/app/capture-loop/shell/composables/*.test.ts` | `pnpm test -- src/app/capture-loop/shell/composables` |
| Board kernel | unit | Semantic-edit + apply-board-edit branches; 422 no emit | `src/app/capture-loop/board/kernel/*.test.ts` | `pnpm test -- src/app/capture-loop/board` |
| Board interactions | unit | Emit callbacks; keyboard priority; drop/connect paths | `src/app/capture-loop/board/interactions/**/*.test.ts` | `pnpm test -- src/app/capture-loop/board` |
| Board zone integration | unit (jsdom) | BoardWall composes interactions; existing keydown/drop tests | `src/app/capture-loop/board/BoardWall*.test.ts` | `pnpm test -- src/app/capture-loop/board/BoardWall` |
| Shell screens | unit (jsdom) | Wiring delegation; cold load gate | `src/app/capture-loop/shell/*.test.ts` | `pnpm test -- src/app/capture-loop/shell` |
| Dep-cruiser rules | integration (lint) | Each new rule triggered by planted violation | `.dependency-cruiser.cjs` | `pnpm depcruise` |
| Capture-loop E2E | e2e | Happy path unchanged (TOPO success criteria) | `e2e/capture-loop.spec.ts` | `pnpm test:e2e` |
| Zone AGENTS.md | none | Build gate + `pnpm check:process-ids` | `**/AGENTS.md` | `pnpm check` |

## Gate Check Commands

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | After unit-test-only tasks | `pnpm test -- <task paths>` then `pnpm typecheck` |
| Full | After shell/board integration tasks | `pnpm check` |
| Build | Phase completion | `pnpm check` (+ `pnpm test:e2e` on final task T18) |

---

## Execution Plan

### Phase 1: Shell orchestration foundation

```
T1 → T2 → T3 → T4
```

### Phase 2: Shell zone move

```
T5 → T6
```

### Phase 3: Board kernel

```
T7 → T8
```

### Phase 4: Board interaction split

```
T9 → T10 → T11
```

### Phase 5: Select-block

```
T12
```

### Phase 6: Zone docs and composable cleanup

```
T13 → T14
```

### Phase 7: Final verification

```
T15
```

---

## Task Breakdown

### T1: Shell orchestration pure modules

**What**: Add `zone-events.ts`, `refetch-graph.ts`, `apply-capture-effect.ts`, `capture-bootstrap.ts`
under `shell/orchestration/`.
**Where**: `src/app/capture-loop/shell/orchestration/`
**Depends on**: None
**Reuses**: `.specs/effort-maps/prototype-shell-orchestration.md`
**Requirement**: TOPO-01, TOPO-02, TOPO-03, TOPO-04

**Done when**:

- [ ] Modules export types and functions per design; zero vue/pinia imports
- [ ] `pnpm typecheck` passes

**Tests**: unit (co-located in T2)
**Gate**: quick (typecheck only — tests land T2)

**Commit**: `refactor(app): add capture-loop shell orchestration modules`

---

### T2: Shell orchestration unit tests

**What**: Add `refetch-graph.test.ts`, `apply-capture-effect.test.ts`, `capture-bootstrap.test.ts`.
**Where**: `src/app/capture-loop/shell/orchestration/`
**Depends on**: T1
**Reuses**: Mock port pattern from design
**Requirement**: TOPO-05

**Done when**:

- [ ] Tests assert event→target mapping and parallel port calls with workshop id
- [ ] `pnpm test -- src/app/capture-loop/shell/orchestration` passes

**Tests**: unit
**Gate**: quick

**Commit**: `test(app): cover capture-loop refetch orchestration`

---

### T3: Wire CaptureScreen through use-capture-orchestration

**What**: Add `use-capture-orchestration.ts`; refactor `screens/CaptureScreen.vue` to delegate
`onMutated`, `onBoardDirty`, cold load, proposals watch (behaviour unchanged).
**Where**: `shell/composables/use-capture-orchestration.ts`, `screens/CaptureScreen.vue`
**Depends on**: T2
**Reuses**: Existing `useInterpretationPoll` (still at root `composables/` until T14)
**Requirement**: TOPO-01, TOPO-02, TOPO-03

**Done when**:

- [ ] CaptureScreen contains no inline `Promise.all([board.load, account.load])` — delegates to orchestration
- [ ] Existing `CaptureScreen.test.ts` passes (update imports only if needed)
- [ ] `pnpm test -- src/app/capture-loop/screens/CaptureScreen.test.ts` passes

**Tests**: unit (existing screen tests)
**Gate**: quick

**Commit**: `refactor(app): delegate capture screen refetch to orchestration`

---

### T4: Dep-cruiser zone graph rules

**What**: Add rules `capture-orchestration-framework-free`, `dock-no-board-or-account-store`,
`board-no-projection-stores`, `zones-no-shell-orchestration`; update `board-public-api-only`
pathNot for future `shell/`. Plant and revert one violation per rule.
**Where**: `.dependency-cruiser.cjs`
**Depends on**: T3
**Requirement**: TOPO-06..TOPO-10

**Done when**:

- [ ] Each rule verified with planted violation → `pnpm depcruise` fails → revert
- [ ] `pnpm depcruise` passes on clean tree
- [ ] `pnpm check` passes

**Tests**: integration (depcruise)
**Gate**: full

**Commit**: `chore(app): enforce capture-loop zone import graph`

---

### T5: Move screens to shell and fold account

**What**: Move `screens/CaptureScreen.vue`, `CreateWorkshop.vue`, tests → `shell/`; move
`account/` → `shell/account/`; remove empty `screens/`.
**Where**: `src/app/capture-loop/shell/`
**Depends on**: T4
**Requirement**: TOPO-11, TOPO-12, TOPO-14

**Done when**:

- [ ] No files under `screens/` or top-level `account/`
- [ ] All imports updated
- [ ] Screen tests pass from new paths

**Tests**: unit
**Gate**: full

**Commit**: `refactor(app): move capture-loop screens under shell/`

---

### T6: Update router to shell paths

**What**: Point `router.ts` at `shell/CaptureScreen.vue` and `shell/CreateWorkshop.vue`.
**Where**: `src/app/capture-loop/router.ts`
**Depends on**: T5
**Requirement**: TOPO-13

**Done when**:

- [ ] Router imports only from `shell/`
- [ ] `pnpm check` passes

**Tests**: unit (router covered by screen tests + e2e)
**Gate**: full

**Commit**: `refactor(app): import capture routes from shell/`

---

### T7: Create board/kernel and move semantic-edit

**What**: Move `semantic-edit.ts`, `typing-surface.ts` to `board/kernel/`; fix board imports.
**Where**: `src/app/capture-loop/board/kernel/`
**Depends on**: T6
**Reuses**: Existing test files (move with modules)
**Requirement**: TOPO-15

**Done when**:

- [ ] Root-level `semantic-edit.ts` and `typing-surface.ts` removed
- [ ] `semantic-edit.test.ts` passes from new location
- [ ] `pnpm test -- src/app/capture-loop/board` passes

**Tests**: unit
**Gate**: quick

**Commit**: `refactor(app): add board kernel for shared edit logic`

---

### T8: Extract apply-board-edit to kernel + dep-cruiser allowlist

**What**: Extract POST apply + cycle-error handling from `use-board-mutations.ts` into
`kernel/apply-board-edit.ts`; extend `no-cross-board-interaction-imports` pathNot for `kernel/`.
**Where**: `board/kernel/apply-board-edit.ts`, `.dependency-cruiser.cjs`
**Depends on**: T7
**Requirement**: TOPO-15, TOPO-06

**Done when**:

- [ ] Mutations composable calls kernel apply helper
- [ ] Planted interaction→kernel import passes; interaction→sibling interaction still fails
- [ ] `pnpm check` passes

**Tests**: unit
**Gate**: full

**Commit**: `refactor(app): extract board POST apply into kernel`

---

### T9: Add board-keyboard interaction

**What**: Create `interactions/board-keyboard/`; extract global key listener from
`use-board-mutations.ts`; wire dispatch table from `BoardWall.vue`.
**Where**: `board/interactions/board-keyboard/`
**Depends on**: T8
**Reuses**: `.specs/effort-maps/research-keyboard-routing.md`
**Requirement**: TOPO-17

**Done when**:

- [ ] `use-board-mutations.ts` no longer registers window keydown
- [ ] `BoardWall.test.ts` keyboard cases pass unchanged

**Tests**: unit
**Gate**: quick

**Commit**: `refactor(app): extract board keyboard router interaction`

---

### T10: Add relate-blocks interaction

**What**: Create `interactions/relate-blocks/` with drag/connect/toolbar/withdraw POST handlers;
move remaining mutation logic from `use-board-mutations.ts`.
**Where**: `board/interactions/relate-blocks/`
**Depends on**: T9
**Requirement**: TOPO-16, TOPO-19

**Done when**:

- [ ] `BoardWall.drop.test.ts` and relation toolbar tests pass
- [ ] Successful POST still emits `board-dirty`; 422 does not

**Tests**: unit
**Gate**: quick

**Commit**: `refactor(app): extract relate-blocks interaction`

---

### T11: Retire use-board-mutations and rewire BoardWall

**What**: Delete `use-board-mutations.ts`; compose `relate-blocks`, `board-keyboard`, existing
reword/select wiring in `BoardWall.vue`.
**Where**: `board/BoardWall.vue`, delete `board/composables/use-board-mutations.ts`
**Depends on**: T10
**Requirement**: TOPO-19

**Done when**:

- [ ] No imports of `use-board-mutations`
- [ ] Full board test suite passes

**Tests**: unit
**Gate**: full

**Commit**: `refactor(app): remove bundled board mutations composable`

---

### T12: Add select-block interaction

**What**: Create `interactions/select-block/` from `use-board-selection.ts`; keep
`use-fresh-sticky-highlight` in composables; update BoardWall wiring.
**Where**: `board/interactions/select-block/`
**Depends on**: T11
**Requirement**: TOPO-18

**Done when**:

- [ ] `use-board-selection.ts` removed
- [ ] Toolbar guard behaviour unchanged in BoardWall tests

**Tests**: unit
**Gate**: full

**Commit**: `refactor(app): extract select-block interaction`

---

### T13: Zone AGENTS.md files

**What**: Add `shell/AGENTS.md`, `board/AGENTS.md`, `dock/AGENTS.md` per design inheritance rules.
**Where**: `src/app/capture-loop/*/AGENTS.md`
**Depends on**: T12
**Requirement**: TOPO-20, TOPO-21

**Done when**:

- [ ] Zone docs state owns + import rules; link to surface AGENTS.md
- [ ] `pnpm check:process-ids` passes on new docs

**Tests**: none
**Gate**: full

**Commit**: `docs(app): add capture-loop zone AGENTS.md files`

---

### T14: Move shell composables and remove root composables/

**What**: Move `use-interpretation-poll.ts` (+ test) to `shell/composables/`; remove empty root
`composables/` if no files remain.
**Where**: `src/app/capture-loop/shell/composables/`
**Depends on**: T13
**Requirement**: TOPO-22

**Done when**:

- [ ] No `src/app/capture-loop/composables/` directory
- [ ] Poll tests pass from new path

**Tests**: unit
**Gate**: full

**Commit**: `refactor(app): colocate shell composables under shell/`

---

### T15: Final gate and E2E verification

**What**: Run full check + e2e; add `.changeset` patch for src delivery; update STATE handoff.
**Where**: repo root
**Depends on**: T14
**Requirement**: all TOPO-*

**Done when**:

- [ ] `pnpm check` passes
- [ ] `pnpm test:e2e` passes
- [ ] `.changeset/*.md` added (patch — refactor)
- [ ] Verifier PASS in `validation.md`

**Tests**: e2e
**Gate**: build + e2e

**Commit**: `chore: changeset for capture-loop topology migration`

---

## Phase Execution Map

```
Phase 1:  T1 ──→ T2 ──→ T3 ──→ T4
Phase 2:  T5 ──→ T6
Phase 3:  T7 ──→ T8
Phase 4:  T9 ──→ T10 ──→ T11
Phase 5:  T12
Phase 6:  T13 ──→ T14
Phase 7:  T15
```

15 tasks → ~2 task-budgeted batches at Execute (~7 tasks each): Batch 1 Phases 1–4 (T1–T11),
Batch 2 Phases 5–7 (T12–T15).

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1: orchestration modules | 4 related pure files | ✅ cohesive module |
| T2: orchestration tests | 3 test files | ✅ Granular |
| T3: wire CaptureScreen | 1 composable + 1 SFC | ✅ Granular |
| T4: dep-cruiser | 1 config file | ✅ Granular |
| T5: shell move | multi-file but one atomic rename | ✅ OK (cohesive) |
| T9–T12: interactions | one folder each | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (body) | Diagram Shows | Status |
| ---- | ------------------- | ------------- | ------ |
| T1 | None | entry | ✅ |
| T2 | T1 | T1→T2 | ✅ |
| T3 | T2 | T2→T3 | ✅ |
| T4 | T3 | T3→T4 | ✅ |
| T5 | T4 | T4→T5 | ✅ |
| T6 | T5 | T5→T6 | ✅ |
| T7 | T6 | T6→T7 | ✅ |
| T8 | T7 | T7→T8 | ✅ |
| T9 | T8 | T8→T9 | ✅ |
| T10 | T9 | T9→T10 | ✅ |
| T11 | T10 | T10→T11 | ✅ |
| T12 | T11 | T11→T12 | ✅ |
| T13 | T12 | T12→T13 | ✅ |
| T14 | T13 | T13→T14 | ✅ |
| T15 | T14 | T14→T15 | ✅ |

---

## Test Co-location Validation

| Task | Layer | Matrix Requires | Task Says | Status |
| ---- | ----- | --------------- | --------- | ------ |
| T1 | orchestration | unit | deferred T2 | ✅ OK (T1+T2 atomic pair) |
| T2 | orchestration | unit | unit | ✅ |
| T3 | shell screen | unit | unit | ✅ |
| T4 | dep-cruiser | integration | integration | ✅ |
| T5–T12 | board/shell | unit | unit | ✅ |
| T13 | docs | none | none | ✅ |
| T14 | composables | unit | unit | ✅ |
| T15 | e2e | e2e | e2e | ✅ |

---

## Requirement → Task Map

| Requirement | Task(s) |
| ----------- | ------- |
| TOPO-01..05 | T1, T2, T3 |
| TOPO-06..10 | T4, T8 |
| TOPO-11..14 | T5, T6 |
| TOPO-15..19 | T7, T8, T9, T10, T11, T12 |
| TOPO-20..22 | T13, T14 |
| All | T15 |

**Coverage:** 22 requirements, 22 mapped, 0 unmapped ✅
