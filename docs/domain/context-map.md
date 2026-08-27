---
workshop: design-level
scope: session-facilitation
status: draft
last_updated: 2026-08-26
digest: e4393aff3ac9
derived_from:
  - path: bounded-contexts/derived-artifact-generation/canvas.md
    digest: b6e96a24ddeb
    at: 2026-08-26
  - path: bounded-contexts/domain-model-capture/canvas.md
    digest: 6ae50843569d
    at: 2026-08-26
  - path: bounded-contexts/question-hot-spot-resolution/canvas.md
    digest: 759a1d42a01f
    at: 2026-08-26
  - path: bounded-contexts/session-facilitation/canvas.md
    digest: 59c06f08153f
    at: 2026-08-26
  - path: sessions/2026-08-26-design-level.md
    digest: a199731d351c
    at: 2026-08-26
  - path: subdomain-catalog.md
    digest: e266740011c9
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
  Facil["Session Facilitation (Core)\n(incl. hot spot / question resolution)"]
  Artifact["Derived Artifact Generation (Supporting)"]

  Capture -->|"OHS + Published Language\n(Building Block lifecycle contract)"| Facil
  Capture -->|"OHS + Published Language\n(read model)\nConformist"| Artifact

  classDef core fill:#ffe0e6,stroke:#c1123e,color:#000
  classDef sup fill:#e0ecff,stroke:#1f5fbf,color:#000
  class Capture core
  class Facil core
  class Artifact sup
```

| Upstream (U) | Downstream (D) | Relationship | Pattern | Mechanism | Evidence / topic | Notes |
|---|---|---|---|---|---|---|
| Domain Model Capture | Session Facilitation | Upstream-Downstream | OHS + Published Language, accommodated as Customer/Supplier | in-process command/query (v1: single deployable) | Building Block lifecycle contract (create/rework/withdraw/reinstate, incl. Hot Spot Building Blocks raised **and resolved** by Facilitation's own resolution judgment — `Raise Hot Spot`/`Resolve Hot Spot`, formalized as commands 2026-08-26) | Both Core & volatile. Capture is self-contained and generic; Facilitation cannot ship without it (U/D tell). Facilitation is the primary consumer shaping the contract — its needs are formally accommodated, not merely conformed to. `[confirmed]` |
| Domain Model Capture | Derived Artifact Generation | Upstream-Downstream | OHS + Published Language, Conformist downstream | in-process read model | the read-only model projection (PRD F10) | Thin, stateless projection; no accommodation needed. `[confirmed]` |

## Why Capture is the hub, not each pair modelled separately

Confirmed this session: Domain Model Capture's Building Block lifecycle contract is genuinely one Open-Host
Service serving two different downstream consumers (Facilitation, Artifact Generation) rather than
two ad hoc integrations — this is the technical expression of the product's own pitch, "one model,
many derived views." A Core context exposing a deliberate, stable public contract (rather than
leaking internals) is the point, not a violation of Core-protection.

## Deployment note

All four contexts currently ship as one deployable (v1 is a single process; see AGENTS.md's layer
rules for the code-level enforcement of these boundaries). The patterns above describe the
**logical** boundary and influence direction; per `modules-first-deployment-last`, splitting any of
these into separate services is a later, evidence-driven call — not implied by this map.

## Decision — Question & Hot Spot Resolution folded into Session Facilitation (2026-08-26)

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

**Adopted by `ddd-strategic-design`, confirmed with the participant, 2026-08-26.** Question & Hot
Spot Resolution is retired as a bounded context. What survives is a capability (resolution
judgment) and a read model (open hot spots/questions) inside Session Facilitation, not a fourth
context. The diagram and table above now reflect this decision. The retired canvas is preserved,
marked superseded, at
[`bounded-contexts/question-hot-spot-resolution/canvas.md`](bounded-contexts/question-hot-spot-resolution/canvas.md);
its surviving content was merged into
[`bounded-contexts/session-facilitation/canvas.md`](bounded-contexts/session-facilitation/canvas.md).
See `open-questions.md` #17.

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
| Question & Hot Spot Resolution | Initially confirmed as its own context; later folded into **Session Facilitation** once a Design-Level pass tested and disproved the "runs on its own clock" rationale — see the Decision section above |

<!-- BEGIN lineage:index -->
<!-- END lineage:index -->