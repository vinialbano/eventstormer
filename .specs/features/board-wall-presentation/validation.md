# Board wall presentation split Validation

**Date**: 2026-09-02
**Spec**: `.specs/features/board-wall-presentation/spec.md`
**Diff range**: `5584a5e..78a0bcc` (`origin/main..HEAD`, branch `board-wall-presentation`)
**Verifier**: independent sub-agent (author ≠ verifier)
**Mode**: Code + tests

---

## Task Completion

| Task | Status  | Notes |
| ---- | ------- | ----- |
| T1   | ✅ Done | `sticky-chrome.css` holds base sticky styles |
| T2   | ✅ Done | `BoardWallChrome.vue`, `BacklogPane.vue` extracted and wired |
| T3   | ✅ Done | `BoardActionToolbar.vue` extracted and wired |
| T4   | ✅ Done | `TimelineEventNode.vue` extracted; `TimelinePane.vue` delegates |
| T5   | ⚠️ Partial | Changeset present; `pnpm check` green; `BoardWall.vue` is 236 lines (script+template) vs ~150 task target |

---

## Spec-Anchored Acceptance Criteria

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| ------------------------- | -------------------- | ----------------------- | ------ |
| BWP-01: WHEN the wall mounts THEN backlog, toolbar, and decorative chrome SHALL render via dedicated presentation components composed by `BoardWall` | Three presentation subcomponents compose the wall; chrome draws frame/time guide; backlog lists stickies; toolbar exposes show-withdrawn | `BoardWall.test.ts:69` — `expect(wrapper.find('.wall__ink rect').exists()).toBe(true)` (chrome marker from `BoardWallChrome.vue`); `BoardWall.test.ts:42-43` — `expect(stickies).toHaveLength(3)` + `:50` — `expect(wrapper.get('[role="list"]').attributes('data-empty')).toBe('false')` (backlog pane); `BoardWall.test.ts:488` — `await wrapper.get('[aria-label="Show withdrawn"]').setValue(true)` (toolbar); wiring at `BoardWall.vue:139-214` | ✅ PASS |
| BWP-02: WHEN the timeline renders THEN event nodes SHALL come from `TimelineEventNode`; `TimelinePane` SHALL remain the Vue Flow adapter | `TimelinePane` owns Vue Flow config; event nodes expose `data-event-id` and selection | `TimelinePane.test.ts:49-51` — `expect(vueFlow.props('nodesDraggable')).toBe(false)` and `expect(vueFlow.props('autoConnect')).toBe(false)`; `BoardWall.drop.test.ts:150` — `await wrapper.get('[data-event-id="eA"]').trigger('click')`; delegation at `TimelinePane.vue:64-69` | ✅ PASS |
| BWP-03: WHEN backlog and timeline stickies render THEN shared sticky base styles SHALL live in one place (`sticky-chrome.css`), not duplicated | Base `.sticky`, `.sticky__label`, `.sticky__who`, `.sticky--withdrawn`, `.sticky--fresh` in `sticky-chrome.css`; imported by backlog + timeline paths; no base sticky rules in coordinator or adapter | `sticky-chrome.css:1-61` (single base definition); `BacklogPane.vue:3` + `TimelineEventNode.vue:5` import shared CSS; no `.sticky` rules in `BoardWall.vue` or `TimelinePane.vue`; `BoardWall.test.ts:59` — `expect(wrapper.get('.sticky__who').text()).toBe('Maria')`; `BoardWall.test.ts:95` — `expect(stickies[0]?.classes()).toContain('sticky--withdrawn')`; `BoardWall.test.ts:142` — `expect(fresh?.classes()).toContain('sticky--fresh')` | ✅ PASS |
| BWP-04: WHEN a user drags, drops, selects, or uses keyboard shortcuts THEN behaviour SHALL match pre-refactor | Existing board wall, timeline, drop, and keyboard tests green with same assertions | `BoardWall.drop.test.ts:71-76` — place POST on backlog drop; `BoardWall.drop.test.ts:139-183` — place/unplace/sequence/pivotal toolbar POSTs; `BoardWall.drop.test.ts:100-136` — sequence/link-cause/insert-between drops; `BoardWall.test.ts:189` — Enter opens reword ghost; `BoardWall.test.ts:118` — Esc restores label | ✅ PASS |
| BWP-05: WHEN `pnpm check` runs THEN all gates SHALL pass | Full gate green (656 tests) | Verifier run: `pnpm check` — 656 passed, 0 failed | ✅ PASS |

**Status**: ✅ All ACs covered (5/5 matched spec outcome)

**Notes**: BWP-01/BWP-02 structural composition is asserted via DOM markers unique to extracted components plus implementation wiring; no new `findComponent` tests (explicitly out of scope in spec). Reword-overlay sticky styles remain duplicated in `BacklogPane.vue` and `BoardActionToolbar.vue`; spec scopes deduplication to **base** sticky chrome only.

---

## Discrimination Sensor

Mutations applied in isolated temp worktree (`git worktree add --detach` + symlinked `node_modules`); real tree verified clean after runs.

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ----------- | ------- |
| 1 | `BoardWall.vue` template | Removed `<BacklogPane …/>` composition | ✅ Killed — `BoardWall.test.ts`: 17 failed, 2 passed |
| 2 | `TimelinePane.vue:64-69` | Replaced `<TimelineEventNode>` slot with plain `<div>` | ✅ Killed — `BoardWall.drop.test.ts`: 1 failed (`[data-event-id="eA"]` click path), 9 passed |
| 3 | `BoardWall.vue:122` | Flipped withdrawn filter `!showWithdrawn && withdrawn` → `showWithdrawn && withdrawn` | ✅ Killed — `BoardWall.test.ts`: 17 failed, 2 passed |

**Sensor depth**: lightweight (3 targeted behavior-level mutations)
**Result**: 3/3 killed — ✅ PASS

---

## Interactive UAT Results

Not performed — refactor-only; existing automated board tests are the gate per spec.

---

## Code Quality

| Principle        | Status |
| ---------------- | ------ |
| Minimum code     | ✅ Refactor-only; no new gestures |
| Surgical changes | ✅ Scoped to `board/presentation/` + coordinator wiring |
| No scope creep   | ✅ No composable or API changes |
| Matches patterns | ✅ Presentation folder, preserved class names |
| Spec-anchored outcome check | ✅ |
| Per-layer Coverage Expectation met | ✅ Domain untouched; app tests cover board behavior |
| Every test maps to spec requirement | ✅ No new unclaimed tests; no test file changes in diff |
| Documented guidelines followed | `docs/testing.md`, `AGENTS.md` (existing BoardWall/TimelinePane tests as gate) |

**Task note**: T5 target `BoardWall.vue` ~150 lines (script+template) — actual 236 (130 script + 106 template). Styles correctly live in children; coordinator still above aspirational size but within refactor scope.

---

## Edge Cases

- [x] Empty board renders framed wall with no stickies — `BoardWall.test.ts:63-71`
- [x] Withdrawn stickies hidden by default, revealed via toolbar — `BoardWall.test.ts:474-495`
- [x] Attached actors leave backlog; timeline events stay on axis — `BoardWall.test.ts:443-471`
- [x] Cycle 422 inline error — `BoardWall.drop.test.ts:202-211`
- [x] Actor drop on empty timeline does not POST — `BoardWall.drop.test.ts:62-67`

---

## Gate Check

- **Quick gate command**: `pnpm exec vitest run --project app src/app/capture-loop/board`
- **Quick result**: 51 passed, 0 failed, 0 skipped
- **Full gate command**: `pnpm check`
- **Full result**: 656 passed, 0 failed, 0 skipped
- **Test count before feature** (board `it()` blocks on `origin/main`): 51
- **Test count after feature**: 51
- **Delta**: 0 (no tests added or removed — per spec)
- **Skipped tests**: none
- **Failures**: none

---

## Fix Plans

None required for AC satisfaction.

### Optional follow-up (non-blocking)

- **T5 line-count target**: `BoardWall.vue` script+template is 236 lines vs ~150 aspiration — consider further slimming only if #67 deep-module API needs it.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status   |
| ----------- | --------------- | ------------ |
| BWP-01      | Pending         | ✅ Verified  |
| BWP-02      | Pending         | ✅ Verified  |
| BWP-03      | Pending         | ✅ Verified  |
| BWP-04      | Pending         | ✅ Verified  |
| BWP-05      | Pending         | ✅ Verified  |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 5/5 ACs matched spec outcome
**Sensor**: 3/3 mutations killed
**Gate**: 656 passed

**What works**: Board wall presentation split into `BoardWallChrome`, `BacklogPane`, `BoardActionToolbar`, and `TimelineEventNode` with shared `sticky-chrome.css`; all pre-refactor board behaviour preserved; full `pnpm check` green.

**Issues found**: None blocking. T5 coordinator line-count aspiration (~150) not met (236 script+template).

**Next steps**: Merge-ready from verification perspective; optional coordinator slimming deferred to #67.
