---
workshop: big-picture
scope: eventstormer-session
status: draft
last_updated: 2026-08-25
digest: 7388877c76ab
---
# Board — EventStormer: running a facilitated session (Big Picture)

**Scope.** The whole business line of EventStormer itself: a domain expert running one facilitated
EventStorming session with the AI facilitator, from opening the session to closing it. Scoped by
the human at the start of this session (not narrowed further).

**Participants.** One: the product owner (solo). This workshop's own hard limit applies — one
person means no genuine inter-participant disagreement was available. Perspectives not in this
room are recorded in `open-questions.md` rather than invented.

**Provenance key.** `[storm]` — the participant's own words or an explicit decision they made in
session. `[glossary]` — drawn from `docs/product/PRD.md`, then explicitly confirmed by the
participant before landing here (nothing below is `[glossary]` without that confirmation; PRD text
that was *not* confirmed, or that turned out to conflict with the discovered model, is called out
separately below and in `open-questions.md`).

**Deliberate granularity note.** Big Picture is normally coarse — breadth over depth. This board is
finer than that default: every Building Block kind (Domain Event / Actor / System / Hot Spot) got its own name
for every lifecycle stage, rather than collapsing them under a generic term. This was a deliberate
choice by the participant, made explicitly when asked, not a drift into Process-Modelling depth —
no Command, Policy, Read Model or Aggregate was added structurally; only Domain Event/Actor/System/Hot
Spot are used, per this format's own legend.

---

## Timeline

### Framing

1. **Workshop Format Selected** `[storm]` — forward-looking; v1 hardcodes Big Picture, so this
   event doesn't happen yet in the shipped product. See `open-questions.md`.
2. **Session Started** `[glossary]`
3. **Question Asked** `[glossary]` — generic; every facilitator question uses this same event,
   including the scope question below. See "Questions and their resolutions."
4. **Domain Problem Stated** `[storm]` *(pivotal)* — the participant's own words for the opening
   scope answer. Sets the whole session's scope (`set scope` operation); kept as its own name
   rather than a generic "Question Answered" because of that unique downstream weight.

### Capture loop (repeats for the length of the session)

5. **Contribution Made** `[glossary]` — was "Transcript Segment Submitted"; renamed off a named
   smell in this skill's own catalog ("Data-availability pseudo-events... `Form Submitted`").
6. **Proposal Made** `[glossary]` — the facilitator proposes a Building Block of some kind. Not yet a
   Domain Event/Actor/System/Hot Spot; a proposal is its own artifact (PRD F04) until accepted.
7. **Contribution Attributed To Another Format** `[glossary]` — was "Facilitator Deferred To
   Deeper Session." Sibling outcome to Proposal Made, not a state of a question: the content
   described a Command, Policy, Read Model or Aggregate, which belongs to Process Modelling or
   Design-Level rather than this format's grammar.
8. **Proposal Edited** `[glossary]` — repeatable, zero or more times, before disposition. Distinct
   from Building Block Reworded below: this changes a *pending proposal* (including its proposed kind);
   Reworded changes an *existing* Building Block's label only, kind fixed.
9. **Proposal Accepted** `[glossary]`
10. **Proposal Rejected** `[glossary]`
11. **Domain Event Captured** `[glossary]` — consequence of Proposal Accepted, when the accepted kind is
    a Domain Event.
12. **Actor Identified** `[glossary]` — same, for Actor.
13. **System Identified** `[glossary]` — same, for System.
14. **Hot Spot Raised** `[glossary]` — the single creation event for the Hot Spot kind, regardless
    of what caused it (see "Questions and their resolutions" — several other events lead here via
    a policy relationship that Big Picture can only point at, not model).

### Positioning

| Kind | Forward | Reverse |
|---|---|---|
| Domain Event | **Domain Event Sequenced** `[glossary]` — a `follows` edge to another event | **Domain Event Unsequenced** `[glossary]` |
| Actor | **Actor Linked To The Domain Event It Caused** `[glossary]` — a `causedBy` edge | **Actor Unlinked** `[glossary]` |
| System | **System Linked To The Domain Event It Caused** `[glossary]` | **System Unlinked** `[glossary]` |

Position itself is never authored, only derived from these relations (PRD F02: "A building block's
place on screen is computed from its relations"). Hot Spots are never placed — no positioning pair exists
for that kind.

### Editing existing Building Blocks

| Kind | Reworded | Withdrawn | Reinstated |
|---|---|---|---|
| Domain Event | Domain Event Reworded | Domain Event Withdrawn | Domain Event Reinstated |
| Actor | Actor Reworded | Actor Withdrawn | Actor Reinstated |
| System | System Reworded | System Withdrawn | System Reinstated |
| Hot Spot | Hot Spot Reworded | Hot Spot Withdrawn | Hot Spot Reinstated |

All twelve `[glossary]`. Deliberately kind-specific rather than a generic "Element ___" — see
"Language" below for why.

**Withdrawn, precisely** `[storm]`: withdrawing a Domain Event/Actor/System/Hot Spot severs its
connections — it is no longer part of the board. History is kept so it can be reinstated later,
but reinstating does not blindly restore the old position: the board may have moved on while the
Building Block was gone (reordering, new Building Blocks, a `follows` chain that would now cycle), so
reinstatement needs to re-validate the old relations against the board's current state before
reapplying them. **The PRD defines no resolution rule for this conflict case** — see
`open-questions.md`.

- **Domain Event Marked Pivotal** `[glossary]` / **Domain Event Unmarked Pivotal** `[glossary]` — Domain Event only;
  marks are provisional and removable at any time.

### Questions and their resolutions

**Question Asked** `[glossary]` is fully generic — the same event whether it's the opening scope
question, the closing stakeholder check, or an ad hoc clarifying question. What differs is the
*resolution*, and only when a resolution has a distinct downstream consequence does it get its own
name (the same test used throughout this board: does something different happen next?).

- **Domain Problem Stated** — see Framing above. Sets scope.
- **Knowledge Gap Revealed** `[glossary]` — the participant answered, but the content itself is an
  admission of uncertainty ("nobody knows this yet"). This *is* a resolution — the question is not
  left open — and it is what triggers a Hot Spot Raised via a policy relationship out of scope
  here.
- **Absent Stakeholder Named** `[glossary]` — repeatable, one per person named when the answer to
  the stakeholder-check question is "somebody." Also triggers Hot Spot Raised via policy.
- **Complete Perspective Confirmed** `[glossary]` — the "nobody else" branch of the same question.
  Tests whether this one narrator's account is the whole picture of the domain or whether a
  different perspective would tell it differently. Kept as its own event (not folded into a plain
  answer) because it sets a stored value — the chosen problem's qualification — that appears in
  every derived artifact from then on, the same way Domain Problem Stated does.
- A plain, inconsequential answer is **not** its own event. It is simply a Contribution Made that
  references the question it addressed — a relation, not a new fact, because nothing downstream
  reacts differently to it. (Considered and dropped: "Question Answered.")

**Three policy relationships found but not modelled here** (Policy is not in play in Big Picture):

- When Absent Stakeholder Named → Hot Spot Raised
- When Knowledge Gap Revealed → Hot Spot Raised
- When Session Closed and a Question Asked has no resolving event → Hot Spot Raised

These are real relationships this session found, named precisely enough for a Process Modelling
pass on "the capture loop" to formalize as actual `When [event], then [action]` policies.

### Close

30. **Session Closed** `[glossary]` *(pivotal)* — the boundary that makes "still unresolved"
    checkable at all; not in the original five-pivotal draft, added once the hot-spot policy
    analysis needed a checkable boundary.
31. **Chosen Problem Named** `[glossary]` *(pivotal)*
32. **Chosen Problem Skipped** `[glossary]` *(pivotal)* — with reason recorded (no problem chosen,
    or no real impediments yet).

**Pivotal events (four, provisional):** Session Started, Domain Problem Stated, Session Closed,
Chosen Problem Named/Skipped. The original five-candidate draft named Stakeholder Check Answered
and Derived Artifacts Exported as the third and fifth; both were dropped during the quality gate
(see below), leaving four. The participant was asked whether to nominate a fifth and did not; four
stands.

---

## Dropped during the quality gate

Each of these was considered, argued through, and rejected — kept here so the reasoning survives,
per this skill's own rule that a session record must show verified claims, not just conclusions.

| Considered | Why dropped |
|---|---|
| Session Resumed | Query-like: reopening a session replays the log and renders the current snapshot; nothing becomes true that wasn't true before. |
| Derived Artifacts Exported | Same test as above: no operation in F01's log records a download; artifacts "regenerate on every applied operation" and are read-only. |
| Unanswered Question Became Hot Spot | Not its own event — collapses into Hot Spot Raised, preceded by the third policy relationship above. |
| Stakeholder Check Answered | Not its own wrapper event — its two real outcomes (Complete Perspective Confirmed / Absent Stakeholder Named) already exist and carry the actual consequences. |
| Question Answered (plain) | No distinct downstream consequence found; collapses into Contribution Made referencing the question it resolved. |
| Element Proposed By Facilitator / Element Reworded / etc. (the original "Element" umbrella) | "Element" is not EventStorming vocabulary — it's this PRD's own implementation term. Replaced by kind-specific names throughout (see Language). |
| "Sticky" as the umbrella term | Considered and reversed by the participant: these are typed artifacts with different responsibilities (Domain Event, Actor, System, Hot Spot, and later Command/Aggregate); a physical-note metaphor for the whole set is misleading for this particular business line. |

---

## Actors and systems

- **Domain Expert** `[glossary]` — the author; solo in v1 (multi-participant collaboration is a
  later feature, out of scope for this session's flow).
- **Facilitator** `[glossary]` — the initiating actor for Question Asked and Proposal Made; runs on
  the AI Model Provider system.
- **Absent Stakeholder(s)** `[glossary]` — named via Absent Stakeholder Named; a person whose
  perspective would tell the story differently and wasn't heard.
- **Engineer** `[glossary]` — silent in the session itself (the editable working surface is out of
  v1 scope) but the downstream reader of every derived artifact; the whole product exists for them.
- **AI Model Provider** `[storm]` — Anthropic/OpenAI/Google, whichever backs the facilitator. The
  one external system this business line depends on today. PRD F04 names its own failure mode
  explicitly: unavailable → the person is told, the model stays fully editable by hand.
- **On-device speech-to-text model** `[glossary]` — not yet built (F17); different risk shape from
  the model provider (local, not networked, but still an outside dependency: a one-time download,
  a specific model, hardware assumptions).

Confirmed complete by the participant — no further actor or system named.

## Declined capabilities (with their reasons)

- **Browser's built-in speech recognition** — rejected on privacy grounds: every shipping
  implementation streams audio to the browser vendor, and the product's input is literally a
  description of how a company operates.
- **Compatibility with any external documentation toolchain** — v1 makes no such claim; the export
  is EventStormer's own model.

## Language (divergences, not a glossary — see `open-questions.md` for the full findings)

- **"Element"/"Node" vs. kind-specific naming** — the PRD's implementation vocabulary ("node
  record," "element") is not EventStorming's vocabulary. This board uses Domain Event/Actor/System/Hot
  Spot throughout instead, including for lifecycle stages the PRD itself describes generically.
- **"Rename" vs. "Reworded"** — the PRD's own operation-log kind is literally `rename`, but this
  board uses "Reworded" for the post-creation label correction, because the underlying identity
  (the id) never changes — only the articulation of an already-recognized fact does. The
  PRD's own word doesn't describe the dynamic even though it's the PRD's own term.
- **"Recorded" vs. "Raised"/"Named"/"Flagged"** — the PRD's F08 prose uses "records"/"is recorded,"
  which reads as a persistence-mechanics word (a caught smell). This board uses the more active
  "Raised," "Named," and equivalent verbs instead.