---
workshop: design-level
scope: question-hot-spot-resolution
status: draft
last_updated: 2026-08-26
digest: a199731d351c
derived_from:
  - path: boards/capture-loop.md
    digest: bc6ad40750e0
    at: 2026-08-26
  - path: bounded-contexts/question-hot-spot-resolution/canvas.md
    digest: 759a1d42a01f
    at: 2026-08-26
  - path: context-map.md
    digest: d4fd9c957b26
    at: 2026-08-28
  - path: open-questions.md
    digest: 82b19cc9dbf4
    at: 2026-08-28
---
# Session — Design-Level EventStorming: Question & Hot Spot Resolution

**Date:** 2026-08-26
**Workshop:** Design-Level
**Participants:** One — the product owner (solo), same hard limit as every prior session in this
line: no genuine inter-participant disagreement was available.
**Domain baseline:** reused `docs/domain` — harvested (not re-derived) the event vocabulary, the
three named hot spots, and the external-context knowledge from `boards/capture-loop.md` and the
existing `bounded-contexts/question-hot-spot-resolution/canvas.md`.
**Scope:** one named bounded context — Question & Hot Spot Resolution.

Disclosed at the prepare step, per this workshop's own rule: the book is thin on Design-Level
(chapters 17–20, the least-finished part of it); what follows leans on the author's 2025 workshop
templates and DDD literature for the six completion rules, the aggregate-discovery method, and the
modelling strategies.

## Why this session stopped short of the intended scope

The named context, tested against the evidence gathered in this session, does not hold as an
independent bounded context. That is a result of Design-Level's own seam-validation step, not a
failure to reach it — see [Boundary validation](#boundary-validation-the-seam-does-not-hold) below.
Once that became clear, the participant chose to **stop here and write up the finding**, rather
than continue by retargeting the session live to Session Facilitation (the offered alternative).
So this session produced a **boundary finding and one piece of durable domain content** (the
hot-spot-resolution invariant), not a completed context canvas — completion rules 1–3 and 6 were
never reached because there was no in-context flow left to complete once the seam collapsed.

## What was elicited, in order

1. **Item #15 from `open-questions.md`** (which context executes `Answer Question`) was the opening
   question. The participant's answer — Session Facilitation, because Question & Hot Spot
   Resolution is about *resolving* pending things, not detecting them live — turned out to be the
   thread that unravelled the whole boundary, not just that one command.

2. **PRD evidence check.** Before designing a resolution mechanic, I checked what F08 (Hot Spots,
   `docs/product/PRD.md:142,356-372,685-699`) actually specifies. It does not define a resolve/close
   operation at all — a hot spot is created, annotates something or nothing, is counted, and can
   become the chosen problem; the only language pointing at closure ("withdrawing an annotated
   building block leaves the hot spot **resolvable**", line 693) is never cashed into a command or
   event, and F01's operation-log kind list has no `resolve` verb. `[code]`, disclosed to the
   participant before any design proceeded, per this skill's provenance-disclosure rule.

3. **Scope call.** Asked whether this is out-of-v1-scope (like Multiplayer) or an under-specified
   part of v1. **Participant: under-specified.** `[storm]`

4. **The hot-spot split (invariant-first, elicited).** The participant distinguished two kinds of
   hot spot, previously undifferentiated in the PRD or any prior session:
   - **Informational / pain-point hot spots** — e.g. "this event is slow because of an external
     provider." Nothing in the model changes because of these; they are a permanent artifact for
     engineering, not something with a resolution lifecycle. This already fits F08's existing
     "annotating nothing is valid, not a waiting room" stance (PRD line 626) — no product change
     implied.
   - **Model-affecting hot spots** — close an open question or fix something in the workshop design
     itself. These have a genuine "done" state.
   `[storm]`

5. **The resolution invariant (elicited).** For model-affecting hot spots: *"when we resolve a hot
   spot, we point to what led to that closure, so that we can persist the context."* The reference
   is deliberately untyped — a note, an external link, a building block, "or whatever" — the
   invariant is only that **something** is recorded, not its shape. `[storm]`

6. **How resolution fires (elicited).** Asked whether resolution is automatic (system infers it from
   an event) or deliberate. **Participant: deliberate — "difficult to automate... need
   interpretation and deliberate act."** This mirrors the existing `Building Block Proposed → Accept
   Proposal` shape (facilitator interprets, human confirms) rather than the existing auto-raise
   shape (`Knowledge Gap Revealed → Raise Hot Spot`, no confirmation step) — proposed by me as the
   pattern match, not asserted as settled; the participant confirmed it "sounds right." `[inferred]`
   pattern-match, `[storm]` confirmation.

## Boundary validation: the seam does not hold

Design-Level's job on an inherited seam is to test it on consistency and integration evidence, not
re-decompose the domain. Testing it here:

| Original rationale (`ddd-strategic-design`, 2026-08-25) | What this session found |
|---|---|
| Capability boundary: "detect-and-track-gaps... noticing what's missing, not eliciting or storing what's present" | Detection already executes inside Session Facilitation's own policies (`boards/capture-loop.md`'s `Reveal Knowledge Gap`, `Name Absent Stakeholder`, the `Session Closed` sweep — all `Facilitator`-executed, not this context) |
| (new, this session) resolution-judgment | Matches `Interpret Contribution`'s existing shape exactly — interpret, then a human confirms — just checking against a wider target (any open hot spot/question, not only the live one). Not a new capability; Facilitation's existing one, extended. |
| Storage/enforcement of the resolution invariant | Already established as Domain Model Capture's job (this context "only issues the raise command" per its own canvas) — unchanged by this session, and consistent, not spanning the seam |
| "Own pace — a question can stay open across many proposal/accept cycles" (the one thing that could still justify separateness) | **Tested directly.** Asked whether Session Facilitation's own model is scoped to one session. Participant: **no — "the facilitation can survive sessions... the workshop remains valid if someone else resumes it later."** If Facilitation already spans sessions, there is no pace difference left to found a boundary on. |

**Finding, `[inferred]`:** on this evidence, Question & Hot Spot Resolution is not an independent
bounded context. What survives is a capability inside Session Facilitation (judge whether a
contribution resolves an open hot spot/question, requiring confirmation and a recorded reference)
and a read model (open hot spots/questions at any point) that Facilitation needs for its own
purposes. Recorded as a **candidate revision** in `context-map.md`, evidence attached, adoption
left to `anoria-commons:ddd-strategic-design` — this workshop tests a seam, it does not settle one.

## The six completion rules

| # | Rule | Status |
|---|---|---|
| 1 | Every path completed | **Not reached** — no in-context flow remained to complete once the seam collapsed |
| 2 | Grammar respected | **Not reached** — no commands/events were modelled inside this context |
| 3 | Every stakeholder reasonably happy | **Not reached** |
| 4 | Every hot spot addressed | **Partial** — the session's own hot spots (below) are addressed with owners/next steps; the pre-existing #13–#15 are folded into this finding rather than resolved independently |
| 5 | Boundaries visible | **N/A, inverted** — this session's output *is* a boundary finding, not a boundary drawn inside a confirmed context |
| 6 | Components have consistent behaviour | **Not reached** — no aggregate/state machine was modelled here; see hand-off note below |

Deferred deliberately, not dropped: rules 1, 2, 3, 6 depend on there being a context to model
inside, which this session found there is not (pending the sibling skill's decision).

## Hand-off

- If `ddd-strategic-design` adopts the merge: the resolution invariant and read model above are
  ready-made input for a Design-Level session on **Session Facilitation** — they do not need
  re-elicitation, only re-modelling as commands/events/policies inside that context's flow,
  reconciled against its existing (currently `UNCONFIRMED`) event-stormed model.
- If it does not: this session's invariant and read-model content still stand as findings, and
  Question & Hot Spot Resolution's canvas would need this content folded in directly instead.
- Either way, the PRD gap (F08 has no resolve/close mechanic) needs a product decision before any
  code is written against it — recorded in `open-questions.md`.

## Provenance summary

| Marker | Count | What |
|---|---|---|
| `[storm]` | 5 | the hot-spot split, the resolution invariant (reference required), resolution is deliberate not automatic, Facilitation spans sessions, the scope call (under-specified not out-of-scope) |
| `[inferred]` | 2 | the seam-collapse finding, the propose/confirm pattern-match for how resolution fires |
| `[code]` | 1 | PRD F08's resolve-mechanic gap, disclosed with citations before any design proceeded |

No `[glossary]` or additional `[confirmed]` elements this session.