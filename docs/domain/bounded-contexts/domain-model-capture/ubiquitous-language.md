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
| Event | One of four element kinds on the board; a past-tense domain fact | UNCONFIRMED | `[confirmed]` this session as the correct term (not "Element"/"Node") |
| Actor | One of four element kinds; a person or role | UNCONFIRMED | `[confirmed]` |
| System | One of four element kinds; an external or supporting system | UNCONFIRMED | `[confirmed]` |
| Hot Spot | One of four element kinds; a flagged gap or disagreement — see Question & Hot Spot Resolution's own language for the policies that create one | UNCONFIRMED | `[confirmed]` |
| Reworded | The post-creation correction of an element's label; the element's identity (its id) does not change | UNCONFIRMED | `[confirmed]` — supersedes "Rename" (PRD's own term, rejected as not describing the dynamic) |
| Withdrawn | An element's connections are severed | board `[storm]` | — |
| Reinstated | A withdrawn element returns; its prior relations are re-validated against the board's current state | board `[storm]` | consistency-boundary candidate — see canvas.md |
| Element / Node | PRD implementation vocabulary — **not** this context's language; superseded by the kind-specific names above | PRD F01 (implementation term) | `leaked` |
| Rename | PRD's operation-log term — **not** this context's language; superseded by "Reworded" | PRD F01 (`rename` operation kind) | `leaked` |

## Behaviour (scenarios)

> None captured this session. Deferred to a Process Modelling or Design-Level pass — the
> reinstatement re-validation rule (`open-questions.md` #3) is the first candidate scenario to
> work through.

## Ambiguities & synonyms found (boundary / modelling signals)

| Word | Conflicting meanings / synonyms | Resolution |
|---|---|---|
| Element/Node vs. Event/Actor/System/Hot Spot | PRD's generic implementation term vs. this context's kind-specific business language | Kind-specific names are this context's confirmed language; "Element"/"Node" is implementation jargon, kept out |
| Rename vs. Reworded | PRD's operation-log term vs. this context's business language | "Reworded" confirmed — the PRD's own word doesn't describe the dynamic (identity persists) even though it's the PRD's own term |

<!-- BEGIN lineage:index -->
<!-- END lineage:index -->
