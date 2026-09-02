# Board wall presentation split

GitHub issue **#65**. Refactor only — board wall behaviour and visuals stay unchanged.

## Problem Statement

`BoardWall.vue` (~800 lines) mixes decorative chrome, backlog rendering, action toolbar,
shared sticky styles, and timeline placement. `TimelinePane.vue` inlines event-node markup
and duplicates sticky styling. That blocks the board deep-module API (#67) and makes
presentation hard to evolve independently.

## Goals

- [ ] Backlog stickies, toolbar, and wall chrome are separate components composed by the wall coordinator.
- [ ] Timeline event nodes are a separate component; `TimelinePane` remains the Vue Flow adapter.
- [ ] Shared sticky styling is not duplicated between backlog and timeline render paths.
- [ ] Drag-and-drop drop targets and keyboard selection still work end-to-end.
- [ ] Existing board wall, timeline, and drop tests pass.
- [ ] `pnpm check` passes.

## Out of Scope

| Item | Reason |
| ---- | ------ |
| Composable changes | Done in #63 |
| Board deep-module API (#67) | Blocked on this ticket |
| New board gestures | Refactor only |
| New component unit tests | Existing BoardWall/TimelinePane tests are the gate |

## Assumptions

| Decision | Default |
| -------- | ------- |
| Presentation folder | `board/presentation/` |
| Shared sticky styles | `board/presentation/sticky-chrome.css` imported by backlog + timeline nodes |
| Coordinator target | `BoardWall.vue` ~150 lines (script + template; styles live in children) |
| Class names | Preserve existing selectors (`.sticky`, `.wall__*`) for regression tests |

## Acceptance Criteria

1. WHEN the wall mounts THEN backlog, toolbar, and decorative chrome SHALL render via dedicated presentation components composed by `BoardWall`.
2. WHEN the timeline renders THEN event nodes SHALL come from `TimelineEventNode`; `TimelinePane` SHALL remain the Vue Flow adapter.
3. WHEN backlog and timeline stickies render THEN shared sticky base styles SHALL live in one place (`sticky-chrome.css`), not duplicated.
4. WHEN a user drags, drops, selects, or uses keyboard shortcuts THEN behaviour SHALL match pre-refactor (existing tests green).
5. WHEN `pnpm check` runs THEN all gates SHALL pass.

## Requirement Traceability

| ID | Status |
| -- | ------ |
| BWP-01 | Done |
| BWP-02 | Done |
| BWP-03 | Done |
| BWP-04 | Done |
| BWP-05 | Done |
