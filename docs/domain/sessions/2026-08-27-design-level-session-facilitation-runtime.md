---
workshop: design-level
scope: session-facilitation
status: draft
last_updated: 2026-08-27
digest: 35fd6b2ca4f9
derived_from:
  - path: boards/capture-loop.md
    digest: bc6ad40750e0
    at: 2026-08-27
  - path: bounded-contexts/derived-artifact-generation/canvas.md
    digest: 99476d0589b3
    at: 2026-08-28
  - path: bounded-contexts/domain-model-capture/canvas.md
    digest: 705129af8f2d
    at: 2026-08-28
---
# Session — Design-Level EventStorming: Session Facilitation, the session runtime (pass 2)

**Date:** 2026-08-27
**Workshop:** Design-Level, resuming Session Facilitation (canvas is `draft` → update in place)
**Participants:** One — the product owner (solo). Participant list deliberately narrowed per this
workshop's own rule; no domain-expert-only round.
**Scope:** the *session runtime* — the parts the 2026-08-26 pass `[carried]` from
`boards/capture-loop.md` rather than modelled: contribution interpretation, the Proposal
lifecycle, the Resolution lifecycle, and question accountability. `Workshop` and invitations were
settled in pass 1 and not reopened.

**Motivating hot spots:** `open-questions.md` #46 (no consistency boundary for the runtime), #47
(Resolution lifecycle unowned + a self-contradictory handler attribution in the canvas), #48
(Timeline crosses its boundary — folded in), #51 (Flow B's missing id link). All four came out of
the 2026-08-27 cross-workshop review.

**Disclosed at the prepare step:** the book is thin on Design-Level (chapters 17–20); the
completion rules, aggregate method, and modelling strategies lean on the author's 2025 templates
and DDD literature. `anoria-commons:domain-modeling`'s aggregate-design and aggregate-discovery
references were read and applied directly. This pass is expected to contradict parts of
`boards/capture-loop.md` and the pass-1 canvas — a result, not an error.
`domain_lineage.py check` at entry: 27 stale (the pre-existing cascade from the 2026-08-26 Big
Picture resume and the QHSR collapse — #45/#54).

## What was elicited, in order

1. **Two logs, not one.** The workshop **operation log** (PRD F01) is workshop-scoped and *is*
   Domain Model Capture's model graph — its entry kinds are all model mutations. The **session
   record** (transcript + proposals + questions) is session-scoped and is Session Facilitation's.
   The session runtime never writes the operation log; it emits `Proposal Accepted` and a policy
   translates that into a model operation appended by Capture, in its own transaction (eventual
   consistency). `[storm]` — the participant liked option 3 of the three offered and we brainstormed
   it to this shape.

2. **The accept→appears delay is fine.** Eventual consistency between `Proposal Accepted` and the
   building block appearing is acceptable; a UI animation covers the gap. `[storm]`

3. **The accept-then-bounce case → tell the expert and re-open the proposal.** A proposal can pass
   pre-display validation, be accepted, and then fail at apply time (target withdrawn by a sibling
   proposal or a direct F06 edit; a cycle). The race is real even in v1 single-player. So
   `ACCEPTED` is **not terminal** — it is a transient "apply pending" state; only `APPLIED`,
   `REJECTED`, `LAPSED` are terminal. `[storm]`

4. **One proposal = one operation = one aggregate.** F04's "proposed relations" is the payload of
   a `relate`-kind proposal, not a bundle inside a `create`. "Event X following Y" is two
   proposals, each independently disposable (consistent with capture-loop Inv. 4). So there is no
   multi-aggregate transaction and no partial-success question on the apply. `[storm]`

5. **The apply-confirmation round trip.** Domain Model Capture publishes back `Operation Applied`
   (keyed to proposal id, carrying the resulting building block id) / `Operation Rejected` (with
   the reason). A policy moves the `Proposal` to `APPLIED` / `APPLY_FAILED`. This is a new pair of
   Boundary Events on the existing Capture→Facilitation relationship — same pattern, fuller
   published language. `Operation Applied`'s id payload resolves #51. `[storm]`

6. **`Session` is its own aggregate, event-sourced; its stream is the session record.** Referenced
   by workshop id. `Workshop`'s invariants never read session internals; session state churns on
   every contribution and would contend `Workshop`'s version if held there (Rule 2). Holds
   `Map<QuestionId, Open|Resolved>` and an interpret-once ledger. `[storm]`

7. **Question accountability is not a synchronous invariant.** Nothing blocks during the session
   (pass-1 item 12). The one real `Session` invariant is that **the unresolved-question snapshot
   is consistent as of `Close Session`** — `Close Session` (now a `Session` command, moved off
   `Workshop`) stops accepting contributions and computes the open-question set in the same
   transaction, emitting `Session Closed` with that list. A policy then raises one hot spot per id
   (eventual). `[storm]`

8. **"At most one open session per workshop" is a set-scoped uniqueness rule, not a `Workshop`
   invariant.** It is still a business rule (avoid two contributors modelling the same area; defer
   real concurrency to Multiplayer), but a single aggregate cannot hold a cross-instance
   uniqueness rule. Enforced by a partial uniqueness constraint (`UNIQUE(workshopId) WHERE
   status=open`) outside any aggregate — which is also what Multiplayer relaxes. `Start Session`
   reads `Workshop.canStartSession` and writes only `Session`. No dual write. `[storm]`

9. **The interpretation fan-out is choreography, no process manager.** No join, no coordination
   state, nothing waits (capture-loop Inv. 4). `Contribution Interpreted` is one stable event;
   independent policies react per judgment. `[storm]`

10. **`Proposal` and `Resolution` are two aggregates, not one `kind`-switched aggregate.** Asked
    directly whether this is real or accidental duplication. Accidental, and already coming apart:
    a proposal adds model content, a resolution flips a hot spot's status; resolutions compete for
    one `Open` state, proposals don't; a proposal bounce is retryable, a resolution bounce is
    terminal (`LAPSED` — "already resolved / gone"); F08's informational/model-affecting split will
    add resolution-only payload rules. Merging means an `if kind == resolve` branch on all of that.
    `[storm]`

11. **Undisposed vs. apply-failed proposals at `Session Closed`.** Presented pros/cons of three
    options (survive / sweep-all-to-hot-spots / lapse). Settled: never-disposed → `LAPSED` (quiet,
    a terminal state distinct from `REJECTED`); apply-failed → `LAPSED` **and** `Raise Hot Spot`
    (the expert expressed intent, the system failed to honour it — a real loose end).
    `ACCEPTED`-and-in-flight operations are allowed to finish after the close. `[storm]`

12. **`Interpret Contribution`'s failure mode → queue and retry.** AI Model Provider down →
    `Contribution Made` still succeeds; interpretation is queued and runs when a model (primary or
    fallback) returns. A contribution is interpreted **at most once** (idempotency keyed on
    contribution id — the modeling-uncertainty ledger pattern). Queue/retry mechanics are
    `distributed-systems`. `[storm]`

## Boundary validation

Testing the one inherited seam (Domain Model Capture ↔ Session Facilitation) against the new
aggregates:

- `Session`, `Proposal`, `Resolution` all live entirely in Session Facilitation. `Proposal` and
  `Resolution` only *react to* events from Capture; they never share a transaction with it. **No
  aggregate spans the seam.**
- The surface grows: new Boundary Commands (kind-specific apply-operation, on `Proposal
  Accepted`), new Boundary Events (`Operation Applied`/`Operation Rejected`, `Hot Spot Resolved`/
  `Hot Spot Resolution Rejected`). The relationship **pattern is unchanged** (OHS + Published
  Language, Customer/Supplier); only the contract is fuller.
- **The seam holds.** Recorded in `context-map.md` as a candidate revision with evidence.

**#48, folded in as promised:** the session-runtime side is unaffected by `Timeline`'s shape.
Walking it surfaced a stronger candidate for Domain Model Capture's own resume — the model graph
as an event-sourced projection over the single-writer operation log, invariants checked at append
time — which would dissolve the `Timeline` two-instance-transaction problem entirely. Handed to
`domain-model-capture`, not decided here. `open-questions.md` #48 updated.

## The aggregates

| Aggregate | Invariant (invariant-first) | Change |
|---|---|---|
| `Workshop` | Format fixed at birth; invitation state machine; `canStartSession` answerable from creator + invitation state | **Simplified:** lost "one open session" (→ constraint) and `Close Session` (→ `Session`) |
| `Session` | Lifecycle `OPEN → CLOSED` (terminal); unresolved-question snapshot consistent at `Close Session`; interpret-at-most-once per contribution | **New.** Event-sourced; stream = session record |
| `Proposal` | One disposition state at a time; transitions legal only from allowed states; no edit after terminal | **New.** 7 states incl. `APPLY_FAILED` → retry |
| `Resolution` | Same disposition invariant; every apply bounce terminal | **New.** No `APPLY_FAILED` state |

State machines for all four are in `bounded-contexts/session-facilitation/canvas.md`.

**Facets not filled** (Aggregate Design Canvas): Throughput and Size not elicited — an estimate
would be `[inferred]`. Left open for all four.

## The six completion rules

| # | Rule | Status |
|---|---|---|
| 1 | Every path completed | **Holds.** `Proposal`/`Resolution` terminals all reachable; `APPLY_FAILED` has exits; deferred interpretation converges when a provider returns; `Session` ends at `CLOSED` |
| 2 | Grammar respected | **Holds.** Command → Aggregate/System → Event, Event → Policy → Command throughout |
| 3 | Every stakeholder reasonably happy | **Holds.** Expert contributes/disposes/is-told-on-failure; Facilitator interprets and proposes; Creator/Invitee start sessions. Engineer is downstream of Derived Artifact Generation, not here |
| 4 | Every hot spot addressed | **Holds with owners.** (a) resolved; #55/#56/#57 owned or flagged-unowned; #27 carried |
| 5 | Boundaries visible | **Holds.** Boundary Commands/Events tabled on the Capture seam; AI Model Provider as external system |
| 6 | Components have consistent behaviour | **Holds.** Four state machines reconciled against the command/event lists. `Proposal`'s 7 states brush the "hidden process" line but are genuine dispositions, not workflow steps |

All six hold, none deferred.

## Hot spots surfaced or resolved this session

- **Resolved:** #46, #47, #51, and hot spot (a) — see `open-questions.md`.
- **Updated / handed on:** #48 (→ `domain-model-capture` resume), #52 (`capture-loop.md`
  superseded in parts, left unedited).
- **New:** #55 (reject reason — minor, unowned), #56 (lapsed-proposal rendering in Flow B — owned
  by `derived-artifact-generation` resume), #57 (`Contribution` not its own aggregate — a
  finding), #58 (lineage cascade — housekeeping).
- **Still open, carried:** #27 (the shape of the context the facilitator gathers before its next
  question) — deliberately left unspecified again; unowned. This is the one remaining genuine
  Session Facilitation modelling gap.

## Provenance summary

| Marker | Count | What |
|---|---|---|
| `[storm]` | 12 | every numbered item above |
| `[inferred]` | 0 | every design point elicited and confirmed directly |
| `[code]` | 0 | no codebase consultation — the repo has only scaffold |

## Hand-off

- `bounded-contexts/session-facilitation/canvas.md` and `ubiquitous-language.md` updated in place
  (both `draft`). Still `draft` pending `ddd-strategic-design` promotion — this skill does not
  promote.
- `context-map.md`: candidate revision recorded for the Capture ↔ Facilitation surface. Adopting
  the wording is `ddd-strategic-design`'s.
- `acceptance-tests.md`: items 32–44.
- **Next workshops:** Domain Model Capture resume (#48 projection-over-log candidate, #49, #50);
  Derived Artifact Generation resume (#56); the facilitator-context question (#27) if it turns out
  to be more than implementation detail. The book's own next action is to prototype — start with
  `Session` and the `Proposal` disposition lifecycle — and write down the questions it raises.