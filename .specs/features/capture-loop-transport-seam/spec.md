# Capture-loop transport seam and hidden-dependency fixes

GitHub issue **#62**. Refactor only — capture-loop behaviour stays unchanged.

## Problem Statement

Capture-screen mutations live in `dock/mutations.ts` beside dock UI, the facilitator dock
reads the board projection store for live block labels (violating `no-cross-store-imports`
intent), the reword popover can create its own portal host, and the withdrawn-visibility
toggle sits on the board Pinia store even though it is client view-state. These couplings
make later modularization (#64, #67) and contract cleanup (#68) harder.

## Goals

- [ ] Group capture-screen POST adapters in a dedicated transport module by concern
      (proposals, session, board).
- [ ] Shell-provided block labels for the facilitator dock — no board-store import in dock UI.
- [ ] Single declared reword portal target; no runtime portal creation in `RewordConfirm`.
- [ ] Withdrawn visibility in view-state; board store holds projection data only.
- [ ] `pnpm check` green with no capture-loop behaviour regression.

## Out of Scope

| Item | Reason |
| ---- | ------ |
| Remove `dock/mutations.ts` shim | #68 contract ticket (blocked by #67) |
| Dock modularization (#64) | Separate ticket |
| Board deep-module API (#67) | Separate ticket |
| New capture-loop behaviour | Refactor only |

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Transport folder | `src/app/capture-loop/transport/{proposals,session,board}.ts` | Matches issue grouping; `client.ts` stays the fetch primitive | y (issue) |
| Shim location | `dock/mutations.ts` re-exports transport | Issue allows shim until #68 | y (issue) |
| Block labels prop shape | `Readonly<Record<string, string>>` keyed by building-block id | Shell derives from `board.snapshot.blocks`; simple prop contract | y |
| View-state module | `view-state/board-view.ts` composable | Keeps `showWithdrawn` + timeline derivation out of the Pinia store | y |
| `startSession` POST | Moves to `transport/session.ts` | Session write grouped with scope/contributions | y |

**Open questions:** none.

## User Stories

### P1: Transport seam ⭐ MVP

**User Story**: As a maintainer, I want mutation POSTs grouped by concern so transport is
findable and dock/board UI does not own HTTP paths.

**Acceptance Criteria**:

1. WHEN a proposal action runs THEN the POST SHALL route through `transport/proposals.ts`.
2. WHEN a session action runs (contribution, scope, start session) THEN the POST SHALL route
   through `transport/session.ts`.
3. WHEN a board operation runs THEN the POST SHALL route through `transport/board.ts`.
4. WHEN existing code imports `dock/mutations.ts` THEN imports SHALL keep working via re-export
   shim until #68.

**Independent Test**: Unit tests hit each transport module; `dock/mutations.ts` re-exports
preserve existing import paths.

### P1: Decouple facilitator dock from board store ⭐ MVP

**User Story**: As a maintainer, I want the dock to receive block labels from the composition
shell so dock UI does not import the board projection store.

**Acceptance Criteria**:

1. WHEN `FacilitatorDock` renders an applied proposal card with a `buildingBlockId` THEN the
   label SHALL come from a shell-provided map, not `useBoardStore`.
2. WHEN the board snapshot updates after reword THEN the shell SHALL pass updated labels and
   receipt text SHALL reflect the new label.

**Independent Test**: `FacilitatorDock.test.ts` passes `blockLabels` prop instead of seeding
board store.

### P1: Single reword portal ⭐ MVP

**User Story**: As a maintainer, I want one portal host for the reword confirmation popover.

**Acceptance Criteria**:

1. WHEN `CaptureScreen` mounts THEN it SHALL declare `#reword-portal`.
2. WHEN `RewordConfirm` opens THEN it SHALL portal to that target only — no `document.body`
   fallback host creation.

**Independent Test**: `RewordConfirm` has no `ensurePortal` / `createElement` path.

### P1: Withdrawn toggle in view-state ⭐ MVP

**User Story**: As a user, I want toggling withdrawn visibility to filter the wall locally
without a server round-trip, with the toggle living outside the board projection store.

**Acceptance Criteria**:

1. WHEN the capture screen loads THEN withdrawn blocks SHALL be hidden by default.
2. WHEN the user toggles show-withdrawn THEN the wall SHALL update without fetch.
3. WHEN inspecting the board Pinia store THEN `showWithdrawn` and `timeline` SHALL NOT be
   store fields — view-state owns them.

**Independent Test**: View-state test for default/toggle/no-fetch; board store test covers
projection load only.

## Edge Cases

- WHEN board stream 404s THEN view-state timeline is empty; toggle still works on empty snapshot.
- WHEN `buildingBlockId` is missing on a card THEN dock uses the proposal card label (unchanged).
- WHEN transport shim is removed in #68 THEN call sites already on `transport/*` paths.

## Requirement Traceability

| ID | Story | Status |
| -- | ----- | ------ |
| CLT-01 | P1 Transport — proposals | Pending |
| CLT-02 | P1 Transport — session | Pending |
| CLT-03 | P1 Transport — board | Pending |
| CLT-04 | P1 Transport — shim | Pending |
| CLT-05 | P1 Dock labels from shell | Pending |
| CLT-06 | P1 Single reword portal | Pending |
| CLT-07 | P1 Withdrawn in view-state | Pending |
| CLT-08 | P1 `pnpm check` green | Pending |

## Success Criteria

- [ ] All CLT requirements verified
- [ ] Existing capture-loop unit tests pass unchanged in behaviour
- [ ] `pnpm check` passes on branch
