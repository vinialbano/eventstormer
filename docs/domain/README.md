---
workshop: ddd-strategic-design
scope: eventstormer-session
status: draft
last_updated: 2026-08-25
derived_from:
  - path: boards/eventstormer-big-picture.md
    at: 2026-08-25
  - path: domain-and-goals.md
    at: 2026-08-25
  - path: subdomain-catalog.md
    at: 2026-08-25
  - path: context-map.md
    at: 2026-08-25
---

# Domain model — EventStormer

**Everything here is `draft`**, at two different depths. The strategic decisions below (goal,
subdomains, contexts, context map) were made **in session with the participant** and are
`[confirmed]` at the strategic level. What's still `draft` and unconfirmed is depth: each bounded
context's own event-stormed model (Commands/Events/Policies/Queries) is deferred to a future
Process Modelling or Design-Level EventStorming session, one context at a time.

## Where this stands

1. **Big Picture EventStorming (2026-08-25)** produced the discovered-form input: a 32-event board,
   candidate seams, and open questions. Its full write-up is preserved at
   `sessions/2026-08-25-big-picture.md` and `boards/eventstormer-big-picture.md`; its own
   discovered-form context map is preserved at `sessions/big-picture-context-map.md`.
2. **Process Modelling on "the capture loop" (2026-08-25)** formalized the three policy
   relationships Big Picture could name but not model (Absent Stakeholder Named / Knowledge Gap
   Revealed / Session-Closed-with-unresolved-Question → Raise Hot Spot), plus two more the session
   discovered: `Interpret Contribution` (a policy the board never named) and `Question Answered`
   (a question-track event distinct from any content outcome a contribution produces). Full model
   in `boards/capture-loop.md`; session record in `sessions/2026-08-25-process-modelling.md`; five
   acceptance tests in `acceptance-tests.md`.
3. **DDD Strategic Design session (2026-08-25), phases 01–07**, run directly with the participant
   (not re-derived from the storm), produced:
   - `domain-and-goals.md` — the Impact Map: an AI reliably playing the facilitator role, so
     domain experts get a living model without needing a trained human facilitator.
   - `subdomain-catalog.md` — 4 v1 subdomains classified (Session Facilitation: Core, Domain Model
     Capture: Core, Question & Hot Spot Resolution: Supporting, Derived Artifact Generation:
     Supporting) + 1 roadmap subdomain (Multiplayer/Real-time Collaboration: Core, provisional) +
     2 Technical Mechanisms (Voice Input, AI Model Provider Integration).
   - Four bounded contexts, 1:1 with the v1 subdomains, each with a `canvas.md` (boundary
     confirmed) and `ubiquitous-language.md` (thin — deeper terms deferred) under
     `bounded-contexts/<slug>/`.
   - `context-map.md` — the decided integration map: Domain Model Capture as an Open-Host Service
     hub, serving Session Facilitation (Customer/Supplier), Question & Hot Spot Resolution
     (Conformist), and Derived Artifact Generation (Conformist); Session Facilitation itself a
     smaller OHS to Question & Hot Spot Resolution (Conformist).

## Artifact status

| Artifact | Status | Confidence | Evidence |
|---|---|---|---|
| `domain-and-goals.md` | draft, confirmed strategically | High | Confirmed with the participant this session; Impact Map built from their own words |
| `subdomain-catalog.md` | draft, confirmed strategically | High | Every row confirmed with the participant, including the Multiplayer row's provisional flag |
| `bounded-contexts/*/canvas.md` (boundary sections) | draft, confirmed strategically | High | Purpose/type/team/boundary rationale confirmed per context |
| `bounded-contexts/*/canvas.md` (event-stormed model sections) | `UNCONFIRMED` | — | Deliberately deferred — needs a Process Modelling or Design-Level pass per context; "the capture loop" process now exists but has not yet been folded back into the Question & Hot Spot Resolution canvas (Design-Level's job) |
| `bounded-contexts/*/ubiquitous-language.md` | draft, thin | Medium | Terms sourced from the Big Picture board where available; deeper elicitation deferred |
| `context-map.md` (decided form) | draft, confirmed strategically | High | Every relationship reasoned through the U/D test and confirmed with the participant |
| `sessions/big-picture-context-map.md` (discovered form) | superseded, preserved for provenance | — | The storm's original `[inferred]` candidates; see `context-map.md`'s "Superseded draft" section for how each maps to the decided form |
| `boards/capture-loop.md` | draft | High | Process Modelling session with the participant, 2026-08-25; every event/command/policy confirmed live, hot spots accounted for |
| `acceptance-tests.md` | draft | High | Five tests extracted once the capture-loop model stabilized |
| `open-questions.md` | draft, live | — | Storm-originated hot spots + 5 items from the strategic-design session (7–11) + 3 items from Process Modelling (13–15) |

## Next steps (named, not started)

- Design-Level on Domain Model Capture, to settle its aggregate boundary (open-questions.md #8),
  the reinstatement re-validation rule (open-questions.md #3), and now also the `Hot Spot Raised`
  payload/granularity question (open-questions.md #13).
- Design-Level on Question & Hot Spot Resolution, to fold "the capture loop" process model into
  its canvas, fix its `Events in` table gap (open-questions.md #14), and settle which context
  executes `Answer Question` (open-questions.md #15).
- Multiplayer/Real-time Collaboration needs its own scoping pass before it can be classified with
  confidence (open-questions.md #10).

## Dependency graph

```
boards/eventstormer-big-picture.md
  └── sessions/2026-08-25-big-picture.md
  └── sessions/big-picture-context-map.md (discovered form, superseded)
  └── open-questions.md (hot spots 1–6, from the storm)
  └── boards/capture-loop.md (Process Modelling harvest)
        └── sessions/2026-08-25-process-modelling.md
        └── acceptance-tests.md
        └── open-questions.md (items 13–15, from this session)
domain-and-goals.md
  └── subdomain-catalog.md
        └── bounded-contexts/<slug>/canvas.md (boundary) — one per subdomain
        └── bounded-contexts/<slug>/ubiquitous-language.md
              └── context-map.md (decided form)
                    └── open-questions.md (items 7–11, from this session)
```

## Draft declaration

Nothing here is ready to build from without further sessions. The strategic layer (goal,
subdomains, contexts, integration patterns) is confirmed; the tactical layer inside each context
(commands, events, policies, aggregates) is not, and is named explicitly as `UNCONFIRMED` rather
than guessed.

<!-- BEGIN lineage:index -->

| Artifact | Workshop | Scope | Status | Updated |
|---|---|---|---|---|
| [acceptance-tests.md](acceptance-tests.md) | process-modelling | capture-loop | draft | 2026-08-26 |
| [boards/capture-loop.md](boards/capture-loop.md) | process-modelling | capture-loop | draft | 2026-08-26 |
| [boards/eventstormer-big-picture.md](boards/eventstormer-big-picture.md) | big-picture | eventstormer-session | draft | 2026-08-26 |
| [bounded-contexts/derived-artifact-generation/ubiquitous-language.md](bounded-contexts/derived-artifact-generation/ubiquitous-language.md) | ddd-strategic-design | eventstormer-session | draft | 2026-08-25 |
| [open-questions.md](open-questions.md) | big-picture + ddd-strategic-design + process-modelling | eventstormer-session | draft | 2026-08-25 |
| [sessions/2026-08-25-big-picture.md](sessions/2026-08-25-big-picture.md) | big-picture | eventstormer-session | draft | 2026-08-25 |
| [sessions/2026-08-25-process-modelling.md](sessions/2026-08-25-process-modelling.md) | process-modelling | capture-loop | draft | 2026-08-26 |
| [sessions/big-picture-context-map.md](sessions/big-picture-context-map.md) | big-picture | eventstormer-session | draft | 2026-08-25 |

```mermaid
graph LR
  boards_capture_loop_md["boards/capture-loop.md"] --> acceptance_tests_md["acceptance-tests.md"]
  boards_eventstormer_big_picture_md["boards/eventstormer-big-picture.md"] --> boards_capture_loop_md["boards/capture-loop.md"]
  boards_eventstormer_big_picture_md["boards/eventstormer-big-picture.md"] --> open_questions_md["open-questions.md"]
  context_map_md["context-map.md"] --> open_questions_md["open-questions.md"]
  boards_capture_loop_md["boards/capture-loop.md"] --> sessions_2026_08_25_process_modelling_md["sessions/2026-08-25-process-modelling.md"]
  boards_eventstormer_big_picture_md["boards/eventstormer-big-picture.md"] --> sessions_big_picture_context_map_md["sessions/big-picture-context-map.md"]
```

<!-- END lineage:index -->
