---
workshop: design-level
scope: domain-model-capture
status: draft
last_updated: 2026-08-26
digest: 93baefbb2551
derived_from:
  - path: boards/capture-loop.md
    digest: bc6ad40750e0
    at: 2026-08-26
  - path: bounded-contexts/domain-model-capture/canvas.md
    digest: bf2af41bae0a
    at: 2026-08-26
  - path: bounded-contexts/session-facilitation/canvas.md
    digest: 59c06f08153f
    at: 2026-08-26
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

## Design-Level on Domain Model Capture (2026-08-26)

Extracted once the `Board` aggregate and its invariants stabilized. Given/When/Then, asserting
expected state.

12. **Given** three events `A`, `B`, `C` already on the board with `A follows B` and `B follows C`,
    **when** a `Relate` command proposes `C follows A`, **then** it is rejected as a cycle and the
    board's relations are unchanged.

13. **Given** an event `X` with a `follows` edge established in an earlier session of the same
    workshop, **when** a later session (of the same workshop) proposes a new edge that would close
    a cycle through `X`, **then** it is rejected — the cycle check spans the whole workshop's
    accumulated graph, not just the current session.

14. **Given** `A follows B` is the only edge between them, **when** `Insert Between(A, C, B)` is
    applied, **then** the board holds exactly `A follows C` and `C follows B`, `A follows B` no
    longer exists, and this is true atomically — no intermediate state where both the old and new
    edges coexist is ever observable.

15. **Given** event `A` has two successors, `B` and `D` (a branch), **when** `Insert Between(A, C, B)`
    is applied, **then** `A follows D` is untouched; only the `A`–`B` edge is replaced.

16. **Given** a Domain Event with both an incoming and an outgoing `follows` edge, **when**
    `Withdraw` is applied to it, **then** both edges are removed and its former neighbors are
    **not** silently rejoined to each other.

17. **Given** a withdrawn Building Block that, before withdrawal, had several relations, **when**
    `Reinstate` is applied, **then** it returns to the backlog with zero relations — none of its
    former relations are restored, and it is indistinguishable in shape from a freshly captured
    Building Block.

18. **Given** two Building Blocks with no relation between them, **when** each is independently
    `Place`d, **then** both exist on the timeline as two disconnected tracks; **when** they are
    later `Relate`d, **then** the two tracks merge into one.

19. **Given** a resolved Hot Spot with a recorded reference, **when** `Reopen` is applied, **then**
    it returns to `Open` and remains distinct from a new Hot Spot later `Raise`d for a
    recurring-but-differently-caused issue — the two carry different ids.