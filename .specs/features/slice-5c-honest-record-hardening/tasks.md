# Slice 5c — Honest-Record Hardening Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `spec-driven-development` skill (plugin-qualified:
`anoria-engineering:spec-driven-development`): **activate it by name and follow its Execute flow
and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of
truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier,
discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Design**: `.specs/features/slice-5c-honest-record-hardening/design.md`
**Status**: Approved (2026-09-18)

---

## Test Coverage Matrix

> Generated from codebase sampling. Guidelines found: `AGENTS.md` ("Write comments and docs...",
> the process-id ban), `vitest.config.ts` (domain layer ≥ 90% branch/line/stmt/fn floor, ADR-008),
> `docs/testing.md` (not re-read in full here — sampled test files below are the floor). Sampled:
> `accept.test.ts`, `interpret.test.ts`, `reconcile.test.ts`, `decide.test.ts` (domain-model-capture
> board), `session-transcript.test.ts`, `http.test.ts` (session-transcript / summary capabilities),
> `ProposalCard.test.ts`, `use-review-proposal.test.ts`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Domain (`session-facilitation/domain/**`, `domain-model-capture/domain/**`) | unit | All branches; 1:1 to spec ACs; every listed edge case (≥ 90% floor, ADR-008) | `src/**/domain/**/*.test.ts` (co-located) | `pnpm test` |
| Infrastructure (`session-facilitation/infrastructure/**`) | unit/integration | Key paths + idempotency/retry behavior (sweep, reconciliation) | `src/**/infrastructure/**/*.test.ts` | `pnpm test` |
| Capability route (`capabilities/**/http.ts`, `accept.ts`) | integration | Happy path + every listed edge case + error/failure paths, via `hono/testing` `testClient` | `src/**/capabilities/**/*.test.ts` | `pnpm test` |
| App component / composable (`src/app/**`) | unit (Vue Test Utils) | Render + prop/emit contract + error-state behavior | `src/app/**/*.test.ts` | `pnpm test` |
| Entity / schema / config (zod schemas, comment-only changes) | none | Build gate only | — | `pnpm typecheck` |
| Cross-slice / E2E | e2e | Existing scenarios must stay green; no new e2e required unless a task states one | `e2e/**/*.spec.ts` | `pnpm test:e2e` |

## Gate Check Commands

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | After a domain-only or schema-only task | `pnpm typecheck && pnpm test` |
| Full | After a task touching a capability route, infrastructure sweep, or app component | `pnpm typecheck && pnpm lint && pnpm test` |
| Build | After the last task in a phase, and always before the final commit | `pnpm check` (process-ids → typecheck → lint → test → depcruise → knip) |

---

## Execution Plan

Phases are ordered and run sequentially — each phase completes before the next begins, and tasks
within a phase execute in order. Phases 3–6 are functionally independent of each other (no shared
files across F5/F4/F9/P2) but Phase 4 (F7 sweep) hard-depends on Phase 3's file
(`review-resolution/accept.ts`) already carrying the F6 fix before it is extracted, so the
declared phase order also serves as the safe execution order.

### Phase 1: F5 — honest `blocksAdded` (HREC-05, 06, 07)

```
T1 → T2 → T3
```

### Phase 2: F4 — transcript resolution lane (HREC-01, 02, 03, 04)

```
T4 → T5 → T6 → T7 → T8
```

### Phase 3: F6 — `review-resolution` records every rejection (HREC-08)

```
T9
```

### Phase 4: F7 — no stream stuck `ACCEPTED` (HREC-09, 10, 11, 12)

```
T10 → T11 → T12 → T13
```

### Phase 5: F9 — `decide.ts` convergence-scope comment (HREC-13, 14)

```
T14
```

### Phase 6: P2 — dock relation/pivotal endpoint edit (HREC-15, 16, 17)

```
T15 → T16 → T17
```

---

## Task Breakdown

### T1: Thread `outcome` through the `Record Operation Applied` command / `Operation Applied` event

**What**: Add an optional `outcome?: 'appended' | 'already-satisfied'` field to the
`Record Operation Applied` command and `Operation Applied` event in the `Proposal` aggregate, and
pass it through in `decideRecordApplied`.
**Where**: `src/session-facilitation/domain/proposal/model.ts` (command + event union members),
`src/session-facilitation/domain/schema/events.ts` (`OperationApplied` zod schema),
`src/session-facilitation/domain/proposal/decide.ts` (`decideRecordApplied`)
**Depends on**: None
**Reuses**: `ApplyResult.outcome` shape (AD-040) — mirrored field name/values, not imported (the
`Proposal` domain never imports `domain-model-capture`)
**Requirement**: HREC-05, HREC-06 (foundation)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `outcome` is optional on both the command and the event (schema + type)
- [x] `decideRecordApplied` forwards `command.outcome` onto the emitted event unchanged
- [x] A pre-existing event with no `outcome` still parses (`OperationApplied.parse` on a fixture
      missing the field succeeds)
- [x] `decide.test.ts` (proposal) asserts the event carries `outcome` when the command supplies it
- [x] Gate check passes: `pnpm typecheck && pnpm test`

**Tests**: unit
**Gate**: quick

---

### T2: Record the outcome on `recordApplyOutcome`

**What**: `review-proposal/accept.ts`'s `recordApplyOutcome` passes
`outcome: applied.value.outcome` into the `Record Operation Applied` command on the `applied.ok`
branch (the `duplicate-id` branch keeps no `outcome` — it has no `ApplyResult` to read one from,
so it stays implicitly `'appended'`-equivalent per the fallback rule).
**Where**: `src/session-facilitation/capabilities/review-proposal/accept.ts`
**Depends on**: T1
**Reuses**: existing `recordApplyOutcome` structure — one field added to one call
**Requirement**: HREC-05, HREC-06

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] A relation/pivotal/resolve proposal whose apply converges to `'already-satisfied'` records
      an `Operation Applied` event with `outcome: 'already-satisfied'`
- [x] A real append records `outcome: 'appended'`
- [x] `accept.test.ts` (review-proposal) covers both branches with the real event asserted, not
      just the HTTP response
- [x] Existing accept-chain tests stay green (no behavior change to the HTTP response shape)
- [x] Gate check passes: `pnpm typecheck && pnpm lint && pnpm test`

**Tests**: integration
**Gate**: full

---

### T3: Exclude superseded / converged-no-op applies from `blocksAdded`

**What**: In `assembleFacilitationContext`'s `priors` reduce (`interpret.ts`), change the
per-proposal count from `.filter((event) => event.type === 'Operation Applied').length` to: skip
the proposal if its write model is `superseded`; otherwise count 1 only if it has an
`Operation Applied` event whose `outcome` is `undefined` or `'appended'`.
**Where**: `src/session-facilitation/capabilities/interpret-contribution/interpret.ts` (lines
~134-137)
**Depends on**: T2
**Reuses**: `replayProposal` (already imported in this file for other derivations)
**Requirement**: HREC-05, HREC-06, HREC-07

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] Two proposals racing one relation (one `appended`, one `already-satisfied`) count as 1
- [x] A superseded reword is not counted
- [x] Every-proposal-applied-normally happy path count is unchanged from today's value (no
      regression)
- [x] A historical proposal stream with an `Operation Applied` event carrying no `outcome` field
      still counts (fallback — no crash, no under-count)
- [x] `interpret.test.ts` covers all four cases above
- [x] Gate check passes: `pnpm typecheck && pnpm lint && pnpm test`

**Tests**: unit
**Gate**: full

---

### T4: Add the `TranscriptResolution` shape to the `SessionTranscript` contract

**What**: Add a `TranscriptResolution` zod object (`resolutionId`, `hotSpotId`, `reference`,
`disposition` enum incl. `'superseded'`, optional `supersededByReference`) and a
`resolutions: z.array(TranscriptResolution)` field on `SessionTranscript`.
**Where**: `src/session-facilitation/domain/read-models/session-transcript-contract.ts`
**Depends on**: None
**Reuses**: the existing `TranscriptProposal` / `ContributorCount` pattern in the same file
**Requirement**: HREC-01

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `SessionTranscript.parse` accepts a fixture with a non-empty `resolutions` array and with an
      empty one
- [x] `disposition` enum includes `'superseded'` alongside the six proposal-lane values
- [x] No test needed beyond the type-checking build gate (schema-only layer)
- [x] Gate check passes: `pnpm typecheck`

**Tests**: none
**Gate**: quick

---

### T5: Derive the resolution lane in `sessionTranscript`

**What**: `sessionTranscript` gains a `resolutionStreams: { resolutionId, events }[]` parameter;
for each id in `sessionResolutionIds(sessionEvents)`, map its `resolutionCard` to a
`TranscriptResolution` — disposition is the lowercased `resolutionCard.disposition` via a
`DISPOSITION` lookup mirroring the proposal one, **except** when `resolutionCard.superseded` is
true, in which case `disposition` is the literal `'superseded'`.
**Where**: `src/session-facilitation/domain/read-models/session-transcript.ts`
**Depends on**: T4
**Reuses**: `resolutionCard`, `sessionResolutionIds` (`resolutions-view.ts`) — zero new derivation
**Requirement**: HREC-01, HREC-02

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] A session with one applied, one lapsed, and one superseded resolution produces three
      `resolutions` entries with the right dispositions (the spec's own Independent Test)
- [x] The superseded entry reads `disposition: 'superseded'`, not `'applied'`
- [x] A session that proposed no resolutions produces `resolutions: []`
- [x] `session-transcript.test.ts` covers all three cases
- [x] Gate check passes: `pnpm typecheck && pnpm test`

**Tests**: unit
**Gate**: quick

---

### T6: Wire `readSessionTranscript` to load resolution streams

**What**: Load `sessionResolutionIds(sessionEvents)` and each `resolutionStream(id)`, pass the
resulting `resolutionStreams` into `sessionTranscript`.
**Where**: `src/session-facilitation/infrastructure/read-session-transcript.ts`
**Depends on**: T5
**Reuses**: the existing proposal-stream loading two lines above it — identical shape
**Requirement**: HREC-01

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `readSessionTranscript` on a session with resolutions returns a contract whose
      `resolutions` array matches T5's fixture shape end to end
- [x] Existing `read-session-transcript` behavior (workshop/session-not-found errors) unchanged
- [x] Gate check passes: `pnpm typecheck && pnpm test`

**Tests**: unit
**Gate**: quick

---

### T7: `renderTranscript` resolution-lane formatting

**What**: Add a `resolutionsSection` helper rendering a `## Resolutions` heading + one line per
`TranscriptResolution` (reference, disposition, `supersededByReference` if present); render it
only when `transcript.resolutions.length > 0`. Stays a pure function of the contract (ADR-008).
**Where**: `src/derived-artifact-generation/domain/render-transcript.ts`
**Depends on**: T4 (contract shape)
**Reuses**: `quoteLine`, the `contributionsTable` heading/table style already in this file
**Requirement**: HREC-01, HREC-02, HREC-03, HREC-04

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] Same contract in → byte-identical Markdown out across two renders (purity, ADR-008)
- [x] An empty `resolutions` array renders no `## Resolutions` heading at all (not an empty one)
- [x] A non-empty array renders one line per entry, superseded entries visibly distinct
- [x] `render-transcript.test.ts` (new or extended) covers all three
- [x] Gate check passes: `pnpm typecheck && pnpm test`

**Tests**: unit
**Gate**: quick

---

### T8: End-to-end transcript resolution-lane test

**What**: Extend `session-transcript`'s capability `http.test.ts`
(`src/derived-artifact-generation/capabilities/session-transcript/http.test.ts`) with a scenario
that proposes, accepts, and races resolutions through the real HTTP routes, then asserts the
rendered Markdown contains the resolution section with the right dispositions.
**Where**: `src/derived-artifact-generation/capabilities/session-transcript/http.test.ts`
**Depends on**: T6, T7
**Reuses**: the existing `seeded()` / `getTranscript()` test helpers in this file
**Requirement**: HREC-01, HREC-02, HREC-03, HREC-04 (integration)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] A full request/response cycle shows a resolved hot spot's disposition in the exported
      transcript (this is also the spec's `Success Criteria` line: "`pnpm test:e2e` (or an
      integration test) shows a resolved hot spot in the exported F19 transcript")
- [x] Byte-identical-response regression test (already in this file) still passes with the wider
      contract
- [x] Gate check passes: `pnpm typecheck && pnpm lint && pnpm test`

**Tests**: integration
**Gate**: full

---

### T9: `review-resolution` records every rejection reason

**What**: In `acceptResolutionRoutes`, replace the `LAPSE_REASONS.has(...)` gate on *recording*
with: always append `Record Resolution Rejected { reason: applied.error.kind }` on any
`applied.ok === false` branch, **then** branch only on `LAPSE_REASONS` to pick the response —
`200` with the resolution card for a lapse reason, `422` for everything else (the recording now
happens before either response).
**Where**: `src/session-facilitation/capabilities/review-resolution/accept.ts`
**Depends on**: None
**Reuses**: `decideOrEmpty` (already in this file), `decideRecordRejected` (no domain change
needed — `reason: z.string().min(1)` already accepts any string)
**Requirement**: HREC-08

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] Any board rejection appends `Hot Spot Resolution Rejected { reason }` before the response is
      returned, for every possible `applied.error.kind`
- [x] A `LAPSE_REASONS` member still returns 200 with the resolution card
- [x] A non-`LAPSE_REASONS` reason still returns 422, but the `Resolution` stream now ends
      `Hot Spot Resolution Rejected`, not stuck `ACCEPTED`
- [x] `accept.test.ts` (review-resolution) covers both the lapse and the non-lapse recording paths
- [x] Gate check passes: `pnpm typecheck && pnpm lint && pnpm test`

**Tests**: integration
**Gate**: full

---

### T10: Extract `acceptProposal(deps, id): Handled`

**What**: Move the body of `acceptRoutes`'s `POST /proposals/:id/accept` handler (id→birth
lookup, session/workshop lookup, `APPLIED`/`session-closed` short-circuits, dispatch to
`acceptModelChange`/`acceptBuildingBlock`) into an exported `acceptProposal(deps, id): Handled`
function. The route becomes a thin wrapper: `const handled = acceptProposal(deps, id); return
context.json(handled.json, handled.status)` (with the 404 cases handled the same way they are
today, before calling `acceptProposal`, or folded into it — whichever keeps the extraction
mechanical).
**Where**: `src/session-facilitation/capabilities/review-proposal/accept.ts`
**Depends on**: None
**Reuses**: 100% of the existing handler logic — this is a pure move, not a rewrite
**Requirement**: HREC-09 (prep — no new behavior)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `acceptProposal` is exported and callable with just `(deps, id)`
- [x] The full existing `accept.test.ts` (review-proposal) suite passes unchanged — same status
      codes, same JSON bodies, zero test edits (this is the regression gate for the extraction)
- [x] Gate check passes: `pnpm typecheck && pnpm lint && pnpm test`

**Tests**: integration
**Gate**: full

---

### T11: Extract `acceptResolution(deps, id): Handled`

**What**: Same extraction as T10, applied to `acceptResolutionRoutes`'s
`POST /resolutions/:id/accept` handler body (already carrying T9's fix).
**Where**: `src/session-facilitation/capabilities/review-resolution/accept.ts`
**Depends on**: T9 (extract the already-fixed logic, not the pre-fix version)
**Reuses**: 100% of the existing handler logic
**Requirement**: HREC-09 (prep)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `acceptResolution` is exported and callable with just `(deps, id)`
- [x] The full existing `accept.test.ts` (review-resolution) suite, including T9's new tests,
      passes unchanged
- [x] Gate check passes: `pnpm typecheck && pnpm lint && pnpm test`

**Tests**: integration
**Gate**: full

---

### T12: `stuck-accepted-sweep.ts` — re-drive stuck `ACCEPTED` streams

**What**: New module exporting `sweepStuckAccepted(deps, sessionId): void`. For each id in
`sessionProposalIds(sessionEvents)` whose `replayProposal(...).disposition === 'ACCEPTED'`, log
`info` and call `acceptProposal(deps, id)`; log `warn` if the disposition is still `ACCEPTED`
afterward. Same for each id in `sessionResolutionIds(sessionEvents)` with `acceptResolution`. Doc
comment states the open-sessions-only bound (inherited from the caller, per AD-021) and that a
closed-session race during re-drive is a documented accepted gap (no `.specs/` id in the comment).
**Where**: new file `src/session-facilitation/infrastructure/stuck-accepted-sweep.ts`
**Depends on**: T10, T11
**Reuses**: the `superseded-sweep.ts` shape (iterate, guard, act, no new abstraction);
`sessionProposalIds`, `sessionResolutionIds`
**Requirement**: HREC-09, HREC-10, HREC-11, HREC-12

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] Fault-inject a crash between the board append and the outcome append (append the board
      operation directly, skip the outcome-record append, leaving the `Proposal` `ACCEPTED`);
      calling `sweepStuckAccepted` reaches `APPLIED`
- [x] Calling `sweepStuckAccepted` twice on the same now-resolved stream is a no-op the second time
      (idempotent — HREC-10)
- [x] A stream `ACCEPTED` for a session that closes between read and re-drive is left `ACCEPTED`
      (the extracted function's own `session-closed` guard fires) and a `warn` is logged
- [x] An `info` line is logged for every re-drive attempt
- [x] `stuck-accepted-sweep.test.ts` covers all four cases (the spec's own Independent Test:
      "Fault-inject a crash... run the tick; assert the proposal reaches APPLIED")
- [x] Gate check passes: `pnpm typecheck && pnpm lint && pnpm test`

**Tests**: unit/integration
**Gate**: full

---

### T13: Wire the sweep into `reconcilePendingDerivations`

**What**: Add `sweepStuckAccepted(deps, sessionId)` to the per-open-session loop in
`reconcilePendingDerivations`, alongside the existing `reconcileHotSpots` / `finishClose` calls.
Update the function's doc comment to mention the new sweep and restate the open-sessions-only
bound in this one place (no duplicate restatement needed in T12's file-level comment beyond a
one-line pointer).
**Where**: `src/session-facilitation/capabilities/interpret-contribution/interpret.ts` (the
`reconcilePendingDerivations` export, ~line 585)
**Depends on**: T12
**Reuses**: the existing loop — one line added
**Requirement**: HREC-09, HREC-11

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `reconcile.test.ts` (interpret-contribution) has a scenario driving the fault-injected
      stuck-`ACCEPTED` case through `reconcilePendingDerivations` end to end (not just the unit
      module from T12) and asserts the proposal/resolution resolves within one tick
- [x] Existing `reconcile.test.ts` / `interpret.test.ts` suites stay green
- [x] Gate check passes: `pnpm typecheck && pnpm lint && pnpm test`

**Tests**: integration
**Gate**: full

---

### T14: `decide.ts` convergence-scope comment

**What**: Add a comment directly above the `export const decide` docstring stating that `ok([])`
convergence is deliberately scoped to the facilitator-reachable kinds (relation / pivotal /
`resolve` / `insert-between` / `unlink-cause`) and that `withdraw` / `reinstate` / `reopen` /
`unsequence` / `unannotate` stay genuine failures for single-user v1. **Do NOT cite `AD-038`
(or any `AD-NNN`) in the comment** — `scripts/check-process-ids.sh` bans the bare `AD-[0-9]+`
pattern anywhere under `src/**`/`e2e/**` with no exception for a decision-log id (only
`docs/adr/NNN`-style ADR references and PRD `F01`-style ids are exempt, and neither applies
here since this decision has no standalone ADR doc). State the reasoning in prose instead —
drop the tag, keep the reasoning, per `AGENTS.md`'s own example.
**Where**: `src/domain-model-capture/domain/board/decide.ts` (~line 515, directly above
`export const decide`)
**Depends on**: None
**Reuses**: nothing — comment-only
**Requirement**: HREC-13, HREC-14

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] The comment states the deliberate scope and names both kind lists
- [x] `grep` finds it adjacent to `export const decide`
- [x] `pnpm check:process-ids` passes — the comment contains no `AD-NNN` id and no `.specs/`
      task id
- [x] Gate check passes: `pnpm typecheck && pnpm lint`

**Tests**: none
**Gate**: quick

---

### T15: Dock endpoint editor for a relation/pivotal card

**What**: Extend `ProposalCard.vue`'s `editableIntent` computed to also cover `relation` and
`pivotal` kinds. For those kinds, render an endpoint picker (options from `props.intent.endpoints`
for a relation, or the single `props.intent.target` for a pivotal) + a label text input, and on
confirm emit `'edit-intent', { field, label }` where `field` is the chosen endpoint's
`RELATION_FIELDS[relationKind]` member (relation) or the literal `'target'` (pivotal) — mirroring
the existing reword `newLabel` emit path in shape.
**Where**: `src/app/capture-loop/dock/ProposalCard.vue`,
`src/session-facilitation/domain/read-models/proposals-view.ts` (server-side prerequisite, see
correction below), `src/app/capture-loop/types.ts` (mirror the widened shape)
**Depends on**: None
**Reuses**: the existing `editing` / `draft` / emit pattern (lines ~58-86 today)
**Requirement**: HREC-15, HREC-17

**CORRECTION (found during Execute, 2026-09-18):** the original text of this task assumed
`IntentCard.endpoints` already carried a per-endpoint `field` name. It does not —
`intentCard()`'s relation branch (`proposals-view.ts:96-106`) builds `endpoints` as
`{ id, label }[]` only, discarding the `RELATION_FIELDS[intent.relationKind]` field name it maps
over locally. The client has no other way to learn which `RELATION_FIELDS` member each endpoint
is (it never receives `relationKind` either — only the free-text `summary`). This is a genuine
design gap, not scope creep: HREC-15's own AC1 requires the field mapping, so closing it is part
of this task, not a separate one. **Authorized minimal additive fix**: widen `intentCard`'s
relation-branch `endpoints` map to `{ id, label, field }[]` (the `field` value comes from the
`RELATION_FIELDS[intent.relationKind]` entry already being iterated — one line, `.flatMap`
instead of `.map().filter()`, or an equivalent no-behavior-change-otherwise restructure). Update
`proposals-view.test.ts` and `http.test.ts` (session-facilitation) fixtures/assertions to expect
the added `field` — this widens an existing assertion's expected value, it does not weaken one.
No `IntentCard.target` (pivotal) change needed — the pivotal `field` is always the literal
`'target'`, already knowable client-side with no server data.

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `IntentCard.endpoints` (relation) carries `field` per entry, sourced from
      `RELATION_FIELDS[intent.relationKind]`; `proposals-view.test.ts` / `http.test.ts` updated to
      assert it
- [x] A `relation` card renders an endpoint selector (one option per `endpoints` entry) + label
      input; confirming emits `edit-intent` with the correct `field` (read from the endpoint's own
      `field`, not re-derived client-side)
- [x] A `pivotal` card renders a single target label input; confirming emits `edit-intent` with
      `field: 'target'`
- [x] `ProposalCard.test.ts` covers both kinds' emit payloads
- [x] Gate check passes: `pnpm typecheck && pnpm lint && pnpm test`

**Tests**: unit
**Gate**: full

---

### T16: `unknown-label` 422 keeps the endpoint-edit form open

**What**: Verify (and, if missing, fix) that `use-review-proposal.ts`'s `onEditIntent` /
`editModelChangeProposal` → `run(...)` path surfaces a `unknown-label` 422 to `ProposalCard.vue`
without clearing the person's in-progress endpoint/label input — the same guarantee the reword
path already has.
**Where**: `src/app/capture-loop/dock/interactions/review-proposal/use-review-proposal.ts`,
`src/app/capture-loop/dock/ProposalCard.vue`
**Depends on**: T15
**Reuses**: the existing `run()` wrapper's rejected-promise propagation
**Requirement**: HREC-16

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] A rejected `editModelChangeProposal` call (simulating a 422) leaves `editing` state intact
      in `ProposalCard.vue` — the draft input is not lost
- [x] `use-review-proposal.test.ts` and/or `ProposalCard.test.ts` covers the 422 path for the new
      endpoint editor
- [x] Gate check passes: `pnpm typecheck && pnpm lint && pnpm test`

**Tests**: unit
**Gate**: full

---

### T17: `ProposalIntent` app type mirrors the server `IntentCard` exactly

**What**: Confirm (or extend) `src/app/capture-loop/types.ts`'s `ProposalIntent` carries every
field the server's `IntentCard`/`proposalsView` intent shape exposes for `relation` (per-endpoint
`field` name) and `pivotal` (`target.field`), and add a store-level test that fails if the two
drift (e.g., asserting the app type's keys against a fixture shaped like the server's real JSON
response for each intent kind).
**Where**: `src/app/capture-loop/types.ts`, its nearest existing store test file (extend, e.g.
`src/app/capture-loop/stores/proposals.test.ts` if present, else co-located with `types.ts`'s
consumer)
**Depends on**: T15
**Reuses**: the server's `IntentCard` shape (`proposals-view.ts`) as the source of truth to assert
against
**Requirement**: HREC-17

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `ProposalIntent` carries whatever field the endpoint editor (T15) needs to build its
      `{ field, label }` POST body for both `relation` and `pivotal`
- [ ] A new/extended test fails if a future server response shape for `endpoints`/`target` drops a
      field the app type declares required
- [ ] Gate check passes: `pnpm typecheck && pnpm lint && pnpm test`

**Tests**: unit
**Gate**: full

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6

Phase 1:  T1 ──→ T2 ──→ T3
Phase 2:  T4 ──→ T5 ──→ T6 ──→ T7 ──→ T8
Phase 3:  T9
Phase 4:  T10 ──→ T11 ──→ T12 ──→ T13
Phase 5:  T14
Phase 6:  T15 ──→ T16 ──→ T17
```

Execution is strictly sequential — there is no intra-phase parallelism. Phases 1, 2, 3, 5, 6 touch
disjoint files and have no real cross-phase data dependency on each other; they are ordered here
only because Phase 4 depends on Phase 3's file already carrying the T9 fix before extraction. A
batch-packing split (see Sub-Agent Delegation below) may still assign them to different workers
running in sequence — the phase order above is what each worker's batch must respect internally.

**How phase-based execution works**: 17 tasks total → offer sub-agent batching (≈ 3 workers at the
~7-task budget: e.g. Batch A = Phases 1–3 (T1–T9, 9 tasks — one over budget but Phase 3 is a single
task that cannot be split further and Phases 1–2 are a tight thematic pair), Batch B = Phase 4
(T10–T13, 4 tasks), Batch C = Phases 5–6 (T14–T17, 4 tasks)). Batches run sequentially. See the
skill's `sub-agents.md` for the full packing/offer/summary contract.

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1: Thread `outcome` through command/event | 1 cohesive type contract across 3 files (inseparable for compilation) | ✅ Granular |
| T2: Record the outcome on `recordApplyOutcome` | 1 function | ✅ Granular |
| T3: Exclude superseded/no-op from `blocksAdded` | 1 function | ✅ Granular |
| T4: `TranscriptResolution` contract shape | 1 file, 1 schema addition | ✅ Granular |
| T5: Derive resolution lane in `sessionTranscript` | 1 function | ✅ Granular |
| T6: Wire `readSessionTranscript` | 1 function | ✅ Granular |
| T7: `renderTranscript` resolution formatting | 1 function + 1 helper | ✅ Granular |
| T8: E2E transcript resolution-lane test | 1 test file extension | ✅ Granular |
| T9: `review-resolution` records every rejection | 1 route handler | ✅ Granular |
| T10: Extract `acceptProposal` | 1 function extraction | ✅ Granular |
| T11: Extract `acceptResolution` | 1 function extraction | ✅ Granular |
| T12: `stuck-accepted-sweep.ts` | 1 new module, 1 function | ✅ Granular |
| T13: Wire sweep into `reconcilePendingDerivations` | 1 function, 1 line | ✅ Granular |
| T14: `decide.ts` comment | 1 comment | ✅ Granular |
| T15: Dock endpoint editor | 1 component | ✅ Granular |
| T16: 422 keeps form open | 1 composable + 1 component (cohesive pair) | ✅ Granular |
| T17: `ProposalIntent` mirrors server | 1 type + 1 test | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | (start of Phase 1 chain) | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | T2 | T2 → T3 | ✅ Match |
| T4 | None | (start of Phase 2 chain) | ✅ Match |
| T5 | T4 | T4 → T5 | ✅ Match |
| T6 | T5 | T5 → T6 | ✅ Match |
| T7 | T4 | Drawn as T6 → T7 (sequential chain) — T7's real dependency (T4) is earlier in the same phase, so the drawn arrow is a valid (if looser) ordering, not a violation | ✅ Match (no backward/cross-phase dependency) |
| T8 | T6, T7 | T7 → T8 | ✅ Match |
| T9 | None | (start of Phase 3) | ✅ Match |
| T10 | None | (start of Phase 4 chain) | ✅ Match |
| T11 | T9 | Drawn as T10 → T11 — T11's real dependency (T9) is an earlier phase, satisfied by phase ordering | ✅ Match (no backward/cross-phase violation) |
| T12 | T10, T11 | T11 → T12 | ✅ Match |
| T13 | T12 | T12 → T13 | ✅ Match |
| T14 | None | (Phase 5, single task) | ✅ Match |
| T15 | None | (start of Phase 6 chain) | ✅ Match |
| T16 | T15 | T15 → T16 | ✅ Match |
| T17 | T15 | Drawn as T16 → T17 — T17's real dependency (T15) is earlier in the same phase | ✅ Match (no backward/cross-phase violation) |

No task depends on a task in a later phase. Every phase-internal diagram arrow corresponds to a
real `Depends on` (possibly a looser same-phase ordering where a task's true dependency is earlier
than its immediate diagram predecessor, which is always safe — never a violation of the "never
depends on a later phase" rule).

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 | Domain (proposal model/decide/schema) | unit | unit | ✅ OK |
| T2 | Capability route (accept.ts) | integration | integration | ✅ OK |
| T3 | Infrastructure (interpret.ts) | unit (infra key-path) | unit | ✅ OK |
| T4 | Entity/schema | none | none | ✅ OK |
| T5 | Domain (session-transcript.ts) | unit | unit | ✅ OK |
| T6 | Infrastructure (read-session-transcript.ts) | unit/integration | unit | ✅ OK |
| T7 | Domain (render-transcript.ts, derived-artifact-generation) | unit | unit | ✅ OK |
| T8 | Capability route (http.ts, session-transcript) | integration | integration | ✅ OK |
| T9 | Capability route (accept.ts) | integration | integration | ✅ OK |
| T10 | Capability route (accept.ts) | integration | integration | ✅ OK |
| T11 | Capability route (accept.ts) | integration | integration | ✅ OK |
| T12 | Infrastructure (new sweep module) | unit/integration | unit/integration | ✅ OK |
| T13 | Infrastructure (interpret.ts) | unit/integration | integration | ✅ OK |
| T14 | Comment-only | none | none | ✅ OK |
| T15 | App component (ProposalCard.vue) | unit (Vue Test Utils) | unit | ✅ OK |
| T16 | App composable + component | unit | unit | ✅ OK |
| T17 | App type + store test | unit | unit | ✅ OK |

No violations. No task defers its tests to a later task; every task's own `Done when` includes the
tests that exercise the code it introduces.

---

## Tips

(carried from the template — see `references/tasks.md` for the full list)
