---
workshop: design-level
scope: session-facilitation
status: draft
last_updated: 2026-08-27
digest: ffd396170be4
derived_from:
  - path: acceptance-tests.md
    digest: b539eb0b7ab7
    at: 2026-08-27
  - path: bounded-contexts/session-facilitation/canvas.md
    digest: 192d89ca4269
    at: 2026-08-27
  - path: open-questions.md
    digest: 2c40caa4a39d
    at: 2026-08-28
---
# Design-Level EventStorming — Session Facilitation, the facilitator's context (2026-08-27, pass 3 / resume)

**Format:** Design-Level, resume, narrow scope. **Participant:** the product owner (solo, as every
session in this line). **Ran** inline with the live participant, invariant-first.

**Motivating hot spot:** `open-questions.md` #27 — *"the context a facilitator gathers before
asking its first (or next) question is unspecified beyond 'whatever context it has.'"* Carried
unspecified through three prior passes. The participant chose (this session's opening) to elicit it
now rather than treat it as an implementation detail or defer it to prototyping.

**Prepare-step disclosures made to the participant:** the narrow stop condition (below); that this
pass may invalidate earlier canvas content and that is a result not an error; that the book is thin
on Design-Level (chapters 17–20) so some method here is from the author's later templates and DDD
literature. Lineage `check` at entry: 31 stale, 0 dangling — the pre-existing
`canvas ↔ context-map ↔ open-questions ↔ README` reference cycle (#16 / #58 / #62), not a signal.

**Stop condition (stated up front):** stop when the `Ask Question` policy's supporting read model
is specified well enough to build — its inputs named, its derivation (what it projects over)
explicit, its staleness/recompute rules stated — and the six completion rules are reported. Not
re-opening the rest of the canvas.

---

## What was decided, in order

### 1. `Ask Question` is the facilitator running an interview, not reacting to a contribution

The participant's first correction reframed the whole question. The three moments the opening turn
named — (a) the session-open scope question, (b) ad-hoc mid-session questions, (c) the
stakeholder-check — are not the shape. Moment (b) is **the facilitator conducting an interview**:
it has a method, it has a sense of where it is in that method, and at every turn it picks the next
move — ask the scope question, probe a phase name, chase a region nobody has opened, run the
stakeholder check, **or actively guide an expert who does not know how to start**. `Ask Question`
covers all of that. The facilitator is expected to run something like the EventStorming skill's own
interview loop.

### 2. Scope of *this* pass — what it can settle vs. what prototyping settles

Agreed explicitly with the participant:

| This workshop settles | Prototyping settles |
|---|---|
| *What* the next-move decision depends on (the input list) | How each input is summarised / compressed |
| *Where* each input lives — which context/aggregate owns it (the duplication question) | Whether it is one read model or several physical projections |
| Staleness: when the context is recomputed, and over what history | Prompt shape, token budget, retrieval strategy, the AI's engagement read |

Anything that could not be settled without code was to become a hot spot naming prototyping as the
owner — not a guess tagged `[storm]`.

### 3. The eight inputs to the next-move decision — all confirmed real

Put to the participant as candidates; the answer was *"all are real."*

1. **Where it is in the method** — which phase (still gathering events vs. events done, now commands)
2. **What is covered vs. thin or unopened** — regions with no detail, phase names nobody expanded
3. **Open facilitator questions this session** — already `Map<QuestionId, Open|Resolved>` on `Session`
4. **Open hot spots** — from Domain Model Capture
5. **Workshop scope** (and, for a Big Picture workshop, whether it is converging on a problem)
6. **Prior-session history** — what happened in earlier `Session`s of the same `Workshop`
7. **The expert's apparent state** — stuck, terse, disengaging, fluent
8. **Recent transcript** — the last few contributions this session

### 4. Ownership of each input — the real-vs-accidental-duplication pass

| # | Input | Owner | New this pass? |
|---|---|---|---|
| 3 | Open questions this session | `Session` stream (this context) | No — the existing `Open questions in this session` read model |
| 8 | Recent transcript | `Session` stream (this context) | No — projection over the `Session` stream |
| 7 | Expert's apparent state | derived from #8 by the AI Model Provider at decision time | Not stored — an inference, not a read model |
| 4 | Open hot spots | Domain Model Capture graph | No — the existing `Open hot spots for this workshop` read model |
| 2 | Thin / unopened regions | Domain Model Capture graph (building blocks + connectivity) | **Same read dependency as #4**, new purpose — not new duplication |
| 6 | Prior-session history | prior (closed) `Session` streams for the same `workshopId` | **Yes** — a workshop-scoped read model over closed sessions |
| 5 | Workshop scope | **`Workshop`** state (see #6 below) | scope state added to `Workshop` this pass |
| 1 | Method phase | **not modelled as state** — the AI infers it (see #5) | No stored artifact |

**Conclusion:** the only genuinely new pieces are the prior-session read model (#6) and adding
`scope` to `Workshop`. Every other input is a re-use of a dependency this context already declares
on the context map (`model graph + open hot spots (read)` from Domain Model Capture; the `Session`
stream for its own state). That is real sharing, not duplication.

### 5. Input #1 (method phase): inferred, not a state machine — with an optional derived agenda

The participant: *"probably mixed. I'd like things deterministic when possible, but the
EventStorming workshops are fluid and don't have a real sequence of phases or hard requirements.
The AI will interpret where we are. But we should have some hints or a backlog somewhere if that
helps."*

Resolved to:

- **No explicit phase state machine on `Session`.** EventStorming is deliberately fluid; a
  hard-coded phase gate would misrepresent the method. `[storm]`
- The facilitator (AI Model Provider) **infers method position** from board state + transcript at
  decision time.
- Static method heuristics ("events but no commands ⇒ consider asking for commands") live in the
  **facilitator's own method knowledge** (its prompt / F04), not in a read model — out of scope
  here.
- A **`Facilitation agenda`** read model surfaces the concrete follow-ups the facilitator should
  not lose: open questions ∪ building blocks that look like unexpanded phase names ∪ whether the
  stakeholder check is still pending. **Derived, not stored** — every element already exists
  elsewhere. If the facilitator turns out to need to store *arbitrary* notes-to-self beyond those
  categories, that is a prototyping finding (#65), not a v1 aggregate.

### 6. Input #5 (workshop scope): `Workshop` state, birth-fixed, immutable

The participant, firmly and twice: *"the scope belongs to the workshop. We can model the business
as-is, or to-be, or something specific — it doesn't matter — but it's part of the workshop and not
something we operate on. Every session models the domain according to this scope. It's not a
building block."*

- `scope` is **`Workshop` state** — a free-form statement of modelling intent (as-is / to-be / a
  named area). Established through a facilitator↔expert accept/edit/reject interaction **before the
  workshop's first session, or at its very start** — the participant was indifferent to which.
- **Immutable for the `Workshop`'s life** (input #6 to the "rule broken anyway" question): the
  participant ruled out mid-workshop scope changes outright — *"start a new workshop to change the
  scope. We can use the current one as a template, but it's really confusing to change scope in
  the middle and we'll have a lot of misleading context."* So there is **no corrective policy** —
  the rule genuinely cannot be broken. `scope` joins `format` as birth-fixed.
- Every `Session` reads `Workshop.scope`; it is context to guide against, never a target.

**PRD divergence surfaced (not reconciled):** PRD F04 says the scope answer *"sets the session
scope through the normal accept path"* — which is how model content is created (an operation in
Domain Model Capture's log). The participant's model puts scope in `Workshop` state instead; the
accept/edit/reject *interaction* is reused, the result is not a log operation. Recorded as #63 for
the participant's PRD pass (#29).

### 7. Input #5, the "chosen problem" part: dropped from the context, recorded as a separate concern

The participant did not understand the purpose of the "chosen problem" and asked for the method
background. Given it:

- In EventStorming, the **chosen problem is the exit deliverable of a Big Picture workshop** — the
  one problem/opportunity the room picks to go deeper on. It becomes the **scope fed into** the
  next Process Modelling or Design-Level workshop. A Big Picture that ends without one is
  unfinished (the skill's own exit-gate rule). PRD F10 adds that the pick is *qualified honestly*
  when others should have weighed in (`Confirm Complete Perspective` / the stakeholder check).

The participant's read: *"the problem pick is more suited to the start of other workshop formats.
Maybe each workshop solves a different problem."* — which matches the method (Big Picture produces
it; the next workshop's scope *is* it).

**Decision:** drop "chosen-problem status" as a distinct input to the facilitation context. The
facilitator knowing the workshop's **format + scope** (both `Workshop`, both birth-fixed) is
enough to know what a session is driving toward. Whether EventStormer implements the Big Picture
"pick one problem" exit at all is unsettled — recorded as #64, a Big Picture / PRD concern bigger
than this pass, rather than modelled here.

### 8. Input #6 (prior-session history) and staleness

The participant: *"acceptable to summarise and freeze. Live inputs — on every facilitator turn.
It needs up-to-date context for the live inputs."*

- **`Prior-session history`** — a workshop-scoped read model over the **closed** `Session` streams
  of the same `Workshop`. Each closed session's facilitation summary is **computed once, in the
  `Session Closed` transaction, and frozen** thereafter — `CLOSED` is terminal, so the input can
  never change. This **extends `Session`'s existing close-transaction invariant**, which already
  computes the unresolved-question snapshot atomically at `Close Session`.
- **`Facilitation context`** — the composite the `Ask Question` policy actually reads. **Recomputed
  on every facilitator turn** from the live inputs (recent transcript, open questions, open hot
  spots, thin/unopened regions, `Workshop` scope) plus the frozen prior-session summary. No
  staleness tolerance on the live half.

### 9. No new aggregate

Invariant-first walk found no rule in this pass that needs a new consistency boundary:

- "The facilitator's context is fresh every turn" is a read-model recompute property, not an
  aggregate invariant.
- "The prior-session summary is frozen at close" rides on `Session`'s existing atomic
  close-transaction invariant — an extension, not a new aggregate.
- "Scope is set once and never changes" is a new **`Workshop`** invariant (birth-fixed, like
  format) — handled by the aggregate that already exists.

So this pass adds: three read models, one `Workshop` invariant + state, one extension to
`Session`'s close transaction. Aggregate inventory is unchanged (`Workshop`, `Session`,
`Proposal`, `Resolution`).

---

## The model (deltas to `bounded-contexts/session-facilitation/canvas.md`)

### Commands

| Command | Actor / source | Handled by | Produces | Notes |
|---|---|---|---|---|
| Propose Scope | Facilitator (automatic, before/at the first session) | AI Model Provider | Scope Proposed | Mirrors the F05 review shape; result is `Workshop` state, not a log operation |
| Set Scope | Creator | `Workshop` | Scope Set | Accept/edit of the proposed scope. Legal **once**, before or during the first session; rejected thereafter |

### Events out (added)

| Event | Consumed by | Meaning | Produced by |
|---|---|---|---|
| Scope Proposed / Scope Set | (internal — the scope review UI; then every session reads it) | Workshop modelling intent established | AI Model Provider / `Workshop` |

### Policies (changed)

| When | Then | Notes |
|---|---|---|
| Session Started | Ask Question | Reads `Facilitation context` (recomputed this turn). **#27 resolved** — the read model is specified below |
| every facilitator turn (not only Session Started) | Ask Question | The interview loop: the facilitator picks its next move from `Facilitation context` each turn |
| Session Closed | compute and freeze this session's facilitation summary, in the same transaction as the unresolved-question snapshot | Feeds `Prior-session history` for later sessions of the same `Workshop` |

### Queries / views / read models (replaces the single `Context for the next question` row)

| Query / view | Used by | Answers | Backed by | Freshness |
|---|---|---|---|---|
| `Facilitation context` | `Ask Question` policy, every turn | "What should the facilitator ask / do next?" | composite: recent transcript + open questions + open hot spots + thin/unopened regions + `Workshop.scope` + frozen prior-session summary | live inputs recomputed **every facilitator turn**; prior-session half is frozen |
| `Prior-session history` | `Facilitation context` | "What happened in earlier sessions of this workshop?" | projection over the **closed** `Session` streams for this `workshopId`; each session's summary frozen at its `Close Session` | append-only; each entry immutable once written |
| `Facilitation agenda` | `Facilitation context` | "What follow-ups must the facilitator not lose?" | **derived** — open questions ∪ unexpanded-phase-name building blocks ∪ pending stakeholder check | recomputed with the live half |
| `Thin / unopened regions` | `Facilitation agenda`, `Facilitation context` | "Where is the board empty or shallow?" | projection over Domain Model Capture's graph (building blocks + `follows`/`causedBy` connectivity) | reads the same upstream as `Open hot spots for this workshop` |

*Expert's apparent state (input #7) is intentionally absent from this table — it is the AI Model
Provider's read of the recent transcript at decision time, not a stored or projected view.*

### Aggregates (changed)

| Aggregate | Change |
|---|---|
| `Workshop` | **+ invariant:** `scope` is set exactly once, before or during the first session, and is immutable thereafter (birth-fixed, like `format`). **+ state:** `scope` (free-form modelling intent). No corrective policy — the rule cannot be broken; a scope change means a new `Workshop`. |
| `Session` | **close-transaction invariant extended:** `Close Session` computes, atomically and in the same transaction, both the unresolved-question snapshot (existing) **and** this session's frozen facilitation summary (new). |

---

## Six completion rules — reported

| # | Rule | Status |
|---|---|---|
| 1 | Every path completed | **Holds** for the scope of this pass — the `Ask Question` decision path now has a specified input; the scope-set path reaches `Scope Set` or is rejected |
| 2 | Grammar respected | **Holds** — `Session Started → Ask Question` and `every turn → Ask Question` read `Facilitation context`; `Propose Scope → Scope Proposed → Set Scope → Scope Set` alternates cleanly |
| 3 | Every stakeholder reasonably happy | **Holds** — the expert who does not know how to start is now an explicit facilitator responsibility (input #1 + agenda), not an unhandled gap |
| 4 | Every hot spot addressed | **#27 resolved.** New: #63 (scope PRD divergence, owner: participant's PRD pass), #64 (Big Picture chosen-problem exit, unowned), #65 (agenda storage beyond derived categories → prototyping), #66 (physical read-model decomposition → prototyping). Each carries an owner or is explicitly unowned-and-flagged |
| 5 | Boundaries visible | **Holds** — no boundary moved; `Thin/unopened regions` reads the *existing* Domain Model Capture read surface, drawn on the context map already. No new Boundary Command or Event |
| 6 | Components have consistent behaviour | **Holds** — `Workshop` gains one birth-fixed field and invariant, consistent with `format`; `Session`'s state machine is unchanged (the summary freeze is inside the existing `Close Session` transition) |

All six hold for this pass's narrow scope. Two hot spots (#65, #66) consciously hand implementation
shape to prototyping, as agreed at step 2.

---

## Verification pass

- Every claim above traces to a participant statement in this conversation — reproduced in
  "What was decided, in order." No `[inferred]` or `[code]` element is presented as settled.
- No `[code]` pass was run (`src/` is scaffold only). Unchanged from prior passes.
- The one contradiction found (PRD F04 "accept path" vs. `Workshop`-state scope) is recorded as
  #63, not reconciled.
- `boards/capture-loop.md` is unaffected by this pass (it never modelled the facilitator's context
  read); no re-scaling of an earlier board.
- Aggregate inventory unchanged; no new consistency boundary claimed.

## Provenance accounting

| Element | Marker |
|---|---|
| `Ask Question` is an interview loop, not contribution-reactive | `[storm]` |
| The eight decision inputs | `[storm]` |
| Ownership map (real vs. accidental duplication) | `[storm]` — derivation confirmed input-by-input with the participant |
| No phase state machine; AI infers method position | `[storm]` |
| `Facilitation agenda` is derived, not stored | `[storm]` |
| `scope` is `Workshop` state, birth-fixed, immutable | `[storm]` |
| Chosen problem dropped from the context; recorded as #64 | `[storm]` (the drop) + `[inferred]` (that EventStormer needs a Big Picture exit at all — #64) |
| Prior-session summary frozen in the `Session Closed` transaction | `[storm]` |
| `Facilitation context` recomputed every facilitator turn | `[storm]` |
| No new aggregate | `[storm]` (invariant-first walk, confirmed) |
| PRD F04 scope divergence | `[storm]` (the observation) — resolution is the participant's PRD pass |

## Hand-off

**Next, per the book's own instruction after Design-Level:** prototype. This pass's model is small
enough to fold into an existing prototype target — `Session` (already recommended) plus the
`Facilitation context` recompute and the `Session Closed` summary freeze. Write down what it
raises, especially: whether the derived `Facilitation agenda` is sufficient or the facilitator
needs stored notes (#65), and whether one physical projection or several serve the composite (#66).

**Unchanged priorities from the prior handoff:** prototype the `Board`; Derived Artifact Generation
resume (#56, #43); the participant's PRD pass (#29, now also #63).