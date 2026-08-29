---
workshop: design-level
scope: domain-model-capture
status: draft
last_updated: 2026-08-27
digest: 7a55df625f6a
derived_from:
  - path: boards/eventstormer-big-picture.md
    digest: a1fe4f12aaba
    at: 2026-08-26
  - path: bounded-contexts/domain-model-capture/canvas.md
    digest: 705129af8f2d
    at: 2026-08-27
---
# Ubiquitous Language: Domain Model Capture

> Phase 04, extended by the Design-Level EventStorming passes (2026-08-26, and 2026-08-27 pass 2
> — the `Board`).

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
| Reinstated | A withdrawn Building Block returns — **naked**: no relation, no placement, identical in shape to a freshly captured one. Re-linking (`Link Cause`, `Annotate`, `Sequence`) is a separate, explicit act afterward — the facilitator can help by proposing links from history | `[storm]`, 2026-08-26 — supersedes the original "re-validates old relations" reading | Resolves `open-questions.md` #3 by dissolving it |
| `Board` | The one event-sourced aggregate for a workshop — the append-only operation log and the typed graph projected from it. Every model-mutating operation is validated against the current projection and appended, or rejected. One per Workshop | `[storm]`, 2026-08-27 pass 2 — the participant's confirmed name, after `Board`→`Timeline` (2026-08-26) and `Timeline`→`Board` again once the log turned out to be the whole boundary | consistency boundary — see canvas.md |
| ~~`Timeline`~~ (dissolved) | Was: one aggregate per connected component of sequenced events. **Dissolved 2026-08-27** — with the operation log single-writer and totally ordered, there is no per-component boundary. What remains is a **derived read model**: the connected-component grouping of `follows`-linked events (F02's display surface) | `[storm]`, superseded 2026-08-27 | not an aggregate; recomputed after every topology change |
| Sequence / Unsequence | The `follows` relation between two Domain Events, cycle-checked against the whole-graph projection. Renamed from the generic `Relate`/`Unrelate` (2026-08-26) — the shared verb read as "awkward" across three structurally different relation kinds | `[storm]` | `Sequence` / `Unsequence` change which events fall in one derived track — no aggregate merge or split, just the recomputed grouping |
| Link Cause / Unlink Cause | The `causedBy` relation, Actor/System → Domain Event. Owned entirely by the Event's own record — the Actor/System holds no back-reference. Also renamed off the generic `Relate`/`Unrelate`, echoing the original Big Picture board's own wording ("Actor Linked To The Domain Event It Caused") | `[storm]`, this session | `Unlink Cause` also fires automatically when the source Actor/System is withdrawn |
| Annotate / Unannotate | A Hot Spot's relation to the Building Block it's about (or none). Owned entirely by the Hot Spot's own record. Renamed off `Relate`/`Unrelate`, echoing the PRD's own verb ("a hot spot annotates...") | `[storm]`, this session | — |
| Insert Between | A first-class atomic operation that replaces one `follows` edge `A→B` with `A→C→B` — one entry in the log, not a bundle. **Cycle-checked exactly like `Sequence`** (2026-08-27): rejected if `C` already has a path to `A` | `[storm]`, command 2026-08-26, cycle-safety + atomicity 2026-08-27 | The graph is a DAG, not a queue — other successors of `A` are untouched. Outward event name ("Domain Event Sequence Reshaped") is `[inferred]`, unconfirmed |
| Reopen | Moves a Hot Spot from Resolved back to Open, to correct a wrong resolution. Distinct from a fresh `Raise Hot Spot` for a recurring-but-differently-caused issue — different identity | `[storm]`, this session | New verb; PRD does not yet name it |
| Element / Node | Implementation-flavored synonym for Building Block — **not** this context's language | — | `leaked`, synonym-of:Building Block |
| Rename | Synonym for Reworded — **not** this context's language: renaming implies the identity changes, when only the articulation does | — | `leaked`, synonym-of:Reworded |

## Behaviour (scenarios)

See `acceptance-tests.md` items 12–21 (plus 12a/16a/18a/19a/20a/20b, revised 2026-08-27) for the
full Given/When/Then set — cycle rejection against the whole-graph projection, `Insert Between`
cycle-safety and atomicity, reject-at-append for dead targets, naked `Reinstate`, `Resolve` /
`Reopen`, the connected-component read model recomputing on topology change, and full-log replay.

## Ambiguities & synonyms found (boundary / modelling signals)

| Word | Conflicting meanings / synonyms | Resolution |
|---|---|---|
| Element/Node vs. Building Block (umbrella) / Domain Event/Actor/System/Hot Spot (kind-specific) | Generic implementation vocabulary vs. this context's confirmed business language | "Building Block" (Brandolini's own term) is the confirmed umbrella; "Element"/"Node" is implementation jargon, kept out |
| Rename vs. Reworded | Implementation-flavored wording vs. this context's business language | "Reworded" confirmed — renaming implies the identity changes, when only the articulation does |
| `place`/`unplace` vs. `relate`/`unrelate` (PRD F01's operation-log kind list) | Opened this session as a hypothesis that `place`/`unplace` might be a PRD leftover, fully derivable from `relate`/`unrelate` | **Not a leftover — both are real, independent operations.** `Place` is the factory that births a Timeline; `Sequence`/`Unsequence` grow, merge, or split it |
| `Board` vs. `Timeline` (the aggregate name) | 2026-08-26: `Board` (one aggregate for the whole graph) → corrected to four Building Block aggregates + `Timeline` (one per connected component). 2026-08-27: reframed again | **`Board` is the confirmed name.** Once the operation log was confirmed single-writer and totally ordered, the whole graph *is* one boundary — an event-sourced projection over the log. `Timeline`-as-aggregate is dissolved; the connected-component grouping survives as a read model. See `../../open-questions.md` #48 |
| PRD F02's "timeline" (the UI surface) vs. the connected-component read model | Largely moot 2026-08-27 | The `Timeline` aggregate is gone; the read model still wants a non-colliding name (`../../open-questions.md` #60), minor |

<!-- BEGIN lineage:index -->
<!-- END lineage:index -->