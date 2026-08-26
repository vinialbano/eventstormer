---
workshop: design-level
scope: session-facilitation
status: draft
last_updated: 2026-08-26
digest: 3ffac8ef6342
derived_from:
  - path: boards/eventstormer-big-picture.md
    digest: 568f97a816f3
    at: 2026-08-26
  - path: bounded-contexts/question-hot-spot-resolution/ubiquitous-language.md
    digest: d19c35cc15d4
    at: 2026-08-26
  - path: sessions/2026-08-26-design-level-session-facilitation.md
    digest: fa99635a3b22
    at: 2026-08-26
---
# Ubiquitous Language: Session Facilitation

> Design-Level pass (2026-08-26). Most terms below were confirmed live in this session through
> worked scenarios, replacing the "thin, Big-Picture-only" state this file was previously in.

**Status:** draft • **Provenance:** `[storm]` unless noted

## Terms

| Term | Meaning in this context | Code name(s) / source (`file:line`) | Flags |
|---|---|---|---|
| Workshop | The persistent unit: one identity, bound to exactly one format for its whole life, can span many sessions and multiple people | UNCONFIRMED (no code yet) | participant's own term |
| Session | One sitting: bound to exactly one workshop, started by the creator or an accepted invitee, ends at Session Closed | UNCONFIRMED | participant's own term |
| Facilitator | The AI actor that initiates Question Asked, Building Block Proposed, and Resolution Proposed, running on the AI Model Provider | UNCONFIRMED | role |
| Contribution | The domain expert's raw input — not yet interpreted | UNCONFIRMED | — |
| Contribution Interpreted | The facilitator's structured judgment of a Contribution; may carry multiple independent tracks (content judgments, a question-track judgment, or both) | `boards/capture-loop.md` | internal step, not itself called "Proposal" |
| Proposal / Proposal Made | Synonym for `Building Block Proposed` — one specific outcome of a Contribution Interpreted, when a judgment is proposal-worthy. **Resolved 2026-08-26:** not a synonym for the interpretation step itself; see Ambiguities below for how this was settled | `boards/capture-loop.md` | resolved this session |
| Resolution | The mechanic that closes an open Hot Spot: `Contribution Interpreted (judgment=resolves-open-hot-spot)` → `Resolution Proposed` → `Resolution Accepted`/`Resolution Rejected`, mirroring the Proposal/Accept/Reject shape exactly | new, this session | — |
| Question Asked | A generic event covering every facilitator question, regardless of what it's asking about | UNCONFIRMED | — |
| Hot Spot Raised | The single creation event for a Hot Spot Building Block, however it was triggered | `open-questions.md` #4 | `[from QHSR]` |
| Hot Spot Resolved | The event recording that a Hot Spot's resolution was accepted and a reference recorded | new, this session | mirrors Hot Spot Raised |
| Informational hot spot | A hot spot that doesn't affect the model (e.g. "this event is slow because of an external provider") — resolvable, but never required to be resolved | this session, refining `[from QHSR]`'s split | — |
| Model-affecting hot spot | A hot spot that closes an open question or fixes something in the workshop design itself — has a genuine "done" state, and generally does need resolving eventually, though nothing in the system enforces this | this session, refining `[from QHSR]`'s split | — |
| Absent Stakeholder Named | Trigger: a stakeholder who should be present is identified as missing | `[storm]` | policy trigger |
| Knowledge Gap Revealed | Trigger: the participant admits a gap in their own knowledge | `[storm]` | policy trigger |

## Behaviour (scenarios)

- **Starting a workshop.** A creator picks a format and starts the workshop in the same act — there
  is no separate "format selected" moment, and no way to change the format afterward. Wanting a
  different format means evolving into a new workshop (a separate, parked mechanic), not editing
  this one.
- **Inviting and joining.** Only the creator can invite (v1). An invitee accepts or declines; once
  accepted, they can start any number of sessions on that workshop, subject to the "one open
  session at a time" rule. Acceptance can later be revoked by the creator.
- **Starting a session.** Only the creator or a currently-accepted invitee may start one, and only
  if the workshop has no other session currently open. On start, the facilitator always takes the
  first step — it asks a question, informed by whatever context it has (the workshop's stated
  purpose, or the history of prior sessions if this one is a continuation).
- **Resolving a hot spot.** Any open hot spot — informational or model-affecting — can be resolved
  by a later contribution, in the same or a different session, possibly by a different person. The
  facilitator proposes the resolution; the domain expert must confirm it; a reference to what
  resolved it is always recorded. Rejecting a proposed resolution leaves the hot spot open,
  unaffected.

## Ambiguities & synonyms found (boundary / modelling signals)

| Word | Conflicting meanings / synonyms | Resolution |
|---|---|---|
| Proposal vs. Contribution | Both appeared to describe a pre-acceptance artifact | **Resolved 2026-08-26:** three distinct things at three distinct points — `Contribution` (raw) → `Contribution Interpreted` (the judgment, possibly multiple tracks) → `Building Block Proposed`/`Proposal Made` (one specific outcome). Not a boundary signal after all — just an underspecified sequence. |
| "Resolves a question" vs. "resolves a hot spot" | The predecessor Design-Level session (`sessions/2026-08-26-design-level.md`) named the resolution judgment `resolves-open-hot-spot-or-question` | **Resolved 2026-08-26, self-correction:** every `Question Asked` that outlives its own session is already swept into a `Hot Spot Raised` at close (existing invariant). The resolution mechanic can therefore only ever apply to Hot Spots — the "-or-question" case cannot occur. Judgment renamed `resolves-open-hot-spot`. |

<!-- BEGIN lineage:index -->
<!-- END lineage:index -->