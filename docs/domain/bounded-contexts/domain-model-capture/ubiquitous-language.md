---
workshop: design-level
scope: domain-model-capture
status: draft
last_updated: 2026-08-26
digest: c4c497159b0d
derived_from:
  - path: boards/eventstormer-big-picture.md
    digest: a1fe4f12aaba
    at: 2026-08-26
  - path: bounded-contexts/domain-model-capture/canvas.md
    digest: bf2af41bae0a
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
| Withdrawn | A Building Block's connections are severed; hidden by default, reversible | board `[storm]` | — |
| Reinstated | A withdrawn Building Block returns — **naked**: unplaced, unrelated, identical in shape to a freshly captured one. No relation is ever automatically restored | `[storm]`, this session — supersedes the original "re-validates old relations" reading | Resolves `open-questions.md` #3 by dissolving it |
| `Board` | The aggregate — one per Workshop, accumulating across all of that workshop's sessions. Holds every Building Block and relation and is the thing that enforces the no-cycle invariant | `[storm]`, this session — the participant's own choice, drawing on EventStorming's own vocabulary (the PRD already used "board" informally for the same snapshot) | consistency boundary |
| Placed / Unplaced | Whether a Building Block sits on the timeline (Placed) or the backlog (Unplaced). A **real, independent state** — not purely derived from having a relation: a Building Block can be Placed with zero relations, starting a new disconnected track/cluster | `[storm]`, this session | `Unplace` severs relations, same shape as `Withdraw` |
| Relate / Unrelate | The three relation kinds — `follows` (event→event, cycle-checked), `causedBy` (actor/system→event), and Hot Spot annotation (hot spot→any non-hot-spot Building Block) — share one command pair. Endpoint-kind pairing is structural, not a runtime check | `[storm]`, this session | Merges/splits tracks |
| Insert Between | A first-class atomic command that replaces one `follows` edge `A→B` with `A→C→B` in a single commit — not a bundle of unrelate+relate+relate | `[storm]`, this session | Board is a DAG, not a queue — other successors of `A` are untouched |
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
| `place`/`unplace` vs. `relate`/`unrelate` (PRD F01's operation-log kind list) | Opened this session as a hypothesis that `place`/`unplace` might be a PRD leftover, fully derivable from `relate`/`unrelate` | **Not a leftover — both are real, independent operations.** A Building Block can be `Placed` with zero relations (starting a disconnected track); `relate`/`unrelate` only connect or split already-placed Building Blocks |

<!-- BEGIN lineage:index -->
<!-- END lineage:index -->