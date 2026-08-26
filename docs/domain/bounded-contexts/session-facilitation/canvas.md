---
workshop: ddd-strategic-design
scope: eventstormer-session
status: draft
last_updated: 2026-08-25
derived_from:
  - path: boards/eventstormer-big-picture.md
    digest: 568f97a816f3
    at: 2026-08-26
  - path: context-map.md
    digest: 71e703c4a12c
    at: 2026-08-26
  - path: subdomain-catalog.md
    digest: 8ba6b998650a
    at: 2026-08-26
---
# Bounded Context: Session Facilitation

> Phase 05–06 canvas. Boundary facts confirmed this session; the event-stormed model is left
> `UNCONFIRMED` pending a Process Modelling or Design-Level EventStorming pass on this context
> specifically — Big Picture (already run) stops at the event board and does not produce
> per-context commands/events/policies.

**Status:** draft • **Provenance:** `[confirmed]` (boundary) / `UNCONFIRMED` (event-stormed model)

- **Purpose:** Conduct the AI-facilitated conversation — elicit the expert's narration, propose
  typed Building Blocks from it, and apply the method's required asymmetry (lenient on the human's
  phrasing, strict on names the machine supplies), across a session's lifecycle (start, scope,
  close).
- **Subdomain type:** Core
- **Domain experts:** The participant (product owner), currently the sole source of facilitation
  method knowledge for this build.
- **Owning team:** One team (currently: the participant), owns all four v1 contexts.
- **Status:** draft

## Boundary rationale

- **Language boundary:** "Proposal" and "Contribution" (Facilitation's own pre-acceptance
  artifacts — not yet a Domain Event/Actor/System/Hot Spot, per the board); asymmetric leniency as a
  named behavior, not an implementation detail.
- **Capability boundary:** conduct-conversation-and-propose (noun–verb: session facilitation).
  Passes the single-name test — one capability, no "and" hiding a second context.
- **Consistency boundary:** UNCONFIRMED — likely candidate: a session's lifecycle state
  (open/scoped/closed) must stay consistent within one session. Needs a Design-Level pass to
  confirm any aggregate boundary.
- **Does not own:** Building Block storage/lifecycle (Domain Model Capture); deciding when to raise a Hot
  Spot (Question & Hot Spot Resolution); projecting the model into readable output (Derived
  Artifact Generation).

## Event-stormed model

> Deferred. This session confirmed the boundary only. Commands, Events in/out, Policies, Queries,
> and any Aggregates are `UNCONFIRMED` until a Process Modelling or Design-Level session storms
> this context specifically.

### Commands

| Command | Actor / source | Handled by | Produces event(s) | Notes |
|---|---|---|---|---|
| UNCONFIRMED | — | — | — | Deferred to Process Modelling / Design-Level |

### Events in

| Event | Published by | Reaction in this context | Notes |
|---|---|---|---|
| UNCONFIRMED | — | — | Deferred |

### Events out

| Event | Consumed by | Meaning | Produced by |
|---|---|---|---|
| Absent Stakeholder Named | Question & Hot Spot Resolution | A named stakeholder is missing from the session | UNCONFIRMED which command/policy produces this — named as a fact this session's board carries, not yet modelled here |
| Knowledge Gap Revealed | Question & Hot Spot Resolution | The participant admitted a gap in their own knowledge | Same caveat as above |
| Session Closed | Question & Hot Spot Resolution | The session ended; any Question Asked with no resolving event becomes eligible for a Hot Spot | Same caveat as above |

### Policies

| When this event happens | Then this command/action occurs | Rule / rationale | Status |
|---|---|---|---|
| UNCONFIRMED | — | — | Deferred |

### Queries / views / read models

| Query / view | Used by | Answers | Built from / backed by |
|---|---|---|---|
| UNCONFIRMED | — | — | Deferred |

### Aggregates / consistency boundaries

| Aggregate / boundary | Handles commands | Emits events | Consistency rule |
|---|---|---|---|
| UNCONFIRMED | — | — | Deferred |

### External systems

| System | Role | Interaction | Notes |
|---|---|---|---|
| AI Model Provider | Backs the facilitator's proposals/questions | UNCONFIRMED (sync/async) | Technical Mechanism, see `subdomain-catalog.md` — not a subdomain in its own right |
| Voice Input | Optional input channel | On-device, audio never leaves device (design preference, not binding — `open-questions.md`) | Technical Mechanism |

## Integration arrows

> Confirmed Phase 06 relationships — see `../../context-map.md` for the source of truth.

```mermaid
flowchart LR
  Capture["Domain Model Capture"] -->|"OHS + Published Language\nCustomer/Supplier"| This["Session Facilitation"]
  This -->|"OHS + Published Language\nConformist"| HotSpot["Question & Hot Spot Resolution"]

  classDef core fill:#ffe0e6,stroke:#c1123e,color:#000
  classDef sup fill:#e0ecff,stroke:#1f5fbf,color:#000
  class This core
  class Capture core
  class HotSpot sup
```

- **Upstream (this context depends on):** Domain Model Capture — OHS + Published Language, this
  context accommodated as Customer/Supplier (it's the primary consumer shaping the contract).
- **Downstream (consumers of this context):** Question & Hot Spot Resolution — Conformist,
  consuming a curated set of this context's domain events as-is.
- **Published language / contracts:** the curated event set (Absent Stakeholder Named, Knowledge
  Gap Revealed, Session Closed) — deliberately narrow, not this context's whole internal model.
- **Anticorruption needs:** none identified this session; Capture is this context's only upstream
  and is clean/self-owned (same team).

## Hot-spots and open questions

| Topic | Type | What's unresolved | Next question / expert |
|---|---|---|---|
| Format-selection gap | hot-spot | "Workshop Format Selected" is on the board for the whole business line, but v1 hardcodes Big Picture | See `../../open-questions.md` #1 |
| Reinstatement conflict rule | white-spot | No resolution rule for a failed re-validation on reinstate | Named as Process Modelling/Design-Level work, `../../open-questions.md` #3 |
| As-is/to-be distinction | white-spot | Neither this board nor the PRD distinguishes describing the business as it works today vs. as wanted | `../../open-questions.md` #6 |

## Code evidence (as-is)

Not run this session — no `[code]` pass has been performed against `src/`. UNCONFIRMED.

## Opportunities / problems

- This context's full event-stormed model (Commands/Policies/Queries) needs a Process Modelling
  or Design-Level EventStorming pass — flagged as the natural next session per README.

<!-- BEGIN lineage:index -->
<!-- END lineage:index -->