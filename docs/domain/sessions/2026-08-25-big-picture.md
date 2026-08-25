---
workshop: big-picture
scope: eventstormer-session
status: draft
last_updated: 2026-08-25
digest: 97183cfccd14
---
# EventStorming: EventStormer (running a facilitated session)

**Date:** 2026-08-25
**Workshop:** Big Picture
**Participants:** one — the product owner. This skill interviews one person; no genuine
inter-participant disagreement was available in this session.
**Domain baseline:** fresh — no prior `docs/domain/` existed.
**Scope:** the whole business line of running one EventStormer session, end to end.

## Reused domain knowledge

None — `docs/domain/` did not exist before this session (`domain_lineage.py check` confirmed this
at entry).

## Observed evidence

`docs/product/PRD.md` was read in full and used as seed material, at the participant's explicit
request, rather than eliciting the full event vocabulary from a blank page. Every candidate pulled
from it was tagged `[glossary]` and put to the participant for an explicit yes/edit/reject before
counting as confirmed — none passed silently. Specific citations used through the session:

- F01 (`docs/product/PRD.md:188-222`) — node kinds, operation log, the `restore` omission.
- F02 (`:224-244`) — backlog/timeline, derived (not authored) position.
- F03 (`:246-266`) — transcript segments, the smell that renamed "Submitted."
- F04 (`:268-295`) — the asymmetric quality bar, the deeper-format deferral, error handling.
- F05 (`:297-316`) — proposal disposition, questions with no accept control.
- F06 (`:318-339`) — direct editing, rename/archive/restore, the restore inconsistency with F01.
- F07–F10 (`:341-416`) — pivotal events, hot spots, the stakeholder check, derived artifacts.
- Out of scope (`:515-538`) — the format-selection gap, declined integrations.

## Raw chaotic capture

The participant's own first pass, verbatim order, before any quality review:

> Workshop format selected → EventStorming session started → Expert stated the domain problem →
> Facilitator prompt question → Expert answered question → Domain Event added to backlog → Expert
> proposed another domain event → Expert rephrased the sticky note → Domain Event added to timeline
> → Artifacts exported.

| Raw note | Provenance | Disposition |
|---|---|---|
| Workshop format selected | `[storm]` | Kept — Workshop Format Selected, flagged forward-looking |
| EventStorming session started | `[storm]` | Kept — Session Started |
| Expert stated the domain problem | `[storm]` | Kept — Domain Problem Stated; disambiguated (opening scope answer, not the closing chosen problem) |
| Facilitator prompt question | `[storm]` | Reworded past-tense, later generalized to Question Asked |
| Expert answered question | `[storm]` | Merged into Domain Problem Stated |
| Domain Event added to backlog | `[storm]` | Merged into Event Captured (creation) + Event Sequenced (positioning), once those were separated out |
| Expert proposed another domain event | `[storm]` | Disambiguated — proposer is the facilitator, not the expert (F04); dropped as its own event |
| Expert rephrased the sticky note | `[storm]` | Merged into Proposal Edited |
| Domain Event added to timeline | `[storm]` | Became Event Sequenced |
| Artifacts exported | `[storm]` | Dropped — query-like, no operation logged for it (same test as Session Resumed) |

## Official narrative vs. observed reality

| PRD says | This session found | Status |
|---|---|---|
| F01 operation kinds omit `restore` | F06 states "archive an element, and restore an archived one" as a capability | Hot spot — the PRD disagrees with itself; not resolved here |
| v1 runs Big Picture only, no format choice | Board keeps "Workshop Format Selected" as a whole-business-line event | Hot spot — flagged as forward-looking, not yet built |
| "the model is a discriminated union, not a generic sticky" (F01) | Initially over-read as rejecting "sticky" as UI vocabulary; on rereading, it's a type-system claim, not a naming one | Resolved in session — no real conflict, "sticky" language issue was separate and resolved on its own merits |
| PRD uses "rename"/"label"/"element" throughout | Board uses "Reworded" and kind-specific names instead, because the PRD's own words don't describe the dynamic even where they're the PRD's own term | Resolved — deliberate divergence, recorded under Language |

## Event quality review

Full reasoning for every rename/split/drop is in `boards/eventstormer-big-picture.md` (inline) and
the "Dropped during the quality gate" table there. Summary of the smells actually caught:

| Raw note | Classification | Action taken |
|---|---|---|
| Transcript Segment Submitted | Data-availability smell ("Form Submitted" — named verbatim in this skill's own catalog) | Renamed to Contribution Made |
| Facilitator Deferred To Deeper Session | Actor-naming smell + undefined jargon ("deeper") | Renamed to Contribution Attributed To Another Format; restructured as a sibling of Proposal Made, not a question-state |
| Hot Spot Raised (originally "Recorded") | CRUD-flavored verb, matching the PRD's own "records"/"is recorded" | Renamed to "Raised" |
| Absent Stakeholder Recorded As Hot Spot | Same CRUD verb, missed on first pass | Renamed to Absent Stakeholder Named (+Hot Spot Raised via policy) |
| Element Proposed/Reworded/Withdrawn/Reinstated | "Element" is not EventStorming vocabulary (PRD's own implementation term) | Split into kind-specific names throughout |
| Session Resumed | Query/report masquerading as event | Dropped |
| Derived Artifacts Exported | Same query smell | Dropped |
| Stakeholder Check Answered | Vague wrapper name with no distinct mechanism of its own | Dropped in favor of its two real outcomes |
| Question Answered (plain) | No distinct downstream consequence found | Dropped — collapses into Contribution Made referencing the question |
| Proposal Edited Then Accepted (compound) | Granularity mismatch — two sequential, independently-meaningful facts merged | Split into Proposal Edited (repeatable) + Proposal Accepted (terminal, same regardless of prior edits) |
| Chosen Problem Selected (or Skipped, with reason) | Same granularity mismatch | Split into Chosen Problem Named / Chosen Problem Skipped |
| Sticky Placed On Timeline / Returned To Backlog | Position is derived from relations (PRD F02), not an authored fact; also conflated two different relation kinds (`follows` vs `causedBy`) | Split into Event Sequenced/Unsequenced and Actor/System Linked/Unlinked |

## Resolved hot spots

| Issue | Resolution | Agreed by |
|---|---|---|
| Is "Domain Problem Stated" the opening scope answer or the closing chosen problem? | The opening scope answer; kept distinct from the closing Chosen Problem Named/Skipped | participant |
| Does the expert or the facilitator propose elements? | The facilitator only — F06 never describes a direct-creation path, only editing of existing elements | participant |
| Is "Session Resumed" a real event? | No — query-like, dropped | participant |
| Is "Facilitator Deferred To Deeper Session" a real event or just facilitator behavior? | Real event, kept — restructured to remove the actor-naming smell and the undefined "deeper" jargon | participant |
| Should "Workshop Format Selected" stay despite not being in v1? | Yes, kept as forward-looking, flagged | participant |
| Is "Session Resumed" part of this board's story? | Dropped entirely (see above) | participant |
| Element vs. Sticky vs. kind-specific naming | Kind-specific (Event/Actor/System/Hot Spot) throughout; neither generic term used | participant, reversed once mid-session after further thought |
| Is "Derived Artifacts Exported" a real event? | No — same query test as Session Resumed | participant |
| How does a generic facilitator question get marked answered? | Explicit operation approach (Option B); only consequential resolutions get their own name (Domain Problem Stated, Knowledge Gap Revealed, Absent Stakeholder Named, Complete Perspective Confirmed); a plain answer is not its own event | participant |
| Does a Knowledge Gap Revealed leave the question open? | No — it is itself a resolution; leaving it open would double-count the resulting hot spot at Session Closed | participant |
| Is the stakeholder question's *ask* distinct from a generic Question Asked? | No — only answers get distinct names when they have distinct consequences; the ask stays generic throughout | participant |
| Does withdrawing an Actor/System cascade-unlink it from everything it caused, or just hide it? | Participant's call: it severs its connections (not merely hidden-but-wired); reinstating requires re-validating old relations against the board's current state. PRD defines no rule for the conflict case — recorded as an open hot spot, not resolved here. | participant |

## Final claim verification

| Claim | Verdict | Evidence | Wording change |
|---|---|---|---|
| "Position is never authored, only derived" | Supported | PRD F02, verbatim | None needed |
| "There is no re-type operation" | Supported | PRD F01, verbatim | None needed |
| Withdrawing an Actor/System cascades to unlink it everywhere | Hypothesis, not supported by PRD text | PRD only states the no-silent-rejoin rule for Events; Actor/System behavior is undefined | Recorded as the participant's decision, not as a PRD fact — see open-questions.md #3 |
| The three "hot spot flavor" events were structurally distinct | Contradicted, revised in session | Only one Hot Spot node kind exists (F01); the three collapsed into one creation event plus three real antecedent events | Board reflects the corrected model |

## Post-workshop artifact plan

| Item | Plan |
|---|---|
| Artifact location | `docs/domain/` in this repo |
| Review window | Not set — no date given by the participant |
| Missing stakeholders to invite | None named for this specific board (participant is EventStormer's own product owner); the method's own "one person, no real disagreement" limit applies |
| Change-capture rule | Any correction should resume this Big Picture workshop rather than hand-edit the board |
| Open hot spots for review | See `open-questions.md` in full |
| Facilitator/agent availability | Resume via `/eventstorming` naming Big Picture, or Process Modelling on "the capture loop" for the three unformalized policies |

## Provenance summary

| Marker | Events | Actors/Systems |
|---|---|---|
| `[storm]` | 4 (Workshop Format Selected, Domain Problem Stated, Contribution/withdraw semantics decisions, AI Model Provider naming) | 1 (AI Model Provider, named directly by participant) |
| `[glossary]` — PRD-derived, explicitly confirmed | 28 | 5 |
| `[inferred]` | 0 promoted to the board | — |
| `[code]` | 0 — no application code existed to read at this stage | — |

No `[code]` or `[inferred]` element reached the board without an explicit yes — the whole session
worked from the PRD plus direct elicitation, both gated the same way.

## Next steps

1. Resume Process Modelling, scoped to "the capture loop," to formalize the three policy
   relationships this session found but could not model (owner/date: none given).
2. Resolve the PRD's own `restore` inconsistency (F01 vs. F06) before F06 is built — owner/date:
   none given.
3. Decide the reinstatement conflict-resolution rule (open-questions.md #3) — owner/date: none
   given.

## Resumed: pivotal-event re-examination (same date, same session)

The participant asked to revisit the four pivotal events, starting from a specific hypothesis:
**Proposal Accepted** as a candidate, on the grounds that a pivotal event need not be singular —
it can recur within a repeating loop, as the book's own yearly-conference example shows.

**Book research.** Re-read `Introducing EventStorming` (pp. 106–107, 125–126) directly. Confirmed:
recurrence across natural cycles does not disqualify a pivotal event; the actual test is whether,
within one pass of the cycle, the event marks a transition between *kinds* of activity, or is the
repeated mechanism of one kind. The book's own canonical Big Picture phase sequence (Chaotic
Exploration → Enforce the Timeline → People and Systems → Explicit Walk-through → Reverse
Narrative → Problems and Opportunities → Pick the right problem → Wrapping up, pp. 106–107) was
also checked directly against this board.

**Round 1 — three independent subagent proposals**, each blind to the others, each given the board
plus the pivotal-event criterion, run from different starting angles:

| Lens | Conclusion |
|---|---|
| Book's phase list (pp. 106-107) as the starting hypothesis | Same four events confirmed. 5 of the book's 7 live-workshop phases (Enforce the Timeline, People and Systems, Explicit Walk-through, Reverse Narrative, Problems and Opportunities) have no corresponding board event — not a gap, but evidence the book's phase sequence is a physical-facilitation artifact that doesn't map onto a single-narrator, continuous AI-facilitated loop. |
| Bottom-up read of the board's own sections, no reference to the book's phase names | Same four events confirmed independently. Proposal Accepted and all capture-loop/positioning/editing events rejected as repeated mechanism; Complete Perspective Confirmed rejected as a fact-check, not a transition. |
| PRD-text-only: does EventStormer's actual specified behavior sequence into phases at all? | Same four events confirmed from PRD citations alone (F04, F08, F09). Found that capture, sequencing, and causation-linking are one concurrent loop by design (F04 proposes relations from the first segment), and that Explicit Walk-through/Reverse Narrative are simply absent from v1's spec, not merely continuous. |

All three converged on the same set with no addition or removal, from independent angles — a
strong result. **Proposal Accepted rejected as pivotal**, each lens for a compatible reason: it is
the repeated mechanism of the capture loop, not a boundary between phases of it.

**Non-linearity check.** The book does not state a formal "phases loop back" cycle in so many
words, but its own stance (*"the flow is not linear... there's no strict recipe here"*; *"Do we
have a recipe? Yes and no"* — adaptive, not prescriptive) supports informal interleaving of the
named phases in live workshops. This reinforces rather than contradicts the round-1 finding: if
even the book's own live-workshop phases are fluid rather than hard-gated, a single continuous
AI-facilitated loop has even less reason to produce discrete, repeatable phase-transition events
matching them.

**Round 2 — the "sorting anchors" candidate.** The participant's structural concern (nothing
pivotal sits in the *middle* of the timeline, only at the open and close) was taken seriously as
its own question, separate from the book's phase list. A candidate was proposed: the first time
F07's "once there are enough events" threshold fires and backlog placement shifts from
undifferentiated to milestone-relative, is that a genuine one-time phase boundary?

A dedicated subagent vetted this against the same criterion and against standard event-smell
tests. **Rejected**: it is a count-based artifact (a UI-threshold consequence of the already-
existing, already-repeating Event Marked Pivotal), not a new business fact — the domain expert is
doing the same act (deciding where something goes) before and after, just with a better hint from
the interface. The underlying activity does not change kind, which is what the pivotal test
actually requires. The middle of the capture loop is genuinely homogeneous; F07's own "4 to 5"
already anticipates sessions where a fifth pivotal event doesn't exist.

**Round 3 — full PRD completeness audit.** A separate subagent re-read all of F01–F17 line by line
against the board's 32 events and its Actors/Systems list, checking every concrete fact against
the same smell tests the board already applied. Result: **clean audit** — every fact maps onto an
existing event, an existing policy relationship, or an already-reasoned drop. Two borderline
candidates were checked and rejected on the same grounds as prior drops: F04's rename-holdback
threshold (an internal readiness flag, not a business fact) and F05's archived-target-at-accept-
time edge case (a concurrency/race condition, same category as the schema-validation and cycle-
rejection error paths that never became events). No missing actor or system found.

**Outcome: no change to the board.** The four pivotal events (Session Started, Domain Problem
Stated, Session Closed, Chosen Problem Named/Skipped) and the 32-event catalog both stand,
now verified by three independent tournament proposals plus two targeted follow-up
investigations, rather than by the original single pass alone.