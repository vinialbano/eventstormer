---
workshop: design-level
scope: session-facilitation
status: draft
last_updated: 2026-08-26
digest: 18e1aede9374
derived_from:
  - path: boards/capture-loop.md
    digest: bc6ad40750e0
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