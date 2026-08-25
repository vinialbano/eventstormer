---
workshop: big-picture
scope: eventstormer-session
status: draft
last_updated: 2026-08-25
digest: 8a880b8aed25
derived_from:
  - path: boards/eventstormer-big-picture.md
    digest: 7388877c76ab
    at: 2026-08-25
  - path: context-map.md
    digest: cbd6e95ca6c5
    at: 2026-08-25
---
# Open questions — EventStormer Big Picture

Hot spots, binding constraints, and the policy relationships this session found but could not
model (Policy is not in play in Big Picture). Per this skill's rule: no owner or date is invented
here that the participant didn't give — most of these are unowned and undated, and that is
recorded as the honest state, not filled in.

## Hot spots

1. **Format-selection gap.** "Workshop Format Selected" is on the board as a forward-looking event
   for the whole business line, but v1 hardcodes Big Picture — there is no format-selection step
   in the shipped product today. Unowned, undated.

2. **PRD self-inconsistency on `restore`.** F01's operation-log kind list
   (`create, rename, relate, unrelate, place, unplace, mark pivotal, archive, set scope, set
   stakeholder answer, set chosen problem`) omits `restore`, while F06 states outright: "Archive an
   element, and restore an archived one." The PRD disagrees with itself; not something this session
   resolves. Unowned, undated.

3. **Reinstatement conflict rule undefined.** The participant decided that withdrawing an
   Event/Actor/System/Hot Spot severs its connections, and that reinstating requires re-validating
   the old relations against the board's current state (a stale position, or a `follows` chain that
   would now cycle, are both possible). The PRD defines no resolution rule for what happens when
   that re-validation fails. Named as belonging to a deeper session on F06 (Process Modelling or
   Design-Level). Unowned, undated.

4. **Three policy relationships found, not modelled here** (Policy is out of play in Big Picture;
   named precisely enough for Process Modelling on "the capture loop" to formalize):
   - When Absent Stakeholder Named → Hot Spot Raised
   - When Knowledge Gap Revealed → Hot Spot Raised
   - When Session Closed and a Question Asked has no resolving event → Hot Spot Raised

5. **This session's own hard limit.** Per this skill's own stance: a solo participant means genuine
   inter-participant disagreement was never available here. No absent stakeholder was named for
   *this* board itself (the participant is the sole domain expert for EventStormer's own business
   line) — but the gap is recorded rather than silently accepted, consistent with the method's own
   prescription for an absent perspective.

6. **No as-is/to-be distinction.** Per the avanscoperta Big Picture Facilitator's Handbook (starter
   kit, read 2026-08-25): *"Big Picture works very well in as-is and to-be scenarios. The workshop
   dynamics are very different."* Neither this board nor the PRD's opening scope question (F04:
   "what business are we mapping") distinguishes whether a session describes how the business
   works **today** or how the participant **wants** it to work. That's a real, consequential fork
   the method itself treats as changing workshop dynamics, and EventStormer's current design is
   silent on it. Unowned, undated.

## Candidate seams (derived in close-out — `[inferred]`, mirrored from `context-map.md`)

Nobody said these; they were derived from the board after the exit gate, from four of six
available heuristics (people-in-the-room and body language were unavailable). Full evidence is in
`context-map.md`.

- Session Lifecycle vs. Modeling Capture (business phases / pivotal events)
- Facilitation vs. Artifact Consumption (people on the paper roll)
- Question & Hot Spot Resolution (swimlane — runs on its own clock)

## Declined capabilities (not hot spots — deliberate non-goals, kept visible with their reasons)

- Browser's built-in speech recognition — privacy grounds, audio must stay on-device.
- Compatibility with any external documentation toolchain — v1 makes no such claim.

## Binding constraints

- **Audio never leaves the device** — checked directly with the participant: **not a hard
  constraint**, just today's design preference. Recorded as such rather than as binding, since the
  participant was explicit about this.

## Discovered purpose (not an Impact Map — that belongs to `ddd-strategic-design`)

`[storm]`: *"The purpose of EventStormer is to help in the adoption of EventStorming and in domain
modeling in general."* Recorded as the participant's own words; not elaborated into goals/impacts
here.

## Raised in the ddd-strategic-design session (2026-08-25) — additive, phases 01–07

7. **Proposal vs. Contribution, in Session Facilitation.** The board uses both terms for what
   looks like the same pre-acceptance artifact, without a scenario that clearly separates them.
   Needs a worked example with the participant. See
   `bounded-contexts/session-facilitation/ubiquitous-language.md`.

8. **Domain Model Capture's aggregate boundary is unconfirmed.** Candidate: one Building Block, or
   the whole board — this decides how the reinstatement re-validation rule (item 3 above) actually
   gets enforced. Needs a Design-Level pass. See `bounded-contexts/domain-model-capture/canvas.md`.

9. **Derived Artifact Generation: on-demand vs. materialized export.** Whether F10's export is
   computed on request or kept live as a materialized view is undecided, and changes this
   context's event-stormed model shape (whether it has any Events in at all). See
   `bounded-contexts/derived-artifact-generation/canvas.md`.

10. **Multiplayer / Real-time Collaboration's classification is provisional.** Catalogued as one
    Core row for now; likely splits into a Generic real-time-sync-infra part (buy) and a Core
    graph-conflict-resolution-semantics part once it's actually scoped for design. See
    `subdomain-catalog.md`.

11. **All four v1 contexts' event-stormed models (Commands/Events/Policies/Queries) are
    deferred.** This session confirmed boundaries, subdomain types, and the context map; per-context
    Process Modelling or Design-Level EventStorming is the natural next step. Question & Hot Spot
    Resolution is the most fully-specified candidate to storm first (its three policies are
    already named precisely).

12. **Umbrella term for "any of the four kinds" settled: Building Block.** Resolved live in this
    session, worth recording because of how it went: this session's own first drafts used
    "element" as the generic umbrella — an accidental reintroduction of the PRD term the storm had
    already rejected. The participant caught it, proposed alternatives ("Sticky Note," "Building
    Block," "Notation," "Concept," "Grammar"), and "Building Block" was confirmed after checking
    Alberto Brandolini's own *Introducing EventStorming* (ch. 19, "Building Blocks – 20%"; ch. 14,
    "Process Modeling Building Blocks – 90%"), which uses it for exactly this. "Sticky Note" was
    considered and not used — it's the same umbrella the board had already rejected
    (`boards/eventstormer-big-picture.md:166`) as misleading for typed artifacts with different
    responsibilities; that earlier call stands, unreversed. See
    `bounded-contexts/domain-model-capture/ubiquitous-language.md` for the confirmed term.

## Deliberate deviations, recorded rather than silent

- **Granularity.** Big Picture's default is coarse; this board went fine-grained (every kind gets
  its own name for every lifecycle stage) by the participant's explicit choice when asked, not by
  drift. No Command/Policy/Read Model/Aggregate was added structurally.
- **Pivotal events reduced from five to four.** The original draft candidates (Stakeholder Check
  Answered, Derived Artifacts Exported) were both dropped during the quality gate; the participant
  was asked whether to nominate a fifth pivotal event and declined, so four stands: Session Started,
  Domain Problem Stated, Session Closed, Chosen Problem Named/Skipped.