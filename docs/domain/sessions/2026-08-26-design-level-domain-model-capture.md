---
workshop: design-level
scope: domain-model-capture
status: draft
last_updated: 2026-08-26
digest: 8fb8d04365b1
derived_from:
  - path: boards/capture-loop.md
    digest: bc6ad40750e0
    at: 2026-08-26
  - path: boards/eventstormer-big-picture.md
    digest: a1fe4f12aaba
    at: 2026-08-26
  - path: bounded-contexts/domain-model-capture/canvas.md
    digest: 705129af8f2d
    at: 2026-08-27
  - path: bounded-contexts/session-facilitation/canvas.md
    digest: 192d89ca4269
    at: 2026-08-28
  - path: context-map.md
    digest: ec6dc67a4870
    at: 2026-08-28
  - path: open-questions.md
    digest: c9a8044f0a62
    at: 2026-08-28
---
# Session — Design-Level EventStorming: Domain Model Capture

**Date:** 2026-08-26
**Workshop:** Design-Level
**Participants:** One — the product owner (solo), same hard limit as every prior session in this
line: no genuine inter-participant disagreement was available. Participant list deliberately
narrowed per this workshop's own rule.
**Domain baseline:** harvested (not re-derived) the event vocabulary from
`boards/eventstormer-big-picture.md` and `boards/capture-loop.md`, the motivating hot spot from
`open-questions.md` #3/#8 (the aggregate boundary, tied to the reinstatement conflict rule), and
what's known about the external contexts touched (Session Facilitation upstream, Derived Artifact
Generation downstream) from `context-map.md` and `bounded-contexts/session-facilitation/canvas.md`.

Disclosed at the prepare step, per this workshop's own rule: the book is thin on Design-Level
(chapters 17–20, the least-finished part of it); what follows leans on the author's 2025 workshop
templates and DDD literature for the six completion rules, the aggregate-discovery method, and the
modelling strategies. `domain_lineage.py check` at entry reported this context's canvas stale
against the most recent Big Picture resume (the `Workshop Started`/`Session Started` split); folded
into this pass rather than treated as a separate refresh.

## What was elicited, in order

1. **The reinstatement conflict rule dissolved, not resolved.** Asked what actually happens when a
   reinstated Building Block's old relations no longer hold, the participant proposed the
   facilitator resolving location at reinstatement time — which, on inspection, is the UI doing
   ordinary re-placement, not Domain Model Capture doing conflict resolution. Confirmed directly:
   reinstate always returns a **naked** Building Block — unplaced, unrelated — identical in shape
   to a freshly captured one. Old relations may be surfaced as hints; that's facilitation, not a
   `Board` invariant. `[storm]`, dissolves `open-questions.md` #3.

2. **The cycle question, checked against the references rather than assumed.** The participant
   asked whether `follows` cycles should be tolerated, citing EventStorming's own notion of
   "loops." Checked `references/sticky-note-types.md` and `event-smells-and-antipatterns.md`: the
   method's "loop" vocabulary is either the Command→System→Event→Policy→Command automation loop
   (Process Modelling grammar) or a *business process* with negotiation/retries/recurrence
   (addressed via conversational-system markers or frames, not a literal cyclic timeline). Neither
   supports a genuinely cyclic `follows` chain — that would mean "A after B and B after A"
   simultaneously. Reported back; the participant agreed: cycles are never valid, hard-rejected
   always. `[storm]`

3. **`causedBy`'s endpoint restriction is structural, not a runtime check.** The five forbidden
   combinations the participant named (actor↔actor, system↔system, actor↔system, actor↔hot-spot,
   system↔hot-spot) are all unrepresentable by construction — each artifact kind is its own type
   with its own permitted relations, confirmed as a deliberate design commitment: "we should design
   different artifacts and each of them have their rules in the design." `[storm]`

4. **Naming the aggregate: `Board`.** Invariant-first — the no-cycle check needs whole-graph
   visibility, which is what requires one consistency boundary bigger than a single Building
   Block. Deliberately not offered a real name until the invariant and responsibility were stated;
   the participant chose `Board`, citing it as an EventStorming term already used informally in the
   PRD's own prose. `[storm]`.

5. **Scope of the graph: per-Workshop, accumulating across sessions, not per-Session.** Confirmed
   directly — "the board accumulates artifacts from all the sessions of a workshop." This is what
   makes the cycle check span more than one sitting. `[storm]`

6. **`place`/`unplace` are real, independent operations — correcting this session's own opening
   hypothesis.** Initially suspected as a PRD leftover (same pattern as the earlier "rename"
   finding), fully derivable from `relate`/`unrelate`. The participant corrected this: EventStorming's
   Chaotic Exploration phase produces roughly-organized clusters, not a single fully-ordered chain
   — "if we already know where to place, we relate. If we don't know, we just place and start a
   parallel track. Then we can merge them later." A Building Block can be `Placed` with zero
   relations. `[storm]`, self-correction.

7. **`Unplace` severs relations, same shape as `Withdraw`.** Confirmed directly; can split a
   previously-connected track into two. Reconnection (e.g. the UI suggesting `A`–`C` once `B` is
   removed from `A`–`B`–`C`) is always a separate, explicit `Relate`, never automatic. `[storm]`

8. **`Insert Between(A, C, B)` is a first-class atomic command**, not a bundle of three sequential
   operations — the participant's own framing: "we can think about the operations we can do in a
   graph, or a sorted array... we'd probably have the same in here." Replaces one edge with two in
   a single commit; other successors of `A` (the board is a DAG, confirmed, not a queue) are
   untouched. `[storm]`

9. **Annotation is a third relation kind under the same `Relate`/`Unrelate` commands**, not fixed
   at creation — a Hot Spot's target can move later. `[storm]`

10. **Hot Spot Raised's payload, mostly settled.** Now that the resolution logic is designed
    (Session Facilitation session), the participant committed to: kind, trigger, annotation target.
    The `kind` field's own usefulness stayed explicitly unresolved — "I'm not sure if we need the
    kind attribute, but it may be useful." Recorded honestly as still open, not decided either way.
    `[storm]`, partial.

11. **`Reopen` — new command, new finding.** A resolved Hot Spot can be reopened to correct a wrong
    resolution; explicitly distinguished from a fresh `Raise Hot Spot` for a recurring-but-
    differently-caused issue — "if the same issue appears but for a different reason, then it's
    another hotspot." Different identity, not a reopen. `[storm]`

12. **A "destroy" operation was floated and explicitly left undesigned.** The participant raised
    the possibility for true duplicates found while organizing the timeline, but was explicit about
    being unsure. It conflicts with F01's confirmed "the system never merges two building blocks."
    Recorded as a hot spot, not modelled — the tension is the finding. `[storm]`, not adopted.

## Boundary validation

Testing the one inherited seam (Domain Model Capture as the map's upstream hub), given everything
modelled this session:

- Every command Session Facilitation issues into this context (kind-specific creation,
  `Resolve`, and now `Reopen`) and every event it consumes back (`Hot Spot Raised`,
  `Hot Spot Resolved`, `Hot Spot Reopened`) fits the existing Customer/Supplier relationship —
  nothing crosses that wasn't already anticipated.
- F06's direct-editing commands (Reword/Withdraw/Reinstate/Place/Unplace/Relate/Unrelate/Insert
  Between/Mark Pivotal) arrive from the Domain Expert via the UI, not through another bounded
  context — a boundary crossing from the app layer, not a context-to-context one, and still a
  Boundary Command by this workshop's own definition.
- Derived Artifact Generation's Conformist relationship is unchanged — it still just consumes
  every event out.

**The seam holds. No revision to `context-map.md`'s relationships is needed** — this session made
the boundary's commands and events explicit, it didn't move it.

## The aggregate(s): first draft, `Board`

**This section records the first draft's reasoning as it happened — see the Addendum below for
the same-day correction.** First-draft invariants (invariant-first — carried here for the record):

1. No `follows` edge may create a cycle, checked against the whole graph accumulated across the
   workshop's life. Hard, always enforced.
2. Relation endpoint-kind pairing is structural (unrepresentable otherwise), not a runtime check.
3. `Insert Between` is atomic — never observably half-applied.
4. `Withdraw` and `Unplace` both sever every relation; `Withdraw` additionally hides by default.
5. `Reinstate` never restores relations — always naked.
6. `Resolve` requires a reference; `Reopen` requires none. Both target Hot Spot only.

Invariant 1 survives the correction unchanged in substance — it's still what forces a boundary
bigger than one record. What changed is the *shape* of that boundary (`Timeline`, one per
connected component, not `Board`, one per workshop) and the fact that invariants 2–6 never
actually needed to share a boundary with invariant 1 at all. **See canvas.md for the corrected,
current model** — this section is history, not the current design.

## The six completion rules

| # | Rule | Status |
|---|---|---|
| 1 | Every path completed | **Holds.** Every command's effect terminates in a stable state; no dangling transition found. `Withdrawn` is reversible but not a dead end — explicit, not accidental. |
| 2 | Grammar respected | **Holds.** Command → Aggregate → Event alternates throughout; no step papered over. |
| 3 | Every stakeholder reasonably happy | **Holds, with a caveat.** Domain Expert (direct F06 editing) and Session Facilitation (mediated commands) both get what they came for; the Facilitator itself never appears as more than a pass-through actor here, which is expected — it has no stake of its own in this context. |
| 4 | Every hot spot addressed | **Holds, with owners recorded.** See below — every survivor carries an explicit unowned/undated status or is closed. |
| 5 | Boundaries visible | **Holds.** Every command/event in the canvas's Commands/Events tables is drawn explicitly as a Boundary Command/Event, not asserted in prose. |
| 6 | Components have consistent behaviour | **Holds**, re-verified after the correction — each aggregate's state machine (canvas.md) reconciled against the command/event tables; `Timeline`'s birth/merge/split reconciled separately, since it's a structurally different lifecycle from the four Building Block kinds. |

All six held this session — none deferred, including after the same-day correction (see Addendum).

## Hot spots surfaced or resolved this session

See `open-questions.md` for the full, dated accounting. Summary:

- **Resolved (dissolved):** #3 (reinstatement conflict rule) — no conflict case exists; reinstate
  is always naked.
- **Resolved:** #8 (aggregate boundary) — `Board`, invariant-first from the no-cycle check.
- **Mostly resolved:** #13/#28 (Hot Spot Raised/Resolved payload) — kind/trigger/annotation-target
  agreed; the `kind` field's own necessity stays open (#32).
- **New, unowned:** #32 (Hot Spot `kind` field), #33 (a possible destroy operation, in tension with
  the confirmed no-merge rule), #34 (`Insert Between`'s atomicity has no home in F01's per-operation
  atomicity guarantee).
- **New, recorded as a finding not a gap:** #35 (`place`/`unplace` are real, independent
  operations — this session's own opening hypothesis was wrong, corrected by the participant).

## Addendum — same-day correction: the aggregate boundary was wrong

After close, the participant reviewed the model and pushed back directly: several operations
(Reword, `causedBy`, annotation) have no invariant reaching outside one or two records, so folding
everything into one `Board` aggregate was a mis-derivation, not a defensible conservative default.
This is a **resume of the same workshop**, not a new session — the artifact is still `draft`.

**Re-run of the discovery loop** (`anoria-commons:domain-modeling`'s `aggregate-discovery.md`,
consulted directly per the participant's request), invariant by invariant:

1. **Reword, Mark/Unmark Pivotal, Resolve, Reopen** — no invariant reaches outside one record.
   → each Building Block kind is its own aggregate.
2. **`causedBy`** — structurally typed (Actor/System→Event only), never chains, so no invariant
   needs more than the two endpoints. Confirmed live: this relation is owned entirely by the
   **Event's own record** (its `causedBy` list) — the Actor/System holds no back-reference.
3. **Annotation** — same shape, owned entirely by the **Hot Spot's own record** (one field).
4. **`follows`** — the one invariant (no cycle) that genuinely needs whole-chain visibility. But
   the participant sharpened the boundary further: **a `Timeline` is a connected DAG of placed,
   sequenced Domain Events — a workshop holds many of them**, not one graph for the whole workshop.
   `Board` (this session's own earlier name) was retired in favor of `Timeline`, named live by the
   participant, with the workshop-spanning "one big graph" framing explicitly wrong.

**`Timeline`'s birth/merge/split, worked through directly with the participant:**

- **Birth:** `Place` creates a single-event Timeline — confirmed as "the simplest thing to do,"
  resolving an open question from earlier in the same resume about whether a lone placed event
  counts as its own Timeline.
- **Merge:** `Sequence(A, B)` across two different Timelines reads both and commits one surviving
  instance — confirmed as a legitimate, bounded multi-instance transaction (the union-find shape),
  not the unbounded multi-aggregate anti-pattern the discovery loop warns against, because the
  invariant's true reach is exactly the two components being joined.
- **Split, corrected with a precision the first draft missed:** the participant caught that
  `Unsequence`/`Withdraw`/`Unplace` should split a Timeline **only if the removal actually
  disconnects the graph** — "unless there's another branch that keeps the chain united... if we
  remove one event in the middle of the bifurcation, the timeline is still there." This is a real
  connected-components recomputation, not a naive "any edge removed = a split."

**Command renaming, prompted by the participant finding the shared `Relate`/`Unrelate` verb
"awkward" once three structurally different aggregates were involved:**

| Old (this session's first draft) | New | Reasoning |
|---|---|---|
| `Relate`/`Unrelate` (`follows`) | `Sequence`/`Unsequence` | Matches this session's own event names (`Domain Event Sequenced`), now the command matches too |
| `Relate`/`Unrelate` (`causedBy`) | `Link Cause`/`Unlink Cause` | Echoes the original Big Picture board's own wording |
| `Relate`/`Unrelate` (annotation) | `Annotate`/`Unannotate` | Echoes the PRD's own verb ("a hot spot annotates...") |

**Two new cascading policies, resolved live rather than left as dangling-reference questions:**

- **When an Actor/System is Withdrawn → `Unlink Cause`** on every Domain Event that referenced it.
  Confirmed: "the Link Cause is cleared. If we reinstate, we'll need to link again" — re-linking is
  explicit, the facilitator can propose it from history the same way it does elsewhere.
- **When any Building Block a Hot Spot annotates is Withdrawn → withdraw that Hot Spot too.**
  Block-vs-cascade was put directly to the participant; cascade won: "probably the latter is
  better."

**One naming overlap surfaced and deliberately left open:** PRD F02 already uses "timeline" for
the UI's placed-vs-backlog surface, which is a different concept from this session's `Timeline`
aggregate. The participant accepted the possible confusion and said the PRD can differentiate the
two later if it matters — not settled here (`open-questions.md` #37).

`bounded-contexts/domain-model-capture/canvas.md` was rewritten in full to reflect this corrected
model — the boundary rationale, commands table, events table, policies table, aggregates section
(now five aggregates, invariant-first, with `Timeline`'s birth/merge/split stated precisely), and
state machines. `acceptance-tests.md` items 12–19 were revised for the new vocabulary and one new
connectivity nuance (item 16a); two new tests (20–21) cover the cascading policies.

## Hand-off

- This context's event-stormed model (`Commands`/`Events`/`Policies`/`Queries`/`Aggregates`) in
  `bounded-contexts/domain-model-capture/canvas.md` moves from `UNCONFIRMED` to `[storm]`,
  confirmed this session — still `draft` pending `ddd-strategic-design` promotion.
- Derived Artifact Generation remains the last v1 context with no Design-Level pass at all
  (`open-questions.md` #9 still open — on-demand vs. materialized export).
- The PRD (F01, F08) has accumulated several gaps this line of sessions has found but not fixed:
  `place`/`unplace` need naming as real operations, `Insert Between` and `Reopen` are new verbs,
  and the Hot Spot resolve/reopen/kind shape needs writing up. Recommending the participant fold
  all of these into one PRD pass rather than one at a time, alongside the F08 update already owned
  from the Session Facilitation session (`open-questions.md` #29).

## Recommendation

Per the book's own next action after Design-Level: *"start coding a prototype as soon as
possible... turn the exploration into working code, and write down the resulting questions."* A
working prototype of `Board` is itself another form of model. Not done here — recommended as the
next step, alongside the PRD update and, when the participant is ready, Design-Level on Derived
Artifact Generation (the one remaining unstormed v1 context).