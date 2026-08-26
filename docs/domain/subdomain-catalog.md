---
workshop: ddd-strategic-design
scope: eventstormer-session
status: draft
last_updated: 2026-08-26
digest: e266740011c9
derived_from:
  - path: domain-and-goals.md
    digest: 015ff10858df
    at: 2026-08-26
  - path: context-map.md
    digest: 94f3014c1877
    at: 2026-08-26
  - path: boards/eventstormer-big-picture.md
    digest: 568f97a816f3
    at: 2026-08-26
---
# Subdomain Catalog

> Phases 02–03. The distilled inventory of subdomains, each classified Core / Supporting / Generic
> with the decisive tell and the sourcing decision that follows. The highest-leverage strategic
> decision in the model.

**Status:** draft — every row `[confirmed]` in this session, but nothing here has been re-checked
against downstream bounded-context work yet.

## Landscape

```mermaid
flowchart TB
  subgraph Core["Core — build, best talent"]
    Facil["Session Facilitation\n(incl. hot spot / question resolution)"]
    Capture["Domain Model Capture"]
    Multi["Multiplayer / Real-time\nCollaboration (roadmap)"]
  end
  subgraph Supporting["Supporting — build cheap"]
    Artifact["Derived Artifact\nGeneration"]
  end

  classDef core fill:#ffe0e6,stroke:#c1123e,color:#000
  classDef sup fill:#e0ecff,stroke:#1f5fbf,color:#000
  class Facil core
  class Capture core
  class Multi core
  class Artifact sup
```

| Subdomain | Type | Why this type (the tell) | Sourcing | Evidence | Confidence | Notes |
|---|---|---|---|---|---|---|
| Session Facilitation (incl. hot spot / question resolution) | Core | Someone would pay for an AI that reliably plays the scarce, skilled human-facilitator role; the logic (asymmetric leniency, lifecycle judgment, and — as of 2026-08-26 — hot spot/question resolution judgment) is complex and evolving, not CRUD | Build, best talent | PRD opportunity section ("nothing in a general-purpose chat enforces that asymmetry"); board actors `[storm]` | High | `[confirmed]`. Absorbed the former "Question & Hot Spot Resolution" Supporting row 2026-08-26 — see below |
| Domain Model Capture | Core | The mechanism behind the product's central claim — "board and docs are the same object, no drift" — is the typed graph itself: stable ids, reword propagation, invariants across Building Block/relation kinds | Build, best talent | PRD §1 ("a typed graph of building blocks with stable identities"); §2 opportunity ("against drift") | High | `[confirmed]` |
| Derived Artifact Generation | Supporting | Mostly transformation/rendering of an already-correct model; the differentiating judgment lives upstream in Capture and Facilitation, not in the projection step | Build in-house, not best-talent priority | PRD F10; board §"Facilitation vs. Artifact Consumption" candidate seam | High | `[confirmed]` |

### Superseded row — Question & Hot Spot Resolution (Supporting)

Originally classified Supporting 2026-08-25 (no standalone value; the three policy rules read as
Complicated/analyzable, fully enumerated in one pass). A Design-Level session on 2026-08-26 tested
the *bounded-context* seam behind this row and found it does not hold independently of Session
Facilitation — detection and resolution both already live in Facilitation's own capabilities.
`ddd-strategic-design` adopted the finding the same day: the row above is retired, and its
capability now lives inside the Session Facilitation row. See `context-map.md`'s "Decision"
section and `open-questions.md` #17. The Core/Supporting *classification lesson* still holds —
this was a bounded-context boundary correction, not a reclassification of the work's difficulty.
| Multiplayer / Real-time Collaboration | Core | Kept as one row for now (not yet built/scoped); differentiator angle — solves remote EventStorming's synchronous-meeting bottleneck. **Flagged**: likely splits into a Generic real-time-sync-infra part (buy: CRDTs/presence/transport) and a Core graph-conflict-resolution-semantics part once actually designed | Build, best talent (provisional) | Participant's stated goal (`domain-and-goals.md`); roadmap, not v1 | Low | Roadmap only — not built, not yet scoped for design. Revisit classification (possible split) when this reaches phase 05 |

## Technical Mechanisms (not subdomains)

- **Voice Input** — on-device speech-to-text (browser built-in / on-device ASR). Low-level infra;
  audio-never-leaves-device is a design preference, not a binding constraint (`open-questions.md`).
- **AI Model Provider Integration** — the LLM backend (Anthropic/OpenAI/etc.) powering the
  facilitator. Off-the-shelf, swappable; no business-differentiating logic of its own.

## Human-core work (software only supports)

- **The domain expert's own business knowledge** — the operational detail, exceptions, and
  workarounds the expert narrates. Session Facilitation elicits and structures this; it never
  replaces the expert's judgment.

<!-- BEGIN lineage:index -->
<!-- END lineage:index -->