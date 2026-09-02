# Board deep-module public API and frontend architecture rules

GitHub issue **#67**. Refactor only — capture-loop behaviour stays unchanged.

## Problem Statement

The board wall grew composables, interactions, and presentation folders (#63–#66), but
`CaptureScreen` still imports `BoardWall.vue` directly, board interactions reach
`client.ts`, and nothing prevents the dock or shell from importing board internals.
That blocks the contract cleanup in #68.

## Goals

- [ ] `board/index.ts` is the sole public import surface (`BoardWall` + `BoardBlockInput`).
- [ ] Shell and dock import the board only through that entry.
- [ ] dependency-cruiser rules enforce board entry-only imports, isolated interactions,
      dock isolation, and transport-only HTTP client usage — each proven by a planted violation.
- [ ] `pnpm check` passes with no behaviour regression.

## Out of Scope

| Item | Reason |
| ---- | ------ |
| Remove `dock/mutations.ts` shim | #68 |
| New board gestures | Refactor only |

## Acceptance Criteria

1. WHEN `CaptureScreen` mounts the wall THEN it SHALL import `{ BoardWall, BoardBlockInput }` from `board/index.ts` only.
2. WHEN depcruise runs THEN `board-public-api-only`, `no-cross-board-interaction-imports`, `dock-no-board-internals`, and `capture-loop-client-via-transport` SHALL be error rules, each verified by a planted violation.
3. WHEN stores, screens, or board code perform HTTP THEN they SHALL call `transport/*` adapters — not `client.ts` directly.
4. WHEN `pnpm check` runs THEN all gates SHALL pass (666 tests baseline).

## Requirement Traceability

| ID | Status |
| -- | ------ |
| BDM-01 | Done |
| BDM-02 | Done |
| BDM-03 | Done |
| BDM-04 | Done |
