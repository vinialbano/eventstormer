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
| Building Block | The umbrella term for "one of the four kinds, regardless of which" — Event, Actor, System, or Hot Spot. Alberto Brandolini's own chapter title for this exact vocabulary, at both the Big Picture ("Building Blocks – 20%") and Process Modeling ("Process Modeling Building Blocks – 90%") zoom levels, *Introducing EventStorming* | UNCONFIRMED | `[glossary]`, `[confirmed]` |
| Event | One of four Building Block kinds on the board; a past-tense domain fact | UNCONFIRMED | `[confirmed]` |
| Actor | One of four Building Block kinds; a person or role | UNCONFIRMED | `[confirmed]` |
| System | One of four Building Block kinds; an external or supporting system | UNCONFIRMED | `[confirmed]` |
| Hot Spot | One of four Building Block kinds; a flagged gap or disagreement — see Question & Hot Spot Resolution's own language for the policies that create one | UNCONFIRMED | `[confirmed]` |
| Reworded | The post-creation correction of a Building Block's label; its identity (its id) does not change | UNCONFIRMED | `[confirmed]` |
| Withdrawn | A Building Block's connections are severed | board `[storm]` | — |
| Reinstated | A withdrawn Building Block returns; its prior relations are re-validated against the board's current state | board `[storm]` | consistency-boundary candidate — see canvas.md |
| Element / Node | Implementation-flavored synonym for Building Block — **not** this context's language | — | `leaked`, synonym-of:Building Block |
| Rename | Synonym for Reworded — **not** this context's language: renaming implies the identity changes, when only the articulation does | — | `leaked`, synonym-of:Reworded |

## Behaviour (scenarios)

> None captured this session. Deferred to a Process Modelling or Design-Level pass — the
> reinstatement re-validation rule (`open-questions.md` #3) is the first candidate scenario to
> work through.

## Ambiguities & synonyms found (boundary / modelling signals)

| Word | Conflicting meanings / synonyms | Resolution |
|---|---|---|
| Element/Node vs. Building Block (umbrella) / Event/Actor/System/Hot Spot (kind-specific) | Generic implementation vocabulary vs. this context's confirmed business language | "Building Block" (Brandolini's own term) is the confirmed umbrella; "Element"/"Node" is implementation jargon, kept out |
| Rename vs. Reworded | Implementation-flavored wording vs. this context's business language | "Reworded" confirmed — renaming implies the identity changes, when only the articulation does |

<!-- BEGIN lineage:index -->
<!-- END lineage:index -->
