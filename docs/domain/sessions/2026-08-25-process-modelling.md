---
workshop: process-modelling
scope: capture-loop
status: draft
last_updated: 2026-08-25
digest: c527aa540f53
derived_from:
  - path: boards/capture-loop.md
    digest: fdf3ee7790ec
    at: 2026-08-25
---
# Session record — Process Modelling: the capture loop (2026-08-25)

## Entry

- Lineage `check` at entry found `open-questions.md` and `sessions/big-picture-context-map.md`
  stale against `boards/eventstormer-big-picture.md` and `context-map.md`. Investigated via
  `git log`/`git show`: the only intervening change was commit `6156357` (terminology alignment —
  Element → Building Block, Event → Domain Event), no semantic change. Dismissed with
  `domain_lineage.py ack`, not by re-running Big Picture.
- Scope offered as a choice between `Contribution Made → Hot Spot Raised` (narrower) and
  `Question Asked → Hot Spot Raised` (wider). Participant chose the wider scope.
- Harvested from `boards/eventstormer-big-picture.md` (capture-loop steps 5–14, the "Questions and
  their resolutions" section, the three named-but-unmodelled policies) and from
  `bounded-contexts/question-hot-spot-resolution/canvas.md` (context boundary: that context
  consumes three specific events and issues one command, does not own `Question Asked`/
  `Contribution Made`).

## Quality gate

Full review is in `boards/capture-loop.md`. Summary of dispositions:

- **Kept as-is:** `Question Asked`, `Contribution Made`, `Proposal Made`,
  `Contribution Attributed To Another Format`, `Proposal Edited`/`Accepted`/`Rejected`,
  `Knowledge Gap Revealed`, `Absent Stakeholder Named`, `Complete Perspective Confirmed`.
- **Split, justified:** `Domain Event Captured`/`Actor Identified`/`System Identified` — same
  cause, different downstream reactions per kind. Sanctioned exception to granularity-mismatch,
  not a smell.
- **Hot spot, not closed:** `Hot Spot Raised`'s single-event-with-payload shape. The participant
  named plausible future features that might need the cause distinguished (scheduling a session
  with an absent stakeholder), but explicitly declined to decide now, absent knowing what the
  resolution logic needs. Recorded as owned/undated, attributed to that explicit deferral, not
  invented as a decision.
- **New event, added this session:** `Contribution Interpreted`. First modelled as a direct
  fan-out with no intermediate event (reasoning: nothing reacts to "interpreted" in the abstract).
  The participant challenged this, pointing out a reactive design wants a stable event to fan out
  from so each downstream reaction can retry/fail independently. Corrected and kept — verified
  against the same "distinct consumer" test used for the sibling `Proposal Accepted` decision, so
  the two decisions now use one consistent rule rather than two different ones.
- **New event, added this session:** `Question Answered`. Surfaced by the participant's own
  example: an off-topic contribution can produce content outcomes (e.g. a Proposal) while leaving
  the specific pending Question unresolved. This forced separating "content judgments" from
  "question-resolving judgments" as two independent tracks on `Contribution Interpreted` — they had
  been silently conflated in the first draft.

## Commands, actors, systems

Full table in `boards/capture-loop.md`. One correction made on a whole-board audit (requested by
the participant after the Contribution Interpreted discussion): the Building Block creation
command was originally left generic ("Create Building Block"); split into
`Record Domain Event`/`Identify Actor`/`Identify System`/`Raise Hot Spot` to mirror the
already-kind-split events, for the same reason (independent failure/retry per kind).

## Policies and read models

Formalizes Big Picture open-questions.md #4's three named-but-unmodelled policy relationships,
plus the new `Interpret Contribution` and `Answer Question` policies this session added. All
policies in this process are automatic — no managed policy with a human owner appears in this
slice.

## Alternatives and exceptions

Happy path (Question Asked → Contribution Made → Interpret Contribution → Proposal Made → Accept
Proposal → kind-specific capture) completed first, per the WIP-limit-of-one rule. Alternatives
(Edit/Reject Proposal, Contribution Attributed To Another Format, Complete Perspective Confirmed)
and exceptions (Knowledge Gap Revealed, Absent Stakeholder Named, Session-Closed sweep) each
walked one at a time, none left half-modelled.

Confirmed directly: no timeout/deadline exists per question — the only checkpoint is
`Session Closed` itself, so this is a policy reacting to that event, not a time-driven event of
its own. Checked against this workshop's own guidance on "a thing that fails to happen" and
confirmed it does not apply here (there is no deadline to expire).

## Invariants

Four stated in `boards/capture-loop.md`. Invariant 2 was drafted wrong on the first pass (it
included `Proposal Accepted`/`Rejected`/`Contribution Attributed To Another Format` in the set of
events that exempt a question from the close-time sweep) and corrected in session once
`Question Answered` was introduced — this is the same insight that produced that event, applied
back to the invariant it had already been drafted against.

## Hot-spot scoreboard — every survivor accounted for

| Hot spot | Status |
|---|---|
| Three policy relationships (Big Picture open-questions.md #4) | Resolved — fully formalized |
| Auto-raise vs. confirm for policy-triggered Hot Spots | Resolved — auto-raise, no confirmation |
| Contribution routing: intermediate event or direct fan-out | Resolved — `Contribution Interpreted` added |
| Creation command granularity | Resolved — kind-specific |
| `Hot Spot Raised` payload/granularity | Owned, undated, attributed to participant's explicit deferral — revisit at Design-Level on Domain Model Capture |
| Question & Hot Spot Resolution canvas's `Events in` table omits Question Asked/Answered | New, unowned — flagged for Design-Level, not fixed here (canvas ownership is that workshop's call) |
| Which context executes `Answer Question` | New, unowned — Design-Level question |

## Acceptance tests

Five extracted once the model stabilized; see `acceptance-tests.md`. Test 5 added specifically to
cover the off-topic-answer case the participant raised — the model's correctness on this point had
no test before that exchange.

## Verification pass

Checked against `boards/eventstormer-big-picture.md` and
`bounded-contexts/question-hot-spot-resolution/canvas.md`: no claim in `boards/capture-loop.md`
contradicts either without being called out as a correction (the Invariant 2 correction and the
canvas gap are both named explicitly, not silently reconciled). Every event not carried unchanged
from the Big Picture board is tagged `[storm]` with the reasoning that produced it; nothing here
carries a `[code]` or `[inferred]` tag needing further human confirmation before use.

## Recommended next workshop

Design-Level on **Domain Model Capture** — it now has two concrete, named open questions waiting
for it (`Hot Spot Raised` payload shape; the aggregate boundary question already on record from
the strategic-design session), plus the newly surfaced canvas gap on
**Question & Hot Spot Resolution**. Either context could reasonably go first; Domain Model Capture
carries the heavier open-question load.