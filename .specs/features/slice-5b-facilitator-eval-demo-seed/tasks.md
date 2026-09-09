# Slice 5b — Facilitator Eval + Demo Seed Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `spec-driven-development` skill (plugin-qualified:
`anoria-engineering:spec-driven-development`): **activate it by name and follow its Execute flow
and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source
of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier,
discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Design**: `.specs/features/slice-5b-facilitator-eval-demo-seed/design.md`
**Status**: Draft

**Open questions resolved (agent's discretion, per user "proceed" 2026-09-09):**
- Seed marker → `data/seed.json` file (no migration).
- Seed scope answer → replayed as a `set-scope` propose+accept.
- Eval `priorBlocks` → flat `string[]` of labels, folded as `domain-event` blocks.
- Seed orchestration lives in `src/host/seed.ts` (testable by the `domain` Vitest project); the
  `scripts/seed.ts` entry is a thin jiti shim.

---

## Test Coverage Matrix

> Generated from codebase (`AGENTS.md`, `docs/testing.md`, `vite.config.ts`, `package.json`,
> `.github/workflows`) and the spec. Confirm before Execute. Guidelines found: `AGENTS.md`,
> `docs/testing.md`, `docs/adr/008`, `vite.config.ts` (`coverage.thresholds`,
> `src/**/domain/** ≥ 90%`), `package.json`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Domain (`src/**/domain/**` — events, `decide`, `evolve`, read models) | unit | All branches; 1:1 to spec ACs; every listed edge case; ≥ 90% coverage (ADR-008 floor) | `src/**/*.test.ts` (Vitest `domain` project, `environment: node`) | `pnpm test` |
| Capability / infrastructure (`src/**/capabilities/**`, `src/**/infrastructure/**`, `src/host/**`) | unit / sociable integration | Happy + every listed edge + error/failure paths, through the public interface / route | `src/**/*.test.ts` | `pnpm test` |
| App (`src/app/**` — SFCs, stores, composables) | unit | Component renders every disposition/state; store drift fails; sociable adapters `*.integration.test.ts` | `src/app/**/*.test.ts` (Vitest `app` project, `jsdom`) | `pnpm test` |
| E2E (`e2e/**`) | e2e | The scripted relation flow: contribution → dock card → accept click → board → export, no `SPEC_DEVIATION` | `e2e/**/*.spec.ts` | `pnpm test:e2e` |
| Eval harness (`eval/**` — `run.ts`, `report.ts`) | unit | `scoreFixture` rows for every new `expect.*`; splice against a stub README | `eval/**/*.test.ts` (Vitest `eval` project — **out of the merge gate**, AD-027) | `pnpm vitest run --project eval` |
| Eval fixtures (`eval/fixtures/*.json`) | none (data) — completeness asserted in `run.test.ts` | one file per F11 assertion; parses; maps to a transcript turn | `eval/fixtures/*.json` | `pnpm vitest run --project eval` |
| Committed `k/N` README table (EVAL-05) | live run (HITL — needs `ANTHROPIC_API_KEY`) | `pnpm eval --report` splices only between the markers | `README.md` | `pnpm eval --report` |
| `data/seed.json`, `package.json` script, docs | none | build / doc-link gate only | — | `pnpm check` |

## Gate Check Commands

> Generated from `package.json` + `.github/workflows`. Confirm before Execute.

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | After a task with unit tests only (domain / capability / app) | `pnpm test` |
| Eval | After an EVAL harness/oracle/fixture task | `pnpm test && pnpm vitest run --project eval` |
| Full | After an e2e task, or a task touching the accept/apply seam | `pnpm test && pnpm test:e2e` |
| Build | After a phase, or a config / docs / data-only task | `pnpm check && pnpm build && pnpm test:e2e` |

- `pnpm check` = `check:process-ids → typecheck → lint → test → depcruise → knip` (fail-fast).
- Sensor / mutation checks run in a **separate git worktree** (`docs/testing.md`), never the
  shared checkout — the Verifier sub-agent uses `isolation: "worktree"`.

---

## Execution Plan

Phases are ordered and run sequentially; tasks within a phase execute in order.

### Phase 1: SUPS substrate — `domain-model-capture`

```
T1
```

### Phase 2: SUPS events + domain folds — `session-facilitation/domain`

```
T2 → T3 → T4 → T5
```

### Phase 3: SUPS wiring — `session-facilitation` capabilities + tick

```
T6 → T7
```

### Phase 4: SUPS + PCARD — `src/app`

```
T8 → T9 → T10 → T11 → T12 → T13
```

### Phase 5: EVAL

```
T14 → T15 → T16 → T17 → T18
```

### Phase 6: SEED

```
T19 → T20 → T21
```

---

## Task Breakdown

### T1: `ApplyResult` gains an explicit `outcome`

**What**: Add `outcome: 'appended' | 'already-satisfied'` to `ApplyResult`; set
`'already-satisfied'` in the empty-decision arm and on a `duplicate-id` reconverge, `'appended'`
on a real append.
**Where**: `src/domain-model-capture/infrastructure/apply-operation.ts`, `apply-operation.test.ts`
**Depends on**: None
**Reuses**: existing `applyOperation` retry loop
**Requirement**: SUPS-01

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] `ApplyResult.outcome` present; both `ok(...)` arms set it; `duplicate-id` reconverge path sets `'already-satisfied'`
- [ ] `apply-operation.test.ts` asserts `outcome` for: fresh append, already-satisfied relation, `duplicate-id` reconverge
- [ ] Every existing caller still compiles (additive field)
- [ ] Gate: `pnpm test` · Test count: baseline + ≥3

**Tests**: unit
**Gate**: quick
**Commit**: `feat(domain-model-capture): ApplyResult carries an explicit appended/already-satisfied outcome`

---

### T2: `Resolution Superseded` + `Model Change Superseded` events

**What**: Add both event shapes to the Zod SSOT — `Resolution Superseded { resolutionId,
hotSpotId, supersededByReference, at }` on `ResolutionEvent`; `Model Change Superseded {
proposalId, target, supersededByLabel, at }` on `ProposalEvent`.
**Where**: `src/session-facilitation/domain/schema/events.ts`, `events.test.ts`
**Depends on**: None
**Reuses**: `ResolutionReference`, `BuildingBlockId`, existing event union pattern
**Requirement**: SUPS-02, SUPS-03

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] Both events parse; both join their discriminated unions
- [ ] `events.test.ts` round-trips a sample of each; a bad payload is rejected
- [ ] Gate: `pnpm test` · Test count: baseline + ≥2

**Tests**: unit
**Gate**: quick
**Commit**: `feat(session-facilitation): add Resolution Superseded / Model Change Superseded events`

---

### T3: `Resolution` decide + evolve — record superseded, disposition stays `APPLIED`

**What**: Add `Record Resolution Superseded` to `ResolutionCommand`; `decide` emits
`Resolution Superseded` when the resolution is `ACCEPTED`; `evolve` folds it to
`{ disposition: 'APPLIED', superseded: true }`. Add `superseded?: boolean` to
`ResolutionWriteModel`.
**Where**: `src/session-facilitation/domain/resolution/{model,decide,evolve}.ts`, their `*.test.ts`
**Depends on**: T2
**Reuses**: existing `Record Hot Spot Resolved` command/evolve path
**Requirement**: SUPS-05, SUPS-06

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] `Given(Proposed, Accepted) / When(Record Resolution Superseded) / Then(Resolution Superseded)`
- [ ] `Given(… , Resolution Superseded) / When(Record Resolution Superseded) / Then([])` (idempotent)
- [ ] `replay` of a stream ending `Resolution Superseded` → `{ disposition: 'APPLIED', superseded: true }` (pinned literal, not a fold-vs-fold)
- [ ] `decide` rejects the command from `PROPOSED` / terminal `LAPSED`
- [ ] Gate: `pnpm test` · Test count: baseline + ≥4

**Tests**: unit
**Gate**: quick
**Commit**: `feat(session-facilitation): Resolution records a superseding contribution without leaving APPLIED`

---

### T4: `Proposal` decide + evolve — record model-change superseded

**What**: Add `Record Model Change Superseded` to `ProposalCommand`; `decide` emits
`Model Change Superseded` when disposition is `APPLIED` and no marker is present; `evolve` folds
it to `superseded: true`, disposition unchanged. Add `superseded?: boolean` to the proposal
write model.
**Where**: `src/session-facilitation/domain/proposal/{model,decide,evolve}.ts`, their `*.test.ts`
**Depends on**: T2
**Reuses**: T3's shape (mirror)
**Requirement**: SUPS-05, SUPS-06

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] `Given(… , Operation Applied) / When(Record Model Change Superseded) / Then(Model Change Superseded)`
- [ ] Second `Record Model Change Superseded` → `[]` (idempotent)
- [ ] `replay` ending `Model Change Superseded` → disposition `APPLIED`, `superseded: true` (pinned literal)
- [ ] `decide` returns `[]` (not an error) when disposition is not `APPLIED`
- [ ] Gate: `pnpm test` · Test count: baseline + ≥4

**Tests**: unit
**Gate**: quick
**Commit**: `feat(session-facilitation): Proposal records a superseding reword without leaving APPLIED`

---

### T5: `resolutionsView` / `proposalsView` — fold `superseded`

**What**: Add `superseded?: boolean` (+ the winning reference/label) to `ResolutionCard` /
model-change `ProposalCard`, folded from the write model. Pure — no board read.
**Where**: `src/session-facilitation/domain/read-models/{resolutions-view,proposals-view}.ts`,
their `*.test.ts`
**Depends on**: T3, T4
**Reuses**: existing `resolutionCard` / `proposalCard` fold
**Requirement**: SUPS-06

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] A stream carrying the marker → `superseded: true` + `supersededByReference` / `supersededByLabel`
- [ ] A stream without it → field absent (no `superseded: false` noise unless the existing style uses explicit false)
- [ ] No `store` / board import added to either read model (depcruise stays green)
- [ ] Gate: `pnpm test` · Test count: baseline + ≥3

**Tests**: unit
**Gate**: quick
**Commit**: `feat(session-facilitation): surface superseded on the resolution / proposal card`

---

### T6: `review-resolution/accept.ts` — record superseded on `already-satisfied`

**What**: After `applyOperation`, when `applied.value.outcome === 'already-satisfied'`, read the
board hot spot's current `reference`; if it differs from this resolution's reference, append
`Record Resolution Superseded { supersededByReference }` instead of `Record Hot Spot Resolved`;
if equal, keep `Record Hot Spot Resolved` (genuine idempotent no-op).
**Where**: `src/session-facilitation/capabilities/review-resolution/accept.ts`, `accept.test.ts`
**Depends on**: T1, T3
**Reuses**: `readBoardSnapshot` from `domain-model-capture/api.ts` (already an allowed import here)
**Requirement**: SUPS-02

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] Two resolutions, same hot spot, different reference: second stream ends `Accept Resolution, Resolution Superseded`; card `{ disposition: 'APPLIED', superseded: true }`
- [ ] Two resolutions, same reference: second stream ends `Record Hot Spot Resolved` (no marker)
- [ ] Board read returns no block (withdrawn hot spot mid-race) → falls through to `Record Hot Spot Resolved`
- [ ] Handler still returns `200` with the card in every superseded case
- [ ] Per-context transaction discipline unchanged (board append ≠ resolution append)
- [ ] Gate: `pnpm test && pnpm test:e2e` · Test count: baseline + ≥3

**Tests**: integration
**Gate**: full
**Commit**: `feat(session-facilitation): a losing resolution race records that it was superseded`

---

### T7: `supersededRewordSweep` in `reconcilePendingDerivations`

**What**: New `superseded-sweep.ts` exporting `supersededRewordSweep(deps)`: for each open
session, each `APPLIED` `reword` model-change proposal with no `Model Change Superseded`, read
the board label for `intent.target`; if it differs from the proposal's `newLabel`, append
`Record Model Change Superseded { supersededByLabel }`. Wire the call into
`reconcilePendingDerivations`.
**Where**: `src/session-facilitation/capabilities/interpret-contribution/superseded-sweep.ts`
(+ `.test.ts`), `interpret-contribution/interpret.ts` (wire), `deps.ts` if a dep is missing
**Depends on**: T1, T4
**Reuses**: `reconcilePendingDerivations` open-session iteration, `readBoardSnapshot`,
`sessionProposalIds`
**Requirement**: SUPS-03

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] Two rewords, one target, different labels: after a tick the earlier proposal's stream gains `Model Change Superseded { supersededByLabel: <later label> }`
- [ ] A second tick is a no-op (marker-present guard)
- [ ] Same label on both → no marker
- [ ] Closed session → skipped; the open-sessions-only bound is in the function's doc comment (AD-021)
- [ ] No `.specs/` id in any comment (`pnpm check:process-ids`)
- [ ] Gate: `pnpm test && pnpm test:e2e` · Test count: baseline + ≥4

**Tests**: integration
**Gate**: full
**Commit**: `feat(session-facilitation): reconcile a superseded reword onto the earlier proposal`

---

### T8: dock renders a superseded card state

**What**: Add `superseded?: boolean` to `ProposalCard` / `ResolutionCard` in `types.ts`; in
`ProposalCard.vue` / `ResolutionCard.vue` render a distinct `superseded` receipt ("another
contribution's text was kept") instead of the plain `APPLIED` ✓ receipt.
**Where**: `src/app/capture-loop/types.ts`, `src/app/capture-loop/dock/{ProposalCard,ResolutionCard}.vue`,
their `*.test.ts`
**Depends on**: T5
**Reuses**: the existing `state` computed + `pc--receipt` styling
**Requirement**: SUPS-07

**Tools**: MCP: NONE · Skill: `impeccable` (the receipt copy + treatment — a one-surface tweak, run `/impeccable` if the state needs more than a copy swap)

**Done when**:

- [ ] Component test: `superseded: true` renders the superseded text, not the applied receipt
- [ ] `superseded` absent / false → unchanged applied receipt
- [ ] `types.ts` shape matches the server card (a store test would fail on drift)
- [ ] Gate: `pnpm test` · Test count: baseline + ≥2

**Tests**: unit
**Gate**: quick
**Commit**: `feat(app): show a superseded state on the resolution / proposal card`

---

### T9: `types.ts` mirrors the model-change `intent` card

**What**: Add `intent?: { kind: 'relation'|'pivotal'|'reword'; summary: string; endpoints?:
{id,label}[]; target?: {id,label}; newLabel?: string }` to `ProposalCard`; mirror in the
transport type. Store test asserts no drift from `proposalsView`'s `IntentCard`.
**Where**: `src/app/capture-loop/types.ts`, `src/app/capture-loop/transport/proposals.ts`,
`src/app/capture-loop/stores/proposals.test.ts`
**Depends on**: None (server already returns `intent`)
**Reuses**: `proposalsView` `IntentCard` shape (`src/session-facilitation/domain/read-models/proposals-view.ts`)
**Requirement**: PCARD-01

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] `ProposalCard.intent` typed; transport parses it
- [ ] Store test loads a fixture with an `intent` card and exposes it unchanged
- [ ] Gate: `pnpm test` · Test count: baseline + ≥1

**Tests**: unit
**Gate**: quick
**Commit**: `feat(app): mirror the model-change intent card shape`

---

### T10: `ProposalCard.vue` renders a model-change proposal

**What**: When `intent` is present: pill `= kindLabel(intent.kind)`, body `= intent.summary`,
source quote as today, Accept / Reject / Hold actions. Add `relation` / `pivotal` / `reword` to
`kind-label.ts`.
**Where**: `src/app/capture-loop/dock/ProposalCard.vue`, `src/app/capture-loop/dock/kind-label.ts`,
`ProposalCard.test.ts`, `kind-label.test.ts`
**Depends on**: T9
**Reuses**: all disposition / held / overflow machinery in `ProposalCard.vue`
**Requirement**: PCARD-02

**Tools**: MCP: NONE · Skill: `impeccable` (the model-change card visual — pill colour, summary layout)

**Done when**:

- [ ] Component test: a relation, a pivotal, and a reword card each render summary + pill + actions
- [ ] Every disposition (`PROPOSED`…`LAPSED`, held) renders without error for a model-change card
- [ ] A card with neither `blockKind` nor `intent` renders nothing (guard)
- [ ] Gate: `pnpm test` · Test count: baseline + ≥6

**Tests**: unit
**Gate**: quick
**Commit**: `feat(app): ProposalCard renders relation / pivotal / reword proposals`

---

### T11: model-change edit affordance → `POST /proposals/:id/edit`

**What**: In `ProposalCard.vue`, the edit action on a model-change card emits a structured
payload (changed endpoint / target / `newLabel`); `use-review-proposal.ts` maps it to
`POST /proposals/:id/edit`'s `changed` shape.
**Where**: `src/app/capture-loop/dock/ProposalCard.vue`,
`src/app/capture-loop/dock/interactions/review-proposal/use-review-proposal.ts`, their `*.test.ts`
**Depends on**: T10
**Reuses**: the existing `edit` emit + `use-review-proposal` POST wiring
**Requirement**: PCARD-04

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] Editing a reword card's `newLabel` POSTs `{ changed: { newLabel } }`
- [ ] Editing a relation endpoint POSTs `{ changed: { <field>: <id> } }`
- [ ] `intent.kind` is never sent (immutable — `Model Change Edited` contract)
- [ ] Gate: `pnpm test` · Test count: baseline + ≥3

**Tests**: unit
**Gate**: quick
**Commit**: `feat(app): edit a model-change proposal from the dock`

---

### T12: `DockFeed` + `PendingDrawer` wire model-change cards

**What**: `DockFeed.vue` live cluster and `PendingDrawer.vue` overflow / parked groups render
model-change cards via the shared component; `liveLabel` / pill fallbacks cover `intent`.
**Where**: `src/app/capture-loop/dock/DockFeed.vue`, `src/app/capture-loop/dock/PendingDrawer.vue`,
their `*.test.ts`
**Depends on**: T10
**Reuses**: existing cluster / drawer rendering
**Requirement**: PCARD-02, PCARD-05

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] A model-change card in the live cluster renders (DockFeed test)
- [ ] A model-change card in overflow and in "parked by you" renders (PendingDrawer test)
- [ ] No `blockKind`-pill crash for a model-change card
- [ ] Gate: `pnpm test` · Test count: baseline + ≥3

**Tests**: unit
**Gate**: quick
**Commit**: `feat(app): model-change proposals in the dock feed and pending drawer`

---

### T13: e2e accepts the relation proposal via a dock click

**What**: In `e2e/artifacts-and-relations.spec.ts` replace the `POST /proposals/:id/accept`
step with a dock interaction (find the relation card, click Accept); delete the `SPEC_DEVIATION`
docblock.
**Where**: `e2e/artifacts-and-relations.spec.ts`
**Depends on**: T10, T11
**Reuses**: the scripted-facilitator fixture + the rest of the spec unchanged
**Requirement**: PCARD-03, PCARD-06

**Tools**: MCP: NONE · Skill: `playwright-cli` (drive / verify the running app)

**Done when**:

- [ ] The relation proposal is accepted by clicking the rendered dock card
- [ ] The board gains the `follows` edge and the export carries it + the composite stamp (unchanged assertions)
- [ ] `grep -rn SPEC_DEVIATION e2e/` returns nothing about the proposal accept path
- [ ] Gate: `pnpm test:e2e` · Test count: 6 specs pass

**Tests**: e2e
**Gate**: full
**Commit**: `test(e2e): accept the scripted relation proposal from the dock`

---

### T14: eval oracles for the new assertions

**What**: Add pure fns to `eval-oracles.ts`: `flagsPhase` (alias / keep `hasFlagPhase`),
`attributesToFormat(tracks, word)`, `proposesRelation(tracks, {kind, labels})`,
`proposesPivotal(tracks, {kind, label})`, `proposesReword(tracks, {from, to})`. Endpoint labels
matched by order + case-insensitive substring.
**Where**: `src/session-facilitation/infrastructure/facilitator/eval-oracles.ts`, `eval-oracles.test.ts`
**Depends on**: None
**Reuses**: `contentWords`, `RELATION_FIELDS`, `FacilitationTrack` type
**Requirement**: EVAL-03

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] Each oracle has a positive + negative case over hand-authored `FacilitationTrack[]`
- [ ] `proposesRelation` respects endpoint order and `relationKind`
- [ ] No network, no Zod import
- [ ] Gate: `pnpm test` · Test count: baseline + ≥10

**Tests**: unit
**Gate**: quick
**Commit**: `feat(session-facilitation): eval oracles for relation / pivotal / reword / phase / format`

---

### T15: extend `EvalFixture` + `scoreFixture`

**What**: Add `phaseFlagged` / `attributesToFormat` / `relation` / `pivotal` / `reword` to
`EvalFixture.expect` and `priorBlocks?: string[]` to `EvalFixture`; `parseExpect` /
`parseFixture` validate them; `scoreFixture` emits one `EvalRow` per present key;
`facilitationContext` gets `priorBlocks` folded as `domain-event` blocks.
**Where**: `eval/run.ts`, `eval/run.test.ts`
**Depends on**: T14
**Reuses**: existing `parseExpect` / `scoreFixture` / `loadFixtures`
**Requirement**: EVAL-01, EVAL-02

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] `parseFixture` accepts the new keys, rejects malformed ones (throws with the file name)
- [ ] `scoreFixture` produces the right rows for a fixture with `relation` + `kind`
- [ ] `priorBlocks` reaches `facilitationContext.buildingBlocks`
- [ ] A fixture-set completeness assertion: every F11 assertion has ≥1 fixture
- [ ] Gate: `pnpm vitest run --project eval` · Test count: baseline + ≥5

**Tests**: unit
**Gate**: eval
**Commit**: `feat(eval): fixture schema + scoring for the remaining F11 assertions`

---

### T16: the six new fixture files

**What**: `eval/fixtures/{phase-flagged,deeper-format,relation,pivotal,reword,integration-relation,integration-pivotal}.json`
— contributions taken from `transcript.md` turns 5–11 (table in `design.md`), with `priorBlocks`
where the readiness gate needs board context. Add them to `FIXTURE_FILES` in `run.ts`.
**Where**: `eval/fixtures/*.json`, `eval/run.ts` (`FIXTURE_FILES`)
**Depends on**: T15
**Reuses**: `transcript.md`, existing fixture JSON shape
**Requirement**: EVAL-02

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] 7 new files (5 single + 2 integration), each parses via `parseFixture`
- [ ] `FIXTURE_FILES` lists them; `run.test.ts` completeness assertion passes
- [ ] Each fixture's contribution text is a verbatim (or lightly-trimmed) `transcript.md` turn
- [ ] Gate: `pnpm vitest run --project eval` · Test count: unchanged + fixtures load
- [ ] Build gate: `pnpm check` (knip / lint on `run.ts`)

**Tests**: none (data — completeness asserted in T15's `run.test.ts`)
**Gate**: build
**Commit**: `feat(eval): fixtures for phase / format / relation / pivotal / reword / integration`

---

### T17: reconcile the "deliberately untested" inventory

**What**: Remove the README + ADR-008 bullet claiming "the real model's decision to propose a
relation / pivotal / reword" is untested; point ADR-008 at the eval. Keep the
`smoke:facilitation-schema` line.
**Where**: `README.md`, `docs/adr/008-testing-eval-and-observability.md`
**Depends on**: T16
**Reuses**: —
**Requirement**: DOC-01, DOC-02

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] The stale bullet is gone from both files; the eval is referenced instead
- [ ] `pnpm check` offline doc-link job passes
- [ ] No machine-specific path, no `.specs/` id
- [ ] Gate: `pnpm check`

**Tests**: none
**Gate**: build
**Commit**: `docs: the facilitator relation / pivotal / reword decision is eval-covered now`

---

### T18: run `pnpm eval --report`, commit the `k/N` table (HITL)

**What**: With `ANTHROPIC_API_KEY` set, run `pnpm eval --report`; commit the README table
between the `<!-- eval:results -->` markers. Note flaky rows' spread per ADR-008.
**Where**: `README.md` (between markers only)
**Depends on**: T14, T15, T16, T17
**Reuses**: `pnpm eval --report`
**Requirement**: EVAL-04, EVAL-05

**Tools**: MCP: NONE · Skill: NONE
**Note**: needs the API key — runs in the main window / by the operator, **not** in a sub-agent
batch. ~$1–2. If a fixture scores implausibly low (0/5), treat it as a fixture bug (wrong
`priorBlocks` / endpoint labels), not a model regression — fix the fixture and re-run.

**Done when**:

- [ ] `pnpm eval` prints a `k/5` line for every assertion in EVAL-02
- [ ] `git diff README.md` shows only the marker block changed
- [ ] Any `k/5` with k ≤ 2 has a one-line note on its run-level spread
- [ ] Gate: `pnpm check` (doc-link, lint on README)

**Tests**: none (live run)
**Gate**: build
**Commit**: `docs: publish the facilitator eval k/N results`

---

### T19: seed interpretation fixture + scripted facilitator

**What**: `scripts/seed/interpretation.json` — `{ [contributionBody]: FacilitationTurn }` for
every `transcript.md` turn + the scope answer, with the relation / pivotal / reword strands.
`scripts/seed/facilitator.ts` — `seedScriptedFacilitator(script): Facilitator` that looks up by
body and throws on a miss.
**Where**: `scripts/seed/interpretation.json`, `scripts/seed/facilitator.ts`, `scripts/seed/facilitator.test.ts`
**Depends on**: None
**Reuses**: the `Facilitator` port; `e2e/fixtures/facilitator-relations.json` as a shape
reference; `transcript.md`
**Requirement**: SEED-01

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] Every `transcript.md` turn body is a key; each value parses as a `FacilitationTurn`
- [ ] `seedScriptedFacilitator` returns the mapped turn; throws (with the body) on an unknown contribution
- [ ] `facilitator.test.ts` covers hit + miss
- [ ] Gate: `pnpm test` · Test count: baseline + ≥2

**Tests**: unit
**Gate**: quick
**Commit**: `feat(seed): committed interpretation fixture + scripted facilitator`

---

### T20: `src/host/seed.ts` — offline replay through the real handlers

**What**: `runSeed(deps, { force }): { workshopId }` — resolve the db path, refuse (or `--force`
wipe) an existing `data/seed.json` marker, then drive `createRoutes(config)` via `app.request()`:
start workshop → propose+accept scope → start session → per turn: contribution, run
`interpretContribution` / the derive tick, accept each proposal → write `data/seed.json`.
**Where**: `src/host/seed.ts`, `src/host/seed.test.ts`
**Depends on**: T19
**Reuses**: `createRoutes`, `loadConfig` shape, `interpretContribution`, `reconcilePendingDerivations`
**Requirement**: SEED-02, SEED-03, SEED-04

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] Integration test: a fresh `runSeed` against a temp db yields the expected block / relation / hot-spot counts (pinned literals)
- [ ] Board state is produced only through `app.request` handler calls (no direct stream writes)
- [ ] Re-run without `force` → refusal (returns / throws a typed "already seeded"); with `force` → wipes the marked workshop's streams, re-seeds
- [ ] No outbound HTTP (assert the scripted facilitator is used; no `ANTHROPIC_API_KEY` read)
- [ ] Gate: `pnpm test && pnpm test:e2e` · Test count: baseline + ≥3

**Tests**: integration
**Gate**: full
**Commit**: `feat(seed): offline demo workshop replayed through the real capability handlers`

---

### T21: `pnpm seed` CLI shim + `pnpm check` wiring

**What**: `scripts/seed.ts` — thin jiti entry that parses `--force`, calls `runSeed`, prints
`workshop <id>` + `/workshops/<id>` or the refusal, sets exit code. Add `"seed"` to
`package.json` scripts. Ensure `scripts/seed*.ts` is inside `tsconfig.include` / lint / knip.
**Where**: `scripts/seed.ts`, `package.json`, `tsconfig.json` / `knip.json` if needed
**Depends on**: T20
**Reuses**: `scripts/spike-structured-output.ts` jiti-entry pattern
**Requirement**: SEED-01, SEED-05

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] `pnpm seed` on a clean checkout exits 0, prints the id + URL, no network
- [ ] `pnpm seed` again → exits 1 with a message naming `--force`
- [ ] `pnpm seed --force` → exits 0
- [ ] `pnpm check` green (typecheck / lint / knip see `scripts/seed.ts`)
- [ ] Gate: `pnpm check && pnpm build && pnpm test:e2e`

**Tests**: none (CLI shim — logic tested in T20)
**Gate**: build
**Commit**: `feat(seed): pnpm seed`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6

Phase 1:  T1
Phase 2:  T2 → T3 → T4 → T5
Phase 3:  T6 → T7
Phase 4:  T8 → T9 → T10 → T11 → T12 → T13
Phase 5:  T14 → T15 → T16 → T17 → T18
Phase 6:  T19 → T20 → T21
```

Execution is strictly sequential — no intra-phase parallelism.

**Batch packing (~7 tasks/worker, whole phases):**

| Batch | Phases | Tasks | Count |
| --- | --- | --- | --- |
| A | 1 + 2 + 3 | T1–T7 | 7 |
| B | 4 | T8–T13 | 6 |
| C | 5 | T14–T18 | 5 (T18 is HITL — main window) |
| D | 6 | T19–T21 | 3 |

→ offer 4 batch sub-agents at Execute (Batch C's T18 runs in the main window after the worker
reports T14–T17). Batches run sequentially.

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1 | 1 return type + tests | ✅ |
| T2 | 2 event shapes, 1 file | ✅ cohesive |
| T3 | 1 aggregate's decide+evolve+model | ✅ cohesive (one concept) |
| T4 | 1 aggregate's decide+evolve+model | ✅ cohesive |
| T5 | 2 read-model folds, 1 field each | ✅ cohesive |
| T6 | 1 handler branch | ✅ |
| T7 | 1 sweep fn + 1 wire point | ✅ |
| T8 | 2 SFC receipt states + 1 type | ✅ cohesive |
| T9 | 1 type mirror | ✅ |
| T10 | 1 SFC render branch + label map | ✅ cohesive |
| T11 | 1 edit affordance + its POST mapping | ✅ cohesive |
| T12 | 2 container SFCs, same wiring | ✅ cohesive |
| T13 | 1 e2e spec edit | ✅ |
| T14 | 5 pure oracle fns, 1 file | ✅ cohesive |
| T15 | 1 schema + 1 scorer extension | ✅ cohesive |
| T16 | 7 data files + 1 list | ✅ cohesive (data) |
| T17 | 2 doc edits | ✅ cohesive |
| T18 | 1 live run + 1 commit | ✅ |
| T19 | 1 fixture + 1 port impl | ✅ cohesive |
| T20 | 1 orchestration fn | ✅ |
| T21 | 1 CLI shim + wiring | ✅ |

---

## Diagram-Definition Cross-Check

| Task | Depends On (body) | Diagram | Status |
| --- | --- | --- | --- |
| T1 | None | — | ✅ |
| T2 | None | — | ✅ |
| T3 | T2 | T2→T3 | ✅ |
| T4 | T2 | T2→T3→T4 (chain; T4 also needs T2 only — diagram chains for order) | ✅ (order arrow; true dep T2) |
| T5 | T3, T4 | T4→T5 | ✅ (T3 via chain) |
| T6 | T1, T3 | Phase 3 after Phase 1+2 | ✅ |
| T7 | T1, T4 | Phase 3 after Phase 1+2 | ✅ |
| T8 | T5 | Phase 4 after Phase 2 | ✅ |
| T9 | None | Phase 4 chain | ✅ (independent; ordered) |
| T10 | T9 | T9→T10 | ✅ |
| T11 | T10 | T10→T11 | ✅ |
| T12 | T10 | T10→…→T12 (chain) | ✅ (true dep T10) |
| T13 | T10, T11 | T11→…→T13 (chain) | ✅ |
| T14 | None | Phase 5 chain | ✅ (independent; ordered) |
| T15 | T14 | T14→T15 | ✅ |
| T16 | T15 | T15→T16 | ✅ |
| T17 | T16 | T16→T17 | ✅ |
| T18 | T14–T17 | T17→T18 (chain) | ✅ |
| T19 | None | Phase 6 chain | ✅ |
| T20 | T19 | T19→T20 | ✅ |
| T21 | T20 | T20→T21 | ✅ |

> Phase-internal chains are drawn as a single arrow line for order; the task body's `Depends on`
> lists only the *true* upstream. Every true dep points backward or within-phase. ✅

---

## Test Co-location Validation

| Task | Layer created/modified | Matrix requires | Task says | Status |
| --- | --- | --- | --- | --- |
| T1 | domain-model-capture infrastructure | unit | unit | ✅ |
| T2 | domain schema | unit | unit | ✅ |
| T3 | domain (resolution aggregate) | unit | unit | ✅ |
| T4 | domain (proposal aggregate) | unit | unit | ✅ |
| T5 | domain (read models) | unit | unit | ✅ |
| T6 | capability (review-resolution) | unit/integration | integration | ✅ |
| T7 | capability + tick | unit/integration | integration | ✅ |
| T8 | app (SFC + type) | unit | unit | ✅ |
| T9 | app (type + transport) | unit | unit | ✅ |
| T10 | app (SFC) | unit | unit | ✅ |
| T11 | app (SFC + composable) | unit | unit | ✅ |
| T12 | app (SFC) | unit | unit | ✅ |
| T13 | e2e | e2e | e2e | ✅ |
| T14 | infrastructure (oracles) | unit | unit | ✅ |
| T15 | eval harness | unit | unit | ✅ |
| T16 | eval fixtures (data) | none (completeness in T15) | none | ✅ (matrix: data → none) |
| T17 | docs | none | none | ✅ |
| T18 | docs (live run) | none | none | ✅ |
| T19 | scripts fixture + port impl | unit | unit | ✅ |
| T20 | `src/host` orchestration | unit/integration | integration | ✅ |
| T21 | CLI shim | none (logic in T20) | none | ✅ |

> No ❌. T16/T21 are `none` only because the matrix rows for data files and CLI shims are
> `none` with their real coverage in T15 / T20 respectively — not deferral of a required layer.

---

## MCPs and Skills

**Available MCPs**: `context7` (library docs — unlikely needed; the stack is settled).
**Available Skills**: `impeccable` (T8, T10 — the two new card visuals), `playwright-cli` (T13,
and verifying any `src/app/` change), `testing-boss` (reference while writing the sensor-facing
tests).

Per-task tool notes are in each task's **Tools** field. Default: no MCP, no skill.

---

## Status

Approved — In Progress. Branch `slice-5b-facilitator-eval-demo-seed` (planning: `fe2210b`).

### Execution Log

- **Batch A (T1–T7) ✅ 2026-09-09** — `a82ea40` T1 · `948dde4` T2 · `24535c4` T3 · `f061aa3` T4
  · `e700608` T5 · `72b76e4` T6 · `9cd9577` T7. `pnpm check` 1188 tests (+28) + `pnpm build` +
  `pnpm test:e2e` 6/6 green. AD-040 in STATE.md (T1). Notes: commit subjects backtick the leading
  identifier (commitlint `subject-case`); `already-satisfied` on `duplicate-id` only after a
  stale-position retry (first-attempt `duplicate-id` stays a `Rejection` — existing behaviour);
  `ResolutionWriteModel`/`ProposalWriteModel` gained `supersededBy{Reference,Label}?` companions
  so T5 folds from the write model; T6's "withdrawn hot spot" edge lands `LAPSED` via the
  existing path (the guard defensively covers `null`/`undefined`); `supersededRewordSweep` is one
  tail call in `reconcilePendingDerivations`.
- **Batch B (T8–T13) ⚠️ 2026-09-09** — `b7a1c30` T8 · `a1f00b3` T9 · `bfc84a7` T10 · `6953ead`
  T11 · `7c20c63` T12 · `35625fd` T13 · `eecf1ea` (phase-final test fixup). `pnpm check` 1208
  tests (+20) + build + e2e 6/6 green. `impeccable` not used — fallback: `pc--superseded` /
  `rc--superseded` + `pc__pill--intent` on existing tokens. **T11 partial — PCARD-04 relation /
  pivotal endpoint edit NOT built** (only reword `newLabel` edit is wired end-to-end). Also
  touched (justified pass-throughs, outside task file lists): `FacilitatorDock.vue`,
  `transport/proposals.ts`; store-drift test went to `stores/stores.test.ts` (the file that
  exists). Pre-existing app `ProposalCard` `modelAffecting` drift left alone.
  → **PCARD-04 decision pending (see below).**
- **Batch C (T14–T18)** — pending (T18 HITL).
- **Batch D (T19–T21)** — pending.
- **Verifier** — after Batch D.
