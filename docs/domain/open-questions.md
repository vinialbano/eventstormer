---
workshop: design-level
scope: session-facilitation
status: draft
last_updated: 2026-08-27
digest: 084867d98992
derived_from:
  - path: boards/eventstormer-big-picture.md
    digest: a1fe4f12aaba
    at: 2026-08-26
  - path: bounded-contexts/domain-model-capture/canvas.md
    digest: 705129af8f2d
    at: 2026-08-27
  - path: bounded-contexts/session-facilitation/canvas.md
    digest: 192d89ca4269
    at: 2026-08-27
  - path: context-map.md
    digest: d4fd9c957b26
    at: 2026-08-27
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

3. ~~**Reinstatement conflict rule undefined.**~~ **Dissolved 2026-08-26**, Design-Level on Domain
   Model Capture. `Reinstate` never restores relations — a reinstated Building Block always lands
   unplaced and unrelated, identical in shape to a fresh one. There is no conflict case left to
   have a resolution rule for; old relations may be surfaced as UI hints, but that's a
   facilitation concern, not a `Board` invariant. Full reasoning in
   `sessions/2026-08-26-design-level-domain-model-capture.md`.

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

8. ~~**Domain Model Capture's aggregate boundary is unconfirmed.**~~ **Resolved 2026-08-26, then
   corrected same-day.** First pass: `Board`, one aggregate for the whole workshop's graph. The
   participant challenged this directly — most operations (Reword, `causedBy`, annotation) have no
   invariant reaching outside one or two records, so lumping them into one boundary was a
   mis-derivation, not a conservative default. Corrected to four Building Block aggregates (Domain
   Event, Actor, System, Hot Spot — each protecting only its own local state) plus `Timeline`, one
   per **connected component** of sequenced events, sized to exactly what the no-cycle invariant
   needs. See `bounded-contexts/domain-model-capture/canvas.md`.

9. ~~**Derived Artifact Generation: on-demand vs. materialized export.**~~ **Resolved 2026-08-27**,
   Design-Level on Derived Artifact Generation. **On-demand only** — every artifact is generated
   when requested and nothing exists between requests; real-time regeneration was judged "a waste
   of time." A **readable-account preview** persists as an eventually-consistent read model that is
   allowed to be stale and carries a "model changed since rendered" signal. Consequence: this
   context has **no Events in** required for correctness. Full model in
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

13. ~~**`Hot Spot Raised`'s payload/granularity is undecided, not just deferred to design.**~~
    **Mostly resolved 2026-08-26**, Design-Level on Domain Model Capture. Payload direction agreed:
    kind (informational/model-affecting), trigger (content/absent-stakeholder/knowledge-gap/
    unresolved-question), annotation target. **One field stays genuinely open** — whether `kind`
    itself is worth storing — the participant is explicitly unsure, not merely deferring. See #32.

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

## Raised in the Design-Level session (2026-08-26) — Session Facilitation

21. ~~**Format-selection gap** (item #1, above).~~ **Resolved 2026-08-26.** `Start Workshop` fixes
    the format at workshop creation; no command changes it afterward. Full model in
    `bounded-contexts/session-facilitation/canvas.md`.

22. ~~**Proposal vs. Contribution, in Session Facilitation** (item #7, above).~~ **Resolved
    2026-08-26.** Three distinct things at three distinct points, not two names for one:
    `Contribution` (raw) → `Contribution Interpreted` (the facilitator's judgment) →
    `Building Block Proposed`/`Proposal Made` (one specific outcome). See
    `bounded-contexts/session-facilitation/ubiquitous-language.md`.

23. ~~**Big Picture's pivotal-event scoping is superseded.**~~ **Resolved 2026-08-26**, by resuming
    the Big Picture workshop itself (the board is `draft`, so update-in-place applied, per this
    skill's own resume rule — this is not the "re-scaling another workshop's board" case, since Big
    Picture is editing its own artifact). The participant clarified live: `Session Started`
    conflated two scopes. Split into `Workshop Started` (folds the former "Workshop Format
    Selected" candidate; once per workshop, fixes the format) and `Session Started` (repeatable;
    once per session, only after `Domain Problem Stated` has set the workshop's scope — a workshop
    determines what it's about before any session runs). `Domain Problem Stated` and `Chosen
    Problem Named/Skipped` remain workshop-scoped as this item originally found; `Session Closed`
    stays session-scoped, unaffected. Full model in `boards/eventstormer-big-picture.md`; session
    record in `sessions/2026-08-26-big-picture.md`.

24. **Two new structural concepts, `Workshop` and `Session`, replace the earlier undifferentiated
    "session."** `Workshop` persists, is bound to exactly one format for its life, and can span
    many sessions and multiple people; `Session` is one sitting. Full model, including the
    `Workshop` aggregate's invariants and state machine, in
    `bounded-contexts/session-facilitation/canvas.md`.

25. **Parked as future-feature ideas, not modelled:** invitation expiry (duration undecided, "the
    user can set it or leave it unexpirable — doesn't matter much for v1"); broader invite
    permissions ("any member can invite," not just the creator); archiving or locking a workshop
    once "a good shape is found." All three surfaced during this session and were deliberately not
    designed against. Unowned, undated.

26. **Concurrent multi-person sessions are deliberately unsolved for v1.** "At most one open session
    per workshop" is the v1 rule — the participant's own reasoning is that concurrent sessions,
    even by different people, risk corrupting the workshop's state, and this needs to be thought
    through more deeply once Multiplayer/Real-time Collaboration is actually scoped. Ties directly
    to item #10, above — not a new independent question, but sharpens it with a concrete
    consistency concern to resolve when that scoping happens.

27. ~~**The context a facilitator gathers before asking its first (or next) question is
    unspecified beyond "whatever context it has."**~~ **Resolved 2026-08-27**, Design-Level pass 3
    (narrow resume on Session Facilitation). `Ask Question` is the facilitator running an
    **interview loop**, not reacting to a contribution. Its supporting read model is a composite,
    **`Facilitation context`**, recomputed **every facilitator turn** from: recent transcript,
    open questions this session, open hot spots, thin/unopened board regions, `Workshop.scope`,
    and a **frozen prior-session summary**. Two supporting read models: **`Prior-session history`**
    (projection over the *closed* `Session` streams of the same `Workshop`; each session's summary
    frozen in its `Close Session` transaction) and **`Facilitation agenda`** (derived: open
    questions ∪ unexpanded-phase-name building blocks ∪ pending stakeholder check). No new
    aggregate: "scope set once" is a new `Workshop` invariant, the summary freeze rides on
    `Session`'s existing atomic close transaction. Full model in
    `bounded-contexts/session-facilitation/canvas.md`; record in
    `sessions/2026-08-27-design-level-session-facilitation-context.md`.

28. ~~**`Hot Spot Raised`/`Hot Spot Resolved`'s payload/granularity remains open**~~ **Mostly
    resolved 2026-08-26** — see #13/#32. This session's `Resolve` shape (requires a recorded
    reference) stands unchanged; Design-Level on Domain Model Capture additionally added `Reopen`
    (Resolved → Open) to the same command family.

31. **This session's edit to `boards/eventstormer-big-picture.md` (the #23 resume) left 8
    downstream artifacts stale**, per `domain_lineage.py check` run at close: `boards/capture-
    loop.md`, `bounded-contexts/domain-model-capture/{canvas,ubiquitous-language}.md`,
    `bounded-contexts/session-facilitation/{canvas,ubiquitous-language}.md`, `domain-and-goals.md`,
    and `sessions/big-picture-context-map.md`. Reported, not auto-propagated, per this skill's own
    rule — none of these are re-derived here; whether the `Workshop Started`/`Session Started`
    split changes anything in their content is each artifact's own workshop's call (Process
    Modelling on the capture loop, Design-Level on the two contexts, or `ddd-strategic-design`) to
    make when it next resumes. Unowned, undated.

30. **This session's edits to `context-map.md` and `open-questions.md` left 9 artifacts stale**,
    per `domain_lineage.py check` run at close: `subdomain-catalog.md`, `domain-and-goals.md`,
    both `bounded-contexts/domain-model-capture/canvas.md` and
    `bounded-contexts/derived-artifact-generation/canvas.md`, both retired
    `bounded-contexts/question-hot-spot-resolution/{canvas,ubiquitous-language}.md`, and
    `sessions/2026-08-26-design-level.md`. Reported, not auto-propagated — per this skill's own
    rule, deciding whether any of these need a real content change is `ddd-strategic-design`'s call
    (or, for the retired/historical files, arguably nobody's — but that judgment isn't this
    workshop's to make either). `context-map.md`'s own edge back from
    `bounded-contexts/session-facilitation/canvas.md` was re-linked this session, since the
    corresponding wording change was made in the same pass. Unowned, undated.

29. **PRD gap (item #19, above) has an owner now.** The participant will update F08 (and F01's
    operation-log kind list) after this workshop concludes, now that this session gives the full
    candidate design (`Resolve Hot Spot` → `Hot Spot Resolved`, the required reference, both hot-spot
    kinds resolvable but only model-affecting ones expected to need it).

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

## Raised in the Design-Level session (2026-08-26) — Domain Model Capture

32. **Hot Spot's `kind` field is genuinely unsettled, not deferred.** The payload direction for
    `Raise Hot Spot` is agreed (kind, trigger, annotation target), but the participant is
    explicitly unsure whether the `kind` attribute (informational/model-affecting) earns its place
    as a stored field versus being derivable or unnecessary. Unowned, undated.

33. **A "destroy" operation for true duplicates was floated and left undesigned.** The participant
    raised the possibility of a real delete, for duplicates found while organizing the timeline,
    but was explicit about not being sure. It conflicts with F01's confirmed "the system never
    merges two building blocks" and the broader no-destructive-delete/no-re-type stance. Not
    modelled. Unowned, undated.

34. ~~**`Insert Between`'s atomicity has no home in F01's current operation model.**~~ **Resolved
    2026-08-27**, Design-Level pass 2. `Insert Between` is **one operation** in the log, atomic
    because the log append is atomic — F01's per-operation atomicity guarantee covers it directly,
    with no need for a transactionally-bundled group of three. Acceptance test 14.

35. **`place`/`unplace` are real, independent operations — a corrected hypothesis, not a PRD
    leftover.** This session opened by suspecting `place`/`unplace` were an old name for
    `relate`/`unrelate`, later renamed `sequence`/`unsequence` (same pattern as the earlier
    "rename"/"Reworded" find). The participant corrected this: `Place` is the factory that births a
    single-event `Timeline`; separate, disconnected Timelines later merge via `Sequence`. Recorded
    as a finding, not a gap.

36. **This session's own repeated edits to `open-questions.md` left several already-stale
    downstream artifacts stale against a moving target**, per `domain_lineage.py check` run at
    close: `boards/capture-loop.md`, `bounded-contexts/derived-artifact-generation/canvas.md`, both
    retired `bounded-contexts/question-hot-spot-resolution/{canvas,ubiquitous-language}.md`, both
    `bounded-contexts/session-facilitation/{canvas,ubiquitous-language}.md`,
    `sessions/2026-08-26-design-level-session-facilitation.md`, `domain-and-goals.md`,
    `sessions/2026-08-26-design-level.md`, `sessions/big-picture-context-map.md`, and
    `subdomain-catalog.md`. Every one of these was **already stale before this workshop started**
    (cascading from the 2026-08-26 Big Picture resume and the Question & Hot Spot Resolution
    collapse); this session's own edits only moved the digest they're stale *against*, they didn't
    newly invalidate any of them. Reported, not auto-propagated: refreshing any of these is
    `session-facilitation`'s, `process-modelling`'s, or `ddd-strategic-design`'s own resume to make,
    not this workshop's. This session's own artifacts (`bounded-contexts/domain-model-capture/*`,
    `acceptance-tests.md`, `open-questions.md` itself, `README.md`, and this session's own record)
    are clean — `check` confirms 0 stale among them. Unowned, undated.

37. **PRD F02's "timeline" (the UI surface: placed-vs-backlog) vs. the modelling term.**
    **Largely moot as of 2026-08-27** — the `Timeline` aggregate is dissolved (see #48); only
    F02's UI surface and a derived connected-component read model remain, so the naming clash
    mostly disappears. The read model still wants a name that isn't "timeline"; minor, unowned.

38. **Withdrawing a Building Block a Hot Spot annotates now cascades — resolved live, corrected
    from an earlier open framing.** Block-vs-cascade was put to the participant directly; cascade
    won ("the latter is better") — withdrawing the annotated target also withdraws the Hot Spot,
    rather than blocking the original withdrawal or leaving a dangling annotation. Same session
    also resolved the parallel `causedBy` case: withdrawing an Actor/System cascades `Unlink Cause`
    on every Domain Event that referenced it, and reinstating requires re-linking explicitly
    (the facilitator can propose links from history, same as elsewhere). Both `[storm]`.

## Raised in the Design-Level session (2026-08-27) — Derived Artifact Generation

39. **New context-map edge: Session Facilitation → Derived Artifact Generation.** The decided
    context map has only Domain Model Capture → Derived Artifact Generation. This session found that
    Flows B (transcript export) and C (synthesized summary) read Session Facilitation's **session
    log** (conversation turns + proposal lifecycle). Recorded as a candidate revision with evidence
    in `context-map.md`; the inherited Capture → Artifact seam is unchanged. Adopting it is
    `ddd-strategic-design`'s call. Unowned, undated.

40. **PRD F10 divergence — artifact count and determinism.** F10 names exactly two artifacts and
    states the readable account is "never generated by a language model" because "determinism is
    the product's central claim." This session confirmed **three** artifact types for v1, the third
    (synthesized summary) deliberately non-deterministic and AI-generated. Accepted `[storm]` as a
    v1 goal. The participant owns a PRD pass to reflect this, alongside the F08/F01 pass already
    owned (#29). Owner: participant. Undated.

41. **DDD-artifact generator deferred.** Deriving EventStorming / Strategic-DDD artifacts (boards,
    canvases, context maps) from the model was raised this session and explicitly left out of v1.
    Unowned, undated.

42. **Flow A coverage disclosure needs a source of truth for "what steps a format has."** Every
    deterministic artifact must state which steps of its format were not run — which requires
    knowing the full step list for that format. Where that definition lives is unspecified.
    Unowned, undated.

43. **Upstream-completeness constraint on Domain Model Capture.** The participant's idea that
    Capture's aggregates should embed every datum Flow A's deterministic report needs is a shaping
    constraint on `domain-model-capture`, not this context — noted for that context's next resume.
    Unowned, undated.

44. **Whether Flow C's output is persisted or discarded after handover** was not pressed. If
    persisted, it becomes a stale-able read model like the preview. Unowned, undated.

45. **This session's edits to `context-map.md` and `open-questions.md` moved 24 already-stale
    downstream artifacts further out of date**, per `domain_lineage.py check` run at close. Every
    one was **already stale before this workshop started** (cascading from the 2026-08-26 Big
    Picture resume and the Question & Hot Spot Resolution collapse — see #31, #30, #36); this
    session only moved the digest they are stale *against*. Reported, not auto-propagated, per this
    skill's rule — refreshing them is `ddd-strategic-design`'s, `session-facilitation`'s, or
    `process-modelling`'s own resume to make. `context-map.md` additionally now carries a real new
    staleness edge from `bounded-contexts/derived-artifact-generation/canvas.md` (the canvas grew
    this session) — `ddd-strategic-design` folds that in when it adopts #39. This session's own
    artifacts (`bounded-contexts/derived-artifact-generation/*`, `acceptance-tests.md`, `README.md`,
    this file, and the session record) are clean — `check` confirms 0 stale among them. Unowned,
    undated.

## Raised in the cross-workshop review (2026-08-27)

A domain-modeling-lens audit of every artifact — asking whether each business rule and invariant
has a clear aggregate owner, and whether the aggregate and bounded-context shapes hold up for
implementation. Not a workshop: no elicitation, `[review]` provenance. Items 46–48 were put to the
participant and confirmed as real; 49–54 are recorded as findings for the owning workshop to judge.

46. ~~**The session runtime has no consistency boundary.**~~ **Resolved 2026-08-27**, Design-Level
    pass 2 on Session Facilitation (the session runtime). Three aggregates added:
    `Session` (event-sourced, its stream is the session record; owns the atomic unresolved-question
    snapshot at `Close Session` and interpret-at-most-once), `Proposal` (one per proposal-worthy
    judgment; disposition lifecycle with an `APPLY_FAILED` → retry path), `Resolution` (one per
    resolves-open-hot-spot judgment; every apply bounce terminal). The interpretation fan-out is
    plain choreography — no process manager (capture-loop Inv. 4: nothing coordinates). `Workshop`
    simplified: lost its "one open session" invariant (now a uniqueness constraint) and `Close
    Session` (now `Session`'s). Full model in
    `bounded-contexts/session-facilitation/canvas.md`; reasoning in
    `sessions/2026-08-27-design-level-session-facilitation-runtime.md`.

47. ~~**The Resolution lifecycle is unowned, and its handler assignment contradicts itself.**~~
    **Resolved 2026-08-27**, Design-Level pass 2. `Resolution` is its own aggregate in Session
    Facilitation — it handles `Accept`/`Reject Resolution` and the `Resolution Proposed →
    Accepted/Rejected` transition; the canvas's earlier "handled by Domain Model Capture" was
    wrong and is corrected. Competing resolutions for one hot spot **are allowed** — the
    apply-confirmation round trip settles them: the first to apply wins, every other accepted
    resolution bounces to `LAPSED` ("already resolved"). AT-39. No extra invariant needed.

48. ~~**`Timeline` crosses its own aggregate boundary.**~~ **Resolved 2026-08-27**, Design-Level
    pass 2 on Domain Model Capture (the `Board`). The reframe was adopted: the workshop operation
    log is single-writer (one open session per workshop, v1) and totally ordered (F01), so the
    model graph is an **event-sourced projection over that one log**, with every invariant checked
    at append time against the projection. The four Building Block aggregates and `Timeline` all
    dissolve into **one event-sourced aggregate, `Board`, one per workshop**. `Sequence`-as-merge,
    the "one per connected component" boundary and the unowned backlog all disappear — the
    connected-component grouping is now a derived read model. Full model in
    `bounded-contexts/domain-model-capture/canvas.md`; reasoning in
    `sessions/2026-08-27-design-level-domain-model-capture-board.md`.

49. ~~**Cross-aggregate referential integrity is unspecified in Domain Model Capture.**~~
    **Resolved 2026-08-27**, Design-Level pass 2. `Link Cause` / `Annotate` naming a withdrawn or
    non-existent target → rejected at append (F01's existing "targets an id that does not exist →
    rejected as a no-op"). The `Hot Spot` resolution **reference** is a **recorded value, not a
    live pointer** (F01: "deliberately untyped… the schema does not constrain its shape") — a
    reference that later names a withdrawn block is historical text, not a failure state, and the
    `Board` does not police it. Acceptance tests 19a, 20a, 20b.

50. ~~**`Insert Between` cycle-safety is unstated.**~~ **Resolved 2026-08-27**, Design-Level pass 2.
    `Insert Between(A, C, B)` is cycle-checked exactly like `Sequence` — validated against the
    whole-graph projection; if `C` already has a path to `A`, rejected. No "`C` must be a fresh
    event" exception. Acceptance test 12a.

51. ~~**Flow B of Derived Artifact Generation has a hidden cross-context dependency.**~~
    **Resolved 2026-08-27**, Design-Level pass 2. Domain Model Capture publishes `Operation
    Applied` (a new Boundary Event, keyed to the proposal id) carrying **the resulting building
    block id**; the `Proposal` aggregate records it as `resultingBuildingBlockId` on `APPLIED`. The
    link lives in the session record — exactly what Flow B reads to annotate each turn with what it
    produced. Recorded on the Capture→Facilitation surface in `context-map.md`. #39 (the Session
    Facilitation → Derived Artifact Generation edge) is still `ddd-strategic-design`'s to adopt.

52. **`boards/capture-loop.md` is superseded in parts, and left unedited.** Design-Level pass 2
    (2026-08-27) confirmed: `Answer Question` is handled by the `Session` aggregate (not
    UNCONFIRMED); question accountability is `Session`-scoped and holds under the `Workshop`/
    `Session` split (the close-time snapshot is atomic within `Session`); the interpretation flow
    gains the apply-confirmation round trip. The board file stays as-is per this skill's rule
    against re-scaling an earlier workshop's artifact —
    `bounded-contexts/session-facilitation/canvas.md` is now the finer-grained source of truth for
    the capture loop. A Process Modelling resume would reconcile the board itself. Unowned, undated.

53. **The as-is/to-be distinction (#6) is still unowned after three workshops.** Not cosmetic: a
    to-be session changes what `Domain Problem Stated` means and the facilitator's whole stance
    (the avanscoperta handbook: "the workshop dynamics are very different"). Needs an owner — a Big
    Picture resume or a product decision. Re-flagged 2026-08-27.

54. **This review's edit to `open-questions.md` continues the pre-existing staleness cascade.**
    `domain_lineage.py check` reported 24 stale before this edit (from the 2026-08-26 Big Picture
    resume and the QHSR collapse — see #45, #36, #31, #30); adding these items only moves the
    digest they are stale against, per the precedent in #45. Reported, not auto-propagated.
    `open-questions.md` re-stamped and `index` re-run after this edit. Unowned, undated.

## Raised in the Design-Level session (2026-08-27) — Session Facilitation, the session runtime

Pass 2 on Session Facilitation: modelling the session runtime (`Session`/`Proposal`/`Resolution`
aggregates) that pass 1 `[carried]` unmodelled. See #46/#47/#48/#51/#52 above, updated. Full
model in `bounded-contexts/session-facilitation/canvas.md`; record in
`sessions/2026-08-27-design-level-session-facilitation-runtime.md`.

- **Resolved (a):** `Interpret Contribution`'s failure mode. If the AI Model Provider is
  unavailable, `Contribution Made` still succeeds (the expert's words), and interpretation is
  **queued and retried** when a model — primary or fallback — returns. A contribution is
  interpreted **at most once** (idempotency keyed on contribution id). `[storm]`. Queue/retry
  mechanics are `anoria-commons:distributed-systems`.
- **Resolved:** `Start Session`'s dual-write worry. There is none — "at most one open session per
  workshop" is a set-scoped uniqueness rule (not a `Workshop` invariant), enforced by a partial
  uniqueness constraint outside any aggregate. `Start Session` reads `Workshop.canStartSession`
  and writes only `Session`. `Close Session` moved from `Workshop` to `Session`. `[storm]`.
- **Resolved:** undisposed proposals at `Session Closed` → `LAPSED` (quiet). Apply-failed
  proposals at close → `LAPSED` **and** `Raise Hot Spot` (unfulfilled intent survives). `[storm]`.

55. **Whether `Reject Proposal` / `Reject Resolution` carry a reason** was raised and left open —
    minor, no invariant depends on it. Unowned, undated.

56. **How a lapsed or apply-failed proposal renders in Derived Artifact Generation Flow B** —
    "proposed, not taken" vs. "proposed, failed" are different stories the transcript export
    should tell. The session record carries the terminal state; the rendering is not designed.
    Owner: `derived-artifact-generation` resume. Undated.

57. **`Contribution` is not modelled as its own aggregate** — its only rule (interpreted at most
    once) is enforced by the `Session`'s own event-sourced record. Recorded as a finding, not a
    gap: if `Contribution` later grows rules of its own (e.g. per-contribution retraction), revisit.
    Unowned, undated.

58. **This session's edits continue the pre-existing staleness cascade.** `check` reported 27 stale
    at entry (from the 2026-08-26 Big Picture resume and the QHSR collapse); 31 after this pass —
    the +4 are `context-map.md`, `README.md`, and `subdomain-catalog.md` moving in the pre-existing
    `canvas ↔ context-map ↔ open-questions` reference cycle (authored during the
    `ddd-strategic-design` session, see #16). This pass's own output artifacts —
    `bounded-contexts/session-facilitation/{canvas,ubiquitous-language}.md`, `acceptance-tests.md`,
    and `sessions/2026-08-27-design-level-session-facilitation-runtime.md` — are clean; the cycle
    edges were `ack`ed since all three files were co-authored and verified mutually consistent in
    this pass. The rest is reported, not auto-propagated. Unowned, undated.

## Raised in the Design-Level session (2026-08-27) — Domain Model Capture, the `Board`

Pass 2 on Domain Model Capture: adopting the projection-over-log reframe from #48. The four
Building Block aggregates and `Timeline` dissolve into one event-sourced `Board`. See #48/#49/#50/
#34/#37 above, updated. Full model in `bounded-contexts/domain-model-capture/canvas.md`; record in
`sessions/2026-08-27-design-level-domain-model-capture-board.md`.

- **Resolved:** the single-writer premise. For v1, within the one open session, operations are
  applied one at a time in arrival order — a totally-ordered sequence, single logical writer.
  F14 multiplayer is "a broadcast over the existing operation log; no model change". `[storm]`
- **Resolved:** whose job / one boundary. The accept-or-reject answer is synchronous and the
  issuing user's — "we can't really do multiple operations in parallel if the result of one
  operation may invalidate another". One transactional boundary over the whole workshop graph.
  `[storm]`
- **Elicited (not estimated):** low hundreds of Building Blocks per workshop; single-digit
  thousands of operations over a workshop's life; a couple of operations per minute at peak even
  with multiplayer. The one big boundary is affordable. `[storm]`

59. **`Insert Between`'s published event name is unconfirmed.** The participant named the *command*
    (`Insert Between`) but not the outward event. The canvas uses "Domain Event Sequence Reshaped"
    as a placeholder, tagged `[inferred]`. Worth naming when the PRD pass (#29) touches F01's
    operation-log kind list. Unowned, undated.

60. **The connected-component read model wants a name that isn't "timeline".** With the `Timeline`
    aggregate gone, the derived grouping of `follows`-connected events (F02's display surface)
    still needs its own term to avoid colliding with F02's "timeline". Minor. Unowned, undated.

61. **`v1` archiving / locking a `Board` is still not designed.** The `Board` has a birth (the
    Workshop is created) and no modelled death — archiving or locking a Workshop once "a good
    shape is found" (#25) remains a parked future-feature idea. Recorded so the missing terminus
    is explicit, not silent. Unowned, undated.

62. **This session's edits continue the pre-existing staleness cascade.** `domain_lineage.py
    check` reported 31 stale at entry (the 2026-08-26 Big Picture resume and the QHSR collapse —
    see #58); this pass's edits to `context-map.md` / `README.md` / `subdomain-catalog.md` move
    only the digest they are stale against, per the precedent in #58 / #45. This pass's own output
    artifacts — `bounded-contexts/domain-model-capture/canvas.md`, `acceptance-tests.md`,
    `open-questions.md`, `README.md`, and the session record — are co-authored and mutually
    consistent; their cross-cycle edges were `ack`ed. The rest is reported, not auto-propagated.
    Unowned, undated.

## Raised in the Design-Level session (2026-08-27) — Session Facilitation, the facilitator's context

Pass 3 on Session Facilitation: a narrow resume specifying #27 (above, now resolved). Full model in
`bounded-contexts/session-facilitation/canvas.md`; record in
`sessions/2026-08-27-design-level-session-facilitation-context.md`.

63. **Workshop scope: `Workshop` state vs. PRD F04's "accept path".** The participant's model puts
    `scope` (as-is / to-be / a named area) in `Workshop` state — set once, before or during the
    first session, immutable thereafter. PRD F04 says the scope answer *"sets the session scope
    through the normal accept path"*, which is how model content is created (an operation in Domain
    Model Capture's log). The accept/edit/reject *interaction* is reused; the *result* is not a log
    operation. Owner: the participant's PRD pass (#29). Undated.

64. **Whether EventStormer implements the Big Picture "pick one problem" exit.** In EventStorming
    the *chosen problem* is a Big Picture workshop's exit deliverable — the one problem picked to
    go deeper on, which becomes the *scope* fed into the next Process Modelling / Design-Level
    workshop (PRD F10 adds the honest-qualification check). Pass 3 dropped "chosen-problem status"
    as an input to the facilitator's context (format + scope suffice). Whether the product models
    the cross-workshop handoff at all is a Big Picture / PRD concern, not settled here. Unowned,
    undated.

65. **`Facilitation agenda`: derived categories vs. stored notes.** Pass 3 models the agenda as a
    *derived* read model (open questions ∪ unexpanded-phase-name building blocks ∪ pending
    stakeholder check). If the facilitator turns out to need to store *arbitrary* notes-to-self
    beyond those categories, that is a stored concept, not a derived one. Owner: prototyping.
    Undated.

66. **`Facilitation context`: one physical projection or several.** The composite is specified by
    its inputs and freshness rules; whether it is built as one projection or several, how each is
    summarised / compressed, and the prompt/token-budget shape are explicitly handed to
    prototyping. Owner: prototyping. Undated.

67. **This session's edits continue the pre-existing staleness cascade.** `domain_lineage.py check`
    reported 31 stale at entry (the 2026-08-26 Big Picture resume and the QHSR collapse — see #58 /
    #62); 35 after this pass. The +4 are `README.md` / `open-questions.md` and the
    `domain-model-capture`-scoped siblings moving in the pre-existing
    `canvas ↔ context-map ↔ open-questions ↔ README` reference cycle (#16). This pass's own output
    artifacts — `bounded-contexts/session-facilitation/{canvas,ubiquitous-language}.md`,
    `acceptance-tests.md`, `open-questions.md`, `README.md`, and
    `sessions/2026-08-27-design-level-session-facilitation-context.md` — are co-authored and
    mutually consistent; their cross-cycle edges were `ack`ed. The rest is reported, not
    auto-propagated. Unowned, undated.

## Deliberate deviations, recorded rather than silent

- **Granularity.** Big Picture's default is coarse; this board went fine-grained (every kind gets
  its own name for every lifecycle stage) by the participant's explicit choice when asked, not by
  drift. No Command/Policy/Read Model/Aggregate was added structurally.
- **Pivotal events reduced from five to four.** The original draft candidates (Stakeholder Check
  Answered, Derived Artifacts Exported) were both dropped during the quality gate; the participant
  was asked whether to nominate a fifth pivotal event and declined, so four stands: Session Started,
  Domain Problem Stated, Session Closed, Chosen Problem Named/Skipped.