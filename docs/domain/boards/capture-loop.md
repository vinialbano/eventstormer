---
workshop: process-modelling
scope: capture-loop
status: draft
last_updated: 2026-08-25
digest: fdf3ee7790ec
derived_from:
  - path: boards/eventstormer-big-picture.md
    digest: ac38c26c6691
    at: 2026-08-25
---
# Board — EventStormer: the capture loop (Process Modelling)

**Scope.** One process, start to finish: from a `Question Asked` by the AI facilitator through to
every path it can resolve into — a captured Building Block, a raised Hot Spot, or a question left
pending. Confirmed by the participant as `Question Asked → Hot Spot Raised` (the wider of two
offered start points), over the narrower `Contribution Made → Hot Spot Raised`.

**Participants.** One: the product owner (solo), same hard limit as the Big Picture session — no
genuine inter-participant disagreement was available; this workshop's own bar (agreement, not
diverse perspectives) makes that less of a limitation here than it was for Big Picture.

**Harvested from `boards/eventstormer-big-picture.md`** per this workshop's own rule (harvest, do
not re-derive): the event vocabulary for this slice (steps 5–14 and the "Questions and their
resolutions" section), the three named-but-unmodelled policy relationships (`open-questions.md`
#4), and the context boundaries from `bounded-contexts/question-hot-spot-resolution/canvas.md`
(that context consumes `Absent Stakeholder Named`, `Knowledge Gap Revealed`, `Session Closed`; it
does not own `Question Asked`/`Contribution Made`, which are Session Facilitation's).

**Provenance key.** `[storm]` — decided or confirmed by the participant in this session.
`[carried]` — harvested unchanged from the Big Picture board, not re-litigated except where noted.

**Not in play:** Aggregate. This workshop deliberately does not decide which context or
consistency boundary owns any of this — that is Design-Level's job on Domain Model Capture and on
Question & Hot Spot Resolution.

---

## The process model

### Happy path

```
Question Asked [carried]
  --(Make Contribution)--> Domain Expert
    --> Contribution Made [carried, command renamed: was "Submit Contribution"]
      --(Interpret Contribution, automatic policy)--> Facilitator (on AI Model Provider)
        --> Contribution Interpreted [storm, new — see "Why Contribution Interpreted exists"]
```

`Contribution Interpreted`'s payload carries **two independent judgment tracks**, established and
confirmed this session:

1. **Content judgments** (zero or more; independently multipliable — see "Multiple proposals"
   below): proposal-worthy, belongs-elsewhere, knowledge-gap, absent-stakeholder(s),
   complete-perspective-confirmed, or none.
2. **Question-track judgment** (whether *this specific* `Question Asked` gets answered): one of
   `Question Answered` / `Knowledge Gap Revealed` / `Absent Stakeholder Named` /
   `Complete Perspective Confirmed`, or none (question stays pending).

These two tracks are orthogonal and can combine freely. A typical on-topic answer produces both a
content judgment and a question-resolving judgment; an off-topic contribution can produce a
content judgment with **no** question-resolving judgment, leaving the original question pending.
`[storm]` — this was the session's central correction, prompted by the participant's own example
(an unrelated contribution that "leads to actions, but the original question remains open").

### Content-judgment track (independently multipliable per interpretation)

```
Contribution Interpreted, judgment = proposal-worthy
  --(Propose Building Block, automatic policy)--> Facilitator
    --> Proposal Made [carried]
      --(Edit Proposal)--> Domain Expert --> Proposal Edited [carried] (loops, 0+ times)
      --(Accept Proposal)--> Domain Expert --> Proposal Accepted [carried]
        --(automatic policy: create the Building Block matching the proposed kind)-->
          --(Record Domain Event)--> Domain Model Capture --> Domain Event Captured [carried]
          --(Identify Actor)--> Domain Model Capture --> Actor Identified [carried]
          --(Identify System)--> Domain Model Capture --> System Identified [carried]
          --(Raise Hot Spot)--> Domain Model Capture --> Hot Spot Raised [carried]
      --(Reject Proposal)--> Domain Expert --> Proposal Rejected [carried] (terminal, no Building Block)

Contribution Interpreted, judgment = belongs-elsewhere
  --(Attribute Contribution, automatic policy)--> Facilitator
    --> Contribution Attributed To Another Format [carried] (terminal for this process)
```

`[storm]` — confirmed this session: **one `Contribution Interpreted` can carry multiple
proposal-worthy judgments** (same repeatable shape as `Absent Stakeholder Named` naming several
people from one answer). Each spawns its own independent `Proposal Made`, with its own
edit/accept/reject lifecycle, decoupled from every sibling proposal from the same interpretation —
one being rejected or still pending edit never blocks or invalidates another (Invariant 4).

**Command split by kind, not one generic "Create Building Block."** Confirmed this session on the
whole-board audit: the creation command mirrors the already-kind-split events, for the same
reason those events split (different downstream consequences per kind) and because kind-specific
commands can fail or be retried independently. `Raise Hot Spot` here is **the same command name**
used by the policy-triggered path below — both routes converge on an identical command and event,
confirming the earlier "same event regardless of cause" decision holds.

### Question-track: the three hot-spot-triggering resolutions (harvested, formalized as policies this session)

```
Contribution Interpreted, judgment = knowledge-gap
  --(Flag Knowledge Gap, automatic policy)--> Facilitator --> Knowledge Gap Revealed [carried]
    --(Raise Hot Spot, automatic policy)--> Domain Model Capture --> Hot Spot Raised [carried]
      -- bypasses Proposal/Accept entirely [storm, confirmed this session]

Contribution Interpreted, judgment = absent-stakeholder (repeatable, one per person named)
  --(Name Absent Stakeholder, automatic policy)--> Facilitator --> Absent Stakeholder Named [carried]
    --(Raise Hot Spot, automatic policy)--> Domain Model Capture --> Hot Spot Raised [carried]
      -- once per named person; bypasses Proposal/Accept [storm]

Contribution Interpreted, judgment = complete-perspective
  --(Confirm Complete Perspective, automatic policy)--> Facilitator
    --> Complete Perspective Confirmed [carried] (terminal, sets the chosen-problem qualification)
```

### Question-track: the plain case (new this session)

```
Contribution Interpreted, judgment = on-topic, no other special consequence
  --(Answer Question, automatic policy)--> [context owner UNCONFIRMED, see hot spot]
    --> Question Answered [storm, new]
```

### Question-track: nothing resolves it (exception — not a negative event, a real absence)

```
Session Closed [carried, inbound from Session Facilitation — not re-derived here]
  --(for every open Question Asked with no resolving event, automatic policy)-->
    --(Raise Hot Spot)--> Domain Model Capture --> Hot Spot Raised [carried]
      -- once per unresolved question, independently [storm, confirmed: multiple, not one
         aggregate hot spot]
```

**No timeout/deadline exists for an individual question** `[storm]` — confirmed directly: unlike a
generic "thing that fails to happen," there is no per-question clock. The only checkpoint is
`Session Closed` itself, which is why this is modelled as a policy reacting to `Session Closed`,
not a time-driven event of its own.

---

## Commands, actors, systems

| Command | Actor / trigger | System | Produces |
|---|---|---|---|
| Ask Question | Facilitator | AI Model Provider | Question Asked |
| Make Contribution | Domain Expert | Session Facilitation | Contribution Made |
| Interpret Contribution | automatic (policy) | Facilitator / AI Model Provider | Contribution Interpreted |
| Propose Building Block | automatic (policy) | Facilitator | Proposal Made |
| Attribute Contribution | automatic (policy) | Facilitator | Contribution Attributed To Another Format |
| Flag Knowledge Gap | automatic (policy) | Facilitator | Knowledge Gap Revealed |
| Name Absent Stakeholder | automatic (policy) | Facilitator | Absent Stakeholder Named |
| Confirm Complete Perspective | automatic (policy) | Facilitator | Complete Perspective Confirmed |
| Answer Question | automatic (policy) | UNCONFIRMED — see hot spot | Question Answered |
| Edit Proposal | Domain Expert | Domain Model Capture | Proposal Edited |
| Accept Proposal | Domain Expert | Domain Model Capture | Proposal Accepted |
| Reject Proposal | Domain Expert | Domain Model Capture | Proposal Rejected |
| Record Domain Event | automatic (policy, on Proposal Accepted) | Domain Model Capture | Domain Event Captured |
| Identify Actor | automatic (policy, on Proposal Accepted) | Domain Model Capture | Actor Identified |
| Identify System | automatic (policy, on Proposal Accepted) | Domain Model Capture | System Identified |
| Raise Hot Spot | automatic (policy: Proposal Accepted kind=Hot Spot, **or** Knowledge Gap Revealed, **or** Absent Stakeholder Named, **or** Session Closed sweep) | Domain Model Capture | Hot Spot Raised |

## Policies (the automated kind throughout — no managed/human-owned policy in this process)

| When | Then | Rule |
|---|---|---|
| Contribution Made | Interpret Contribution | The Facilitator judges every contribution; not modelled as a policy before this session |
| Contribution Interpreted, judgment=proposal-worthy | Propose Building Block | one per proposal-worthy judgment, independently multipliable |
| Contribution Interpreted, judgment=belongs-elsewhere | Attribute Contribution | |
| Contribution Interpreted, judgment=knowledge-gap | Flag Knowledge Gap | |
| Contribution Interpreted, judgment=absent-stakeholder | Name Absent Stakeholder | once per named person |
| Contribution Interpreted, judgment=complete-perspective | Confirm Complete Perspective | |
| Contribution Interpreted, judgment=on-topic/plain | Answer Question | the new, previously-unnamed case |
| Proposal Accepted | Record Domain Event / Identify Actor / Identify System / Raise Hot Spot | kind-specific; **confirmed:** policy-triggered and proposal-accepted Hot Spots converge on the identical event |
| Knowledge Gap Revealed | Raise Hot Spot | bypasses Proposal/Accept — confirmed auto-raise, no confirmation step |
| Absent Stakeholder Named | Raise Hot Spot | once per named person; bypasses Proposal/Accept |
| Session Closed | Raise Hot Spot, once per Question Asked with no resolving event | confirmed: independent per question, not one aggregate hot spot |

## Read models

- **Open questions at any point in the session** — `Question Asked` minus every question that has
  received `Question Answered` / `Knowledge Gap Revealed` / `Absent Stakeholder Named` /
  `Complete Perspective Confirmed`. Already named (UNCONFIRMED-for-owner) in the Question & Hot
  Spot Resolution canvas; this session gives it the exact build rule.

## Invariants

1. **No `Question Asked` may go unaccounted for.** Every question either gets a resolving event
   before close, or is swept into a `Hot Spot Raised` at `Session Closed`. This is the reason the
   policies exist, not a separate rule layered on top.
2. **A question is exempted from the close-time sweep only by one of four specific events** —
   `Question Answered`, `Knowledge Gap Revealed`, `Absent Stakeholder Named`,
   `Complete Perspective Confirmed` — **never by a content judgment alone.** `[storm, corrected
   mid-session]` — the first draft wrongly included `Proposal Accepted`/`Proposal Rejected`/
   `Contribution Attributed To Another Format` in this set; the participant's own off-topic-answer
   example broke that assumption. A question can accumulate proposals and still be swept into a
   Hot Spot at close if none of the four ever fired against it.
3. **Policy-triggered Hot Spots bypass Proposal/Accept entirely.** The triggering fact (an absent
   stakeholder named, a gap admitted, a question left open at close) is itself the confirmation;
   asking the domain expert to also approve it would ask them to confirm something the system just
   observed them say.
4. **Proposals are independent artifacts.** A single `Contribution Interpreted` may spawn several
   proposals; each one's edit/accept/reject lifecycle and the Building Block it may produce is
   independent of every sibling proposal from the same interpretation.

## Why `Contribution Interpreted` exists (worth keeping, since the reasoning nearly went the
other way)

Initially modelled as a direct fan-out with no named intermediate event, on the theory that nothing
reacts to "interpreted" in the abstract. The participant's challenge corrected this: a reactive
design wants a stable, named event to fan out from, precisely so that each downstream reaction —
each content judgment, each question-track judgment — can succeed, fail, or retry independently
rather than requiring one command to do everything atomically. Symmetric with why `Proposal
Accepted` stays a separate event from the kind-specific creation event: a decision and its
consequences are different facts even when one always follows the other.

---

## Hot spots surfaced or resolved this session

See `open-questions.md` for the full, dated accounting. Summary:

- **Resolved:** the three policy relationships from Big Picture #4 (fully formalized above).
- **Resolved:** auto-raise vs. confirm for policy-triggered Hot Spots (auto-raise, no confirmation).
- **Resolved:** intermediate event vs. direct fan-out for contribution interpretation
  (`Contribution Interpreted` exists).
- **Resolved:** command granularity for Building Block creation (kind-specific, not generic).
- **Owned, undated, deferred to Design-Level on Domain Model Capture:** `Hot Spot Raised`
  payload/granularity — the participant named plausible future features (scheduling a session with
  an absent stakeholder, etc.) that might need to distinguish cause, but declined to decide the
  shape now, absent knowing what the hot-spot resolution logic actually needs.
- **New, unowned:** `Question & Hot Spot Resolution`'s canvas doesn't yet list `Question Asked` /
  `Question Answered` as events it consumes, even though its own stated purpose ("track whether a
  question resolves before the session closes") already implies it. Flagged for Design-Level, not
  fixed here — canvas ownership is that workshop's decision.
- **New, unowned:** which context/system executes `Answer Question` (the plain-case policy) is
  UNCONFIRMED — Session Facilitation (symmetric with the rest of the interpretation policies) or
  Question & Hot Spot Resolution (matches its stated purpose) are both plausible. Design-Level
  question.