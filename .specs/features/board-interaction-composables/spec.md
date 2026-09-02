# Board interaction composables

GitHub issue **#63**. Refactor only — board wall behaviour stays unchanged.

## Problem Statement

`BoardWall.vue` owns selection, mutation POSTs, inline reword draft state, keyboard shortcuts,
and fresh-sticky animation in one ~320-line script. That blocks later board modularization (#67)
and makes interaction logic hard to test in isolation.

## Goals

- [ ] Selection state, placement eligibility, and toolbar action guards live in a dedicated
      composable consumed by the wall.
- [ ] Board mutation application (including cycle-error feedback) and keyboard shortcuts live
      in a dedicated composable.
- [ ] Inline reword draft state (editing id, draft text, confirm open) lives in a dedicated
      composable wired to the existing reword confirm UI.
- [ ] Fresh-sticky settle animation logic is extracted and does not change visible timing.
- [ ] Existing board wall and drop integration tests pass without behaviour change.
- [ ] `pnpm check` passes.

## Out of Scope

| Item | Reason |
| ---- | ------ |
| Template / style changes | Refactor script only per issue |
| Board deep-module API (#67) | Separate ticket |
| New board gestures | Refactor only |
| Composable unit tests | Existing BoardWall tests are the regression gate |

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Composable location | `src/app/capture-loop/board/composables/` | Colocated with `BoardWall`; not global `composables/` | y (issue) |
| Keyboard shortcuts owner | `use-board-mutations.ts` | Issue groups shortcuts with mutation application | y (issue) |
| Fresh animation timing | 1000 ms timeout, 0.9 s CSS animation unchanged | Issue: no visible timing change | y (issue) |
| Test gate | Existing `BoardWall.test.ts` + `BoardWall.drop.test.ts` | Issue AC | y (issue) |

**Open questions:** none.

## User Stories

### P1: Extract interaction composables ⭐ MVP

**User Story**: As a maintainer, I want board interaction logic in focused composables so
`BoardWall` stays a thin render shell.

**Acceptance Criteria**:

1. WHEN the wall mounts THEN selection, toolbar guards, mutations, reword draft, and fresh
   animation SHALL be provided by four dedicated composables under `board/composables/`.
2. WHEN a user selects, places, sequences, drags, withdraws, reinstates, or rewords THEN
   behaviour SHALL match pre-refactor (existing tests green).
3. WHEN a cycle rejection occurs THEN the cycle line feedback SHALL still surface via
   `relationError`.
4. WHEN a new block arrives after mount THEN `sticky--fresh` timing SHALL be unchanged
   (1000 ms JS timeout; reduced motion still skips).
5. WHEN `pnpm check` runs THEN all gates SHALL pass.

**Independent Test**: `BoardWall.test.ts`, `BoardWall.drop.test.ts`, full `pnpm check`.

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| BIC-01 | P1 | Execute | Pending |
| BIC-02 | P1 | Execute | Pending |
| BIC-03 | P1 | Execute | Pending |
| BIC-04 | P1 | Execute | Pending |
| BIC-05 | P1 | Execute | Pending |
| BIC-06 | P1 | Execute | Pending |

## Success Criteria

- [ ] `BoardWall.vue` script section shrinks; template and styles unchanged.
- [ ] Four composables: `use-board-selection`, `use-board-mutations`, `use-board-reword`,
      `use-fresh-sticky-highlight`.
- [ ] Zero behaviour regression in board tests.
