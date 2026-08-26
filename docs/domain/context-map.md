---
workshop: ddd-strategic-design + design-level
scope: eventstormer-session
status: draft
last_updated: 2026-08-26
digest: 0429d6d38b35
derived_from:
  - path: bounded-contexts/derived-artifact-generation/canvas.md
    digest: b6e96a24ddeb
    at: 2026-08-26
  - path: bounded-contexts/domain-model-capture/canvas.md
    digest: cc155f371bca
    at: 2026-08-26
  - path: bounded-contexts/question-hot-spot-resolution/canvas.md
    digest: a3848a5f28a6
    at: 2026-08-26
  - path: bounded-contexts/session-facilitation/canvas.md
    digest: 9741ca703f15
    at: 2026-08-26
  - path: sessions/2026-08-26-design-level.md
    digest: a199731d351c
    at: 2026-08-26
  - path: subdomain-catalog.md
    digest: 8ba6b998650a
    at: 2026-08-26
---
# Context Map

> Phase 06. Every integrating pair of bounded contexts, with the team relationship, the
> integration pattern, the direction of influence (upstream → downstream), and the mechanism.
> This supersedes the discovered-form `context-map.md` written by the Big Picture workshop
> (renamed in spirit, not deleted — see `Superseded draft` below); the storm's candidate seams
> were the input to this session's phase 05–06 work, not a competing artifact.

**This is the decided form.** Every relationship below was reasoned through the U/D
succeeds-independently test and the Core-protection rules, in session with the participant — not
carried over from the storm's `[inferred]` candidates untouched.

## Diagram

```mermaid
flowchart LR
  Capture["Domain Model Capture (Core)"]
  Facil["Session Facilitation (Core)"]
  HotSpot["Question & Hot Spot Resolution (Supporting)"]
  Artifact["Derived Artifact Generation (Supporting)"]

  Capture -->|"OHS + Published Language\n(Building Block lifecycle contract)"| Facil
  Capture -->|"OHS + Published Language\n(Building Block lifecycle contract)\nConformist"| HotSpot
  Capture -->|"OHS + Published Language\n(read model)\nConformist"| Artifact
  Facil -->|"OHS + Published Language\n(session domain events)\nConformist"| HotSpot

  classDef core fill:#ffe0e6,stroke:#c1123e,color:#000
  classDef sup fill:#e0ecff,stroke:#1f5fbf,color:#000
  class Capture core
  class Facil core
  class HotSpot sup
  class Artifact sup
```

| Upstream (U) | Downstream (D) | Relationship | Pattern | Mechanism | Evidence / topic | Notes |
|---|---|---|---|---|---|---|
| Domain Model Capture | Session Facilitation | Upstream-Downstream | OHS + Published Language, accommodated as Customer/Supplier | in-process command/query (v1: single deployable) | Building Block lifecycle contract (create/rework/withdraw/reinstate) | Both Core & volatile. Capture is self-contained and generic; Facilitation cannot ship without it (U/D tell). Facilitation is the primary consumer shaping the contract — its needs are formally accommodated, not merely conformed to. `[confirmed]` |
| Domain Model Capture | Question & Hot Spot Resolution | Upstream-Downstream | OHS + Published Language, Conformist downstream | in-process command | same Building Block lifecycle contract, "Raise Hot Spot" as another Building Block-creation call | Hot Spot Resolution has no leverage to shape Capture's contract; accepts it as-is, additive only. `[confirmed]` |
| Domain Model Capture | Derived Artifact Generation | Upstream-Downstream | OHS + Published Language, Conformist downstream | in-process read model | the read-only model projection (PRD F10) | Thin, stateless projection; no accommodation needed. `[confirmed]` |
| Session Facilitation | Question & Hot Spot Resolution | Upstream-Downstream | OHS + Published Language (curated event set), Conformist downstream | in-process domain events | Absent Stakeholder Named, Knowledge Gap Revealed, Session Closed (with unresolved Question Asked) | Hot Spot Resolution depends entirely on these facts and has no leverage back; a deliberately curated set of named events, not Facilitation's whole internal model. `[confirmed]` |

## Why Capture is the hub, not each pair modelled separately

Confirmed this session: Domain Model Capture's Building Block lifecycle contract is genuinely one Open-Host
Service serving three different downstream consumers (Facilitation, Hot Spot Resolution, Artifact
Generation) rather than three ad hoc integrations — this is the technical expression of the
product's own pitch, "one model, many derived views." A Core context exposing a deliberate, stable
public contract (rather than leaking internals) is the point, not a violation of Core-protection.

## Deployment note

All four contexts currently ship as one deployable (v1 is a single process; see AGENTS.md's layer
rules for the code-level enforcement of these boundaries). The patterns above describe the
**logical** boundary and influence direction; per `modules-first-deployment-last`, splitting any of
these into separate services is a later, evidence-driven call — not implied by this map.

## Candidate revision — Design-Level, 2026-08-26 (`[inferred]`, not adopted)

A Design-Level session on Question & Hot Spot Resolution tested this map's seam against
consistency and integration evidence (its own required step, not a re-decomposition) and found it
does not hold as an independent bounded context. Full reasoning and evidence in
[`sessions/2026-08-26-design-level.md`](sessions/2026-08-26-design-level.md). Summary:

- Detection of the three triggers already executes inside **Session Facilitation**'s own policies
  (confirmed against `boards/capture-loop.md`), not this context.
- The resolution capability this session designed (judge whether a contribution resolves an open
  hot spot/question; requires deliberate human confirmation and a recorded reference) matches
  Session Facilitation's existing `Interpret Contribution` shape exactly — an extension of an
  existing capability, not a new one.
- The one thing that could still have justified separateness — "its own pace, a question can stay
  open across many cycles" — was tested directly: the participant confirmed Session Facilitation's
  own model already spans sessions ("the workshop remains valid if someone else resumes it
  later"), which removes the pace difference.
- Storage/enforcement of the resolution invariant was already Domain Model Capture's job before
  this session and is unchanged.

**Candidate outcome:** fold Question & Hot Spot Resolution into Session Facilitation. What
survives is a capability (resolution judgment) and a read model (open hot spots/questions) inside
Facilitation, not a fourth context. **This is `[inferred]` — a candidate with evidence, not a
decision.** Adopting it (retiring the Question & Hot Spot Resolution canvas, merging its content
into Session Facilitation's, updating the diagram/table above and the subdomain catalog) is
`anoria-commons:ddd-strategic-design`'s call. Until then this map's diagram and table above stand
as recorded, unedited, per this skill's own rule against quietly reconciling a later finding into
an earlier decided artifact.

## Superseded draft

The Big Picture workshop's own context map (candidate seams, `[inferred]`, derived from four of
six heuristics in close-out) was the input to this session's phase 05–06 reasoning, not retained
as a parallel source of truth at this path — its full writeup is preserved at
[`sessions/big-picture-context-map.md`](sessions/big-picture-context-map.md). Its three candidates
mapped closely to this decided form:

| Storm candidate | Outcome here |
|---|---|
| Session Lifecycle vs. Modeling Capture | Became **Session Facilitation** vs. **Domain Model Capture** — confirmed as two Core contexts, Capture upstream |
| Facilitation vs. Artifact Consumption | Became **Session Facilitation/Domain Model Capture** vs. **Derived Artifact Generation** — confirmed, Capture (not Facilitation directly) is Artifact Generation's upstream |
| Question & Hot Spot Resolution | Confirmed as its own context, exactly as named, with the "runs on its own clock" evidence carrying through to its Conformist/downstream position on two upstreams |

<!-- BEGIN lineage:index -->
<!-- END lineage:index -->