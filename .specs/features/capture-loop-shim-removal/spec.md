# Capture-loop shim removal and structure finalization

GitHub issue **#68**. Refactor only — capture-loop behaviour stays unchanged.

## Problem Statement

The transport seam (#62) left `dock/mutations.ts` as a backward-compat re-export shim until the
board deep-module API (#67) landed. With architecture rules in place, the shim and its test are
dead weight and confuse agents about where HTTP adapters live.

## Goals

- [ ] Remove `dock/mutations.ts` and `dock/mutations.shim.test.ts`.
- [ ] Confirm all call sites already use `transport/*` paths.
- [ ] Add a short `AGENTS.md` scope note for the capture-loop folder.
- [ ] `pnpm check` passes with no behaviour regression.

## Out of Scope

| Item | Reason |
| ---- | ------ |
| New capture-loop behaviour | Contract cleanup only |
| Transport module changes | Already final |

## Acceptance Criteria

1. WHEN searching `src/` THEN no `dock/mutations` import or re-export SHALL remain.
2. WHEN `pnpm check` runs THEN all gates SHALL pass.
3. WHEN `src/app/capture-loop/AGENTS.md` exists THEN it SHALL describe folder boundaries without
   process ids or machine-specific paths.

## Requirement Traceability

| ID | Status |
| -- | ------ |
| CLS-01 | Done |
| CLS-02 | Done |
| CLS-03 | Done |
