# Slice 5b — Facilitator Eval + Demo Seed Specification

GitHub issue: [#92](https://github.com/vinialbano/eventstormer/issues/92) · Blocked by #42
(Slice 5, merged as PR #91) · Blocks #43 (Slice 6) · Parent effort map #9 ·
Version target **0.7.0** (`minor` changeset; the version PR is the only writer of
`package.json` `version` — [ADR-009](../../../docs/adr/009-versioning-and-release.md)).

**Status**: Specify — awaiting confirmation.

**Scope note.** Issue #92 was split out of #42 (PR #91) as the tracks that depend on a
maintainer-owned deliverable — the restaurant / kitchen-order narration
([ADR-008](../../../docs/adr/008-testing-eval-and-observability.md) "Demo domain"). That
narration now exists as a written transcript
(`transcript.md`, provided 2026-09-08); the eval fixtures and the `pnpm seed` session derive
from it. **The recorded demo video is dropped** — the original plan (record, then transcribe
the recording) is inverted now that the transcript is authored directly, and the video has no
code dependency (its only stated downstream, the eval + seed, is satisfied by the transcript).
This slice covers **four tracks**:

1. **F11 facilitator eval suite** — complete the ADR-008 fixture set (add the phase-flagged,
   deeper-format, relation/pivotal/reword, and two integration cases to the four that ship
   today), publish the `k/N` table in the README.
2. **`pnpm seed`** — a CLI that loads the demo workshop from a committed, deterministic
   interpretation of the transcribed narration.
3. **A superseded contribution says so** (PR #91 review W2 / W5 + audit F1–F3) — an explicit
   `ApplyResult` outcome, a `Resolution Superseded` / `Model Change Superseded` marker event,
   and a distinct card state. The wider honest-record surface (transcript lane, `blocksAdded`,
   backstops — audit F4–F9) is **slice 5c**.
4. **In-dock proposal card for model-change proposals** (F04/F07 P1 UI) — the Vue `ProposalCard`
   renders relation / pivotal / reword intent cards, removing the `POST /proposals/:id/accept`
   `SPEC_DEVIATION` in `e2e/artifacts-and-relations.spec.ts`.

## Problem Statement

The facilitator's relation / pivotal / reword judgment is measured by no automated check — it
sits on the ADR-008 "deliberately untested" list — so a prompt change that degrades it ships
silently. There is no one-command way to get a populated model on screen for a demo or a
first run. When two people race a resolution or a reword, the board converges correctly
(AD-038) but the loser's card claims `APPLIED` against text that never landed, with no signal
that another contribution won. And the facilitator can propose a relation, a pivotal mark, or
a reword, but the dock renders only building-block proposals, so those proposals can be
accepted only by calling the raw endpoint.

## Goals

- [ ] `pnpm eval` runs the full ADR-008 fixture set — every F11 assertion has at least one
      fixture case — and `pnpm eval --report` splices a per-case × per-assertion `k/N` table
      into the README between the `<!-- eval:results -->` markers.
- [ ] `pnpm seed` exits `0` with no network call and no API key, leaving a workshop whose id
      it prints; opening that workshop in `pnpm dev` shows a populated board and a session
      transcript that matches the narration.
- [ ] A losing same-target `resolve` or `reword` contribution's card shows a `superseded`
      state naming that it was overtaken by another contribution — driven by a marker event on
      that `Resolution` / `Model Change` stream, not a read-model guess.
- [ ] The dock renders a relation / pivotal / reword proposal as an intent card with
      Accept / Edit / Reject / Hold, and `e2e/artifacts-and-relations.spec.ts` accepts it by a
      dock click with no `POST /proposals/:id/accept` `SPEC_DEVIATION`.

## Out of Scope

| Feature | Reason |
| --- | --- |
| A recorded demo walkthrough video | Dropped — no code dependency; the seeded board under `pnpm dev` is itself the live demo. File separately if ever wanted. |
| Re-baking the seed interpretation against the live model on every `pnpm seed` | Decided: the interpretation is a committed fixture (offline, deterministic, free). Regenerating it is a manual maintainer step. |
| Widening `BoardWriteModel` with placement / labels so `decidePlace` / `decideUnplace` / `decideReword` short-circuit an already-satisfied effect to `ok([])` | Slice 6 (STATE handoff). 5b records the reword race *outcome* honestly (SUPS-03); it does not change the board decider to converge reword. |
| The wider honest-record surface — F19 transcript resolution lane, superseded annotation, honest `blocksAdded`, `review-resolution` rejection recording, stuck-`ACCEPTED` sweep, `decide.ts` scope comment (audit F4–F7, F9) | **Slice 5c** (`slice-5c-honest-record-hardening`, blocks Slice 6). Split from 5b to keep this slice to the marker + card. |
| Removing the dead `already-related` / `already-resolved` variants from the board error union (audit F8) | Slice 6 cleanup (STATE handoff, issue #43) — no producer, no consumer. |
| A dock card for held-back reword / pivotal tracks | Already shipped as `sessionView` notice turns (Slice 5); this slice adds the card for *born* model-change proposals only. |
| Import of a `ModelJson` export as a user flow | F14 (multiplayer), out of v1 (AD-037). |
| Voice narration capture (F17), real-time collaboration (F14) | Out of v1. |
| `pnpm eval` in CI | Out of CI by ADR-008 / AD-027 — real model, non-deterministic, `k/N`. |

---

## Prerequisites

1. **The transcribed narration** — `transcript.md` in this feature directory (provided by the
   maintainer 2026-09-08). Source for the `pnpm seed` session and the eval fixtures'
   `scopeStatement` / `contribution` bodies. ✅ satisfied.
2. **`ANTHROPIC_API_KEY` available to the implementer** — EVAL-05 commits real `k/N` numbers
   produced by `pnpm eval --report` (decided: part of Execute, not a maintainer step).
   ⚠️ outstanding.

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| `pnpm seed` interpretation source | A committed fixture (`scripts/seed/*.json` or similar) holding the facilitator's interpretation of the narration; `pnpm seed` replays it with no model call | Decided with maintainer 2026-09-08. A seed that costs ~$1 and needs a key each run is hostile; ADR-008 wants `pnpm seed` reliable | y |
| Losing-racer signal mechanism | A new past-tense marker event per aggregate (`Resolution Superseded` / `Model Change Superseded`), recorded **when the race is decided**, folded to a `superseded` field — never a read-time diff against board state. `resolve`: recorded inline by the losing (second) handler on its own stream. `reword`: recorded by the `reconcilePendingDerivations` sweep on the earlier proposal's stream (last-write-wins board, loser's handler already finished). `ApplyResult` gains an explicit `applied` / `already-satisfied` outcome (AD-040). | Decided with maintainer 2026-09-08; shape confirmed against `domain-modeling` (dedup/ordering are business decisions → in the model, not read-time reconstruction; "query less, event more"), `distributed-systems` (reconciliation backstop; effectively-once), `software-design` (make the outcome explicit — don't hide a no-op in an `APPLIED` shape). Consistent with AD-023 (outcome fact, not frozen rollup), AD-035, AD-038. | y |
| Eval fixture set | The full ADR-008 set: the 4 shipped cases + phase-flagged + deeper-format-named + relation + pivotal + reword + 2 integration cases | Decided with maintainer 2026-09-08. 5b is where F11 closes | y |
| README `k/N` table | Produced by `pnpm eval --report` during Execute against the real model and committed; splice logic verified against a stub in a unit test | Decided with maintainer 2026-09-08 | y |
| `pnpm seed` write target | The same on-disk sqlite database `pnpm dev` reads (the path resolved by the host's store wiring); a re-run refuses unless `--force`, which wipes the prior seed workshop first | No AC in #92; a silent double-seed leaves two demo workshops. Least-surprise: idempotent-by-refusal with an explicit override | n |
| Model-change proposals in the pending drawer (overflow / parked groups) | Rendered with the same intent-card summary as in the live feed; `Hold` / `Unhold` work identically | `PendingDrawer.vue` already groups `ProposalCard[]`; a model-change card must not crash it | n |
| `e2e/artifacts-and-relations.spec.ts` facilitator mode | Stays `FACILITATOR_MODE=scripted` with `e2e/fixtures/facilitator-relations.json`; only the accept step changes from a `POST` to a dock click | The scripted fixture is how the strand is produced deterministically; the `SPEC_DEVIATION` was about the accept path only | n |
| ADR-008 "deliberately untested" list + README | Updated to remove "the real model's decision to propose a relation / pivotal / reword" once EVAL cases cover it; the `pnpm smoke:facilitation-schema` probe stays and stays green | The list is a live inventory; leaving it stale after the eval lands is a doc rot | n |

**Open questions:** none — all resolved or logged above.

---

## User Stories

### P1: F11 eval suite covers every facilitator assertion ⭐ MVP

**User Story**: As the system, I want a fixture case for every F11 facilitator assertion — kind,
past tense, phase flagged, near-miss *not* flagged, deeper-format named, awkward phrasing kept,
and the relation / pivotal / reword decisions — run on demand against the real model with
per-assertion `k/N` results, so that a prompt change that degrades any one behaviour is caught.

**Why P1**: F11 is the slice's headline feature and the reason #92 was blocked on the narration.

**Acceptance Criteria**:

1. WHEN `pnpm eval` runs THEN the system SHALL execute every committed fixture case N=5 times
   against the real facilitator and print one line per case × assertion of the form
   `<caseId> <assertion>: <k>/5`.
2. WHEN the fixture set is loaded THEN the system SHALL include at least one case exercising each
   of: `kind`, `pastTense`, phase-flagged, near-miss-not-flagged, deeper-format-named,
   kept-phrasing, a proposed `relation`, a proposed `pivotal` mark, a proposed `reword`, plus
   two integration cases that assert more than one strand from a single contribution.
3. WHEN a fixture asserts a `relation` / `pivotal` / `reword` behaviour THEN the assertion SHALL
   be a deterministic oracle over the facilitator's returned `FacilitationTrack[]` (e.g. "a
   `propose-relation` track with `relationKind: 'sequence'` and both endpoints resolvable to the
   named board labels"), never a facilitator self-report or a fuzzy string match.
4. WHEN `pnpm eval --report` runs THEN the system SHALL replace the content between
   `<!-- eval:results -->` and `<!-- /eval:results -->` in `README.md` with a Markdown table,
   one row per case × assertion, `Passed` always rendered `k/N`, and no headline aggregate.
5. WHEN a single model call in a run fails or returns an unparseable result THEN the system
   SHALL count that run as not-passed for every assertion of that case and continue the
   remaining runs and cases (no abort).
6. WHEN `ANTHROPIC_API_KEY` is absent THEN `pnpm eval` SHALL exit non-zero with the message
   naming `.env.local`, unchanged from today.

**Independent Test**: Run `pnpm eval` with a key set; see a `k/5` line for every assertion in
AC-2. Run `pnpm eval --report`; `git diff README.md` shows only the table between the markers
changed. Unit-test the splice and the new oracles with fixed `FacilitationTrack[]` inputs.

---

### P1: `pnpm seed` loads the demo workshop offline

**User Story**: As someone running EventStormer for the first time or recording a demo, I want
one command that leaves a populated model on screen, so that I do not have to narrate a whole
workshop to see what the tool does.

**Why P1**: The demo seed is half of #92 and the project's only one-command live demo.

**Acceptance Criteria**:

1. WHEN `pnpm seed` runs with no `ANTHROPIC_API_KEY` and no network THEN the system SHALL
   complete successfully, make no outbound HTTP call, and print the seeded workshop id and its
   resumable URL path.
2. WHEN `pnpm seed` completes THEN opening `/workshops/:id` in `pnpm dev` SHALL show a board
   with the narration's building blocks, relations, and at least one hot spot, and a session
   whose transcript turns are the narration's contributions in order.
3. WHEN `pnpm seed` runs and a prior seed workshop already exists THEN the system SHALL refuse
   with a message unless `--force` is passed, and `--force` SHALL remove the prior seed
   workshop's streams before seeding.
4. WHEN the seed fixture is applied THEN the resulting board state SHALL be produced only
   through the real capability handlers (`applyOperation`, the accept chain) — the fixture
   carries the facilitator's interpretation, not hand-written board rows.
5. WHEN `pnpm check` runs THEN the seed script SHALL typecheck, lint, and be covered by a test
   that asserts a fresh seed produces the expected block / relation / hot-spot counts.

**Independent Test**: In a clean checkout, `pnpm seed` then `pnpm dev`, open the printed URL,
see the populated board. Re-run `pnpm seed` → refusal; `pnpm seed --force` → succeeds.

---

### P1: A superseded contribution says so ⭐

**User Story**: As someone whose resolution or reword lost a race, I want my card to tell me
another contribution's text was kept, so that I do not think mine is on the board when it is not.

**Why P1**: PR #91 review W2 / W5, and audit F1–F3. `applyOperation` returns the same shape for
a real append and a converged no-op, so both accept chains record the no-op as a genuine
`APPLIED`; `APPLIED` is overloaded ("my text landed" vs "the effect holds because someone
else's did") and no disposition, event, or card can tell them apart. The doctrine basis (all
three architecture skills) and the per-kind asymmetry are in `design.md` (AD-040).

**Split.** The *card and marker* are 5b. The wider honest-record surface the audit found —
resolution lane in the F19 transcript (F4), honest `blocksAdded` (F5), the `review-resolution`
rejection-recording and stuck-`ACCEPTED` backstop (F6/F7), the `decide.ts` scope comment (F9) —
is **slice 5c** (`slice-5c-honest-record-hardening`, blocks Slice 6).

**The asymmetry.** A `resolve` race is first-write-wins — the *second* contribution's `decide`
returns `ok([])`, its reference never lands, so the loser is the second and its own handler is
running when it finds out. A `reword` race is last-write-wins — `decideReword` re-applies, the
board ends with the *later* accepter's label, and the loser is the *earlier* proposal whose
handler finished long ago. Different detection points; identical recorded outcome (a folded
`superseded` marker, disposition still `APPLIED`).

**Acceptance Criteria — the explicit-outcome substrate**:

1. WHEN `applyOperation` converges an operation whose effect already held (empty decision, or
   `duplicate-id` on the append path) THEN its `ApplyResult` SHALL carry an explicit outcome
   discriminant (`appended` vs `already-satisfied` — AD-040), so a caller tells a real apply
   from a no-op without inspecting board state. Existing callers compile unchanged until they
   read it.

**Acceptance Criteria — the superseded marker**:

2. WHEN a second `Resolution` is accepted onto a hot spot the first has already resolved **with a
   different reference** THEN the second's accept handler SHALL, on `already-satisfied`, append
   `Resolution Superseded { resolutionId, hotSpotId, supersededByReference, at }` to its own
   `Resolution` stream in its own transaction (in place of `Record Hot Spot Resolved`), and
   still return `ok` — disposition converges to `APPLIED` (AD-038).
3. WHEN a `reword` model-change proposal has applied and a later `reword` on the same target
   applies a different `newLabel` THEN a supersession reconciliation pass in the existing
   `reconcilePendingDerivations` tick SHALL append `Model Change Superseded { proposalId,
   target, supersededByLabel, at }` to the *earlier* proposal's stream — idempotently (skipped
   if the marker is already present, or the board label still equals this proposal's `newLabel`).
4. WHEN the losing contribution's reference / `newLabel` equals the winner's THEN no `Superseded`
   event SHALL be appended (nothing was lost).
5. WHEN `replay` folds a `Superseded` event THEN the write-model disposition SHALL stay `APPLIED`
   — the marker is an outcome fact, not a state transition (AD-023-consistent).
6. WHEN `resolutionsView` / `proposalsView` project a stream carrying a `Superseded` event THEN
   the card SHALL carry `superseded: true` with the winning reference / label — a pure fold of
   the recorded event, never a read-time comparison against current board state.

**Acceptance Criteria — the card**:

7. WHEN the dock renders a card with `superseded: true` THEN it SHALL show a distinct state —
   not a plain `APPLIED` receipt — reading that another contribution's text was kept.

**Independent Test**: Drive two resolutions at one hot spot through the accept handler; assert
the second stream ends `… , Accept Resolution, Resolution Superseded` (not `Record Hot Spot
Resolved`) and the card is `{ disposition: 'APPLIED', superseded: true }`. Drive two rewords on
one block; run the reconciliation tick; assert the earlier proposal's stream gains
`Model Change Superseded` and a second tick is a no-op. Component-test the dock state.

> **Note.** The board-decider convergence layer and every read model are already doctrine-clean
> (audit "no problem found" list). SUPS is scoped here to the marker + card; the transcript /
> summary / backstop work is 5c.

---

### P1: The dock renders model-change proposals

**User Story**: As a participant, I want a relation / pivotal / reword the facilitator proposed
to appear as a card I can accept, edit, reject, or hold in the dock, so that I review it the
same way I review a building-block proposal.

**Why P1**: F04/F07 P1 was left server-verified / UI-pending in Slice 5.

**Acceptance Criteria**:

1. WHEN `GET /sessions/:id/proposals` returns a card with an `intent` object THEN the app
   `ProposalCard` type SHALL mirror `intent` (`kind`, `summary`, `endpoints?`, `target?`,
   `newLabel?`) and a store test SHALL fail on drift.
2. WHEN the dock renders a model-change proposal THEN it SHALL show the `intent.summary`, a pill
   naming the kind (`relation` / `pivotal` / `reword`), and the source contribution quote, with
   Accept / Reject / Hold actions (and Edit for a `reword` — see AC-4).
3. WHEN the person clicks Accept on a model-change card THEN the dock SHALL `POST
   /proposals/:id/accept` and refetch — no optimistic board mutation (unchanged dock contract).
4. WHEN the person edits a **`reword`** model-change card THEN the dock SHALL `POST
   /proposals/:id/edit` with `{ newLabel }`.
   *(Descoped 2026-09-09 — endpoint-swap edit for `relation` / `pivotal` (`POST … { field,
   label }`) moves to slice 5c (#94): it needs an endpoint selector + `RELATION_FIELDS` mapping
   + `unknown-label` 422 handling — real UI beyond this slice. In 5b a wrong-endpoint relation
   proposal is rejected and re-proposed, or accepted and fixed on the board via F06.)*
5. WHEN a model-change proposal is `APPLIED` / `APPLY_FAILED` / `REJECTED` / `LAPSED` / held /
   in overflow THEN the dock and the pending drawer SHALL render each state without error.
6. WHEN `e2e/artifacts-and-relations.spec.ts` runs THEN it SHALL accept the scripted relation
   proposal by a dock interaction and the file SHALL carry no `SPEC_DEVIATION` about the accept
   path.

**Independent Test**: Component-test `ProposalCard` / `DockFeed` with a relation, pivotal, and
reword card fixture across every disposition. Run `pnpm test:e2e` — the relation flows board →
export through the UI with no raw `POST`.

---

### P2: ADR-008 + README inventory reconciled

**User Story**: As a reader of the docs, I want the "deliberately untested" list to reflect what
the eval now covers, so that the inventory is not stale.

**Why P2**: Doc hygiene; not shippable behaviour, but AGENTS.md forbids leaving it rotted.

**Acceptance Criteria**:

1. WHEN the EVAL cases land THEN the README "Deliberately untested" bullet about "the real
   model's decision to propose a relation / pivotal / reword" SHALL be removed, and the
   ADR-008 equivalent updated to point at the eval.
2. WHEN the docs are updated THEN `pnpm check`'s offline doc-link job SHALL still pass.

**Independent Test**: `git diff` shows the bullet gone from both files; doc-link job green.

---

## Edge Cases

- WHEN a fixture file is malformed THEN `pnpm eval` SHALL throw with the file name (unchanged
  parser behaviour), before any model call.
- WHEN `pnpm eval --report` runs and the README markers are missing THEN the splice SHALL throw
  rather than silently append.
- WHEN `pnpm seed --force` runs and no prior seed workshop exists THEN it SHALL seed normally
  (force is idempotent).
- WHEN the seed fixture references a board label that the interpretation would not have
  produced THEN the seed test SHALL fail (the fixture and the handlers must agree).
- WHEN a `Superseded` event exists on a stream that is *also* later `REJECTED` (impossible under
  AD-038 convergence, but defensively) THEN `replay` SHALL keep the terminal disposition and the
  marker SHALL be inert.
- WHEN the dock receives a proposal card with neither `blockKind` nor `intent` THEN it SHALL
  render nothing for that card rather than throw (forward-compat guard).
- WHEN a model-change proposal's `intent.endpoints` contains an id that resolves to no current
  label THEN the card SHALL show the id (the `proposalsView` fallback), not a blank.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| EVAL-01 | P1: eval suite | Design | Pending |
| EVAL-02 | P1: eval suite (fixture-set completeness) | Design | Pending |
| EVAL-03 | P1: eval suite (deterministic oracles) | Design | Pending |
| EVAL-04 | P1: eval suite (`--report` splice) | Design | Pending |
| EVAL-05 | P1: eval suite (committed `k/N` baseline) | Tasks | Pending |
| EVAL-06 | P1: eval suite (no-key exit) | Design | Pending |
| SEED-01 | P1: `pnpm seed` offline | Design | Pending |
| SEED-02 | P1: `pnpm seed` populated board + transcript | Design | Pending |
| SEED-03 | P1: `pnpm seed` re-run refusal + `--force` | Design | Pending |
| SEED-04 | P1: `pnpm seed` through real handlers | Design | Pending |
| SEED-05 | P1: `pnpm seed` covered by `pnpm check` | Design | Pending |
| SUPS-01 | P1: `ApplyResult` explicit outcome (AD-040; audit F1) | Design | Pending |
| SUPS-02 | P1: `Resolution Superseded`, inline in loser's handler (audit F2) | Design | Pending |
| SUPS-03 | P1: `Model Change Superseded`, reconciliation pass (audit F2) | Design | Pending |
| SUPS-04 | P1: no marker when nothing lost | Design | Pending |
| SUPS-05 | P1: `replay` disposition stays `APPLIED` (audit F3) | Design | Pending |
| SUPS-06 | P1: read-model `superseded` — pure fold, no board diff | Design | Pending |
| SUPS-07 | P1: dock superseded state | Design | Pending |
| PCARD-01 | P1: dock model-change card (type mirror) | Design | Pending |
| PCARD-02 | P1: dock model-change card (render) | Design | Pending |
| PCARD-03 | P1: dock model-change card (accept) | Design | Pending |
| PCARD-04 | P1: dock model-change card — `reword` `newLabel` edit (endpoint-swap → 5c) | Implementing | Done (`6953ead`) |
| PCARD-05 | P1: dock model-change card (all dispositions + drawer) | Design | Pending |
| PCARD-06 | P1: dock model-change card (e2e SPEC_DEVIATION removed) | Design | Pending |
| DOC-01 | P2: ADR-008 / README inventory | Tasks | Pending |
| DOC-02 | P2: doc-link job green | Tasks | Pending |

**ID format:** `[CATEGORY]-[NUMBER]`
**Status values:** Pending → In Design → In Tasks → Implementing → Verified
**Coverage:** 26 total, 0 mapped to tasks (Tasks phase pending). (Audit F4–F9 → slice 5c.)

---

## Implicit-Requirement Dimensions Sweep

| Dimension | Resolution |
| --- | --- |
| Input validation & bounds | Eval fixture parser throws on malformed input (EVAL edge case); seed fixture ↔ handler agreement enforced by SEED-05; `ProposalCard` edit already trims / bounds label. |
| Failure / partial-failure states | EVAL-05: a failed model call counts as not-passed and the run continues. SEED-03: a partial prior seed is cleared by `--force`. |
| Idempotency / retry / duplicate handling | SEED-03 (`--force` idempotent); SUPS-01…03 *are* the idempotent-convergence display for AD-038's crash-window re-accept. |
| Auth boundaries & rate limits | N/A — local single-user tool (ADR-002); no auth surface added. |
| Concurrency / ordering | SUPS-02/03 record the two-writer race outcome (resolve first-write-wins, reword last-write-wins). Board OCC-with-retry (AD-022) unchanged. Crash-window backstop → 5c. Eval N=5 runs sequential; `pnpm seed` single-shot. |
| Data lifecycle / expiry | SEED-03 governs the seed workshop's lifecycle (`--force` wipe). Eval JSONL logs to gitignored `eval-runs/` unchanged. |
| Observability | Eval already logs every model call to `eval-runs/*.jsonl` (ADR-008); README `k/N` publication is EVAL-04/05. |
| External-dependency failure | EVAL-06: no key → non-zero exit with message. `pnpm seed` makes no external call by design (SEED-01). |
| State-transition integrity | SUPS-05: the `Superseded` marker is not a disposition transition — `replay` keeps `APPLIED`. PCARD-05: every existing disposition renders. |

---

## Success Criteria

- [ ] `pnpm eval` prints a `k/5` line for all 12+ assertions in EVAL-02; `pnpm eval --report`
      updates only the README table.
- [ ] `pnpm seed && pnpm dev` shows a populated demo board within one command + one page load,
      with no key and no network.
- [ ] A losing same-target `resolve` / `reword` card reads "superseded", backed by a marker
      event visible in the stream.
- [ ] `pnpm test:e2e` drives a facilitator relation proposal to the board through a dock click;
      `grep -rn SPEC_DEVIATION e2e/` shows nothing about the proposal accept path.
- [ ] `pnpm check` green; a `minor` changeset present; ADR-008 / README "deliberately untested"
      list reconciled.
