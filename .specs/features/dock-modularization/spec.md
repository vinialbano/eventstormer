# Dock modularization and proposal/contribute interactions

GitHub issue **#64**. Refactor only — facilitator dock behaviour stays unchanged.

## Problem Statement

`FacilitatorDock.vue` owns feed assembly, proposal review handlers, contribution submit,
pending grouping, and layout in one ~320-line script. That blocks later dock deep-module work
and makes interaction logic hard to test in isolation.

## Goals

- [ ] Feed assembly logic is out of the dock shell; the dock wires stores to the feed renderer.
- [ ] Proposal card actions dispatch through the transport module; accept still triggers board
      refetch via the existing shell event.
- [ ] Proposal review and contribution capture live under interaction folders, not mixed into
      the dock shell.
- [ ] Scope card, pending drawer, collapse/expand, and jump-to-card behaviour are unchanged.
- [ ] Existing facilitator dock tests pass.
- [ ] `pnpm check` passes.

## Out of Scope

| Item | Reason |
| ---- | ------ |
| Template/style changes beyond moves | Refactor only |
| New composable unit tests | Existing FacilitatorDock tests are the gate |
| Remove `dock/mutations.ts` shim | #68 |

## Assumptions

| Decision | Default |
| -------- | ------- |
| Feed composable | `dock/composables/use-dock-feed.ts` |
| Feed component | `dock/DockFeed.vue` |
| Review interaction | `dock/interactions/review-proposal/use-review-proposal.ts` |
| Contribute interaction | `dock/interactions/contribute/use-contribute.ts` |
| Transport | Existing `transport/proposals.ts` and `transport/session.ts` |

## Acceptance Criteria

1. WHEN the dock mounts THEN feed assembly SHALL come from `use-dock-feed` and render via `DockFeed`.
2. WHEN a proposal action runs THEN it SHALL route through transport via `use-review-proposal`.
3. WHEN a contribution is submitted THEN it SHALL route through transport via `use-contribute`.
4. WHEN existing FacilitatorDock tests run THEN all SHALL pass unchanged in behaviour.
5. WHEN `pnpm check` runs THEN all gates SHALL pass.

## Requirement Traceability

| ID | Status |
| -- | ------ |
| DM-01 | Done |
| DM-02 | Done |
| DM-03 | Done |
| DM-04 | Done |
| DM-05 | Done |
