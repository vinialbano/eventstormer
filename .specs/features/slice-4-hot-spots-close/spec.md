# Slice 4 — Hot Spots + Close Specification

GitHub issue: [#41](https://github.com/vinialbano/eventstormer/issues/41) ·
Blocked by #40 (Slice 3, merged) · Blocks #42 (Slice 5) ·
Parent effort map #9 · Version target **0.5.0** (`minor` changeset)

**Status**: Done — Execute complete (T1–T51), Verifier PASS. PR #90 review fixes: see
`../slice-4-review-fixes/`.

## Problem Statement

The model can be built and rendered, but it cannot record what is *painful, disputed, or
unknown* about the business, and a session cannot be ended deliberately. There is no way to
flag a hot spot, no way to resolve one, no accountability for facilitator questions that were
never answered, and no stakeholder check or chosen problem. This slice adds all of that: the
two hot-spot creation routes (F08), the deliberate resolution mechanic (F08), the close-time
question and absent-stakeholder sweep (F08 + F18), the session-close summary freeze (F18), and
the stakeholder check plus chosen problem recorded on the workshop (F09).

## Goals

- [ ] A hot spot can be created two ways — proposed by the facilitator through the F05
      accept/edit/reject path (with a person-editable kind), or created directly by the person
      — and renders as a callout on the building block it annotates, or in a list when it
      annotates nothing. A running count is visible.
- [ ] Resolving a hot spot is deliberate: the facilitator proposes a resolution through the
      F05 path with a recorded reference; accepting marks it resolved, rejecting leaves it
      open, and a resolved hot spot can be reopened.
- [ ] Withdrawing the building block a hot spot annotates withdraws the hot spot too (F01
      cascade); withdrawing a hot spot clears its annotation. No dangling annotation remains.
- [ ] Nothing in the product reads a hot spot's open/resolved state as a precondition.
- [ ] Closing a session is explicit and atomic: every facilitator question still unanswered
      becomes exactly one hot spot (created directly, no review), every named absent
      stakeholder becomes a hot spot, and the session's facilitation summary is consistent as
      of the close.
- [ ] At close the person is asked whether anyone else would tell this differently, then names
      the one problem most worth attacking — chosen from the currently-open hot spots, or
      skipped with a recorded reason. Both are recorded on the workshop, not the model log.
- [ ] A model with no hot spots is reported at close as a signal to interpret, not a pass or a
      failure.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep. **Scope moved out of #41 this slice
is re-filed — see Issue Reconciliation below.**

| Feature | Reason |
| --- | --- |
| Facilitator proposes `sequence` / `insert-between` / `place` / `unplace` / `link-cause` / `unlink-cause` | Parked on #41 by AD-031's loose label; #41's ACs never name the facilitator. **Moved to #42.** New AD supersedes AD-031's slice label (cf. how AD-017 corrected AD-016). |
| Facilitator proposes `mark-pivotal` / `unmark-pivotal` (F07 milestone path) | Same. **Moved to #42.** Direct mark/unmark (Slice 3) already satisfies F07's model behaviour. |
| Reword-hold-back gate (F04 — facilitator holds a reword back until the model has structure) | Same. **Moved to #42.** |
| Eval assertions for the F04/F07/F08/F09 facilitator behaviours | Slice 5 (#42) — eval suite. Blocked on the tracks shipping in #42. |
| A hot-spot **kind-change** operation (informational ⇄ model-affecting after creation) | The frozen `v:1` operation union (ADR-004) has no such operation; ADR-004's note that kind is "changeable by a reword-style operation" has no frozen home. A v2 additive. Kind is editable only *before* accept, on the review card. |
| JSON export, template summary, session-transcript export | Slice 5 (#42). This slice extends `GET /board` and the artifact-source read model with hot-spot + chosen-problem data so #42 consumes a ready projection; it renders no downloadable artifact. |
| Carrying the chosen problem forward to seed a later workshop's scope | PRD §7 + F09 — explicitly out of v1. F09 records it on the workshop and stops. |
| `OperationId`-correlated crash-window reconciliation for the resolve/apply round trips | AD-030 — still unearned. The resolve chain is synchronous per AD-016/AD-017; each context commits its own stream; the sub-millisecond crash window is accepted at v1 single-user scale. |
| ADR-010 / ARCHITECTURE.md slice-table wording, `docs/domain/` "kind"→`modelAffecting` reconciliation, ADR-005/007 rewords | Slice 6 (#43) doc pass. Added to the STATE.md Slice-6 list. |
| Invitations, multiplayer, concurrent sessions, SSE, optimistic client updates | F14 / ADR-007. |
| A language model on any projection or artifact path | Product thesis. |
| Reopening a **session** | F18 / canvas — `CLOSED` is terminal; returning to a workshop starts a new session. Only a *hot spot* reopens. |

---

## Assumptions & Open Questions

Every ambiguity is resolved or recorded here — nothing is left silently unclear. Items marked
**Design** are resolved directions to be pinned with an AD in the Design phase.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Slice 4 scope boundary | F08/F09/F18 only. Facilitator relation/pivotal proposal tracks + reword-hold-back gate move **out** of #41 → **#42**. | User answer 2026-09-02 ("Out — strictly #41"). #41's title and ACs are hot spots + close; AD-031's "(#41)" was a loose label written after the slice plan. | **y** — user 2026-09-02 |
| Direct hot-spot creation route | Build the direct-creation HTTP capability **and** a minimal board affordance (flag a hot spot on a selected building block, or on nothing). | User answer 2026-09-02. Keeps F08's "two distinct routes" demoable end to end. | **y** — user 2026-09-02 |
| F09 / close flow surface | In-dock conversational — the close ceremony runs as facilitator turns in the existing dock. A per-surface brief is shaped via `/impeccable` before the UI is built. | User answer 2026-09-02. Consistent with the capture loop; no new visual world. | **y** — user 2026-09-02 |
| Hot-spot `kind` selection | Facilitator proposes the kind (default model-affecting); on the F05 review card the person can flip it before accepting. Direct-created hot spots default to model-affecting with the same toggle at creation. No post-creation change. | User answer 2026-09-02. F08: "the facilitator picks it from conversational context"; the person owns the final accept. | **y** — user 2026-09-02 |
| Close is a two-phase ceremony | "Close session" opens a **closing** phase: the session stays OPEN while the facilitator asks the stakeholder question and the person answers (a normal contribution, interpreted — acceptance test 44) and picks/skips the problem; then `Close Session` fires, running the atomic sweep + summary freeze. Contributions unrelated to the close are still accepted until `Close Session`. | Acceptance test 44 frames the stakeholder check as an interpreted contribution (`complete-perspective`); F18 says the sweep is "in the same step" as the close. The person must be able to answer before the session is frozen. | **Design** — pin the phase model + guard as an AD |
| `resolve` operation `reference` shape | Keep storage `reference: z.unknown()` but **require the key present** (a missing `reference` fails `.parse` — the current schema comment already asserts this; add a decider guard + test). The facilitator's Anthropic-projection track types it `z.string().min(1)` (AD-015 — no `z.unknown()` in the turn schema). Edit-resolution edits that string. | F08 "a recorded value, not a live pointer" + acceptance test 19a; AD-015's 24-optional / no-empty-schema limits force a concrete type in the turn schema. | **Design** — pin shape + the "present but any value" guard |
| Board write-model / snapshot extension for hot spots | Write model gains `annotates: Map<hotSpotId, targetId>` and `hotSpotResolved: Map<hotSpotId, boolean>` (only what `decide` reads — AD-005). Snapshot gains, per hot-spot block: `annotates: targetId \| null`, `resolved: boolean`, `reference: unknown \| null`, plus a top-level `hotSpotCount`. | AD-005 keeps the write model slim; `resolve`/`reopen`/`annotate` deciders need resolved + annotation state; consumers need the projected shape. | **Design** |
| Withdraw → hot-spot cascade | `decide(withdraw)` on an annotated building block returns `[withdraw, ...withdraw(hotSpot) per annotating hot spot]`, batch-atomic (AD-006). `decide(withdraw)` on a hot spot that annotates something returns `[withdraw, unannotate]`. `evolve`/`project` drop the annotation on hot-spot withdrawal. Reinstating a hot spot returns it naked (no annotation, open — acceptance test 17). | AD-028 assigned "`withdraw` on annotating hot spots" to Slice 4; acceptance tests 21, 17, 19a. | **Design** |
| Hot-spot creation via facilitator = a `Proposal` with `blockKind: 'hot-spot'` | `InterpretedBlockKind` / `Building Block Proposed` gain `'hot-spot'`; the proposal carries `modelAffecting` and an optional `annotatesTargetId`. Accept mints the id, applies `raise-hot-spot`, then (if `annotatesTargetId` set and live) `annotate` as a batch follow-on. | Mirrors the existing capture accept path (`accept.ts`); acceptance test 4 — a policy-raised and a proposal-raised `Hot Spot Raised` are indistinguishable. | **Design** |
| `Resolution` is a new aggregate (not a `Proposal` variant) | New `session-facilitation/domain/resolution/` — `PROPOSED ⇄ EDITED → ACCEPTED → APPLIED \| LAPSED`, `REJECTED` terminal; every apply bounce is terminal (no retry). Its own stream, own capability (`review-resolution`). | Canvas "Why `Proposal` and `Resolution` are two aggregates" — divergent outcomes, a scarce `Open` state, terminal bounce. | **y** — canvas |
| Resolve/apply correlation | Synchronous, like the accept chain (AD-016/AD-017): `review-resolution` accept calls `applyOperation(workshopId, resolve-op)`, reads the `Result`, records `Hot Spot Resolved` (ok) or `Hot Spot Resolution Rejected` (board rejection — `not-a-hot-spot` / `withdrawn-target` / `already-resolved`) on the `Resolution` stream. No persistent correlation id on the board. | AD-016 per-context-transaction rule; acceptance test 39 (second resolution → LAPSED "already resolved"). | **y** — AD-016/17 |
| `reopen` trigger | A direct person action — `POST /workshops/:id/board/hot-spots/:blockId/reopen` → `applyOperation(reopen-op)`. Not a proposal, not a facilitator judgement. Snapshot: `resolved: false`, `reference` value retained. | F08 "A resolved hot spot can be reopened if the resolution turns out wrong"; acceptance test 19 / 19a. | **Design** |
| Question-track events | `Session` decider + events gain `Knowledge Gap Revealed`, `Absent Stakeholder Named` (once per named person), `Complete Perspective Confirmed` — each marks its question `resolved`; the first two become `raise-hot-spot` operations via the reconciliation pass, the third sets the workshop's chosen-problem qualification. Turn schema gains the matching tracks. | Canvas Policies table; acceptance tests 1, 2, 5, 34, 43, 44. | **Design** |
| `Raise Hot Spot` delivery — **no event bus** (AD-032, supersedes AD-019) | `session-facilitation` writes `Session Closed` / `Knowledge Gap Revealed` / `Absent Stakeholder Named` on its own streams; a hot-spot reconciliation pass folded into `reconcilePendingDerivations` + `finishClose` reads them and calls `applyOperation(raise-hot-spot)` idempotently, gated by a `hot_spot_sweep` marker table. | AD-032 — a synchronous 1-publisher/1-subscriber in-process bus is a disguised orchestrator `knip` would flag; choreography over persisted facts is the established shape (AD-018, AD-021). | **Design** — AD-032 |
| Close-time summary "freeze" | No struct is frozen into `Session Closed` (AD-023 stands — it carries only `{ unresolvedQuestionIds, at }`). "Consistent as of the close" is guaranteed because `CLOSED` is terminal and `sessionSummary(...)` is a pure read-time projection over the terminal stream. The AC is satisfied by a test asserting the projection is stable post-close, plus that the unresolved-question sweep and the projection see the same set. | AD-023 — "derived state is never frozen into a domain event." | **y** — AD-023 |
| Apply-failed proposal → hot spot at close | The close sweep raises a `Raise Hot Spot` for every `Proposal` in `APPLY_FAILED` (canvas; acceptance test 36). Slice 1's T22 deviation noted a genuine `APPLY_FAILED` was unreachable for id-minting kinds; with `annotate`/`resolve`/hot-spot targets in play it is now reachable, so this path is implemented and tested. | Canvas `Session Closed` policy; acceptance tests 29, 36. | **Design** |
| F09 chosen-problem candidates | Exactly the hot spots **open** at the moment the picker is shown (a resolved one is never offered). Picking one records `{ problemHotSpotId, qualification: 'firm' \| 'provisional' }`; "Somebody" + names → one absent-stakeholder hot spot per person + `provisional`. Skip records `{ reason: 'none-chosen' \| 'no-impediments-yet' }`. | F09 capabilities + experience; acceptance test — "Problem candidates are exactly the hot spots currently open". | **Design** |
| F09 workshop state | New `Workshop` events: `Stakeholder Check Recorded` (`{ complete: boolean, absentNames: string[] }`) and `Problem Chosen` / `Problem Choice Skipped`. Read via the workshop stream; surfaced in `readArtifactSource` for #42. Not operations in the model log (F09/F18). | F09 "recorded on the workshop (F18), not as operations in the model log." | **Design** |
| Direct-creation route: who is the author | `author: { accepter: { name: creatorName } }`, no proposer — the person created it directly (mirrors Slice 2/3 direct-op author). | Existing direct-op convention (AD-024, Slice 3). | **y** |
| Direct-created hot spot annotating a withdrawn / unknown / hot-spot target | Rejected (`unknown-target` / `withdrawn-target` / `kind-permission` "a hot spot cannot annotate another hot spot"), log unchanged. | Acceptance tests 20b, F08 "any building block except another hot spot". | **y** |
| `GET /board` shape | Adds per hot-spot block `{ annotates, resolved, reference }` and a top-level `hotSpotCount`. Existing keys unchanged. | Client renders callouts + count; determinism boundary unchanged (no pixels). | **Design** |
| Does closing require every open **proposal/resolution** disposed first? | No. Close lapses them (canvas — `PROPOSED`/`EDITED`/held → LAPSED quiet; `APPLY_FAILED` → LAPSED + hot spot). The person is not forced to clear the drawer. | Canvas `Session Closed` policy; "The system may suggest, never force an order of steps." | **y** — canvas |

**Open questions:** none — all resolved or logged above. The **Design** rows are resolved
*directions* with a chosen default; each becomes an AD in the Design phase. One reversal in
Design: the in-process event bus (AD-019) was **not** built — AD-032 delivers `Raise Hot Spot`
as choreography over persisted facts (`hot_spot_sweep` marker table + `reconcileHotSpots`),
matching AD-018 / AD-021. See `design.md` AD-032 and `.specs/STATE.md`.

---

## Issue Reconciliation (scope moved out of #41)

Per the user's instruction to update issues that gain scope as #41 sheds it:

- **#41 (this slice)** — its body already scopes only F08/F09/F18. Add a note that AD-031's
  parked facilitator items are re-filed to #42, and that the doc reconciliation is #43. Post a
  comment recording the move.
- **#42 (Slice 5)** — **gains**: build the facilitator relation / `insert-between` / `place` /
  `unplace` / `link-cause` / `unlink-cause` / `mark-pivotal` proposal tracks and the F04
  reword-hold-back gate (extending `FacilitationTurnSchema` against the AD-015 24-optional
  ceiling), *then* the eval assertions for them. Update the issue body + post a comment.
- **#43 (Slice 6)** — **gains** (already largely implied): ADR-010 / ARCHITECTURE.md
  slice-table reword now that the facilitator's real scope is settled; the `docs/domain/`
  "kind" → `modelAffecting` and ADR-005/007 rewords are already on its list. Post a comment.

A new AD (Design phase) supersedes AD-031's slice label, exactly as AD-017 corrected AD-016.

---

## User Stories

### P1: Flag a hot spot ⭐ MVP

**User Story**: As a domain expert, I want to flag something painful, disputed, or unknown —
either by describing it and accepting the facilitator's proposal, or by flagging it directly —
so that the model records friction, not just structure.

**Why P1**: F08's core. Without it the model cannot hold what the workshop is *for*.

**Acceptance Criteria**:

1. WHEN the facilitator interprets a contribution as describing friction/uncertainty/dispute
   THEN it SHALL produce a hot-spot `Proposal` reviewable through the F05 accept/edit/reject
   path, carrying a kind (default model-affecting) the person can flip before accepting.
2. WHEN a hot-spot proposal is accepted THEN a `raise-hot-spot` operation SHALL be applied and
   the resulting `Hot Spot Raised` SHALL be indistinguishable in kind and downstream handling
   from one raised directly or by policy (acceptance test 4).
3. WHEN the person flags a hot spot directly (with or without a target building block) THEN a
   `raise-hot-spot` operation SHALL be applied with no review step and no accept/reject
   control.
4. WHEN a hot spot names a target THEN it SHALL annotate that building block, rendering as a
   callout on it; WHEN it names no target THEN it SHALL appear in a list and SHALL NOT be
   reported as an error or an incomplete state.
5. WHEN a hot spot targets another hot spot, an unknown id, or a withdrawn block THEN the
   operation SHALL be rejected (`kind-permission` / `unknown-target` / `withdrawn-target`) and
   the log SHALL be unchanged.
6. WHEN a hot spot exists THEN the visible hot-spot count SHALL equal the number of
   non-withdrawn hot-spot building blocks in the snapshot.
7. WHEN the building block a hot spot annotates is reworded THEN the annotation SHALL survive
   the rewording.

**Independent Test**: Describe "the payments integration keeps timing out" → accept the
facilitator's hot-spot card (flip it to informational first) → see a callout on the payments
event and the count read 1. Separately, select an event and flag a hot spot directly → count 2.

---

### P1: Resolve and reopen a hot spot ⭐ MVP

**User Story**: As a domain expert, I want resolving a hot spot to be a deliberate, referenced
step I can undo, so that "resolved" always means someone decided it was.

**Why P1**: F08's resolution mechanic; F09 reads open state.

**Acceptance Criteria**:

1. WHEN a contribution appears to close an open hot spot THEN the facilitator SHALL propose a
   resolution through the F05 path, carrying a reference — never create it directly.
2. WHEN a resolution proposal is accepted THEN the hot spot SHALL become resolved and the
   reference SHALL be recorded; WHEN it is rejected THEN the hot spot SHALL remain open and
   unaffected (acceptance tests 9, 10, 40).
3. WHEN a `resolve` operation carries no `reference` key, or targets a non-hot-spot THEN it
   SHALL be rejected as a schema/kind violation and the snapshot SHALL be unchanged.
4. WHEN a second resolution is accepted for an already-resolved hot spot THEN it SHALL land in
   `LAPSED` with an "already resolved" reason, there SHALL be no retry path, and the hot spot
   SHALL carry exactly one recorded reference (acceptance test 39).
5. WHEN a resolved hot spot is reopened THEN it SHALL return to open with the recorded
   reference retained, and SHALL keep an id distinct from any later hot spot (acceptance tests
   19, 19a).
6. WHEN the building block named in a resolved hot spot's reference is later withdrawn THEN
   the hot spot SHALL stay resolved with the reference value unchanged — no cascade touches it
   (acceptance test 19a).
7. WHEN any feature runs THEN it SHALL NOT read a hot spot's open/resolved state as a
   precondition (nothing is gated on resolution).

**Independent Test**: Open a hot spot → contribute "we fixed it by adding a retry" → accept
the resolution card with a reference → callout shows resolved + reference → reopen → callout
shows open, reference gone from view but present in the log.

---

### P1: Close the session with the sweep and summary ⭐ MVP

**User Story**: As a domain expert, I want closing a session to sweep every unanswered
question and absent stakeholder into hot spots and freeze the sitting's summary in one step,
so that what was never opened is visible and later sessions have a stable record.

**Why P1**: F18's close; F08's close-time sweep; feeds F04 and F09.

**Acceptance Criteria**:

1. WHEN a session closes THEN every facilitator question still `open` SHALL produce exactly one
   hot spot naming what was not opened — including a question left open by a contribution that
   produced an unrelated building-block proposal but no direct resolving response (acceptance
   tests 1, 5, 34, 43).
2. WHEN a contribution names N absent stakeholders THEN N independent hot spots SHALL exist,
   one per named person (acceptance test 2).
3. WHEN a hot spot is created by the close sweep, an absent-stakeholder naming, or a revealed
   knowledge gap THEN it SHALL appear with no facilitator proposal, no accept control, and no
   rejection path.
4. WHEN a session closes THEN the unresolved-question set recorded on `Session Closed` and the
   set the sweep raises hot spots for SHALL be identical, consistent as of the close
   (acceptance test 43).
5. WHEN a session closes THEN this sitting's facilitation summary SHALL be a stable read-time
   projection over the now-terminal stream — re-reading it after close SHALL yield the same
   result (acceptance test 48).
6. WHEN a session closes with a `Proposal` in `APPLY_FAILED` THEN that proposal SHALL be
   `LAPSED` and a hot spot SHALL exist referencing it (acceptance tests 36, 29).
7. WHEN a session closes with a `Proposal` in `PROPOSED` / `EDITED` / held THEN it SHALL be
   `LAPSED` quietly with no hot spot (acceptance test 37).
8. WHEN a session closes with no hot spots on the model THEN the close report SHALL state this
   as a signal to interpret, distinct from a pass or a failure.
9. WHEN `Close Session` has already fired THEN a second close SHALL be a no-op.

**Independent Test**: Ask two questions, answer one, contribute a phase name nobody expands →
close → two hot spots (the unanswered question + the unexpanded phase's question), the summary
reads the same on a re-fetch.

---

### P1: Stakeholder check and chosen problem ⭐ MVP

**User Story**: As a domain expert, at close I want to say whether anyone else would tell this
differently and pick the one problem most worth attacking, so that the workshop ends with a
qualified conclusion.

**Why P1**: F09 in full; issue #41 names it.

**Acceptance Criteria**:

1. WHEN the close ceremony runs THEN the stakeholder question SHALL be asked before the chosen
   problem is offered.
2. WHEN the person answers "nobody else" THEN the chosen problem SHALL be recorded unqualified
   (firm); WHEN they name people THEN one absent-stakeholder hot spot SHALL be created per
   person and the chosen problem SHALL be recorded as provisional (acceptance test 44).
3. WHEN the problem picker is shown THEN its candidates SHALL be exactly the hot spots open at
   that moment; a resolved hot spot SHALL never be offered.
4. WHEN the person skips choosing THEN the reason SHALL be recorded — "no problem chosen" or
   "no real impediments yet" — and the skip control SHALL be equally available and equally
   sized as choosing.
5. WHEN the stakeholder answer and chosen problem are recorded THEN they SHALL be workshop
   state (F18), not operations in the model log.
6. WHEN the stakeholder-check question is interpreted as `complete-perspective` THEN that
   question SHALL be resolved and the workshop's chosen-problem qualification set (acceptance
   test 44).

**Independent Test**: Close → dock asks "would anyone else tell this differently?" → answer
"my ops lead would" → an absent-stakeholder hot spot for the ops lead appears → pick a problem
→ workshop record shows the problem `provisional`.

---

### P2: The board shows hot spots live

**User Story**: As a domain expert, I want hot-spot callouts, the unannotated list, and the
running count to update on every applied operation, like the rest of the board.

**Why P2**: The model behaviour (P1) is testable via the API; the live rendering is the
demoable surface but not the invariant.

**Acceptance Criteria**:

1. WHEN a `raise-hot-spot` / `annotate` / `unannotate` / `resolve` / `reopen` / cascade
   operation is applied THEN the board SHALL re-render to reflect it with no staleness signal.
2. WHEN a hot spot annotates a building block THEN its callout SHALL render on that block; a
   resolved callout SHALL show its reference, an open one SHALL not.
3. WHEN a hot spot annotates nothing THEN it SHALL render in a list, not as an error.
4. WHEN the model has hot spots THEN the running count SHALL be visible during the session.

**Independent Test**: Drive the API to raise + annotate + resolve → the wall shows the callout
transitions and the count without a reload.

---

### P2: In-dock close ceremony

**User Story**: As a domain expert, I want the close flow (stakeholder question → problem
picker → confirmation) to run as facilitator turns in the dock I already use.

**Why P2**: UX shell over P1's recorded behaviour.

**Acceptance Criteria**:

1. WHEN the person starts closing THEN the session SHALL stay OPEN through the stakeholder Q&A
   and the problem picker, and `Close Session` SHALL fire only on final confirmation.
2. WHEN the close ceremony is on screen THEN it SHALL follow the per-surface `/impeccable`
   brief for this flow.
3. WHEN `prefers-reduced-motion` is set THEN the ceremony SHALL present without motion.

**Independent Test**: Manual — click Close, walk the dock prompts, confirm; verify the session
is CLOSED and the drawer/board reflect the sweep.

---

## Edge Cases

- WHEN a hot spot is raised with `modelAffecting` absent THEN it SHALL default to `true`
  (model-affecting).
- WHEN `annotate` names a hot spot as the *target* THEN it SHALL be rejected (`kind-permission`).
- WHEN `unannotate` names a hot spot that annotates nothing THEN it SHALL be a rejected no-op
  (or accepted idempotently — pin in Design), log discriminable from success.
- WHEN a hot spot annotating building block B is withdrawn THEN B is untouched and the
  annotation is cleared; WHEN B is withdrawn THEN every hot spot annotating B is withdrawn too
  (acceptance test 21).
- WHEN a reinstated hot spot is projected THEN it SHALL be open, annotating nothing
  (acceptance test 17).
- WHEN the session closes while a resolution is `ACCEPTED` in flight THEN it SHALL be allowed
  to finish post-close; a post-close bounce lands `LAPSED`.
- WHEN the close sweep runs twice (crash + reconcile) THEN it SHALL raise each hot spot at
  most once (idempotent, keyed on question id / absent-stakeholder name).
- WHEN a contribution is interpreted as both resolving a hot spot and proposal-worthy THEN a
  `Resolution Proposed` and a `Building Block Proposed` SHALL be created independently —
  rejecting one SHALL NOT affect the other (acceptance tests 11, 71-style independence).
- WHEN the stakeholder question is never asked (close aborted) THEN no `Stakeholder Check
  Recorded` exists and the artifact source SHALL state the check was not run (distinct from
  "run and found nothing" — acceptance test 25).

---

## Requirement Traceability

| Requirement ID | Story / area | Phase | Status |
| --- | --- | --- | --- |
| S4-01 | Board `raise-hot-spot` decider + write model + snapshot | Design | Pending |
| S4-02 | Board `annotate` / `unannotate` deciders (target-kind, no-hot-spot-target) | Design | Pending |
| S4-03 | Board `resolve` decider (reference present, target is hot spot, not already resolved) | Design | Pending |
| S4-04 | Board `reopen` decider (target is resolved hot spot; reference retained) | Design | Pending |
| S4-05 | `project` for hot-spot ops: `annotates` / `resolved` / `reference` / `hotSpotCount` | Design | Pending |
| S4-06 | Withdraw cascade: annotated block → hot spots; hot spot → unannotate; reinstate naked | Design | Pending |
| S4-07 | Reword of an annotated block preserves the annotation | Design | Pending |
| S4-08 | `applyOperation` handles the 5 hot-spot kinds without throwing; response shape | Design | Pending |
| S4-09 | `POST /workshops/:id/board/operations` allow-list widened to hot-spot kinds | Design | Pending |
| S4-10 | Direct-creation capability (`raise-hot-spot` + optional `annotate`), person author | Design | Pending |
| S4-11 | Direct `reopen` capability | Design | Pending |
| S4-12 | `GET /board` carries hot-spot fields + count | Design | Pending |
| S4-13 | `InterpretedBlockKind` / `Building Block Proposed` gain `hot-spot` + `modelAffecting` + `annotatesTargetId?` | Design | Pending |
| S4-14 | Turn schema: `propose-hot-spot` track (kind + optional target) | Design | Pending |
| S4-15 | Accept path: hot-spot proposal → `raise-hot-spot` (+ `annotate` batch follow-on) | Design | Pending |
| S4-16 | Review card: person flips `modelAffecting` before accept | Design | Pending |
| S4-17 | `Resolution` aggregate — model / decide / evolve / replay | Design | Pending |
| S4-18 | Turn schema: `propose-resolution` track (`reference: string`) | Design | Pending |
| S4-19 | `review-resolution` capability — propose (derive) / edit / accept / reject | Design | Pending |
| S4-20 | Accept resolution → `applyOperation(resolve)` → `Hot Spot Resolved` / `Hot Spot Resolution Rejected`; test 39 | Design | Pending |
| S4-21 | `Session` decider + events: `Knowledge Gap Revealed` (resolves Q + Raise Hot Spot) | Design | Pending |
| S4-22 | `Session` decider + events: `Absent Stakeholder Named` (once per person, resolves Q + Raise Hot Spot) | Design | Pending |
| S4-23 | `Session` decider + events: `Complete Perspective Confirmed` (resolves Q + sets qualification) | Design | Pending |
| S4-24 | Turn schema + `interpret` derivation: knowledge-gap / absent-stakeholder / complete-perspective tracks | Design | Pending |
| S4-25 | ~~In-process synchronous event bus in `plumbing/`~~ — **superseded by AD-032**: no bus. Replaced by the `hot_spot_sweep` marker table + `reconcileHotSpots` choreography. | AD-032 | Superseded |
| S4-26 | ~~`Raise Hot Spot` subscriber~~ — **superseded by AD-032**: `reconcileHotSpots` reads persisted facts and raises idempotently, no subscriber. | AD-032 | Superseded |
| S4-27 | Close sweep: unresolved questions → hot spots (idempotent, keyed on question id) | Design | Pending |
| S4-28 | Close sweep: `APPLY_FAILED` proposals → `LAPSED` + hot spot | Design | Pending |
| S4-29 | Close: summary is a stable post-close projection; sweep set == `Session Closed` set | Design | Pending |
| S4-30 | Close: "no hot spots" reported as a signal, not pass/fail | Design | Pending |
| S4-31 | `Workshop` events: `Stakeholder Check Recorded` | Design | Pending |
| S4-32 | `Workshop` events: `Problem Chosen` / `Problem Choice Skipped` (candidates = open hot spots) | Design | Pending |
| S4-33 | `record-stakeholder-check` + `choose-problem` capabilities (part of the close ceremony) | Design | Pending |
| S4-34 | Closing phase model: session stays OPEN through the ceremony; `Close Session` on confirm | Design | Pending |
| S4-35 | `readArtifactSource` extended with chosen problem + qualification + open hot spots + "check not run" | Design | Pending |
| S4-36 | App: hot-spot callouts on stickies + unannotated list + running count, live | Design | Pending |
| S4-37 | App: direct "flag hot spot" board affordance (selected block or none) | Design | Pending |
| S4-38 | App: resolution review cards (accept / edit reference / reject) | Design | Pending |
| S4-39 | App: in-dock close ceremony (stakeholder Q → problem picker → confirm), `/impeccable` brief | Design | Pending |
| S4-40 | `/impeccable` per-surface brief for the close ceremony under `.impeccable/surfaces/` | Design | Pending |
| S4-41 | `minor` changeset (target 0.5.0) | Tasks | Pending |
| S4-42 | AD superseding AD-031's slice label; STATE.md + issue comments (#41/#42/#43) | Design | Pending |
| S4-43 | Issue bodies updated: #42 gains the facilitator tracks + reword-hold-back | Design | Pending |

**ID format:** `S4-NN`. **Status values:** Pending → In Design → In Tasks → Implementing →
Verified. **Coverage:** 43 requirements; mapping to tasks happens in the Tasks phase.

---

## Success Criteria

- [ ] All acceptance tests 1, 2, 4, 5, 9, 10, 11, 17, 19, 19a, 21, 34, 36, 39, 40, 43, 44, 48
      in `docs/domain/acceptance-tests.md` pass as automated tests in the consuming context.
- [ ] `pnpm check` + `pnpm build` + `pnpm test:e2e` green; `**/domain/**` coverage ≥ 90%
      (local autoUpdate) for every new domain file.
- [ ] A person can, in the running app: flag a hot spot (both routes), watch the facilitator
      propose and the person resolve one, reopen it, and close a session through the in-dock
      ceremony ending with a recorded stakeholder answer and chosen problem.
- [ ] `GET /board` and `readArtifactSource` expose everything Slice 5 (#42) needs for the
      summary — open model-affecting hot spots, chosen problem, qualification — with no further
      board change required in #42.
- [ ] Issues #41, #42, #43 reflect the moved scope; a new AD records the correction.
