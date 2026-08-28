---
workshop: design-level
scope: session-facilitation
status: draft
last_updated: 2026-08-26
digest: fa99635a3b22
derived_from:
  - path: boards/capture-loop.md
    digest: bc6ad40750e0
    at: 2026-08-26
  - path: bounded-contexts/session-facilitation/canvas.md
    digest: 192d89ca4269
    at: 2026-08-28
  - path: context-map.md
    digest: ec6dc67a4870
    at: 2026-08-28
  - path: open-questions.md
    digest: c9a8044f0a62
    at: 2026-08-28
  - path: sessions/2026-08-26-design-level.md
    digest: a199731d351c
    at: 2026-08-26
---
# Session — Design-Level EventStorming: Session Facilitation

**Date:** 2026-08-26
**Workshop:** Design-Level
**Participants:** One — the product owner (solo), same hard limit as every prior session in this
line: no genuine inter-participant disagreement was available. Participant list deliberately
narrowed per this workshop's own rule — no domain-expert-only round was needed.
**Domain baseline:** reused `docs/domain` — harvested (not re-derived) the event vocabulary and
policies from `boards/capture-loop.md`, and the resolution capability + hot-spot split found by
the retired Question & Hot Spot Resolution Design-Level session (`sessions/2026-08-26-design-level.md`),
whose hand-off named this session as the place it should be re-modelled as commands/events/policies.

Disclosed at the prepare step, per this workshop's own rule: the book is thin on Design-Level
(chapters 17–20, the least-finished part of it); what follows leans on the author's 2025 workshop
templates and DDD literature for the six completion rules, the aggregate-discovery method, and the
modelling strategies.

## What was elicited, in order

1. **A structural gap, found before anything else could be modelled.** The capture-loop board and
   the Session Facilitation canvas both treated "a session" as the only unit. The participant
   introduced a second, persistent concept: **`Workshop`** (an identity that can span many sessions
   and multiple people, bound to exactly one format for its lifetime) and **`Session`** (one sitting,
   bound to a workshop). `[storm]`

2. **Correcting the Big Picture board's pivotal events.** The participant confirmed, on reflection,
   that `Session Started` (Big Picture, 2026-08-25) should have been `Workshop Started` — the
   concept wasn't available at Big Picture time. `Domain Problem Stated` and
   `Chosen Problem Named/Skipped` are also `Workshop`-scoped, not `Session`-scoped: they describe the
   whole business-line conversation, not one sitting. **This supersedes the Big Picture board's
   framing of those three pivotal events; the board itself is left unedited, per this skill's rule
   against re-scaling an earlier workshop's artifact.** `[storm]`, correction

3. **Format is fixed at workshop creation, one format per workshop, no in-place change.** The
   corrective policy for "we picked wrong" is a separate, deliberately out-of-scope-for-now flow
   — evolving into a new workshop, template-seeded from the old one's artifacts. Parked as a hot
   spot, not modelled. `[storm]`

4. **Membership invariant (hard, invariant-first).** A session can only start if the requester is
   the workshop's creator or holds a currently-`ACCEPTED` invitation — checked synchronously, no
   optimistic window. This is what names `Workshop` as the aggregate: it is the thing that must
   authoritatively know creator + invitation state and refuse `Start Session` otherwise. `[storm]`

5. **Invitation sub-lifecycle.** `Invite Stakeholder` (creator only, v1) → `INVITED` →
   `Accept Invitation` / `Decline Invitation`, and `Revoke Invitation` reachable from either
   `INVITED` or `ACCEPTED`, landing on `REVOKED`. Invitation **expiry** was raised and then
   explicitly parked — duration is undecided and doesn't matter for v1; "any member can invite" and
   "archive/lock a workshop" were parked the same way, as future-feature ideas, not modelled.
   `[storm]`

6. **At most one open session per workshop, for v1 — full stop, not per-person.** The participant's
   own reasoning: concurrent sessions (even by different people) risk corrupting the workshop's
   state, and true concurrent multi-person contribution is deliberately deferred to the Multiplayer
   roadmap item (`open-questions.md` #10), not solved here. `[storm]`

7. **The missing seam into the existing capture-loop board.** `Session Started` →
   *(automatic policy, informed by the workshop's stated purpose and, on a resuming workshop, its
   accumulated history)* → `Ask Question` → `Question Asked`. Treated as one policy; "gathering
   context" is not modelled as its own event — nothing reacts to it independently. `[storm]`

8. **Resolving the Question-vs-Hot-Spot ambiguity this session's own predecessor left open.**
   Because every `Question Asked` that survives its own session is already swept into a
   `Hot Spot Raised` at `Session Closed` (invariant, `boards/capture-loop.md`), the resolution
   mechanic never actually fires against a live question — only against Hot Spots. The judgment
   name is **`resolves-open-hot-spot`**, not "...-or-question." `[storm]`, correction to the
   predecessor session's framing

9. **Formalizing the resolution capability** (design only sketched in prose by the predecessor
   session) as commands/events, mirroring `Building Block Proposed → Accept Proposal`:
   `Contribution Interpreted, judgment=resolves-open-hot-spot` → `Propose Resolution` (automatic) →
   `Resolution Proposed` → `Accept Resolution` / `Reject Resolution` (domain expert) →
   `Resolution Accepted` / `Resolution Rejected`, the former triggering `Resolve Hot Spot` →
   Domain Model Capture → `Hot Spot Resolved` (Boundary Command/Event, mirrors `Raise Hot Spot`).
   Confirmed: one contribution can resolve an existing hot spot **and** propose a new Building
   Block independently, same as the existing multi-judgment shape. Facilitation only judges and
   requests resolution; storage/recording of the reference is Domain Model Capture's job,
   unchanged from the predecessor session's finding. `[storm]`

10. **Proposal vs. Contribution, resolved** (`open-questions.md` #7). Three distinct things at three
    distinct points, not two names for one: `Contribution` (raw input) → `Contribution Interpreted`
    (the facilitator's judgment, possibly multiple independent tracks) → `Building Block Proposed`
    (one specific outcome, when a judgment is proposal-worthy). "Proposal Made" = `Building Block
    Proposed`, not a synonym for the interpretation step. `[storm]`

11. **Both kinds of hot spot are resolvable — the split is about whether resolution is required, not
    whether it's possible.** Corrected from an earlier assumption in this session's own line of
    reasoning: informational hot spots (e.g. "the mail system is slow") can be resolved later by a
    contribution, same as model-affecting ones; they just don't have to be. `[storm]`, self-correction

12. **No hard blocking invariant anywhere in this context.** Asked directly whether an unresolved
    model-affecting hot spot should block any specific action (naming a Chosen Problem, closing the
    workshop, etc.). **Participant: no — EventStorming workshops are deliberately fluid; the system
    may suggest, it must never force a human through a required order of steps.** Recorded as a
    design principle, not an invariant to enforce. `[storm]`

## Boundary validation

Testing the one inherited seam (Session Facilitation vs. everything else), given everything
modelled this session:

- `Workshop`/`Session`/invitations are entirely internal to Session Facilitation — no crossing.
- `Resolve Hot Spot` → `Hot Spot Resolved` is a new Boundary Command/Event, but it extends the
  existing Domain Model Capture relationship (Open-Host Service + Published Language,
  Customer/Supplier) rather than creating a new one — `context-map.md`'s existing note already
  anticipated "Hot Spot Building Blocks raised by Facilitation's own resolution judgment"; this
  session gives that exact shape.
- Ask Question's need to read the current board/history to compose its first question is served by
  the same existing relationship (read side).

**The seam holds. No revision to `context-map.md`'s relationships is needed** — only a small
wording tightening to name the resolve path explicitly alongside raise.

## The aggregate: `Workshop`

**Invariants** (invariant-first — the aggregate is named because these need one place to enforce
them):

1. Format is fixed at `Workshop Started` and never changes structurally — no command exists to
   change it. (No acceptance test possible for this one — there is no `When`.)
2. A session may only start if the requester is the creator or holds a currently-`ACCEPTED`
   invitation. Hard reject, synchronous, no optimistic window.
3. An invitation's acceptance can be revoked at any point after being granted (`ACCEPTED` or
   `INVITED` → `REVOKED`); a revoked or declined invitation no longer satisfies invariant 2.
4. At most one open (unclosed) session exists per workshop at a time, v1. `Start Session` is
   rejected if one is already open.

**State machine:**

```
                    (birth: Start Workshop → Workshop Started)
                    format fixed, creator set, no open session

Invite Stakeholder (creator only)
        │
        ▼
    INVITED ──Accept Invitation──▶ ACCEPTED
        │  ╲                           │  ╲
   Decline  Revoke Invitation    Revoke Invitation
        │        │                    │
        ▼        ▼                    ▼
    DECLINED   REVOKED             REVOKED

Start Session (creator or ACCEPTED invitee; rejected if a session is already open)
        │
        ▼
  [open session exists] ──Close Session──▶ [no open session]
```

No modelled death for `Workshop` itself — it accumulates sessions indefinitely by design; archiving
or locking a finished workshop is a parked feature idea, not modelled here.

`Session`'s own lifecycle is the simple pair `Started → Closed`; no pause/resume state exists —
the participant hadn't considered one, and none was needed once "at most one open session per
workshop" made re-entry to an already-open session moot (there is nothing else to resume into).

## The six completion rules

| # | Rule | Status |
|---|---|---|
| 1 | Every path completed | **Holds.** `Workshop`'s invitation sub-lifecycle terminates in `DECLINED`/`REVOKED` or loops via `ACCEPTED`; `Session` terminates at `Closed`; the resolution mechanic terminates at `Resolution Accepted`/`Resolution Rejected`. No dangling path found. |
| 2 | Grammar respected | **Holds.** Command → System → Event / Event → Policy → Command alternates throughout; no step papered over in prose. |
| 3 | Every stakeholder reasonably happy | **Holds.** Creator (controls invites, starts sessions), invitee (can accept/decline, then start sessions), domain expert (contributes, gets proposals and resolution suggestions), facilitator (executes every automatic policy). No actor appears only as someone else's input. |
| 4 | Every hot spot addressed | **Holds, with owners.** See Hot Spots below — every survivor carries an owner or an explicit unowned/undated status already recorded elsewhere. |
| 5 | Boundaries visible | **Holds.** `Resolve Hot Spot`/`Hot Spot Resolved` drawn as a Boundary Command/Event on the existing Domain Model Capture relationship; nothing else crosses. |
| 6 | Components have consistent behaviour | **Holds.** `Workshop`'s state machine reconciled against the flow above; no transition without a command, no command without a state accepting it. |

All six held this session — none deferred.

## Hot spots surfaced or resolved this session

See `open-questions.md` for the full, dated accounting. Summary:

- **Resolved:** `open-questions.md` #1 (format-selection gap) — fully modelled via `Start Workshop`.
- **Resolved:** `open-questions.md` #7 (Proposal vs. Contribution) — three distinct things, not two
  names for one.
- **Resolved (self-correction):** the predecessor session's `resolves-open-hot-spot-or-question`
  judgment narrowed to `resolves-open-hot-spot` — the "or question" case cannot occur.
- **Owned:** the PRD gap (`open-questions.md` #19, F08/F01) — the participant will resolve it after
  this workshop concludes.
- **New, parked as future-feature ideas, not modelled:** invitation expiry (duration undecided),
  broader invite permissions ("any member can invite"), archive/lock a workshop.
- **New correction, recorded rather than silently reconciled:** the Big Picture board's pivotal
  events `Session Started` / `Domain Problem Stated` / `Chosen Problem Named/Skipped` are
  `Workshop`-scoped, not `Session`-scoped as originally recorded. The Big Picture board itself is
  left unedited.
- **New, unowned:** the exact shape of "context gathered for the first question of a new or
  resuming session" (how much history, summarized how) is unspecified beyond "the facilitator
  gathers whatever context he has." Left as an implementation-level open question, not decided here.

## Hand-off

- This context's event-stormed model (`Commands`/`Events`/`Policies`/`Queries`/`Aggregates`) in
  `bounded-contexts/session-facilitation/canvas.md` moves from `UNCONFIRMED` to `[storm]`,
  confirmed this session — still `draft` pending `ddd-strategic-design` promotion, per this skill's
  own authority limits.
- `Hot Spot Raised`'s payload/granularity (`open-questions.md` #13) remains owned by a future
  Design-Level session on Domain Model Capture — this session's resolution mechanic assumes a
  reference is recorded there but does not decide its shape.
- The PRD update (F08's resolve/close mechanic, F01's operation-log kind list) is the participant's
  to do next, after this workshop.

## Provenance summary

| Marker | Count | What |
|---|---|---|
| `[storm]` | 12 | every numbered item above |
| `[inferred]` | 0 | none this session — every design point was elicited and confirmed directly, not proposed as a hypothesis the participant merely accepted |
| `[code]` | 0 | no codebase consultation was needed this session |

No `[glossary]` or additional `[confirmed]` elements this session.