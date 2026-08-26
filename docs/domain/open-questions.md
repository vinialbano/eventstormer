---
workshop: ddd-strategic-design
scope: eventstormer-session
status: draft
last_updated: 2026-08-26
digest: 401ba0ab793e
derived_from:
  - path: boards/eventstormer-big-picture.md
    digest: 568f97a816f3
    at: 2026-08-26
  - path: context-map.md
    digest: 94f3014c1877
    at: 2026-08-26
  - path: sessions/2026-08-26-design-level.md
    digest: a199731d351c
    at: 2026-08-26
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

2. **PRD self-inconsistency on `restore`.** ~~F01's operation-log kind list (`create, rename,
   relate, unrelate, place, unplace, mark pivotal, archive, set scope, set stakeholder answer, set
   chosen problem`) omits `restore`, while F06 states outright: "Archive an element, and restore an
   archived one." The PRD disagrees with itself; not something this session resolves.~~ **Resolved
   2026-08-25**, as a side effect of the PRD terminology-alignment pass (Building Block, Reworded,
   Withdrawn/Reinstated): F01's operation list now reads `create, reword, relate, unrelate, place,
   unplace, mark pivotal, withdraw, reinstate, set scope, set stakeholder answer, set chosen
   problem`, matching F06's "Withdraw a building block, and reinstate a withdrawn one" exactly.

3. **Reinstatement conflict rule undefined.** The participant decided that withdrawing a
   Domain Event/Actor/System/Hot Spot severs its connections, and that reinstating requires re-validating
   the old relations against the board's current state (a stale position, or a `follows` chain that
   would now cycle, are both possible). The PRD defines no resolution rule for what happens when
   that re-validation fails. Named as belonging to a deeper session on F06 (Process Modelling or
   Design-Level). Unowned, undated.

4. ~~**Three policy relationships found, not modelled here** (Policy is out of play in Big Picture;
   named precisely enough for Process Modelling on "the capture loop" to formalize):
   - When Absent Stakeholder Named → Hot Spot Raised
   - When Knowledge Gap Revealed → Hot Spot Raised
   - When Session Closed and a Question Asked has no resolving event → Hot Spot Raised~~
   **Resolved 2026-08-25** by Process Modelling on "the capture loop." All three formalized as
   automatic policies, plus two more the session discovered along the way (`Interpret
   Contribution`, `Answer Question`). Full model in `boards/capture-loop.md`; session record in
   `sessions/2026-08-25-process-modelling.md`.

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

## Raised in the Process Modelling session (2026-08-25) — "the capture loop"

13. **`Hot Spot Raised`'s payload/granularity is undecided, not just deferred to design.** The
    participant named plausible future features that would need to distinguish *why* a hot spot
    was raised (e.g., scheduling a session with a named absent stakeholder), but explicitly
    declined to commit to a shape now, absent knowing what the hot-spot resolution logic will
    actually need. Attributed to that explicit deferral — not unowned by omission. **Partially
    informed 2026-08-26** by the Design-Level session's #18/#19 findings (the informational/
    model-affecting split, and the required-reference invariant) — still not fully settled; revisit
    at Design-Level on Domain Model Capture, when the resolution logic itself gets designed. See
    `boards/capture-loop.md`.

14. ~~**`Question & Hot Spot Resolution`'s canvas `Events in` table omits `Question Asked` /
    `Question Answered`.**~~ **Moot, 2026-08-26** — #17's seam-collapse was adopted; the canvas
    itself is retired rather than fixed.

15. ~~**Which context/system executes `Answer Question` is UNCONFIRMED.**~~ **Answered, then
    dissolved, 2026-08-26.** The participant's answer (Session Facilitation) was the opening
    question of the Design-Level session and turned out to unravel the whole boundary, not just
    this one command — see #17. #17 was adopted, so the question dissolves: everything is
    Facilitation's.

16. ~~**Lineage tool gap: 28 `derived_from` edges predate consistent digest use.** Discovered this
    session running `domain_lineage.py index` after writing this workshop's artifacts:
    `README.md`, `context-map.md`, `subdomain-catalog.md`, `domain-and-goals.md`, and every
    bounded-context `canvas.md`/`ubiquitous-language.md` carry at least one `derived_from` edge
    with no `digest` field. `stamp`/`link` crash (`KeyError: 'digest'`) on any of these files;
    `index` silently drops them from the rendered table instead of crashing, which is how 16
    tracked artifacts became 8 in `README.md`'s lineage index with no content actually missing —
    only the auto-generated table shrank. Not hand-patched: authoring a digest is exactly what
    this skill's lineage rule forbids doing by hand. Unowned, undated — needs either a script fix
    (a repair subcommand, or tolerate missing-digest edges without dropping the artifact) or a
    one-time manual `link --from` pass per broken edge, run by whoever next touches those files.~~
    **Resolved 2026-08-26.** Root cause turned out to be two-fold: (1) `_render()` serializes
    every edge in a file at once and crashes on any missing `digest`/`at`, so `link`/`stamp` could
    never repair one broken edge in a file that had several — the first successful repair still
    crashed on its still-broken siblings; (2) eight `bounded-contexts/*` files carried
    file-relative edge paths (`../../subdomain-catalog.md`) instead of the root-relative form
    `link` always writes, because those edges were hand-authored during the `ddd-strategic-design`
    session rather than run through this tool. Fixed with a one-time script that computed each
    missing digest via the tool's own `body_digest()` against content already on disk (not
    invented) and normalized every file-relative path to root-relative, then wrote each file once.
    `check` now reports 0 stale, 0 dangling, 0 unparseable across all 19 tracked artifacts.
    The underlying script bug (`_render` crashing on unrelated broken edges instead of reporting
    and skipping them, the way `check`'s `_edge_problems` already does) is unfixed — it lives in
    the shared `anoria-planning:eventstorming` skill, not this repo, so it wasn't patched here.
    Still worth reporting upstream if it recurs.

## Raised in the Design-Level session (2026-08-26) — Question & Hot Spot Resolution

17. ~~**Candidate seam collapse: Question & Hot Spot Resolution folds into Session Facilitation.**~~
    **Decided — adopted, 2026-08-26.** Tested against the evidence this session gathered
    (detection already executes inside Facilitation's policies; the resolution capability designed
    this session matches Facilitation's existing `Interpret Contribution` shape; Facilitation's own
    model already spans sessions, removing the "own pace" rationale that originally justified
    separateness). Full evidence in `sessions/2026-08-26-design-level.md`; the decision record is
    in `context-map.md`'s "Decision" section. Question & Hot Spot Resolution is retired as a
    bounded context; its canvas is preserved, marked superseded, at
    `bounded-contexts/question-hot-spot-resolution/canvas.md`; its surviving content is merged into
    `bounded-contexts/session-facilitation/canvas.md`. `subdomain-catalog.md` updated to match.

18. **Two kinds of hot spot, previously undifferentiated in the PRD.** Informational/pain-point
    hot spots (e.g. "this event is slow because of an external provider") don't affect the model
    and need no resolution — already consistent with F08's "annotating nothing is valid" stance.
    Model-affecting hot spots close an open question or fix something in the workshop design, and
    do have a genuine "done" state. `[storm]`, confirmed by the participant 2026-08-26. Whether
    F08 needs updating to name this split explicitly is a product decision, not decided here.
    Unowned, undated.

19. **Hot spot/question resolution is entirely unspecified in the PRD, and now has a candidate
    shape.** F08 defines creation, annotation, and counting, but no resolve/close operation — the
    "resolvable" language at PRD line 693 is never cashed into a command or event, and F01's
    operation-log kind list has no `resolve` verb. `[code]`, disclosed to the participant before
    design proceeded. This session elicited a candidate: resolution is a **deliberate, confirmed
    act** (not automatic, mirroring `Building Block Proposed → Accept Proposal` rather than the
    auto-raise policies), and it **must carry a recorded reference to what resolved it** — deliberately
    untyped (a note, a link, a building block, or anything else). `[storm]`. **#17 is now decided
    (adopted)** — this lives in Session Facilitation's event-stormed model (see its canvas'
    Policies table). Still needs a PRD update (F08, and F01's operation-log kind list); unowned as
    a next action, undated.

20. ~~**This session's edits to `context-map.md` and `open-questions.md` left 10 artifacts stale**~~
    **Resolved, 2026-08-26.** #17 was adopted and every affected artifact was refreshed together in
    the same session that decided it: `subdomain-catalog.md`, both `bounded-contexts/session-
    facilitation/{canvas,ubiquitous-language}.md`, the retired `bounded-contexts/question-hot-spot-
    resolution/{canvas,ubiquitous-language}.md`, `context-map.md`, and this file. Re-run
    `domain_lineage.py stamp`/`link`/`check`/`index` after this edit to confirm no staleness
    remains.

## Deliberate deviations, recorded rather than silent

- **Granularity.** Big Picture's default is coarse; this board went fine-grained (every kind gets
  its own name for every lifecycle stage) by the participant's explicit choice when asked, not by
  drift. No Command/Policy/Read Model/Aggregate was added structurally.
- **Pivotal events reduced from five to four.** The original draft candidates (Stakeholder Check
  Answered, Derived Artifacts Exported) were both dropped during the quality gate; the participant
  was asked whether to nominate a fifth pivotal event and declined, so four stands: Session Started,
  Domain Problem Stated, Session Closed, Chosen Problem Named/Skipped.