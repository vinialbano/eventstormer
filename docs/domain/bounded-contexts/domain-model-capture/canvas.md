---
workshop: ddd-strategic-design
scope: eventstormer-session
status: draft
last_updated: 2026-08-25
derived_from:
  - path: ../../subdomain-catalog.md
    at: 2026-08-25
  - path: ../../context-map.md
    at: 2026-08-25
  - path: ../../boards/eventstormer-big-picture.md
    at: 2026-08-25
---

# Bounded Context: Domain Model Capture

> Phase 05–06 canvas. Boundary facts confirmed this session; the event-stormed model is left
> `UNCONFIRMED` pending a Process Modelling or Design-Level EventStorming pass on this context
> specifically.

**Status:** draft • **Provenance:** `[confirmed]` (boundary) / `UNCONFIRMED` (event-stormed model)

- **Purpose:** Own the accepted domain model — a typed graph of Event/Actor/System/Hot Spot
  elements and their relations, with stable identities, and the shared lifecycle every element
  kind goes through (Reworded / Withdrawn / Reinstated).
- **Subdomain type:** Core
- **Domain experts:** The participant; no dedicated data-modeling expert consulted yet.
- **Owning team:** One team (currently: the participant), owns all four v1 contexts.
- **Status:** draft

## Boundary rationale

- **Language boundary:** Event / Actor / System / Hot Spot — not "Element" or "Node" (the PRD's
  own implementation vocabulary, rejected as not EventStorming's language). "Reworded" — not
  "Rename" (the PRD's operation-log term) — because the underlying identity (the node id) never
  changes; only the articulation of an already-recognized fact does. Both `[confirmed]` this
  session.
- **Capability boundary:** own-the-model (element/relation storage and lifecycle, with the
  invariants that keep it consistent).
- **Consistency boundary:** UNCONFIRMED — strong candidate named in `open-questions.md` #3:
  reinstating a withdrawn element must re-validate its old relations against the board's *current*
  state (a stale position, or a `follows` chain that would now cycle), and the PRD defines no
  resolution rule for a failed re-validation. Needs a Design-Level pass to become an aggregate
  invariant.
- **Does not own:** deciding what to propose or when to close a session (Session Facilitation);
  deciding when a Hot Spot should be raised (Question & Hot Spot Resolution — it only issues the
  generic element-creation call, same as any other kind); projecting the model into readable
  output (Derived Artifact Generation).

## Event-stormed model

> Deferred. Commands/Events/Policies/Queries/Aggregates below are `UNCONFIRMED` pending a
> Process Modelling or Design-Level session on this context.

### Commands

| Command | Actor / source | Handled by | Produces event(s) | Notes |
|---|---|---|---|---|
| UNCONFIRMED (e.g. Create Element, Rework Element, Withdraw Element, Reinstate Element) | Session Facilitation, Question & Hot Spot Resolution | UNCONFIRMED | UNCONFIRMED | Named generically from the board's lifecycle stages; not yet modelled as commands |

### Events in

| Event | Published by | Reaction in this context | Notes |
|---|---|---|---|
| UNCONFIRMED | Session Facilitation, Question & Hot Spot Resolution | UNCONFIRMED | Deferred |

### Events out

| Event | Consumed by | Meaning | Produced by |
|---|---|---|---|
| Element Reworded | Derived Artifact Generation | An element's articulation changed; its identity did not | UNCONFIRMED command |
| Element Withdrawn | Derived Artifact Generation | An element's connections were severed | UNCONFIRMED command |
| Element Reinstated | Derived Artifact Generation | A withdrawn element returned, relations re-validated | UNCONFIRMED command |

### Policies

| When this event happens | Then this command/action occurs | Rule / rationale | Status |
|---|---|---|---|
| UNCONFIRMED | — | — | Deferred |

### Queries / views / read models

| Query / view | Used by | Answers | Built from / backed by |
|---|---|---|---|
| The full model graph | Derived Artifact Generation | "What is the current, accepted model?" | UNCONFIRMED — likely the element/relation store directly |

### Aggregates / consistency boundaries

| Aggregate / boundary | Handles commands | Emits events | Consistency rule |
|---|---|---|---|
| UNCONFIRMED (candidate: the element, or the board as a whole) | UNCONFIRMED | UNCONFIRMED | Candidate: reinstatement must re-validate prior relations against current board state — `open-questions.md` #3 |

### External systems

None identified this session.

## Integration arrows

```mermaid
flowchart LR
  This["Domain Model Capture"] -->|"OHS + Published Language\nCustomer/Supplier"| Facil["Session Facilitation"]
  This -->|"OHS + Published Language\nConformist"| HotSpot["Question & Hot Spot Resolution"]
  This -->|"OHS + Published Language\nConformist"| Artifact["Derived Artifact Generation"]

  classDef core fill:#ffe0e6,stroke:#c1123e,color:#000
  classDef sup fill:#e0ecff,stroke:#1f5fbf,color:#000
  class This core
  class Facil core
  class HotSpot sup
  class Artifact sup
```

- **Upstream (this context depends on):** none — Capture is the hub.
- **Downstream (consumers of this context):** Session Facilitation (Customer/Supplier — its
  needs are formally accommodated, since it's the primary consumer shaping the contract), Question
  & Hot Spot Resolution (Conformist), Derived Artifact Generation (Conformist).
- **Published language / contracts:** the element-lifecycle contract — create / rework / withdraw
  / reinstate, uniform across all element kinds.
- **Anticorruption needs:** none this session — Capture is the upstream of the whole map, so
  nothing protects it from a messier neighbor; its own contract *is* the protection the others get.

## Hot-spots and open questions

| Topic | Type | What's unresolved | Next question / expert |
|---|---|---|---|
| Reinstatement conflict rule | white-spot | No resolution rule when re-validating a reinstated element's relations fails | `../../open-questions.md` #3 — named for Process Modelling or Design-Level |
| PRD self-inconsistency on `restore` | hot-spot | F01's operation-log kinds omit `restore`; F06 states it exists | `../../open-questions.md` #2 |

## Code evidence (as-is)

Not run this session. UNCONFIRMED.

## Opportunities / problems

- This context's aggregate boundary is the single highest-leverage next question — it decides
  whether "the whole board" or "one element" is the unit of consistency, and the reinstatement
  rule hangs on that answer.

<!-- BEGIN lineage:index -->
<!-- END lineage:index -->
