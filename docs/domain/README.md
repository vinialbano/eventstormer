---
workshop: design-level
scope: session-facilitation
status: draft
last_updated: 2026-08-28
digest: b702f1f495b3
derived_from:
  - path: acceptance-tests.md
    digest: 89ee81a531d0
    at: 2026-08-28
  - path: boards/eventstormer-big-picture.md
    digest: a1fe4f12aaba
    at: 2026-08-26
  - path: bounded-contexts/derived-artifact-generation/canvas.md
    digest: 99476d0589b3
    at: 2026-08-28
  - path: bounded-contexts/domain-model-capture/canvas.md
    digest: 705129af8f2d
    at: 2026-08-27
  - path: bounded-contexts/session-facilitation/canvas.md
    digest: 192d89ca4269
    at: 2026-08-27
  - path: context-map.md
    digest: ec6dc67a4870
    at: 2026-08-28
  - path: domain-and-goals.md
    digest: 015ff10858df
    at: 2026-08-26
  - path: open-questions.md
    digest: c9a8044f0a62
    at: 2026-08-28
  - path: sessions/2026-08-26-big-picture.md
    digest: 308013b9fcc5
    at: 2026-08-26
  - path: sessions/2026-08-26-design-level-domain-model-capture.md
    digest: 8fb8d04365b1
    at: 2026-08-26
  - path: sessions/2026-08-26-design-level-session-facilitation.md
    digest: fa99635a3b22
    at: 2026-08-26
  - path: sessions/2026-08-26-design-level.md
    digest: a199731d351c
    at: 2026-08-26
  - path: sessions/2026-08-27-design-level-derived-artifact-generation.md
    digest: ecd3d54470f6
    at: 2026-08-27
  - path: sessions/2026-08-27-design-level-domain-model-capture-board.md
    digest: 56a9cc417c6d
    at: 2026-08-27
  - path: sessions/2026-08-27-design-level-session-facilitation-runtime.md
    digest: 35fd6b2ca4f9
    at: 2026-08-27
  - path: subdomain-catalog.md
    digest: c590dae32da0
    at: 2026-08-28
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
3. **Design-Level EventStorming on "Question & Hot Spot Resolution" (2026-08-26)** stopped short
   of its intended scope: seam-validation found the named context does not hold as independent —
   evidence points to folding it into Session Facilitation. It also produced durable domain content
   for whichever context ended up owning it: the two-kind hot-spot split (informational vs.
   model-affecting) and the resolution invariant (deliberate confirmation + a recorded reference).
   Full reasoning in `sessions/2026-08-26-design-level.md`.
4. **DDD Strategic Design session (2026-08-25), phases 01–07**, run directly with the participant
   (not re-derived from the storm), produced:
   - `domain-and-goals.md` — the Impact Map: an AI reliably playing the facilitator role, so
     domain experts get a living model without needing a trained human facilitator.
   - `subdomain-catalog.md` — originally 4 v1 subdomains classified (Session Facilitation: Core,
     Domain Model Capture: Core, Question & Hot Spot Resolution: Supporting, Derived Artifact
     Generation: Supporting) + 1 roadmap subdomain (Multiplayer/Real-time Collaboration: Core,
     provisional) + 2 Technical Mechanisms (Voice Input, AI Model Provider Integration). See item 5.
   - Four bounded contexts, 1:1 with the v1 subdomains, each with a `canvas.md` (boundary
     confirmed) and `ubiquitous-language.md` (thin — deeper terms deferred) under
     `bounded-contexts/<slug>/`. See item 5.
   - `context-map.md` — the decided integration map: Domain Model Capture as an Open-Host Service
     hub, serving Session Facilitation (Customer/Supplier), Question & Hot Spot Resolution
     (Conformist), and Derived Artifact Generation (Conformist); Session Facilitation itself a
     smaller OHS to Question & Hot Spot Resolution (Conformist). See item 5.
5. **`ddd-strategic-design` decision (2026-08-26): adopted the Design-Level finding from item 3.**
   Question & Hot Spot Resolution is retired as a bounded context and subdomain; its capability
   (resolution judgment) and read model (open hot spots/questions) folded into Session
   Facilitation, now v1's only Core context of that shape. Three v1 subdomains remain (Session
   Facilitation incl. resolution: Core, Domain Model Capture: Core, Derived Artifact Generation:
   Supporting) + the same roadmap/Technical Mechanism rows. Every affected artifact was updated in
   the same pass: `context-map.md` (Decision section + diagram/table), `subdomain-catalog.md`,
   `bounded-contexts/session-facilitation/{canvas,ubiquitous-language}.md` (merged content), and
   the retired `bounded-contexts/question-hot-spot-resolution/{canvas,ubiquitous-language}.md`
   (marked superseded, preserved for provenance). See `open-questions.md` #17.
6a. **Big Picture EventStorming, resumed (2026-08-26).** Fixed the pivotal-event scoping defect
   item 6 below's Design-Level session had found but not corrected (`open-questions.md` #23): the
   original board's `Session Started` conflated two scopes. Split into `Workshop Started` (folds
   the former "Workshop Format Selected" candidate; once per workshop, fixes the format) and
   `Session Started` (repeatable; once per session, only after `Domain Problem Stated`, since a
   workshop determines what it's about before any session runs) — confirmed live by the
   participant, who also confirmed `Session Started` keeps its pivotal marker despite repeating.
   Pivotal events go from four to five. `boards/eventstormer-big-picture.md` updated in place (it
   was `draft`, so this is the ordinary resume case, not the confirmed-artifact one). Full reasoning
   in `sessions/2026-08-26-big-picture.md`.
6. **Design-Level EventStorming on Session Facilitation (2026-08-26)** turned this context's
   event-stormed model from `UNCONFIRMED` into `[storm]`-confirmed. Found a structural gap the
   Big Picture never modelled: `Workshop` (persists, one fixed format, spans many sessions and
   people) versus `Session` (one sitting). Named `Workshop` as the aggregate protecting four
   invariants — format immutability, a hard creator/accepted-invitee gate on starting a session,
   invitation state transitions (invited/accepted/declined/revoked), and "at most one open session
   per workshop" for v1. Formalized the resolution capability inherited from the retired Question &
   Hot Spot Resolution session as actual commands/events (`Resolution Proposed/Accepted/Rejected`,
   `Resolve Hot Spot` → `Hot Spot Resolved`), resolved the Proposal-vs-Contribution ambiguity
   (`open-questions.md` #7), and corrected the Big Picture board's pivotal-event scoping (`Session
   Started`/`Domain Problem Stated`/`Chosen Problem Named/Skipped` are workshop-scoped, not
   session-scoped — the board itself is left unedited). All six completion rules held. Full
   reasoning in `sessions/2026-08-26-design-level-session-facilitation.md`.
7. **Design-Level EventStorming on Domain Model Capture (2026-08-26)** turned this context's
   event-stormed model from `UNCONFIRMED` into `[storm]`-confirmed, **then corrected its own
   aggregate design in a same-day resume.** First draft: one `Board` aggregate for the whole
   workshop's graph. The participant challenged this directly — most operations (Reword,
   `causedBy`, annotation) have no invariant reaching outside one or two records, so one shared
   boundary was a mis-derivation. Corrected, invariant-first, to four Building Block aggregates
   (Domain Event, Actor, System, Hot Spot — each protecting only its own local state) plus
   `Timeline`, one per **connected component** of sequenced events (a workshop holds many at once),
   sized to exactly what the no-cycle invariant needs. `Timeline`'s birth (via `Place`, a factory),
   merge (`Sequence` across two components), and split (only when a removal actually disconnects
   the graph — a bifurcation that reunites downstream stays whole) are all stated precisely. Renamed
   the generic `Relate`/`Unrelate` into `Sequence`/`Unsequence` (`follows`), `Link Cause`/
   `Unlink Cause` (`causedBy`, owned by the Domain Event), and `Annotate`/`Unannotate` (Hot Spot's
   own target) — the shared verb read as awkward once three structurally different aggregates were
   involved. Added two cascading policies: withdrawing an Actor/System auto-`Unlink Cause`s every
   Domain Event that referenced it; withdrawing anything a Hot Spot annotates auto-withdraws that
   Hot Spot. Also dissolved the reinstatement conflict rule entirely (`open-questions.md` #3):
   `Reinstate` never restores relations or Timeline membership. Added `Insert Between` (atomic, not
   a bundle) and `Reopen` (Resolved → Open). Settled most of the `Hot Spot Raised` payload question
   (`open-questions.md` #13/#28); left the `kind` field's own necessity, a possible "destroy"
   operation, `Insert Between`'s atomicity guarantee, and the PRD's "timeline" (UI surface) vs.
   `Timeline` (aggregate) naming overlap as genuine open questions rather than guessed answers. All
   six completion rules held, both before and after the correction. Full reasoning in
   `sessions/2026-08-26-design-level-domain-model-capture.md`.

8. **Design-Level EventStorming on Derived Artifact Generation (2026-08-27)** turned this context's
   event-stormed model from `UNCONFIRMED` into `[storm]`-confirmed — the last v1 context with an
   owner to get one. It also **expanded the context past its phase 05–06 sketch**: no longer a
   two-shape projection but **three artifact types**, each independently requested and all
   **on-demand** (resolving `open-questions.md` #9 — nothing materialized, real-time regeneration
   rejected as "a waste of time"): (A) a deterministic **structured outcome** (JSON export +
   template-rendered readable account), (B) a **session transcript export** (verbatim turns
   annotated with the proposals they produced), and (C) a **synthesized summary** — narrative,
   AI-generated, **deliberately non-deterministic**, accepted `[storm]` as a v1 goal even though it
   breaks PRD F10's "determinism is the product's central claim." Invariant-first walk confirmed
   **no aggregate** — the participant's own "purely read and render" — so no state machines and
   completion rule 6 is N/A. Seam validation held the inherited Capture → Artifact edge but found a
   **second, unrecorded upstream**: Session Facilitation, for the session log Flows B and C read
   (candidate revision with evidence in `context-map.md`; `open-questions.md` #39). Flow C makes
   this context an AI Model Provider consumer — its first external dependency. A live
   readable-account **preview** survives as an eventually-consistent, stale-able read model,
   separate from the on-demand artifact. Completion rules 1–5 hold, 6 N/A. Acceptance tests 22–31.
   Full reasoning in `sessions/2026-08-27-design-level-derived-artifact-generation.md`.

9. **Design-Level EventStorming on Session Facilitation — the session runtime (2026-08-27, pass 2
   / resume).** Modelled the parts pass 1 (item 6) `[carried]` from `boards/capture-loop.md`
   rather than designed. Adds three aggregates — **`Session`** (event-sourced; its stream is the
   session record; owns the atomic unresolved-question snapshot at `Close Session` and
   interpret-at-most-once), **`Proposal`** (one per proposal-worthy judgment; a disposition
   lifecycle where `ACCEPTED` is transient and an `Operation Rejected` from Capture sends it to
   `APPLY_FAILED` → retry), **`Resolution`** (one per resolves-open-hot-spot judgment; every apply
   bounce terminal, no retry). The interpretation fan-out is plain choreography — no process
   manager. **`Workshop` simplified:** its "at most one open session" invariant becomes a
   set-scoped uniqueness *constraint* (not an aggregate rule; the thing Multiplayer relaxes), and
   `Close Session` moves to `Session` — `Workshop` is now purely format + invitations. The
   Capture ↔ Facilitation surface grows an **apply-confirmation round trip** (`Operation Applied`/
   `Operation Rejected`, `Hot Spot Resolved`/`Hot Spot Resolution Rejected` as new Boundary
   Events) — same pattern, fuller published language; `Operation Applied`'s building-block-id
   payload resolves Flow B's correlation gap (`open-questions.md` #51). Resolves #46, #47, #51 and
   the interpretation-failure hot spot; updates #48 (a projection-over-log candidate handed to
   Domain Model Capture) and #52 (`capture-loop.md` superseded in parts, left unedited). All six
   completion rules held. Acceptance tests 32–44. Full reasoning in
   `sessions/2026-08-27-design-level-session-facilitation-runtime.md`.

10. **Design-Level EventStorming on Domain Model Capture — the `Board` (2026-08-27, pass 2 /
   resume).** Adopted the projection-over-log reframe (`open-questions.md` #48). Once the workshop
   operation log was confirmed **single-writer** (one open session per workshop, v1) and **totally
   ordered** (F01), the model graph is an **event-sourced projection over that one log**, with
   every invariant checked at append time against the current projection. The four Building Block
   aggregates (Domain Event / Actor / System / Hot Spot) and `Timeline` **all dissolve into one
   event-sourced aggregate, `Board`, one per workshop** — `Sequence`-as-merge, the connected-
   component consistency boundary and the unowned backlog all disappear; the connected-component
   grouping becomes a derived read model. Write model slimmed to what the guards read (Building
   Block id → kind/withdrawn, `follows` adjacency, `causedBy` endpoints, hot-spot state). Resolves
   #48, #49 (referential integrity — reject-at-append; resolution reference is recorded not
   policed), #50 (`Insert Between` cycle-checked like `Sequence`), #34 (`Insert Between` is one
   atomic operation). #37 largely moot. #43 handed to Derived Artifact Generation's resume. All
   six completion rules held. Acceptance tests 12–21 revised, 12a/18a/19a/20a/20b added. Full
   reasoning in `sessions/2026-08-27-design-level-domain-model-capture-board.md`.

11. **Design-Level EventStorming on Session Facilitation — the facilitator's context (2026-08-27,
   pass 3 / narrow resume).** Specifies `open-questions.md` #27, carried unspecified through three
   passes. `Ask Question` is reframed as **the facilitator running an interview loop** — picking
   its next move every turn (scope question, probe a phase name, chase an unopened region, run the
   stakeholder check, or guide a stuck expert) — not reacting to a contribution. The read model
   behind it is **`Facilitation context`**, a composite recomputed **every facilitator turn** from
   the live inputs (recent transcript, open questions, open hot spots, thin/unopened board regions,
   `Workshop.scope`) plus a **frozen prior-session summary**. Two supporting read models:
   **`Prior-session history`** (over the *closed* `Session` streams of the same `Workshop`; each
   summary frozen in its `Close Session` transaction) and **`Facilitation agenda`** (derived: open
   questions ∪ unexpanded-phase-name building blocks ∪ pending stakeholder check). The
   ownership pass found the only genuinely new pieces are that prior-session read model and a
   birth-fixed immutable **`scope`** on `Workshop` — every other input re-uses a dependency this
   context already declares (real sharing, not duplication). **No new aggregate**: "scope set
   once" is a new `Workshop` invariant; the summary freeze rides on `Session`'s existing atomic
   close transaction. Method position is **inferred by the AI**, not a state machine (EventStorming
   is fluid). Surfaced a PRD F04 divergence (#63, scope via "accept path"); recorded the Big
   Picture chosen-problem exit (#64) and two prototyping questions (#65/#66). All six completion
   rules hold for the narrow scope. Acceptance tests 45–48. Full reasoning in
   `sessions/2026-08-27-design-level-session-facilitation-context.md`.

12. **`ddd-strategic-design` adoption pass (2026-08-28).** Adopted the two context-map candidate
   revisions the 2026-08-27 Design-Level passes had left for this skill to rule on. The
   **Session Facilitation → Derived Artifact Generation** edge is now decided: Upstream-Downstream,
   Conformist downstream, OHS + Published Language over the **session log** — reasoned through the
   U/D succeeds-independently test (`open-questions.md` #39). Derived Artifact Generation is a
   Conformist downstream of **two** Core contexts; the inherited Capture → Artifact seam is
   unchanged. The **Domain Model Capture ↔ Session Facilitation apply-confirmation round trip**
   (`Operation Applied`/`Operation Rejected`, `Hot Spot Resolved`/`Hot Spot Resolution Rejected`)
   is adopted as published-language wording — same pattern, fuller surface (`open-questions.md`
   #51 now fully closed). `context-map.md` diagram + main table updated; both former "Candidate
   revision" sections promoted to dated "Decision" sections. No elicitation — `[review]`/decision
   provenance. Left open: Derived Artifact Generation's classification confirm alongside the PRD
   F10 pass (`open-questions.md` #68), and the live strategic-artifact staleness refresh (#69).

13. **`ddd-strategic-design` classification pass (2026-08-28).** Re-confirmed **Derived Artifact
   Generation = Supporting** with the participant. The PRD F10 reconciliation (commit `ec3d094`)
   had resolved `open-questions.md` #40 in the *opposite* direction from the 2026-08-27 canvas —
   every v1 artifact stays deterministic, the AI narrative summary deferred to post-v1 — which
   *retracts* the two facts #68 flagged (external AI dependency, non-determinism) and leaves the
   context as pure deterministic template rendering: textbook Supporting, firmer than at phase 03.
   `subdomain-catalog.md` re-confirmed, its stale status line and an orphaned Multiplayer table
   row fixed; `subdomain-catalog.md` + `domain-and-goals.md` reference-churn edges `ack`ed after
   verifying content still holds (#69). New `open-questions.md` #70: the Derived Artifact
   Generation canvas's Flow C now contradicts the PRD and awaits a `design-level --scope
   derived-artifact-generation` resume. The canvas is left unedited (its owning workshop's to
   reconcile); the divergence is flagged in #70 and this artifact-status table.

14. **Design-Level EventStorming on Derived Artifact Generation — reconciled to PRD F10
   (2026-08-28, resume).** Closes `open-questions.md` #70. Flow C (a non-deterministic,
   AI-generated summary) is **retired**: `Export Model Summary` is now a deterministic template
   render of the model's own outline, the **AI Model Provider** external dependency is removed,
   and `Summary Generation Failed` drops — **no language model in any v1 path**. The model is
   three Boundary Commands: `Export Model` (representation — JSON or readable-account Markdown — a
   **domain-invisible parameter**, the participant's own cut), `Export Model Summary` (a designed
   reduction, distinct), `Export Session Transcript` (PRD F19 — distinct source, distinct rules).
   The in-app readable account is **live** (re-renders every applied operation, PRD F10),
   superseding the 2026-08-27 stale-able preview. Flow B renders all four terminal proposal
   dispositions distinctly (#56) and carries per-contributor accept/edit/reject counts.
   **No aggregate** (re-confirmed invariant-first), no consistency boundary. Both upstream seams
   are decided (Conformist downstream of two Core contexts). Completion rules 1–5 hold, 6 N/A.
   Acceptance tests 22–31 revised. Full reasoning in
   `sessions/2026-08-28-design-level-derived-artifact-generation.md`.

## Artifact status

| Artifact | Status | Confidence | Evidence |
|---|---|---|---|
| `domain-and-goals.md` | draft, confirmed strategically | High | Confirmed with the participant; Impact Map built from their own words. Reviewed 2026-08-28 against the Big Picture resume + PRD reconciliation — goal and impacts unaffected |
| `subdomain-catalog.md` | draft, confirmed strategically | High | Every v1 row confirmed with the participant. Re-checked twice since: the 2026-08-26 QHSR collapse (row retired) and the 2026-08-28 Derived Artifact Generation re-confirm after the PRD F10 determinism reconciliation. Multiplayer row still `Low` (roadmap) |
| `bounded-contexts/*/canvas.md` (boundary sections) | draft, confirmed strategically | High | Purpose/type/team/boundary rationale confirmed per context |
| `bounded-contexts/session-facilitation/canvas.md` (event-stormed model) | draft, `[storm]`-confirmed | High | Design-Level pass 1 (2026-08-26) — `Workshop`, invitations, resolution mechanic. Pass 2 (2026-08-27, resume) — the session runtime: `Session`/`Proposal`/`Resolution` aggregates, the apply-confirmation round trip, `Workshop` simplified. Pass 3 (2026-08-27, narrow resume) — the facilitator's context read models (`Facilitation context` / `Prior-session history` / `Facilitation agenda`), birth-fixed `Workshop.scope`; #27 resolved, no new aggregate. Reasoning in `sessions/2026-08-26-*` and `sessions/2026-08-27-design-level-session-facilitation-{runtime,context}.md` |
| `bounded-contexts/domain-model-capture/canvas.md` (event-stormed model) | draft, `[storm]`-confirmed | High | Design-Level pass 1 (2026-08-26) — commands/events/policies confirmed live. Pass 2 (2026-08-27, resume) — one event-sourced `Board` aggregate over the single-writer operation log; the four Building Block aggregates and `Timeline` dissolved. Reasoning in `sessions/2026-08-26-*` and `sessions/2026-08-27-design-level-domain-model-capture-board.md` |
| `bounded-contexts/derived-artifact-generation/canvas.md` (event-stormed model) | draft, `[storm]`-confirmed | High | Design-Level pass 2026-08-27, **reconciled to PRD F10 on the 2026-08-28 resume** (`open-questions.md` #70). Flow C (non-deterministic AI summary) retired; three deterministic Boundary Commands — `Export Model` (representation a domain-invisible parameter), `Export Model Summary`, `Export Session Transcript` — plus a live in-app readable account; no language model in any path; no external system; no aggregate. Completion rules 1–5 hold, 6 N/A. Reasoning in `sessions/2026-08-28-design-level-derived-artifact-generation.md` |
| `bounded-contexts/question-hot-spot-resolution/canvas.md` | **superseded** | — | Retired 2026-08-26 — `ddd-strategic-design` adopted the Design-Level finding that this context folds into Session Facilitation. Preserved unedited (plus a retirement notice) for provenance; see `context-map.md`'s "Decision" section |
| `bounded-contexts/session-facilitation/ubiquitous-language.md` | draft, mostly confirmed | High | Confirmed live through worked scenarios, Design-Level pass 2026-08-26 |
| `bounded-contexts/domain-model-capture/ubiquitous-language.md` | draft, mostly confirmed | High | Extended live, Design-Level pass 2026-08-26 — `Board`, Placed/Unplaced, Relate/Unrelate, Insert Between, Reopen |
| `bounded-contexts/derived-artifact-generation/ubiquitous-language.md` | draft, mostly confirmed | High | Extended Design-Level pass 2026-08-27; reconciled 2026-08-28 — "synthesized summary" retired, "model summary" is now a deterministic render, "live in-app readable account" replaces the stale-able preview |
| `context-map.md` (decided form) | draft, confirmed strategically | High | Every relationship reasoned through the U/D test and confirmed with the participant; the 2026-08-26 Question & Hot Spot Resolution collapse is adopted and reflected in the diagram/table; the Facilitation↔Capture relationship note names `Resolve Hot Spot` explicitly; the Domain Model Capture Design-Level session (2026-08-26) validated the seam without moving it; 2026-08-28 adoption pass added the **Session Facilitation → Derived Artifact Generation** edge and the Capture↔Facilitation apply-confirmation round-trip wording (#39, #51) |
| `sessions/big-picture-context-map.md` (discovered form) | superseded, preserved for provenance | — | The storm's original `[inferred]` candidates; see `context-map.md`'s "Superseded draft" section for how each maps to the decided form |
| `boards/capture-loop.md` | draft | High | Process Modelling session with the participant, 2026-08-25; every event/command/policy confirmed live, hot spots accounted for |
| `acceptance-tests.md` | draft | High | 1–5 capture-loop, 6–11 Design-Level Session Facilitation, 12–21 (+ 12a/16a/18a/19a/20a/20b) Design-Level Domain Model Capture (revised 2026-08-27 for the single-`Board` model), 22–31 Design-Level Derived Artifact Generation, 32–44 Design-Level Session Facilitation session-runtime, 45–48 Design-Level Session Facilitation facilitator-context |
| `open-questions.md` | draft, live | — | Storm-originated hot spots + 5 items from the strategic-design session (7–11) + 3 items from Process Modelling (13–15) + 4 items from the Question & Hot Spot Resolution Design-Level session (17–20) + 9 items from the Session Facilitation Design-Level session (21–29) + 4 items from the Domain Model Capture Design-Level session (32–35); #3/#8/#13/#17/#20/#21/#22/#28 now resolved |

## Next steps (named, not started)

- A PRD update covering everything this line of sessions has found: F08's resolve/close mechanic
  and the new `Reopen` verb, `place`/`unplace` named as real operations, and `Insert Between` — the
  participant has taken ownership, to do after this workshop concludes (open-questions.md #29).
- Multiplayer/Real-time Collaboration needs its own scoping pass before it can be classified with
  confidence, now with a concrete consistency concern to resolve — "at most one open session per
  workshop" is a v1 simplification, not a permanent answer (open-questions.md #10/#26).
- ~~**Derived Artifact Generation Design-Level resume** to reconcile the canvas's Flow C to PRD
  F10.~~ **Done 2026-08-28** (open-questions.md #70): Flow C retired, `Export Model Summary` is a
  deterministic render, AI Model Provider dependency dropped, live in-app readable account. All six
  completion rules reported.
- All three v1 contexts with an owner have a `[storm]`-confirmed event-stormed model, and Session
  Facilitation's session runtime is now modelled to aggregate level. The book's own next action is
  to prototype (start with `Session` + the `Proposal` disposition lifecycle, or Flow A of Derived
  Artifact Generation) and write down the questions it raises.
- **Prototype the `Board`** (the book's own next action after Design-Level): `decide` / `evolve`
  over the operation log, the cycle check, the connected-component read model; write down the
  questions it raises.
- ~~**Derived Artifact Generation resume:** how a lapsed / apply-failed proposal renders in Flow
  B (`open-questions.md` #56)~~ **resolved 2026-08-28** — all four terminal dispositions rendered
  distinctly. Still open: whether the `Board`'s output carries every datum `Export Model` /
  `Export Model Summary` needs (`open-questions.md` #43), and where the format-step list lives for
  the coverage disclosure (`open-questions.md` #42).
- ~~**#27:** the shape of the context the facilitator gathers before its next question.~~
  **Resolved 2026-08-27** (Design-Level pass 3) — `Facilitation context` / `Prior-session history`
  / `Facilitation agenda`; see item 11.
- Two smaller, genuinely open questions from the Domain Model Capture sessions, neither owned yet:
  whether Hot Spot's `kind` field earns its place (open-questions.md #32), and a possible "destroy"
  operation for true duplicates that currently conflicts with the confirmed no-merge rule
  (open-questions.md #33).

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
        └── bounded-contexts/session-facilitation/canvas.md (Design-Level, 2026-08-26)
              └── bounded-contexts/session-facilitation/ubiquitous-language.md
              └── acceptance-tests.md (items 6–11)
              └── open-questions.md (items 21–29)
              └── sessions/2026-08-26-design-level-session-facilitation.md
```

## Draft declaration

Nothing here is ready to build from without further sessions. The strategic layer (goal,
subdomains, contexts, integration patterns) is confirmed; the tactical layer inside each context
(commands, events, policies, aggregates) is not, and is named explicitly as `UNCONFIRMED` rather
than guessed.

<!-- BEGIN lineage:index -->

| Artifact | Workshop | Scope | Status | Updated |
|---|---|---|---|---|
| [README.md](README.md) | design-level | session-facilitation | draft | 2026-08-28 |
| [acceptance-tests.md](acceptance-tests.md) | design-level | session-facilitation | draft | 2026-08-28 |
| [boards/capture-loop.md](boards/capture-loop.md) | process-modelling | capture-loop | draft | 2026-08-26 |
| [boards/eventstormer-big-picture.md](boards/eventstormer-big-picture.md) | big-picture | eventstormer-session | draft | 2026-08-26 |
| [bounded-contexts/derived-artifact-generation/canvas.md](bounded-contexts/derived-artifact-generation/canvas.md) | design-level | derived-artifact-generation | draft | 2026-08-28 |
| [bounded-contexts/derived-artifact-generation/ubiquitous-language.md](bounded-contexts/derived-artifact-generation/ubiquitous-language.md) | design-level | derived-artifact-generation | draft | 2026-08-28 |
| [bounded-contexts/domain-model-capture/canvas.md](bounded-contexts/domain-model-capture/canvas.md) | design-level | domain-model-capture | draft | 2026-08-27 |
| [bounded-contexts/domain-model-capture/ubiquitous-language.md](bounded-contexts/domain-model-capture/ubiquitous-language.md) | design-level | domain-model-capture | draft | 2026-08-27 |
| [bounded-contexts/question-hot-spot-resolution/canvas.md](bounded-contexts/question-hot-spot-resolution/canvas.md) | ddd-strategic-design | eventstormer-session | draft | 2026-08-26 |
| [bounded-contexts/question-hot-spot-resolution/ubiquitous-language.md](bounded-contexts/question-hot-spot-resolution/ubiquitous-language.md) | ddd-strategic-design | eventstormer-session | draft | 2026-08-26 |
| [bounded-contexts/session-facilitation/canvas.md](bounded-contexts/session-facilitation/canvas.md) | design-level | session-facilitation | draft | 2026-08-27 |
| [bounded-contexts/session-facilitation/ubiquitous-language.md](bounded-contexts/session-facilitation/ubiquitous-language.md) | design-level | session-facilitation | draft | 2026-08-27 |
| [context-map.md](context-map.md) | design-level | session-facilitation | draft | 2026-08-28 |
| [domain-and-goals.md](domain-and-goals.md) | ddd-strategic-design | eventstormer-session | draft | 2026-08-28 |
| [open-questions.md](open-questions.md) | design-level | session-facilitation | draft | 2026-08-28 |
| [sessions/2026-08-25-big-picture.md](sessions/2026-08-25-big-picture.md) | big-picture | eventstormer-session | draft | 2026-08-25 |
| [sessions/2026-08-25-process-modelling.md](sessions/2026-08-25-process-modelling.md) | process-modelling | capture-loop | draft | 2026-08-26 |
| [sessions/2026-08-26-big-picture.md](sessions/2026-08-26-big-picture.md) | big-picture | eventstormer-session | draft | 2026-08-26 |
| [sessions/2026-08-26-design-level-domain-model-capture.md](sessions/2026-08-26-design-level-domain-model-capture.md) | design-level | domain-model-capture | draft | 2026-08-26 |
| [sessions/2026-08-26-design-level-session-facilitation.md](sessions/2026-08-26-design-level-session-facilitation.md) | design-level | session-facilitation | draft | 2026-08-26 |
| [sessions/2026-08-26-design-level.md](sessions/2026-08-26-design-level.md) | design-level | question-hot-spot-resolution | draft | 2026-08-26 |
| [sessions/2026-08-27-design-level-derived-artifact-generation.md](sessions/2026-08-27-design-level-derived-artifact-generation.md) | design-level | derived-artifact-generation | draft | 2026-08-27 |
| [sessions/2026-08-27-design-level-domain-model-capture-board.md](sessions/2026-08-27-design-level-domain-model-capture-board.md) | design-level | domain-model-capture | draft | 2026-08-27 |
| [sessions/2026-08-27-design-level-session-facilitation-context.md](sessions/2026-08-27-design-level-session-facilitation-context.md) | design-level | session-facilitation | draft | 2026-08-27 |
| [sessions/2026-08-27-design-level-session-facilitation-runtime.md](sessions/2026-08-27-design-level-session-facilitation-runtime.md) | design-level | session-facilitation | draft | 2026-08-27 |
| [sessions/2026-08-28-design-level-derived-artifact-generation.md](sessions/2026-08-28-design-level-derived-artifact-generation.md) | design-level | derived-artifact-generation | draft | 2026-08-28 |
| [sessions/big-picture-context-map.md](sessions/big-picture-context-map.md) | big-picture | eventstormer-session | draft | 2026-08-25 |
| [subdomain-catalog.md](subdomain-catalog.md) | ddd-strategic-design | eventstormer-session | draft | 2026-08-28 |

```mermaid
graph LR
  acceptance_tests_md["acceptance-tests.md"] --> README_md["README.md"]
  boards_eventstormer_big_picture_md["boards/eventstormer-big-picture.md"] --> README_md["README.md"]
  bounded_contexts_derived_artifact_generation_canvas_md["bounded-contexts/derived-artifact-generation/canvas.md"] --> README_md["README.md"]
  bounded_contexts_domain_model_capture_canvas_md["bounded-contexts/domain-model-capture/canvas.md"] --> README_md["README.md"]
  bounded_contexts_session_facilitation_canvas_md["bounded-contexts/session-facilitation/canvas.md"] --> README_md["README.md"]
  context_map_md["context-map.md"] --> README_md["README.md"]
  domain_and_goals_md["domain-and-goals.md"] --> README_md["README.md"]
  open_questions_md["open-questions.md"] --> README_md["README.md"]
  sessions_2026_08_26_big_picture_md["sessions/2026-08-26-big-picture.md"] --> README_md["README.md"]
  sessions_2026_08_26_design_level_domain_model_capture_md["sessions/2026-08-26-design-level-domain-model-capture.md"] --> README_md["README.md"]
  sessions_2026_08_26_design_level_session_facilitation_md["sessions/2026-08-26-design-level-session-facilitation.md"] --> README_md["README.md"]
  sessions_2026_08_26_design_level_md["sessions/2026-08-26-design-level.md"] --> README_md["README.md"]
  sessions_2026_08_27_design_level_derived_artifact_generation_md["sessions/2026-08-27-design-level-derived-artifact-generation.md"] --> README_md["README.md"]
  sessions_2026_08_27_design_level_domain_model_capture_board_md["sessions/2026-08-27-design-level-domain-model-capture-board.md"] --> README_md["README.md"]
  sessions_2026_08_27_design_level_session_facilitation_runtime_md["sessions/2026-08-27-design-level-session-facilitation-runtime.md"] --> README_md["README.md"]
  subdomain_catalog_md["subdomain-catalog.md"] --> README_md["README.md"]
  boards_capture_loop_md["boards/capture-loop.md"] --> acceptance_tests_md["acceptance-tests.md"]
  bounded_contexts_derived_artifact_generation_canvas_md["bounded-contexts/derived-artifact-generation/canvas.md"] --> acceptance_tests_md["acceptance-tests.md"]
  bounded_contexts_domain_model_capture_canvas_md["bounded-contexts/domain-model-capture/canvas.md"] --> acceptance_tests_md["acceptance-tests.md"]
  bounded_contexts_session_facilitation_canvas_md["bounded-contexts/session-facilitation/canvas.md"] --> acceptance_tests_md["acceptance-tests.md"]
  boards_eventstormer_big_picture_md["boards/eventstormer-big-picture.md"] --> boards_capture_loop_md["boards/capture-loop.md"]
  sessions_2026_08_26_big_picture_md["sessions/2026-08-26-big-picture.md"] --> boards_eventstormer_big_picture_md["boards/eventstormer-big-picture.md"]
  boards_eventstormer_big_picture_md["boards/eventstormer-big-picture.md"] --> bounded_contexts_derived_artifact_generation_canvas_md["bounded-contexts/derived-artifact-generation/canvas.md"]
  bounded_contexts_domain_model_capture_canvas_md["bounded-contexts/domain-model-capture/canvas.md"] --> bounded_contexts_derived_artifact_generation_canvas_md["bounded-contexts/derived-artifact-generation/canvas.md"]
  bounded_contexts_session_facilitation_canvas_md["bounded-contexts/session-facilitation/canvas.md"] --> bounded_contexts_derived_artifact_generation_canvas_md["bounded-contexts/derived-artifact-generation/canvas.md"]
  context_map_md["context-map.md"] --> bounded_contexts_derived_artifact_generation_canvas_md["bounded-contexts/derived-artifact-generation/canvas.md"]
  open_questions_md["open-questions.md"] --> bounded_contexts_derived_artifact_generation_canvas_md["bounded-contexts/derived-artifact-generation/canvas.md"]
  sessions_2026_08_27_design_level_derived_artifact_generation_md["sessions/2026-08-27-design-level-derived-artifact-generation.md"] --> bounded_contexts_derived_artifact_generation_canvas_md["bounded-contexts/derived-artifact-generation/canvas.md"]
  bounded_contexts_derived_artifact_generation_canvas_md["bounded-contexts/derived-artifact-generation/canvas.md"] --> bounded_contexts_derived_artifact_generation_ubiquitous_language_md["bounded-contexts/derived-artifact-generation/ubiquitous-language.md"]
  sessions_2026_08_27_design_level_derived_artifact_generation_md["sessions/2026-08-27-design-level-derived-artifact-generation.md"] --> bounded_contexts_derived_artifact_generation_ubiquitous_language_md["bounded-contexts/derived-artifact-generation/ubiquitous-language.md"]
  boards_capture_loop_md["boards/capture-loop.md"] --> bounded_contexts_domain_model_capture_canvas_md["bounded-contexts/domain-model-capture/canvas.md"]
  boards_eventstormer_big_picture_md["boards/eventstormer-big-picture.md"] --> bounded_contexts_domain_model_capture_canvas_md["bounded-contexts/domain-model-capture/canvas.md"]
  bounded_contexts_session_facilitation_canvas_md["bounded-contexts/session-facilitation/canvas.md"] --> bounded_contexts_domain_model_capture_canvas_md["bounded-contexts/domain-model-capture/canvas.md"]
  context_map_md["context-map.md"] --> bounded_contexts_domain_model_capture_canvas_md["bounded-contexts/domain-model-capture/canvas.md"]
  open_questions_md["open-questions.md"] --> bounded_contexts_domain_model_capture_canvas_md["bounded-contexts/domain-model-capture/canvas.md"]
  sessions_2026_08_26_design_level_domain_model_capture_md["sessions/2026-08-26-design-level-domain-model-capture.md"] --> bounded_contexts_domain_model_capture_canvas_md["bounded-contexts/domain-model-capture/canvas.md"]
  sessions_2026_08_27_design_level_domain_model_capture_board_md["sessions/2026-08-27-design-level-domain-model-capture-board.md"] --> bounded_contexts_domain_model_capture_canvas_md["bounded-contexts/domain-model-capture/canvas.md"]
  subdomain_catalog_md["subdomain-catalog.md"] --> bounded_contexts_domain_model_capture_canvas_md["bounded-contexts/domain-model-capture/canvas.md"]
  boards_eventstormer_big_picture_md["boards/eventstormer-big-picture.md"] --> bounded_contexts_domain_model_capture_ubiquitous_language_md["bounded-contexts/domain-model-capture/ubiquitous-language.md"]
  bounded_contexts_domain_model_capture_canvas_md["bounded-contexts/domain-model-capture/canvas.md"] --> bounded_contexts_domain_model_capture_ubiquitous_language_md["bounded-contexts/domain-model-capture/ubiquitous-language.md"]
  context_map_md["context-map.md"] --> bounded_contexts_question_hot_spot_resolution_canvas_md["bounded-contexts/question-hot-spot-resolution/canvas.md"]
  open_questions_md["open-questions.md"] --> bounded_contexts_question_hot_spot_resolution_canvas_md["bounded-contexts/question-hot-spot-resolution/canvas.md"]
  sessions_2026_08_26_design_level_md["sessions/2026-08-26-design-level.md"] --> bounded_contexts_question_hot_spot_resolution_canvas_md["bounded-contexts/question-hot-spot-resolution/canvas.md"]
  subdomain_catalog_md["subdomain-catalog.md"] --> bounded_contexts_question_hot_spot_resolution_canvas_md["bounded-contexts/question-hot-spot-resolution/canvas.md"]
  context_map_md["context-map.md"] --> bounded_contexts_question_hot_spot_resolution_ubiquitous_language_md["bounded-contexts/question-hot-spot-resolution/ubiquitous-language.md"]
  open_questions_md["open-questions.md"] --> bounded_contexts_question_hot_spot_resolution_ubiquitous_language_md["bounded-contexts/question-hot-spot-resolution/ubiquitous-language.md"]
  boards_capture_loop_md["boards/capture-loop.md"] --> bounded_contexts_session_facilitation_canvas_md["bounded-contexts/session-facilitation/canvas.md"]
  boards_eventstormer_big_picture_md["boards/eventstormer-big-picture.md"] --> bounded_contexts_session_facilitation_canvas_md["bounded-contexts/session-facilitation/canvas.md"]
  bounded_contexts_question_hot_spot_resolution_canvas_md["bounded-contexts/question-hot-spot-resolution/canvas.md"] --> bounded_contexts_session_facilitation_canvas_md["bounded-contexts/session-facilitation/canvas.md"]
  context_map_md["context-map.md"] --> bounded_contexts_session_facilitation_canvas_md["bounded-contexts/session-facilitation/canvas.md"]
  open_questions_md["open-questions.md"] --> bounded_contexts_session_facilitation_canvas_md["bounded-contexts/session-facilitation/canvas.md"]
  sessions_2026_08_26_design_level_session_facilitation_md["sessions/2026-08-26-design-level-session-facilitation.md"] --> bounded_contexts_session_facilitation_canvas_md["bounded-contexts/session-facilitation/canvas.md"]
  sessions_2026_08_26_design_level_md["sessions/2026-08-26-design-level.md"] --> bounded_contexts_session_facilitation_canvas_md["bounded-contexts/session-facilitation/canvas.md"]
  sessions_2026_08_27_design_level_session_facilitation_runtime_md["sessions/2026-08-27-design-level-session-facilitation-runtime.md"] --> bounded_contexts_session_facilitation_canvas_md["bounded-contexts/session-facilitation/canvas.md"]
  subdomain_catalog_md["subdomain-catalog.md"] --> bounded_contexts_session_facilitation_canvas_md["bounded-contexts/session-facilitation/canvas.md"]
  boards_eventstormer_big_picture_md["boards/eventstormer-big-picture.md"] --> bounded_contexts_session_facilitation_ubiquitous_language_md["bounded-contexts/session-facilitation/ubiquitous-language.md"]
  bounded_contexts_question_hot_spot_resolution_ubiquitous_language_md["bounded-contexts/question-hot-spot-resolution/ubiquitous-language.md"] --> bounded_contexts_session_facilitation_ubiquitous_language_md["bounded-contexts/session-facilitation/ubiquitous-language.md"]
  sessions_2026_08_26_design_level_session_facilitation_md["sessions/2026-08-26-design-level-session-facilitation.md"] --> bounded_contexts_session_facilitation_ubiquitous_language_md["bounded-contexts/session-facilitation/ubiquitous-language.md"]
  bounded_contexts_derived_artifact_generation_canvas_md["bounded-contexts/derived-artifact-generation/canvas.md"] --> context_map_md["context-map.md"]
  bounded_contexts_domain_model_capture_canvas_md["bounded-contexts/domain-model-capture/canvas.md"] --> context_map_md["context-map.md"]
  bounded_contexts_question_hot_spot_resolution_canvas_md["bounded-contexts/question-hot-spot-resolution/canvas.md"] --> context_map_md["context-map.md"]
  bounded_contexts_session_facilitation_canvas_md["bounded-contexts/session-facilitation/canvas.md"] --> context_map_md["context-map.md"]
  sessions_2026_08_26_design_level_md["sessions/2026-08-26-design-level.md"] --> context_map_md["context-map.md"]
  subdomain_catalog_md["subdomain-catalog.md"] --> context_map_md["context-map.md"]
  open_questions_md["open-questions.md"] --> domain_and_goals_md["domain-and-goals.md"]
  boards_eventstormer_big_picture_md["boards/eventstormer-big-picture.md"] --> domain_and_goals_md["domain-and-goals.md"]
  boards_eventstormer_big_picture_md["boards/eventstormer-big-picture.md"] --> open_questions_md["open-questions.md"]
  bounded_contexts_derived_artifact_generation_canvas_md["bounded-contexts/derived-artifact-generation/canvas.md"] --> open_questions_md["open-questions.md"]
  bounded_contexts_domain_model_capture_canvas_md["bounded-contexts/domain-model-capture/canvas.md"] --> open_questions_md["open-questions.md"]
  bounded_contexts_session_facilitation_canvas_md["bounded-contexts/session-facilitation/canvas.md"] --> open_questions_md["open-questions.md"]
  context_map_md["context-map.md"] --> open_questions_md["open-questions.md"]
  sessions_2026_08_26_big_picture_md["sessions/2026-08-26-big-picture.md"] --> open_questions_md["open-questions.md"]
  sessions_2026_08_26_design_level_domain_model_capture_md["sessions/2026-08-26-design-level-domain-model-capture.md"] --> open_questions_md["open-questions.md"]
  sessions_2026_08_26_design_level_session_facilitation_md["sessions/2026-08-26-design-level-session-facilitation.md"] --> open_questions_md["open-questions.md"]
  sessions_2026_08_26_design_level_md["sessions/2026-08-26-design-level.md"] --> open_questions_md["open-questions.md"]
  boards_capture_loop_md["boards/capture-loop.md"] --> sessions_2026_08_25_process_modelling_md["sessions/2026-08-25-process-modelling.md"]
  boards_eventstormer_big_picture_md["boards/eventstormer-big-picture.md"] --> sessions_2026_08_26_big_picture_md["sessions/2026-08-26-big-picture.md"]
  boards_capture_loop_md["boards/capture-loop.md"] --> sessions_2026_08_26_design_level_domain_model_capture_md["sessions/2026-08-26-design-level-domain-model-capture.md"]
  boards_eventstormer_big_picture_md["boards/eventstormer-big-picture.md"] --> sessions_2026_08_26_design_level_domain_model_capture_md["sessions/2026-08-26-design-level-domain-model-capture.md"]
  bounded_contexts_domain_model_capture_canvas_md["bounded-contexts/domain-model-capture/canvas.md"] --> sessions_2026_08_26_design_level_domain_model_capture_md["sessions/2026-08-26-design-level-domain-model-capture.md"]
  bounded_contexts_session_facilitation_canvas_md["bounded-contexts/session-facilitation/canvas.md"] --> sessions_2026_08_26_design_level_domain_model_capture_md["sessions/2026-08-26-design-level-domain-model-capture.md"]
  context_map_md["context-map.md"] --> sessions_2026_08_26_design_level_domain_model_capture_md["sessions/2026-08-26-design-level-domain-model-capture.md"]
  open_questions_md["open-questions.md"] --> sessions_2026_08_26_design_level_domain_model_capture_md["sessions/2026-08-26-design-level-domain-model-capture.md"]
  boards_capture_loop_md["boards/capture-loop.md"] --> sessions_2026_08_26_design_level_session_facilitation_md["sessions/2026-08-26-design-level-session-facilitation.md"]
  bounded_contexts_session_facilitation_canvas_md["bounded-contexts/session-facilitation/canvas.md"] --> sessions_2026_08_26_design_level_session_facilitation_md["sessions/2026-08-26-design-level-session-facilitation.md"]
  context_map_md["context-map.md"] --> sessions_2026_08_26_design_level_session_facilitation_md["sessions/2026-08-26-design-level-session-facilitation.md"]
  open_questions_md["open-questions.md"] --> sessions_2026_08_26_design_level_session_facilitation_md["sessions/2026-08-26-design-level-session-facilitation.md"]
  sessions_2026_08_26_design_level_md["sessions/2026-08-26-design-level.md"] --> sessions_2026_08_26_design_level_session_facilitation_md["sessions/2026-08-26-design-level-session-facilitation.md"]
  boards_capture_loop_md["boards/capture-loop.md"] --> sessions_2026_08_26_design_level_md["sessions/2026-08-26-design-level.md"]
  bounded_contexts_question_hot_spot_resolution_canvas_md["bounded-contexts/question-hot-spot-resolution/canvas.md"] --> sessions_2026_08_26_design_level_md["sessions/2026-08-26-design-level.md"]
  context_map_md["context-map.md"] --> sessions_2026_08_26_design_level_md["sessions/2026-08-26-design-level.md"]
  open_questions_md["open-questions.md"] --> sessions_2026_08_26_design_level_md["sessions/2026-08-26-design-level.md"]
  boards_eventstormer_big_picture_md["boards/eventstormer-big-picture.md"] --> sessions_2026_08_27_design_level_derived_artifact_generation_md["sessions/2026-08-27-design-level-derived-artifact-generation.md"]
  bounded_contexts_derived_artifact_generation_canvas_md["bounded-contexts/derived-artifact-generation/canvas.md"] --> sessions_2026_08_27_design_level_derived_artifact_generation_md["sessions/2026-08-27-design-level-derived-artifact-generation.md"]
  bounded_contexts_domain_model_capture_canvas_md["bounded-contexts/domain-model-capture/canvas.md"] --> sessions_2026_08_27_design_level_derived_artifact_generation_md["sessions/2026-08-27-design-level-derived-artifact-generation.md"]
  bounded_contexts_session_facilitation_canvas_md["bounded-contexts/session-facilitation/canvas.md"] --> sessions_2026_08_27_design_level_derived_artifact_generation_md["sessions/2026-08-27-design-level-derived-artifact-generation.md"]
  context_map_md["context-map.md"] --> sessions_2026_08_27_design_level_derived_artifact_generation_md["sessions/2026-08-27-design-level-derived-artifact-generation.md"]
  open_questions_md["open-questions.md"] --> sessions_2026_08_27_design_level_derived_artifact_generation_md["sessions/2026-08-27-design-level-derived-artifact-generation.md"]
  bounded_contexts_domain_model_capture_canvas_md["bounded-contexts/domain-model-capture/canvas.md"] --> sessions_2026_08_27_design_level_domain_model_capture_board_md["sessions/2026-08-27-design-level-domain-model-capture-board.md"]
  bounded_contexts_session_facilitation_canvas_md["bounded-contexts/session-facilitation/canvas.md"] --> sessions_2026_08_27_design_level_domain_model_capture_board_md["sessions/2026-08-27-design-level-domain-model-capture-board.md"]
  context_map_md["context-map.md"] --> sessions_2026_08_27_design_level_domain_model_capture_board_md["sessions/2026-08-27-design-level-domain-model-capture-board.md"]
  open_questions_md["open-questions.md"] --> sessions_2026_08_27_design_level_domain_model_capture_board_md["sessions/2026-08-27-design-level-domain-model-capture-board.md"]
  sessions_2026_08_26_design_level_domain_model_capture_md["sessions/2026-08-26-design-level-domain-model-capture.md"] --> sessions_2026_08_27_design_level_domain_model_capture_board_md["sessions/2026-08-27-design-level-domain-model-capture-board.md"]
  sessions_2026_08_27_design_level_session_facilitation_runtime_md["sessions/2026-08-27-design-level-session-facilitation-runtime.md"] --> sessions_2026_08_27_design_level_domain_model_capture_board_md["sessions/2026-08-27-design-level-domain-model-capture-board.md"]
  acceptance_tests_md["acceptance-tests.md"] --> sessions_2026_08_27_design_level_session_facilitation_context_md["sessions/2026-08-27-design-level-session-facilitation-context.md"]
  bounded_contexts_session_facilitation_canvas_md["bounded-contexts/session-facilitation/canvas.md"] --> sessions_2026_08_27_design_level_session_facilitation_context_md["sessions/2026-08-27-design-level-session-facilitation-context.md"]
  open_questions_md["open-questions.md"] --> sessions_2026_08_27_design_level_session_facilitation_context_md["sessions/2026-08-27-design-level-session-facilitation-context.md"]
  boards_capture_loop_md["boards/capture-loop.md"] --> sessions_2026_08_27_design_level_session_facilitation_runtime_md["sessions/2026-08-27-design-level-session-facilitation-runtime.md"]
  bounded_contexts_derived_artifact_generation_canvas_md["bounded-contexts/derived-artifact-generation/canvas.md"] --> sessions_2026_08_27_design_level_session_facilitation_runtime_md["sessions/2026-08-27-design-level-session-facilitation-runtime.md"]
  bounded_contexts_domain_model_capture_canvas_md["bounded-contexts/domain-model-capture/canvas.md"] --> sessions_2026_08_27_design_level_session_facilitation_runtime_md["sessions/2026-08-27-design-level-session-facilitation-runtime.md"]
  bounded_contexts_derived_artifact_generation_canvas_md["bounded-contexts/derived-artifact-generation/canvas.md"] --> sessions_2026_08_28_design_level_derived_artifact_generation_md["sessions/2026-08-28-design-level-derived-artifact-generation.md"]
  bounded_contexts_domain_model_capture_canvas_md["bounded-contexts/domain-model-capture/canvas.md"] --> sessions_2026_08_28_design_level_derived_artifact_generation_md["sessions/2026-08-28-design-level-derived-artifact-generation.md"]
  bounded_contexts_session_facilitation_canvas_md["bounded-contexts/session-facilitation/canvas.md"] --> sessions_2026_08_28_design_level_derived_artifact_generation_md["sessions/2026-08-28-design-level-derived-artifact-generation.md"]
  context_map_md["context-map.md"] --> sessions_2026_08_28_design_level_derived_artifact_generation_md["sessions/2026-08-28-design-level-derived-artifact-generation.md"]
  open_questions_md["open-questions.md"] --> sessions_2026_08_28_design_level_derived_artifact_generation_md["sessions/2026-08-28-design-level-derived-artifact-generation.md"]
  sessions_2026_08_27_design_level_derived_artifact_generation_md["sessions/2026-08-27-design-level-derived-artifact-generation.md"] --> sessions_2026_08_28_design_level_derived_artifact_generation_md["sessions/2026-08-28-design-level-derived-artifact-generation.md"]
  boards_eventstormer_big_picture_md["boards/eventstormer-big-picture.md"] --> sessions_big_picture_context_map_md["sessions/big-picture-context-map.md"]
  domain_and_goals_md["domain-and-goals.md"] --> subdomain_catalog_md["subdomain-catalog.md"]
  context_map_md["context-map.md"] --> subdomain_catalog_md["subdomain-catalog.md"]
  boards_eventstormer_big_picture_md["boards/eventstormer-big-picture.md"] --> subdomain_catalog_md["subdomain-catalog.md"]
```

<!-- END lineage:index -->