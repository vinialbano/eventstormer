---
workshop: ddd-strategic-design
scope: eventstormer-session
status: draft
last_updated: 2026-08-25
derived_from:
  - path: ../../boards/eventstormer-big-picture.md
    at: 2026-08-25
---

# Ubiquitous Language: Domain Model Capture

> Phase 04.

**Status:** draft • **Provenance:** `[storm]` / `[confirmed]`

## Terms

| Term | Meaning in this context | Code name(s) / source (`file:line`) | Flags |
|---|---|---|---|
| Building Block | The umbrella term for "one of the four kinds, regardless of which" — Event, Actor, System, or Hot Spot. Not this session's invention: Alberto Brandolini's own chapter title for this exact vocabulary, at both the Big Picture ("Building Blocks – 20%") and Process Modeling ("Process Modeling Building Blocks – 90%") zoom levels, *Introducing EventStorming* | UNCONFIRMED | `[glossary]`, `[confirmed]` — revision 2026-08-25: was "element" (this session's own draft usage, itself an accidental reintroduction of the rejected PRD term) → "Building Block" |
| Event | One of four Building Block kinds on the board; a past-tense domain fact | UNCONFIRMED | `[confirmed]` this session as the correct term (not "Element"/"Node") |
| Actor | One of four Building Block kinds; a person or role | UNCONFIRMED | `[confirmed]` |
| System | One of four Building Block kinds; an external or supporting system | UNCONFIRMED | `[confirmed]` |
| Hot Spot | One of four Building Block kinds; a flagged gap or disagreement — see Question & Hot Spot Resolution's own language for the policies that create one | UNCONFIRMED | `[confirmed]` |
| Reworded | The post-creation correction of a Building Block's label; its identity (its id) does not change | UNCONFIRMED | `[confirmed]` — supersedes "Rename" (PRD's own term, rejected as not describing the dynamic) |
| Withdrawn | A Building Block's connections are severed | board `[storm]` | — |
| Reinstated | A withdrawn Building Block returns; its prior relations are re-validated against the board's current state | board `[storm]` | consistency-boundary candidate — see canvas.md |
| Element / Node | Formerly the PRD's implementation vocabulary — **not** this context's language; superseded by "Building Block" (umbrella) and the kind-specific names above. **PRD aligned 2026-08-25**: `docs/product/PRD.md` no longer uses "element" or "node" anywhere | PRD F01 (was: implementation term) | `leaked`, resolved |
| Rename | Formerly the PRD's operation-log term — **not** this context's language; superseded by "Reworded". **PRD aligned 2026-08-25**: F01's operation list now reads `reword`, matching this context's confirmed term | PRD F01 (was: `rename` operation kind, now `reword`) | `leaked`, resolved |

## Behaviour (scenarios)

> None captured this session. Deferred to a Process Modelling or Design-Level pass — the
> reinstatement re-validation rule (`open-questions.md` #3) is the first candidate scenario to
> work through.

## Ambiguities & synonyms found (boundary / modelling signals)

| Word | Conflicting meanings / synonyms | Resolution |
|---|---|---|
| Element/Node vs. Building Block (umbrella) / Event/Actor/System/Hot Spot (kind-specific) | PRD's generic implementation term vs. this context's confirmed business language | "Building Block" (Brandolini's own term) is the confirmed umbrella; "Element"/"Node" is implementation jargon, kept out |
| Rename vs. Reworded | PRD's operation-log term vs. this context's business language | "Reworded" confirmed — the PRD's own word doesn't describe the dynamic (identity persists) even though it's the PRD's own term |

<!-- BEGIN lineage:index -->
<!-- END lineage:index -->
