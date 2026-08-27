---
workshop: design-level
scope: domain-model-capture
status: draft
last_updated: 2026-08-26
digest: b7d0cd88ba5b
derived_from:
  - path: boards/eventstormer-big-picture.md
    digest: a1fe4f12aaba
    at: 2026-08-26
  - path: bounded-contexts/domain-model-capture/canvas.md
    digest: 6ae50843569d
    at: 2026-08-26
---
# Ubiquitous Language: Domain Model Capture

> Phase 04, extended by the Design-Level EventStorming pass (2026-08-26).

**Status:** draft • **Provenance:** `[storm]` / `[confirmed]`

## Terms

| Term | Meaning in this context | Code name(s) / source (`file:line`) | Flags |
|---|---|---|---|
| Building Block | The umbrella term for "one of the four kinds, regardless of which" — Domain Event, Actor, System, or Hot Spot. Alberto Brandolini's own chapter title for this exact vocabulary, at both the Big Picture ("Building Blocks – 20%") and Process Modeling ("Process Modeling Building Blocks – 90%") zoom levels, *Introducing EventStorming* | UNCONFIRMED | `[glossary]`, `[confirmed]` |
| Domain Event | One of four Building Block kinds on the board; a past-tense domain fact | UNCONFIRMED | `[confirmed]` |
| Actor | One of four Building Block kinds; a person or role | UNCONFIRMED | `[confirmed]` |
| System | One of four Building Block kinds; an external or supporting system | UNCONFIRMED | `[confirmed]` |
| Hot Spot | One of four Building Block kinds; a flagged gap or disagreement | UNCONFIRMED | `[confirmed]` |
| Reworded | The post-creation correction of a Building Block's label; its identity (its id) does not change | UNCONFIRMED | `[confirmed]` |
| Withdrawn | A Building Block's own relations are severed; hidden by default, reversible. Withdrawing an Actor/System also cascades `Unlink Cause` on every Domain Event that referenced it; withdrawing anything a Hot Spot annotates cascades `Withdraw` on that Hot Spot too | board `[storm]`, cascades `[storm]` this session | — |
| Reinstated | A withdrawn Building Block returns — **naked**: no relation, no Timeline membership, identical in shape to a freshly captured one. Re-linking (`Link Cause`, `Annotate`, `Sequence`) is a separate, explicit act afterward — the facilitator can help by proposing links from history, the same way it helps elsewhere | `[storm]`, this session — supersedes the original "re-validates old relations" reading | Resolves `open-questions.md` #3 by dissolving it |
| `Timeline` | The aggregate that isn't a Building Block itself — one per **connected component** of sequenced, placed Domain Events. A workshop holds many Timelines at once, plus the backlog of unplaced/unsequenced events. Enforces the one invariant that needs whole-chain visibility: no `follows` cycle | `[storm]`, this session — the participant's own term, corrected mid-session from the original "Board" once it became clear one aggregate per workshop was the wrong grain | consistency boundary — see canvas.md for birth/merge/split |
| Sequence / Unsequence | The `follows` relation between two Domain Events, cycle-checked. Renamed from the generic `Relate`/`Unrelate` — the participant found the shared verb across three structurally different relation kinds "awkward" and asked for names that "translate to what we're actually changing" | `[storm]`, this session — corrects this session's own earlier `Relate`/`Unrelate` naming | `Sequence` can **merge** two Timelines; `Unsequence` can **split** one, but only if the removal actually disconnects the graph — a bifurcation that reunites downstream stays whole |
| Link Cause / Unlink Cause | The `causedBy` relation, Actor/System → Domain Event. Owned entirely by the Event's own record — the Actor/System holds no back-reference. Also renamed off the generic `Relate`/`Unrelate`, echoing the original Big Picture board's own wording ("Actor Linked To The Domain Event It Caused") | `[storm]`, this session | `Unlink Cause` also fires automatically when the source Actor/System is withdrawn |
| Annotate / Unannotate | A Hot Spot's relation to the Building Block it's about (or none). Owned entirely by the Hot Spot's own record. Renamed off `Relate`/`Unrelate`, echoing the PRD's own verb ("a hot spot annotates...") | `[storm]`, this session | — |
| Insert Between | A first-class atomic command that replaces one `follows` edge `A→B` with `A→C→B` in a single commit — not a bundle of unrelate+relate+relate | `[storm]`, this session | A Timeline is a DAG, not a queue — other successors of `A` are untouched |
| Reopen | Moves a Hot Spot from Resolved back to Open, to correct a wrong resolution. Distinct from a fresh `Raise Hot Spot` for a recurring-but-differently-caused issue — different identity | `[storm]`, this session | New verb; PRD does not yet name it |
| Element / Node | Implementation-flavored synonym for Building Block — **not** this context's language | — | `leaked`, synonym-of:Building Block |
| Rename | Synonym for Reworded — **not** this context's language: renaming implies the identity changes, when only the articulation does | — | `leaked`, synonym-of:Reworded |

## Behaviour (scenarios)

Captured this Design-Level pass — see `acceptance-tests.md` items 12–19 for the full Given/When/Then
set (cycle rejection, `Insert Between` atomicity, `Withdraw`/`Unplace` severing, naked `Reinstate`,
`Resolve`/`Reopen`, disconnected-track placement).

## Ambiguities & synonyms found (boundary / modelling signals)

| Word | Conflicting meanings / synonyms | Resolution |
|---|---|---|
| Element/Node vs. Building Block (umbrella) / Domain Event/Actor/System/Hot Spot (kind-specific) | Generic implementation vocabulary vs. this context's confirmed business language | "Building Block" (Brandolini's own term) is the confirmed umbrella; "Element"/"Node" is implementation jargon, kept out |
| Rename vs. Reworded | Implementation-flavored wording vs. this context's business language | "Reworded" confirmed — renaming implies the identity changes, when only the articulation does |
| `place`/`unplace` vs. `relate`/`unrelate` (PRD F01's operation-log kind list) | Opened this session as a hypothesis that `place`/`unplace` might be a PRD leftover, fully derivable from `relate`/`unrelate` | **Not a leftover — both are real, independent operations.** `Place` is the factory that births a Timeline; `Sequence`/`Unsequence` grow, merge, or split it |
| `Board` vs. `Timeline` | This session's own opening choice, `Board`, named one aggregate for the whole workshop's graph — everything: every Building Block, every relation | **Corrected same-day.** `Board` conflated several unrelated invariants into one boundary. `Timeline` names only the aggregate that actually needs whole-chain visibility (the `follows`-cycle check); there is no single aggregate for "the whole board" — each Building Block kind is its own, and a workshop holds many Timelines at once |
| PRD F02's "timeline" (the UI surface: placed vs. backlog) vs. this context's `Timeline` (the aggregate) | Surfaced, not resolved | The participant accepted the possible overlap and said the PRD can differentiate the two if needed later; left as `../../open-questions.md`, not settled here |

<!-- BEGIN lineage:index -->
<!-- END lineage:index -->