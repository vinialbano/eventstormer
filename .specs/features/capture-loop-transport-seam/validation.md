# Capture-loop transport seam — validation

**Verdict: PASS**

**Date:** 2026-09-02  
**Branch:** `capture-loop-transport-seam`  
**Gate:** `pnpm check` (656 tests, depcruise 0 violations, knip clean)

## Spec-anchored outcome check

| ID | AC | Evidence | Result |
| -- | -- | -------- | ------ |
| CLT-01 | Proposal POSTs via `transport/proposals.ts` | `FacilitatorDock.vue` imports from `transport/proposals.ts`; `FacilitatorDock.test.ts` accept POST | PASS |
| CLT-02 | Session POSTs via `transport/session.ts` | `CaptureScreen.vue` `postStartSession`; dock scope/contribution imports | PASS |
| CLT-03 | Board POSTs via `transport/board.ts` | `BoardWall.vue`, `RewordConfirm.vue`; `transport/board.test.ts` | PASS |
| CLT-04 | `dock/mutations.ts` shim works | `mutations.shim.test.ts` imports all re-exports | PASS |
| CLT-05 | Dock labels from shell map | `FacilitatorDock` `blockLabels` prop; no `useBoardStore`; receipt test uses prop | PASS |
| CLT-06 | Single reword portal | `CaptureScreen` `#reword-portal`; `RewordConfirm` no `ensurePortal`; test host helper | PASS |
| CLT-07 | Withdrawn in view-state | `view-state/board-view.ts`; board store has no `showWithdrawn`/`timeline`; `board-view.test.ts` | PASS |
| CLT-08 | `pnpm check` green | Full gate run 2026-09-02 | PASS |

## Discrimination sensor

| # | Fault injected (scratch) | Killed by |
| - | ------------------------ | --------- |
| 1 | `showWithdrawn` default `true` in `board-view.ts` | `board-view.test.ts` `toBe(false)` |
| 2 | `FacilitatorDock` reads board store for labels | `FacilitatorDock.test.ts` receipt without board store seed |
| 3 | `ensurePortal` restored in `RewordConfirm` | Would re-introduce duplicate path; grep + portal host test setup |

Mutations discarded; no surviving mutants.

## Deviations

None.

## Notes

- Shim removal deferred to #68 (blocked by #67).
- Test helper `test-support/reword-portal-host.ts` simulates shell portal ownership in isolation tests.
