---
workshop: design-level
scope: domain-model-capture
status: draft
last_updated: 2026-08-27
digest: 56a9cc417c6d
derived_from:
  - path: bounded-contexts/domain-model-capture/canvas.md
    digest: 705129af8f2d
    at: 2026-08-27
  - path: bounded-contexts/session-facilitation/canvas.md
    digest: 1926e79a6978
    at: 2026-08-27
  - path: context-map.md
    digest: d4fd9c957b26
    at: 2026-08-27
  - path: open-questions.md
    digest: bedd10cafb15
    at: 2026-08-27
  - path: sessions/2026-08-26-design-level-domain-model-capture.md
    digest: 8fb8d04365b1
    at: 2026-08-27
  - path: sessions/2026-08-27-design-level-session-facilitation-runtime.md
    digest: 35fd6b2ca4f9
    at: 2026-08-27
---
# Session — Design-Level EventStorming: Domain Model Capture (pass 2 / resume — the `Board`)

**Date:** 2026-08-27
**Workshop:** Design-Level, resume against the existing `draft` canvas
**Participants:** One — the product owner (solo). Same hard limit as every prior session in this
line: no genuine inter-participant disagreement was available. Participant list narrowed to the
product owner plus, notionally, the dev team — close-to-code work.
**Domain baseline:** harvested (not re-derived) the event vocabulary and the aggregate model from
`bounded-contexts/domain-model-capture/canvas.md` (2026-08-26), the motivating hot spots from
`open-questions.md` #48 / #49 / #50 / #43, and the operation-log facts (single open session,
apply-in-arrival-order, `Operation Applied` / `Operation Rejected` boundary events) from
`bounded-contexts/session-facilitation/canvas.md` and F01.

Disclosed at the prepare step, per this workshop's own rule: the book is thin on Design-Level
(chapters 17–20); the aggregate work leans on `anoria-commons:domain-modeling`'s
`aggregate-design.md`, `aggregate-discovery.md` and `event-sourced-aggregates.md`, read directly
this session. `domain_lineage.py check` at entry reported 31 stale — all pre-existing cascade from
the 2026-08-26 Big Picture resume and the Question & Hot Spot Resolution collapse (#58); nothing
this pass needed blocked on it.

Also disclosed: this pass was expected to invalidate part of the 2026-08-26 model, and did —
the four Building Block aggregates plus `Timeline` are dissolved. That is a result, not an error.

## The reframe, and why it was pursued

Pass-2 on Session Facilitation (`open-questions.md` #48) surfaced a candidate: because the
workshop operation log is **single-writer** (v1 allows at most one open session per workshop) and
**applied in strict arrival order** (F01), the entire model graph could be an **event-sourced
projection over that one ordered log**, with every invariant checked at append time against the
current projection. That would dissolve `Timeline`-as-aggregate and its two-instance merge
transaction.

The participant chose to explore the reframe (over patching #49 / #50 within the five-aggregate
model) and asked that the domain-modeling aggregate references be used directly.

## What was elicited, in order (the aggregate-discovery loop)

1. **The single-writer premise.** Confirmed: for v1, within the one open session, operations are
   applied one-at-a-time in arrival order — a totally-ordered sequence, single logical writer,
   each operation decided against the projection of everything before it. F14 (multiplayer) is "a
   broadcast over the existing operation log; no model change" and does not change this. `[storm]`

2. **The invariants, stated in the language, and how much graph each reads.** Enumerated:
   no `follows` cycle (whole reachable chain); `Insert Between` may not close a cycle (whole
   chain); relation endpoints must be the permitted kinds (2 endpoints); an operation must target
   an existing Building Block whose kind/state permits it (1); `Link Cause` / `Annotate` may not
   target a withdrawn or missing block (1–2); a hot-spot resolution carries a reference. The
   participant confirmed the list complete — "I don't remember any other rule". `[storm]`

3. **Whose job / one boundary.** The accept-or-reject answer is synchronous and the issuing
   user's, right now (F01: "rejected with the offending path named"). The participant: "We can't
   really do multiple operations in parallel if the result of one operation may invalidate
   another." → one transactional consistency boundary over the whole workshop graph. `[storm]`

4. **Back-of-envelope cost** (elicited, not estimated): low hundreds of Building Blocks per
   workshop ("even for big businesses… the explosion is controlled"); single-digit thousands of
   operations over a workshop's life, timeline organization (many `Insert Between`s) being the
   bulk, rewordings "very controlled"; a couple of operations per minute at peak "even with
   multiplayer capabilities". Verdict: folding that log is sub-millisecond, a cycle check over
   low-hundreds of Building Blocks is instant, single-writer means zero contention. The 144-vs-25
   blow-up from Vernon's Scrum example does not bite — no contention, tiny absolute size, human
   pace. The one big boundary is affordable. `[storm]`

5. **The aggregate, invariant-first.**
   - **Invariant:** the operation log, folded in arrival order, always yields a valid graph.
   - **Responsibility:** validate each operation against the current projection, then append or
     reject with a reason; be the single source of truth the model is derived from.
   - **Name:** `Board`. Invariant and responsibility stated first; the participant chose `Board`
     ("Board makes sense"). The 2026-08-26 pass had tried `Board` for the whole-workshop graph and
     retired it when that boundary turned out wrong — the boundary is now genuinely the whole log,
     so the name fits.
   - **Consequence, accepted by the participant:** the four Building Block aggregates and
     `Timeline` all dissolve into `Board`. Domain Event / Actor / System / Hot Spot become node
     kinds in the projection; the connected-component "timeline" grouping becomes a derived read
     model with no merge/split transaction. `[storm]`

6. **Slimming the write model** (`event-sourced-aggregates.md`). Confirmed: the guard state holds
   Building Block id → { kind, withdrawn? }, `follows` adjacency, `causedBy` endpoints, hot-spot
   open/resolved + annotation target id. Label, pivotal marker, placement-for-display and the
   resolution reference value are read-model detail, not in the write model. The participant
   caught a slip — "why use node id instead of building block id? I thought we deprecated the node
   word" — corrected to Building Block id throughout. `[storm]`

7. **Fold events vs. published events.** Confirmed distinct: the operations are the internal fold
   events; the canvas's Events-out list is the outward contract, unchanged. The Board does not
   leak a separate internal stream past its boundary. `[storm]`

8. **The `Board` state machine.** Confirmed flat: birth when the Workshop is created (an empty
   Board), one long `OPEN` state for the Workshop's whole life, no modelled death for v1 (archiving
   / locking a Workshop, #25, still not designed). The per-kind lifecycles (`ACTIVE ⇄ WITHDRAWN`,
   hot-spot `OPEN ⇄ RESOLVED`, pivotal toggle, placed/unplaced) become projection state, not
   separate state machines. `[storm]`

9. **Boundary validation.** The inherited seam holds unchanged — Domain Model Capture stays the
   map's upstream hub, Customer/Supplier with Session Facilitation, Conformist with Derived
   Artifact Generation. One operational dependency recorded: the single-writer premise rests on
   Session Facilitation's "at most one open session per workshop" constraint (#46) plus F01's
   arrival-order rule; the Board assumes serialization, it does not enforce it. `[storm]`

## Hot spots resolved / updated

- **#48 — resolved (adopted).** One event-sourced `Board`, five aggregates dissolved.
- **#50 — resolved.** `Insert Between(A, C, B)` goes through the same cycle check as `Sequence`;
  if `C` already has a path to `A` it is rejected. No "C must be fresh" restriction.
- **#49 — resolved.** `Link Cause` / `Annotate` to a withdrawn or missing target → rejected at
  append (F01's existing "targets an id that does not exist → rejected as a no-op"). The
  resolution **reference** is a recorded value, not a live foreign key (F01: "deliberately
  untyped… the schema does not constrain its shape") — so a reference that later names a withdrawn
  block is historical text, not a failure state; the Board does not police it.
- **#34 — resolved.** `Insert Between` is one operation in the log, atomic because the append is
  atomic. F01's per-operation atomicity guarantee covers it directly — no need for a
  transactionally-bundled group of three.
- **#37 — largely moot.** The `Timeline` aggregate is gone; only F02's UI "timeline" surface and a
  derived connected-component read model remain, so the naming clash mostly dissolves.
- **#43 — left for the owning context.** With the whole graph served as one read model to Derived
  Artifact Generation, whether the Board's output carries every datum Flow A's deterministic
  account needs is that context's resume to specify. Not pressed here, by the participant's choice.

## Hot spots unchanged (still open)

- **#32** — whether Hot Spot's `kind` field earns its place. Unowned, undated.
- **#33** — a "destroy" operation for true duplicates, in tension with F01's no-merge rule.
  Unowned, undated.
- **#27** — the context the facilitator gathers before its next question. `[carried]`, unowned.

## New finding

- **`Insert Between`'s published event name is unconfirmed.** The canvas uses "Domain Event
  Sequence Reshaped" as a placeholder, tagged `[inferred]` — the participant named the *command*
  (`Insert Between`) but not the outward event. Worth a name when the PRD pass (#29) touches F01's
  operation-log kind list.

## The six completion rules

| # | Rule | Status |
|---|---|---|
| 1 | Every path completed | **Holds.** Every operation terminates in append-or-reject; no dangling transition. |
| 2 | Grammar respected | **Holds.** Command (operation) → `Board` → Event (fold + published) alternates cleanly. |
| 3 | Every stakeholder reasonably happy | **Holds.** Domain Expert (direct F06) and Session Facilitation (mediated) both get the accept/reject answer synchronously. The Facilitator is a pass-through actor here, as expected — no stake of its own in this context. |
| 4 | Every hot spot addressed | **Holds.** #48/#49/#50/#34 resolved; #37 moot; #43 handed to Derived Artifact Generation's resume; #32/#33/#27 explicitly unowned and undated. |
| 5 | Boundaries visible | **Holds.** All operations as Boundary Commands, all published events as Boundary Events, on the surfaces they cross; the one operational dependency on Session Facilitation's constraint is named. |
| 6 | Components consistent | **Holds.** One aggregate, one flat lifecycle; the Building Block lifecycles reconciled as projection state against the Commands / Events tables. |

None deferred.

## Verification pass

- Every claim in the canvas traces to a `[storm]` yes this session or a `[carried]` element from
  the 2026-08-26 pass. No element presented as settled carries `[code]` or `[inferred]` except the
  one flagged `Insert Between` event name.
- The 2026-08-26 session record is left unedited — it is history. The canvas's opening note points
  to both records.
- `acceptance-tests.md`'s Domain Model Capture block (items 12–21) was revised in place for the
  single-`Board` model and extended with new coverage (see that file).

## Hand-off

- `bounded-contexts/domain-model-capture/canvas.md` — the event-stormed model stays
  `[storm]`-confirmed, still `draft` pending `ddd-strategic-design` promotion.
- The 2026-08-26 five-aggregate model is superseded; a later workshop contradicting an earlier one
  is a result, not an error (book p. 258). The `Timeline` aggregate, `Sequence`-as-merge and the
  connected-component consistency boundary are all gone.
- **Recommended next** (recommend, not start): the book's own next action — prototype the `Board`
  (`decide` / `evolve` over the operation log, the cycle check, the connected-component read
  model) and write down the questions it raises. Then Derived Artifact Generation's resume (#56,
  #43).
- PRD pass (#29, participant owns): F01's operation-log kind list needs `sequence` / `unsequence`
  / `insert between` / `link cause` / `unlink cause` / `annotate` / `unannotate` / `reopen`, and
  `place` / `unplace` named as real operations.