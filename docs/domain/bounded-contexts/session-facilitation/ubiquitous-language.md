---
workshop: design-level
scope: session-facilitation
status: draft
last_updated: 2026-08-27
digest: d71c2dcfc311
derived_from:
  - path: boards/eventstormer-big-picture.md
    digest: a1fe4f12aaba
    at: 2026-08-27
  - path: bounded-contexts/question-hot-spot-resolution/ubiquitous-language.md
    digest: d19c35cc15d4
    at: 2026-08-26
  - path: sessions/2026-08-26-design-level-session-facilitation.md
    digest: fa99635a3b22
    at: 2026-08-26
---
# Ubiquitous Language: Session Facilitation

> Design-Level pass 1 (2026-08-26): `Workshop`, invitations, resolution.
> Design-Level pass 2 (2026-08-27): the session runtime — `Session`/`Proposal`/`Resolution` as
> aggregates, the disposition lifecycle, deferred interpretation. Terms confirmed live through
> worked scenarios.

**Status:** draft • **Provenance:** `[storm]` unless noted

## Terms

| Term | Meaning in this context | Code name(s) / source (`file:line`) | Flags |
|---|---|---|---|
| Workshop | The persistent unit: one identity, bound to exactly one format for its whole life, can span many sessions and multiple people | UNCONFIRMED (no code yet) | participant's own term |
| Session | One sitting: bound to one workshop, started by the creator or an accepted invitee, ends at Session Closed (terminal — no reopen). An **aggregate** (pass 2), event-sourced: its stream is the session record | UNCONFIRMED | participant's own term |
| Session record | The `Session` aggregate's event stream — transcript turns, questions, interpretations, judgments, proposal references and dispositions, in order. What Derived Artifact Generation Flow B reads | UNCONFIRMED | pass 2 |
| Proposal | One pending model operation the facilitator offers for the expert's disposition. An **aggregate** (pass 2), one per proposal-worthy judgment | `boards/capture-loop.md` | resolved 2026-08-26; aggregate 2026-08-27 |
| Resolution | One pending hot-spot resolution (a hot-spot id + an untyped reference) for the expert's disposition. An **aggregate** (pass 2), separate from Proposal because their outcomes diverge | this session (pass 1); aggregate pass 2 | — |
| Disposition | A proposal's / resolution's lifecycle state: `PROPOSED` → `EDITED` → `ACCEPTED` (apply pending) → `APPLIED` \| `APPLY_FAILED` (Proposal only) \| `REJECTED` \| `LAPSED` | pass 2 | shared skeleton, code-level only |
| Apply-failed | A `Proposal` whose operation bounced at apply time (target withdrawn, cycle) — carries the reason, is re-editable and re-acceptable. At Session Closed an apply-failed proposal lapses **and** raises a hot spot (unfulfilled intent) | pass 2 | Proposal only — a Resolution bounce is always terminal |
| Lapsed | A proposal / resolution that reached a terminal non-outcome at Session Closed: undisposed (quiet) or apply-failed-and-not-retried (raises a hot spot). Distinct from `REJECTED` (the expert said no) | pass 2 | — |
| Operation Applied / Operation Rejected | Boundary Events from Domain Model Capture confirming (or bouncing) an accepted proposal's operation, keyed to the proposal id. Applied carries the resulting building block id | pass 2 | the apply-confirmation round trip |
| Deferred interpretation | A `Contribution Made` whose `Interpret Contribution` cannot run (AI Model Provider down) is queued and retried when a model returns. A contribution is interpreted **at most once** | pass 2 | idempotency keyed on contribution id |
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
| Workshop scope | A free-form statement of modelling intent for a `Workshop` — as-is, to-be, or a named area of the business. `Workshop` state, set once via `Set Scope` before or during the first session, **immutable** for the workshop's life. Every `Session` models against it. Changing scope means a new `Workshop` | UNCONFIRMED | pass 3; birth-fixed like `format` |
| Facilitation context | The composite read model the `Ask Question` policy reads **every turn** to pick the facilitator's next move: recent transcript + open questions + open hot spots + thin/unopened board regions + `Workshop.scope` + the frozen prior-session summary | UNCONFIRMED | pass 3; resolves `open-questions.md` #27 |
| Prior-session history | A workshop-scoped read model over the **closed** `Session` streams of the same `Workshop`. Each closed session's facilitation summary is frozen in its `Close Session` transaction and never changes | UNCONFIRMED | pass 3 |
| Facilitation agenda | A **derived** read model of follow-ups the facilitator must not lose: open questions ∪ building blocks that look like unexpanded phase names ∪ whether the stakeholder check is still pending. Not stored | UNCONFIRMED | pass 3 |
| Interview loop | How the facilitator runs a session: each turn it infers where it is in the (deliberately fluid) EventStorming method and picks a next move — ask the scope question, probe a phase name, chase an unopened region, run the stakeholder check, or guide a stuck expert | UNCONFIRMED | pass 3; `Ask Question` is this, not contribution-reactive |
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
  first step — it asks a question, reading `Facilitation context` (the workshop's scope, the live
  board and transcript, and a frozen summary of every prior session of this workshop).
- **Resolving a hot spot.** Any open hot spot — informational or model-affecting — can be resolved
  by a later contribution, in the same or a different session, possibly by a different person. The
  facilitator proposes the resolution; the domain expert must confirm it; a reference to what
  resolved it is always recorded. Rejecting a proposed resolution leaves the hot spot open,
  unaffected.

- **Disposing a proposal.** The expert edits the wording zero or more times, then accepts or
  rejects. On accept, the proposed operation is applied to the model by Domain Model Capture and
  the building block appears a moment later (eventual consistency — a UI animation covers the gap).
  If the operation bounces (its target was withdrawn, or it would now close a cycle), the proposal
  becomes *apply-failed*, carries the reason, and the expert can fix and re-accept it or reject it.

- **Closing a session.** `Close Session` stops new contributions and, in the same act, snapshots
  every still-open question. Each becomes a hot spot. Any apply-failed proposal also becomes a hot
  spot (the expert wanted it, the system couldn't deliver it); any proposal or resolution the
  expert simply never acted on lapses quietly. Accepted operations still in flight are allowed to
  finish after the close.

- **When the model provider is down.** A contribution is still captured — those are the expert's
  words. Its interpretation is queued and runs when a model (primary or fallback) returns; it is
  never interpreted twice.

- **Setting the scope.** Before or at the start of the first session, the facilitator proposes a
  scope statement and the creator accepts, edits, or rejects it — the same review shape as any
  proposal, but the result is `Workshop` state, not a model operation. Once set, it never changes;
  a different scope is a different workshop.

- **Asking the next question.** The facilitator runs an interview. Every turn it reads
  `Facilitation context` — the live board and transcript plus a frozen summary of every earlier
  session of this workshop — and decides its next move. On `Close Session`, this session's own
  summary is frozen into `Prior-session history` in the same act as the unresolved-question
  snapshot.

## Ambiguities & synonyms found (boundary / modelling signals)

| Word | Conflicting meanings / synonyms | Resolution |
|---|---|---|
| Proposal vs. Contribution | Both appeared to describe a pre-acceptance artifact | **Resolved 2026-08-26:** three distinct things at three distinct points — `Contribution` (raw) → `Contribution Interpreted` (the judgment, possibly multiple tracks) → `Building Block Proposed`/`Proposal Made` (one specific outcome). Not a boundary signal after all — just an underspecified sequence. |
| "Resolves a question" vs. "resolves a hot spot" | The predecessor Design-Level session (`sessions/2026-08-26-design-level.md`) named the resolution judgment `resolves-open-hot-spot-or-question` | **Resolved 2026-08-26, self-correction:** every `Question Asked` that outlives its own session is already swept into a `Hot Spot Raised` at close (existing invariant). The resolution mechanic can therefore only ever apply to Hot Spots — the "-or-question" case cannot occur. Judgment renamed `resolves-open-hot-spot`. |
| Proposal vs. Resolution | Both are "a pending facilitator suggestion awaiting the expert's yes/no", same lifecycle skeleton | **Kept distinct (pass 2, 2026-08-27):** two aggregates, not one. A proposal adds model content; a resolution flips a hot spot's status. Resolutions compete for one `Open` state; proposals don't. A proposal bounce is retryable; a resolution bounce is terminal. F08's informational/model-affecting split will add resolution-only payload rules. |
| PRD "session" vs. `Session` (this context) | PRD F01's "session" persists, is resumable by URL, survives being closed | **Named (pass 2):** PRD's "session" is closer to this context's `Workshop`. `Session` here is one sitting, and `CLOSED` is terminal. "Reopen where I left it" = start a new `Session` on the same `Workshop`. |

<!-- BEGIN lineage:index -->
<!-- END lineage:index -->