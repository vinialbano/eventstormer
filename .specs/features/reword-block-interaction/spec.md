# Reword-block interaction module

GitHub issue **#66**. Refactor only — ADR-007 two-step reword flow unchanged.

## Goals

- [ ] Reference loading is a testable, framework-free adapter.
- [ ] Confirm loading, error, and posting phases are a composable state machine.
- [ ] Confirm POSTs a board operation and emits board-dirty; no optimistic label update.
- [ ] Cancel at any step returns to idle without side effects.
- [ ] Existing reword confirm tests pass or are relocated with equivalent coverage.
- [ ] `pnpm check` passes.

## Structure

| Piece | Location |
| ----- | -------- |
| Reference adapter | `board/interactions/reword-block/reword-references.ts` |
| Confirm state machine | `board/interactions/reword-block/reword-confirm.ts` |
| Interaction composable | `board/interactions/reword-block/use-reword-block.ts` |
| Popover UI | `board/interactions/reword-block/RewordConfirm.vue` |

## Requirement Traceability

| ID | Status |
| -- | ------ |
| RBI-01 | Done |
| RBI-02 | Done |
| RBI-03 | Done |
| RBI-04 | Done |
| RBI-05 | Done |
| RBI-06 | Done |
