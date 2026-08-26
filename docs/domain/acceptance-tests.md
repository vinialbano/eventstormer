---
workshop: process-modelling
scope: capture-loop
status: draft
last_updated: 2026-08-26
digest: 882d44957659
derived_from:
  - path: boards/capture-loop.md
    digest: bc6ad40750e0
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