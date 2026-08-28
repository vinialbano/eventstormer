---
workshop: design-level
scope: session-facilitation
status: draft
last_updated: 2026-08-28
digest: 89ee81a531d0
derived_from:
  - path: boards/capture-loop.md
    digest: bc6ad40750e0
    at: 2026-08-26
  - path: bounded-contexts/derived-artifact-generation/canvas.md
    digest: 99476d0589b3
    at: 2026-08-28
  - path: bounded-contexts/domain-model-capture/canvas.md
    digest: 705129af8f2d
    at: 2026-08-27
  - path: bounded-contexts/session-facilitation/canvas.md
    digest: 192d89ca4269
    at: 2026-08-27
---
# Acceptance tests

Extracted at the end of Process Modelling on "the capture loop" (2026-08-25), once the model
stabilized. Given/When/Then, asserting expected state — not merely that an event fired.

1. **Given** a `Question Asked` receives no reply at all before the session closes, **when** the
   session closes, **then** a `Hot Spot Raised` exists for that question.

2. **Given** a contribution names two absent stakeholders in one answer, **when** it is
   interpreted, **then** two independent `Hot Spot Raised` instances exist, one per named person.

3. **Given** a contribution yields two proposal-worthy judgments, **when** one proposal is
   accepted and the other is rejected, **then** exactly one Building Block exists on the board,
   and the rejected proposal produces none.

4. **Given** a proposal for a Hot Spot is accepted, **when** the creation policy runs, **then**
   the resulting `Hot Spot Raised` is indistinguishable in kind from one raised automatically by
   policy — same event, same downstream handling, regardless of route.

5. **Given** the expert's contribution to a `Question Asked` is off-topic — it produces a
   `Building Block Proposed` but no question-resolving event (`Question Answered` /
   `Knowledge Gap Revealed` / `Absent Stakeholder Named` / `Complete Perspective Confirmed`) —
   **when** the session closes, **then** a `Hot Spot Raised` exists for that question, identical
   in kind to one from a question that got no reply at all.

## Design-Level on Session Facilitation (2026-08-26)

Extracted once the `Workshop`/`Session` model and the resolution mechanic stabilized. Given/When/Then,
asserting expected state.

6. **Given** a workshop with creator Alice and an invitee Bob whose invitation is still `INVITED`
   (not yet accepted), **when** Bob attempts `Start Session`, **then** it is rejected and no
   session is created.

7. **Given** a workshop with one open session, **when** anyone — including the creator — attempts
   `Start Session` again, **then** it is rejected; exactly one open session exists for that
   workshop.

8. **Given** Bob's invitation is `INVITED` (not yet accepted), **when** the creator revokes it,
   **then** it moves to `REVOKED` and a subsequent `Start Session` attempt by Bob is rejected.

9. **Given** an open hot spot, informational or model-affecting, **when** a contribution is
   interpreted as resolving it, **then** a `Resolution Proposed` exists and the hot spot stays open
   **until** `Accept Resolution` fires — at which point `Hot Spot Resolved` fires, carrying a
   recorded reference.

10. **Given** a `Resolution Proposed`, **when** `Reject Resolution` fires instead, **then** the hot
    spot remains open, unaffected.

11. **Given** one contribution is interpreted as both resolving an existing hot spot **and**
    proposal-worthy for a new Building Block, **when** the interpretation is processed, **then**
    both a `Resolution Proposed` and a `Building Block Proposed` are created independently —
    rejecting one has no effect on the other.

## Design-Level on Domain Model Capture (2026-08-26, revised 2026-08-27)

Extracted once the model stabilized. Given/When/Then, asserting expected state. **Revised
2026-08-27** once the aggregate design collapsed from four Building Block aggregates plus
`Timeline` into one event-sourced `Board` (see
`sessions/2026-08-27-design-level-domain-model-capture-board.md`): every operation is validated
against the projection of the whole workshop operation log, and the connected-component grouping
("timeline" tracks) is a derived read model, not an aggregate. Observable behavior is unchanged;
the tests now speak of the `Board` and its projection.

12. **Given** events `A`, `B`, `C` in one workshop's `Board` with `A follows B` and `B follows C`,
    **when** a `Sequence` operation proposes `C follows A`, **then** it is rejected as a cycle with
    the offending path named, and the operation log is unchanged.

13. **Given** an event `X` with a `follows` edge appended to the `Board` in an earlier session of
    the same workshop, **when** a later session proposes an edge that would close a cycle through
    `X`, **then** it is rejected — the cycle check folds the whole operation log, not just the
    current session's operations.

12a. **Given** events `A`, `C`, `B` where `C` already has a `follows` path to `A`, **when**
    `Insert Between(A, C, B)` is applied, **then** it is rejected as a cycle — `Insert Between` is
    cycle-checked exactly like `Sequence`, with no "`C` must be a fresh event" exception (#50).

14. **Given** `A follows B` is the only edge between them, **when** `Insert Between(A, C, B)` is
    applied, **then** the projection holds exactly `A follows C` and `C follows B`, `A follows B`
    no longer exists, and this is one operation in the log — no intermediate state where both the
    old and new edges coexist is ever observable (#34).

15. **Given** event `A` has two successors, `B` and `D` (a branch), **when** `Insert Between(A, C, B)`
    is applied, **then** `A follows D` is untouched; only the `A`–`B` edge is replaced.

16. **Given** a Domain Event with an incoming and an outgoing `follows` edge and no other path
    connecting its neighbors, **when** `Withdraw` is applied, **then** both edges are removed, its
    former neighbors are **not** silently rejoined, and the connected-component read model
    recomputes to two tracks.

16a. **Given** the same setup as 16 but the neighbors are *also* connected by a second, longer path
    (a diamond), **when** `Withdraw` is applied to the middle event, **then** both its edges are
    removed but the connected-component read model still finds exactly one track — the remaining
    path connects everything.

17. **Given** a withdrawn Building Block that, before withdrawal, had several relations, **when**
    `Reinstate` is applied, **then** it returns naked — no `causedBy`, no annotation, no placement
    — indistinguishable in shape from a freshly captured Building Block.

18. **Given** two Domain Events with no relation between them, **when** each is independently
    `Place`d, **then** the connected-component read model shows two single-event tracks; **when**
    they are later `Sequence`d together, **then** it shows one track — with **no aggregate merge
    transaction**, just one more `Sequence` operation appended.

18a. **Given** a workshop's full operation log, **when** it is folded from empty, **then** the
    reproduced graph is identical to the current projection — building blocks, both relation kinds,
    annotations, placement, and hot-spot state (F01 line 625).

19. **Given** a resolved Hot Spot with a recorded reference, **when** `Reopen` is applied, **then**
    it returns to `Open` and remains distinct from a new Hot Spot later `Raise`d for a
    recurring-but-differently-caused issue — the two carry different ids.

19a. **Given** a Hot Spot resolved with a reference naming Building Block `B`, **when** `B` is later
    `Withdraw`n, **then** the Hot Spot stays `Resolved` and the reference value is unchanged — the
    reference is a recorded value, not a live pointer, and no cascade touches it (#49).

20. **Given** a Domain Event `E` linked as caused by Actor `X` (`Link Cause`), **when** `X` is
    `Withdraw`n, **then** `E`'s `causedBy` list no longer references `X` — the `Board` appends
    `Unlink Cause` as a follow-on operation, without a separate explicit command.

20a. **Given** an Actor `X` that has been `Withdraw`n, **when** a `Link Cause` operation names `X`
    as the source, **then** it is rejected as a no-op with an explicit message, and the log is
    unchanged (#49).

20b. **Given** an `Annotate` operation naming a target id that no Building Block has, **when** it is
    applied, **then** it is rejected and the log is unchanged (#49).

21. **Given** a Hot Spot `H` annotates Domain Event `E`, **when** `E` is `Withdraw`n, **then** `H`
    is also withdrawn — the `Board` appends the cascade as a follow-on operation, rather than
    blocking the withdrawal of `E`.

## Design-Level on Derived Artifact Generation (2026-08-27, revised 2026-08-28)

Extracted once the model stabilized; tests 22, 26–30 rewritten on the 2026-08-28 resume that
retired Flow C and reconciled to PRD F10 (deterministic-only, no language model).
Given/When/Then, asserting expected state.

22. **Given** a model at operation-log position N, **when** `Export Model` (JSON), `Export Model`
    (readable account) and `Export Model Summary` are each run twice with no intervening
    operation, **then** each pair of outputs is byte-identical.

23. **Given** a building block labelled "Order Plced" that is referenced in the readable account,
    **when** it is `Reword`ed to "Order Placed" and `Export Model` (readable account) is run,
    **then** the account shows "Order Placed" everywhere that block's label is rendered as a
    reference.

24. **Given** a transcript segment and a stored proposal rationale that both contain the literal
    text "Order Plced", **when** the building block is `Reword`ed to "Order Placed" and
    `Export Model` (readable account) is run, **then** the quoted evidence still reads "Order
    Plced" verbatim — the rewording does not propagate into frozen free text.

25. **Given** a Big Picture session in which the stakeholder check step was never run, **when**
    `Export Model` or `Export Model Summary` is run, **then** the artifact states that the
    stakeholder check was not run, distinct from a statement that it was run and found nothing.

26. **Given** a model, **when** the Domain Expert requests only the model summary, **then** no
    model export and no transcript export are produced — requesting one artifact never produces
    another.

27. **Given** the live in-app readable account rendered at operation-log position N, **when** a
    further operation is applied (position N+1), **then** the in-app account re-renders to reflect
    position N+1 with no staleness signal — it tracks the model the same way the board does.

28. **Given** a session with three conversation turns, the second of which produced a proposal
    accepted and applied as building block `B`, **when** `Export Session Transcript` is run,
    **then** the artifact contains all three turns in order and the second is annotated with the
    proposal and its disposition "applied as B".

29. **Given** a session with four proposals — one applied as `B`, one rejected by the expert, one
    never taken up (lapsed quiet at close), one accepted then apply-failed (hot spot raised) —
    **when** `Export Session Transcript` is run, **then** each of the four terminal dispositions
    is rendered distinctly on its turn.

30. **Given** a session in which contributor X accepted 3 proposals, edited 1 and rejected 2,
    **when** `Export Session Transcript` is run, **then** the artifact reports, for contributor X,
    accepted 3 / edited 1 / rejected 2 — counts only.

31. **Given** a JSON model export, **when** it is re-imported, **then** the reproduced model is
    identical — building blocks, both relation kinds, annotations, provenance, and the operation
    log.

## Design-Level on Session Facilitation — the session runtime (2026-08-27)

Extracted once the `Session` / `Proposal` / `Resolution` aggregates and the apply-confirmation
round trip stabilized. Given/When/Then, asserting expected state.

32. **Given** the AI Model Provider is unavailable, **when** a contribution is made, **then**
    `Contribution Made` is recorded on the session and no `Contribution Interpreted` exists;
    **when** a model returns, **then** the contribution is interpreted exactly once.

33. **Given** a contribution that has already been interpreted, **when** `Interpret Contribution`
    fires again for the same contribution id, **then** no second `Contribution Interpreted` is
    produced and no duplicate proposals are created.

34. **Given** a contribution interpreted as proposal-worthy but with no question-track judgment
    (an off-topic answer), **when** the session closes, **then** a `Hot Spot Raised` exists for the
    triggering question and the proposal is unaffected.

35. **Given** a proposal in `ACCEPTED`, **when** Domain Model Capture emits `Operation Rejected`
    because the target building block was withdrawn, **then** the proposal is in `APPLY_FAILED`
    carrying that reason, and `Edit Proposal` and `Accept Proposal` are both accepted from that
    state.

36. **Given** a proposal in `APPLY_FAILED`, **when** the session closes without the expert
    re-accepting it, **then** the proposal is `LAPSED` and a `Hot Spot Raised` exists referencing
    it.

37. **Given** a proposal in `PROPOSED` that the expert never acted on, **when** the session closes,
    **then** the proposal is `LAPSED` and no hot spot is raised for it.

38. **Given** a proposal in `ACCEPTED` with its apply in flight, **when** the session closes and
    `Operation Applied` then arrives, **then** the proposal is `APPLIED` and the building block
    exists.

39. **Given** two resolutions for the same open hot spot, **when** the first is accepted and
    applied (`Hot Spot Resolved`) and the second is then accepted, **then** the second lands in
    `LAPSED` with an "already resolved" reason, there is no retry path, and the hot spot carries
    exactly one recorded reference.

40. **Given** a `Resolution Proposed`, **when** `Reject Resolution` fires, **then** the hot spot
    stays `Open` and no reference is recorded.

41. **Given** a workshop with one open session, **when** `Start Session` is attempted by an
    eligible user, **then** it is rejected and the existing session is untouched; **when** that
    session closes and `Start Session` is retried, **then** a new session is created.

42. **Given** Bob's invitation is `REVOKED`, **when** Bob attempts `Start Session`, **then**
    `Workshop.canStartSession` is false, the attempt is rejected, and no `Session` is created.

43. **Given** questions Q1 (answered) and Q2 (open) in a session, **when** `Close Session`
    commits, **then** `Session Closed` carries exactly `[Q2]` and a `Hot Spot Raised` exists for
    Q2 only.

44. **Given** the stakeholder-check question, **when** a contribution is interpreted as
    `complete-perspective`, **then** that question is `Resolved` and the workshop's chosen-problem
    qualification is set.

## Design-Level — Session Facilitation, the facilitator's context (2026-08-27, pass 3)

45. **Given** a workshop whose `scope` is `Scope Set`, **when** `Set Scope` is issued again during
    the first session, **then** it is rejected and `Workshop.scope` is unchanged; **when** it is
    issued in a later session, **then** it is likewise rejected.

46. **Given** a workshop with two closed sessions and one open session, **when** the `Ask Question`
    policy fires, **then** `Facilitation context` contains the frozen summaries of exactly the two
    closed sessions plus the live inputs (recent transcript, open questions, open hot spots,
    thin/unopened regions, `Workshop.scope`) recomputed as of that turn.

47. **Given** an open session with question Q1 still open and a new contribution just interpreted,
    **when** the facilitator takes its next turn, **then** `Facilitation context`'s live half
    reflects the new contribution and Q1's state, and its `Prior-session history` half is byte-for-byte
    unchanged from the previous turn.

48. **Given** a session with question Q1 open and a building block that looks like an unexpanded
    phase name, **when** `Close Session` commits, **then** the frozen facilitation summary for that
    session is written in the same transaction as the unresolved-question snapshot, and both are
    consistent as of the close.