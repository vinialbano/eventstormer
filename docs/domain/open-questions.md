---
workshop: big-picture
scope: eventstormer-session
status: draft
last_updated: 2026-08-25
digest: 49ad71b79610
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

## Deliberate deviations, recorded rather than silent

- **Granularity.** Big Picture's default is coarse; this board went fine-grained (every kind gets
  its own name for every lifecycle stage) by the participant's explicit choice when asked, not by
  drift. No Command/Policy/Read Model/Aggregate was added structurally.
- **Pivotal events reduced from five to four.** The original draft candidates (Stakeholder Check
  Answered, Derived Artifacts Exported) were both dropped during the quality gate; the participant
  was asked whether to nominate a fifth pivotal event and declined, so four stands: Session Started,
  Domain Problem Stated, Session Closed, Chosen Problem Named/Skipped.