# Capture-loop topology migration (ADR-012)

GitHub effort-map **#76** (closed). Refactor only — ADR-007 wire semantics unchanged.

## Problem Statement

`src/app/capture-loop/` partially matches [ADR-012](../../../docs/adr/012-frontend-surface-topology.md):
the board deep module and some interaction folders exist, but composition still lives in
`screens/`, cross-zone refetch is inline in `CaptureScreen.vue`, `use-board-mutations.ts` bundles
multiple gestures, and dependency-cruiser does not yet enforce shell-only refetch orchestration.
Agents and humans cannot grep the refetch graph or land a gesture change in one subtree.

## Goals

- [ ] Folder layout matches ADR-012: `shell/` with explicit orchestration, gesture folders under
  `board/` and `dock/`, zone-level `AGENTS.md`, dep-cruiser rules for the import graph.
- [ ] Cross-zone refetch is grep-able, framework-free, and unit-testable without mounting Vue.
- [ ] Bundled board mutation composable is split into `kernel/`, `relate-blocks/`, `board-keyboard/`,
  and `select-block/` per effort-map decisions.
- [ ] `pnpm check` and existing E2E pass with no ADR-007 behaviour change (server-confirmed GET,
  no optimistic store patches).

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| ADR-007 data-flow changes | Effort map + ADR-012 explicitly exclude optimistic updates, SSE, store mutation actions |
| New product gestures (hot spots, link-cause confirm, artifacts UI) | Topology only; new features get folders when their build slices land |
| Visual/UX rework | No impeccable pass — move files, preserve behaviour |
| `stores/` → `read-models/` rename | #77 decided keep `stores/` |
| Shared `src/app/ui/` extraction | Rule of Three — second surface copies zone table first |
| Eval harness expansion | Unless a move breaks existing tests |

## Assumptions & Open Questions

Effort-map #76 resolved all gray areas. Defaults recorded for traceability:

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Shell orchestration API | Framework-free `shell/orchestration/` + `use-capture-orchestration` | #82 prototype | y (effort map) |
| Pinia folder name | Keep `stores/` | ADR-012 naming | y (#77) |
| Account zone | `shell/account/` | Shell-orchestrated drawer | y (#78) |
| Shared board logic | `board/kernel/` + dep-cruiser allowlist | Enables interaction split without duplication | y (#79) |
| Selection vs highlight | `select-block/` + composable highlight | Different axes of change | y (#80) |
| Usecase ceremony | Full usecase only for `reword-block` | ADR-012 single-step rule | y (#81) |
| Dock feed | `dock/composables/use-dock-feed.ts` | Not a user gesture | y (#83) |
| Relation mutations | One `relate-blocks/` folder | Shared POST kernel + RelationEdit model | y (#85) |
| Dep-cruiser refetch | Shell-only fan-out enforced | Invisible dependencies are the problem ADR-012 names | y (#86) |
| `router.ts` | Surface root | Entry wiring, not shell composition | y (#76) |
| `#reword-portal` | Shell hosts DOM target | Overlay stacking is shell chrome | y (#76) |

**Open questions:** none.

---

## User Stories

### P1: Shell orchestration is explicit and testable ⭐ MVP

**User Story**: As a maintainer, I want cross-zone refetch defined in one framework-free module so
that I can grep which zone events reload which read models without reading Vue SFCs.

**Why P1**: Unblocks dep-cruiser enforcement and every later folder move; zero product behaviour
change if done correctly.

**Acceptance Criteria**:

1. WHEN `mutated` is handled THEN the system SHALL refetch `session` and `proposals` only (same
   as today via `useInterpretationPoll.refetchNow`).
2. WHEN `board-dirty` is handled THEN the system SHALL parallel-load `board` and `account` for
   the current workshop id.
3. WHEN cold-loading the capture screen THEN the system SHALL load `session` and SHALL load
   `board` only when the session view reports at least one contribution (404-safe bootstrap).
4. WHEN `shell/orchestration/` modules are imported THEN they SHALL NOT import `vue` or `pinia`.
5. WHEN unit tests run for orchestration THEN they SHALL assert refetch targets using mock ports
   without mounting `CaptureScreen`.

**Independent Test**: Run orchestration unit tests; grep `REFETCH_BY_ZONE_EVENT` for the graph.

---

### P1: Architecture rules enforce the zone graph ⭐ MVP

**User Story**: As a maintainer, I want dependency-cruiser to reject illegal cross-zone imports so
that folder claims in `AGENTS.md` are checkable, not decorative.

**Why P1**: ADR-012 requires harness enforceability; rules must be proven by planted violations.

**Acceptance Criteria**:

1. WHEN dock code imports `stores/board.ts` or `stores/account.ts` THEN dependency-cruiser
   SHALL fail.
2. WHEN board code imports any file under `stores/` THEN dependency-cruiser SHALL fail.
3. WHEN board or dock code imports `shell/orchestration/` THEN dependency-cruiser SHALL fail.
4. WHEN `shell/orchestration/` imports `vue` or `pinia` THEN dependency-cruiser SHALL fail.
5. WHEN each new rule is added THEN a planted violation SHALL be verified to trigger it before
   the violation is reverted.

**Independent Test**: Run `pnpm depcruise`; temporarily plant each forbidden import and confirm
failure.

---

### P2: Shell zone replaces `screens/`

**User Story**: As a maintainer, I want composition-root code under `shell/` so that the folder
layout matches ADR-012 and a second surface can copy the pattern.

**Acceptance Criteria**:

1. WHEN the capture surface loads THEN `CaptureScreen.vue` and `CreateWorkshop.vue` SHALL live
   under `shell/`.
2. WHEN the account drawer renders THEN its components SHALL live under `shell/account/`.
3. WHEN `router.ts` resolves capture routes THEN it SHALL import shell screen components.
4. WHEN `screens/` is removed THEN no import path SHALL reference `screens/`.

**Independent Test**: Existing `CaptureScreen.test.ts` and `CreateWorkshop.test.ts` pass from new
paths; E2E happy path unchanged.

---

### P2: Board gestures split into interaction folders

**User Story**: As a maintainer, I want board relation and selection logic in named interaction
folders so that a gesture change lands in one subtree.

**Acceptance Criteria**:

1. WHEN shared relation-edit logic is needed by multiple interactions THEN it SHALL live in
   `board/kernel/` and interactions SHALL import kernel via the dep-cruiser allowlist.
2. WHEN place/unplace/sequence/connect/drop/pivotal/withdraw/reinstate POST succeeds THEN
   `relate-blocks/` SHALL emit `board-dirty` (behaviour unchanged from today).
3. WHEN global board keyboard chords fire THEN `board-keyboard/` SHALL dispatch via typed
   callbacks without importing sibling interaction folders.
4. WHEN sticky selection or toolbar guards change THEN `select-block/` SHALL own that state.
5. WHEN `use-board-mutations.ts` is retired THEN no production import SHALL reference it.

**Independent Test**: `BoardWall.test.ts`, `BoardWall.drop.test.ts`, and reword tests pass;
keyboard behaviour matches pre-migration (Escape, Enter/E reword chords).

---

### P3: Zone documentation completes the harness

**User Story**: As an agent, I want zone-level `AGENTS.md` files so that I load only the subtree
rules for the folder I am editing.

**Acceptance Criteria**:

1. WHEN editing under `shell/`, `board/`, or `dock/` THEN a zone `AGENTS.md` SHALL state owns
   and import rules for that subtree.
2. WHEN a zone doc references global rules THEN it SHALL link to surface `AGENTS.md` without
   duplicating ADR-007 substrate prose.
3. WHEN `shell/composables/` holds interpretation poll and orchestration THEN root
   `composables/` SHALL be removed or empty.

**Independent Test**: Read zone docs; confirm no process ids; `pnpm check:process-ids` passes.

---

## Edge Cases

- WHEN a board POST returns 422 cycle rejection THEN the system SHALL NOT emit `board-dirty`
  (unchanged).
- WHEN accept proposal completes THEN dock SHALL emit both `board-dirty` and `mutated` so all
  four read models refresh (unchanged ordering).
- WHEN interpretation poll is active THEN it SHALL continue to refetch only `session` and
  `proposals`, never `board`.
- WHEN account drawer opens with null document THEN shell SHALL lazy-load account once (unchanged).
- WHEN board stream 404s on cold load THEN bootstrap SHALL not fail the screen (unchanged).

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| TOPO-01 | P1: Shell orchestration | Design | Pending |
| TOPO-02 | P1: Shell orchestration | Design | Pending |
| TOPO-03 | P1: Shell orchestration | Design | Pending |
| TOPO-04 | P1: Shell orchestration | Design | Pending |
| TOPO-05 | P1: Shell orchestration | Design | Pending |
| TOPO-06 | P1: Dep-cruiser | Design | Pending |
| TOPO-07 | P1: Dep-cruiser | Design | Pending |
| TOPO-08 | P1: Dep-cruiser | Design | Pending |
| TOPO-09 | P1: Dep-cruiser | Design | Pending |
| TOPO-10 | P1: Dep-cruiser | Design | Pending |
| TOPO-11 | P2: Shell zone | Design | Pending |
| TOPO-12 | P2: Shell zone | Design | Pending |
| TOPO-13 | P2: Shell zone | Design | Pending |
| TOPO-14 | P2: Shell zone | Design | Pending |
| TOPO-15 | P2: Board split | Design | Pending |
| TOPO-16 | P2: Board split | Design | Pending |
| TOPO-17 | P2: Board split | Design | Pending |
| TOPO-18 | P2: Board split | Design | Pending |
| TOPO-19 | P2: Board split | Design | Pending |
| TOPO-20 | P3: Zone docs | Design | Pending |
| TOPO-21 | P3: Zone docs | Design | Pending |
| TOPO-22 | P3: Zone docs | Design | Pending |

**Coverage:** 22 total, 0 mapped to tasks (Tasks phase next), 0 unmapped after tasks.md

---

## Success Criteria

- [ ] `pnpm check` passes including new dep-cruiser rules with planted violations verified.
- [ ] `pnpm test:e2e` capture-loop happy path passes without code changes to wire semantics.
- [ ] Refetch graph visible in `shell/orchestration/refetch-graph.ts` (grep-able).
- [ ] No `screens/`, no `use-board-mutations.ts`, no root `composables/` in capture-loop.

**Primary references:** [`.specs/effort-maps/decisions-capture-loop-topology.md`](../effort-maps/decisions-capture-loop-topology.md), [`.specs/effort-maps/prototype-shell-orchestration.md`](../effort-maps/prototype-shell-orchestration.md)
