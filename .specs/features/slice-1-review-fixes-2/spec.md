# Slice 1 — capture-loop review fixes, round 2

Corrective batch against **round 2** of the automated review of PR #46
([summary comment](https://github.com/vinialbano/eventstormer/pull/46#issuecomment-5474734220)).
Parent feature: [`slice-1-capture-loop`](../slice-1-capture-loop/spec.md) (issue #38); follows
[`slice-1-review-fixes`](../slice-1-review-fixes/spec.md) (round 1). No new product surface — every
item is a defect or precision fix in code already on the `slice-1-capture-loop` branch.

## Problem Statement

Round 2 returned **READY — 0 BLOCK, 0 WARN, 7 NOTE**. The slice is mergeable; the NOTEs are
small silent-degradation gaps and stale comments. This batch closes the ones that are *needed* —
two latent robustness bugs in the SPA and four comment/doc inaccuracies — and explicitly defers
the rest.

## Goals

- [ ] A `failed`-interpretation contribution never shows the "try rephrasing" hint when the
      facilitator already replied with a question or notice (matches the existing `derived` rule).
- [ ] The interpretation short-poll keeps running if a polled store's `refetch` rejects.
- [ ] The attempt-timeout comments in `anthropic-adapter.ts` state the true compounded ladder
      ceiling and the abort-path token-log gap.
- [ ] The dock's post-scope opening prompt is marked as UI chrome, not a facilitator turn.
- [ ] The `deriveTracks` partial-write gap on a since-closed session is recorded next to AD-021.

## Out of Scope

| Item (round-2 NOTE / quick win) | Reason |
| --- | --- |
| NOTE 1 (alt) — lower `attemptTimeoutMs` default to ~15 s | Behaviour change to a tuning constant with no evidence the default is wrong; the comment fix removes the actual defect (a misleading claim). |
| NOTE 6 (alt) — extend the half-closed sweep to re-derive closed sessions | Touching the crash-safety net for a sub-millisecond crash window (missing card, no corruption) is the risk round 1 already declined for NOTE 1. Documenting the accepted gap next to AD-021 is the right weight. |
| Round-2 NOTE re `accept.ts` has no session-state check | Explicitly a *verified match* of the accepted AD-016/017 two-stream crash window — not a new finding. |
| QW — `\bT[0-9]+\b` / `MAJOR` patterns in the process-id gate | Belongs in PR #47 (`chore/harness-process-id-gate`), which automates the check. |
| NOTE 1 — `reconcilePendingDerivations` re-walk per tick; NOTE 6 — cross-session starvation | Carried from round 1; deferred as out of v1 single-user scope. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Round-2 NOTEs 4 and 7 are the only NOTEs needing code | The other five are comment/doc-only or deferred (see Out of Scope) | Round-2 review tiered every finding NOTE; the two SPA ones are latent failure modes, the rest are accuracy | y (from the review) |
| The `failed` branch reuses the same `answered` guard as `derived` | Gate `failed` on `!answered` | The round-1 intent ("a turn never looks dropped … unless it already answered") applies identically to both outcomes; a failed turn that carried a question is contradictory UX | y (agent default, logged) |
| Doc for NOTE 6 lives as a code comment in `interpret.ts` + a line under AD-021 in `.specs/STATE.md` | Not a new AD | It is a known-gap annotation on an existing decision, not a new decision | y (agent default, logged) |

**Open questions:** none — all resolved or logged above.

Remaining implicit-requirement dimensions N/A for this scope (no persistence, auth, or new
external calls; the concurrency/failure dimensions are exactly what the ACs below cover).

---

## User Stories

### P1: Consistent facilitator replies in the dock feed ⭐ MVP

**User Story**: As a workshop creator, I want the facilitator's dock replies to be consistent so a
failed turn that also asked me something doesn't nag me to rephrase.

**Acceptance Criteria**:

1. WHEN a contribution's interpretation `status = failed` AND the next transcript turn is a
   `question` or `notice` THEN the feed SHALL NOT render the "try rephrasing" hint for that
   contribution.
2. WHEN a contribution's interpretation `status = failed` AND there is no following
   `question`/`notice` turn THEN the feed SHALL render the "try rephrasing" hint (unchanged).
3. WHEN a contribution's interpretation `status = derived` with no proposal cards THEN the
   existing `!answered`-gated "Noted — nothing to capture from that one." behaviour SHALL be
   unchanged.

**Independent Test**: mount `FacilitatorDock` with a `failed` contribution followed by a
`question` turn → feed text does not contain "try rephrasing"; drop the question turn → it does.

---

### P1: The interpretation poll survives a store refetch failure ⭐ MVP

**User Story**: As a workshop creator, I want new proposal cards to keep appearing even if one
poll request fails, so the dock never gets stuck on a permanent spinner.

**Acceptance Criteria**:

4. WHEN `useInterpretationPoll`'s `tick()` runs and one of `session.refetch()` /
   `proposals.refetch()` rejects THEN the poll SHALL still schedule the next tick (the loop is
   not wedged) and `polling` SHALL remain `true` while `shouldPoll` holds.
5. WHEN every `refetch` resolves THEN poll scheduling behaviour SHALL be unchanged (polls while a
   contribution is in flight or the scope is unset; idle once fully derived).

**Independent Test**: with fake timers, stub `proposals.refetch` to reject once, advance the
interval twice → `poll.polling.value` is still `true` and a second `session.refetch` call was made.

---

### P1: `classifyThrown` trusts the SDK's retryable flag

**User Story**: As a workshop creator, I want a transient provider error the AI SDK already knows
is retryable to walk the model ladder instead of terminally failing my contribution.

**Acceptance Criteria**: AC 10 (below).

**Independent Test**: scripted `generate` throws `{ isRetryable: true }` with no `statusCode` on
rung 1, a valid turn on rung 2 → `interpret()` resolves ok and walked two rungs.

---

### P2: Accurate comments on the facilitator adapter and dock

**User Story**: As the next engineer in this code, I want the comments to be true so I don't
trust a wrong ceiling or mistake UI copy for a model contract.

**Acceptance Criteria**:

10. WHEN a thrown error carries `isRetryable === true` (the AI SDK's `APICallError` retryable
    flag) THEN `classifyThrown` SHALL return `provider-down`, checked before the generic
    `4xx → schema-invalid` fallthrough. `NoObjectGeneratedError` still classifies `schema-invalid`
    first; a genuine non-retryable `4xx` (e.g. `400`, `413`) still classifies `schema-invalid`.

6. The `anthropic-adapter.ts` comment near `DEFAULT_ATTEMPT_TIMEOUT_MS` SHALL state that one
   `generateText` call is bounded at the timeout but a full `interpret()` walks the whole ladder
   (≈ 3 × timeout + backoffs) before returning.
7. The `runStep` catch branch in `anthropic-adapter.ts` SHALL note that a timed-out attempt logs
   `usage: 0` even though the request may have reached the provider and been billed
   (under-accounting, not double-billing).
8. `FacilitatorDock.vue`'s post-scope opening prompt SHALL carry a one-line comment that it is a
   UI affordance (brief §5), not a `facilitator.askOpening` turn.
9. `interpret.ts` near `deriveTracks` SHALL note that a crash mid-derivation on a session that is
   then closed leaves later tracks underived (`reconcilePendingDerivations` sweeps open sessions
   only) — a missing card, not corruption — and `.specs/STATE.md` AD-021 SHALL carry the same
   note.

**Independent Test**: `grep` the four sites for the new wording; `pnpm check` stays green.

---

## Requirement Traceability

| Requirement ID | Story | Status |
| --- | --- | --- |
| R2FIX-01 | P1: dock replies (AC 1–3) | Pending |
| R2FIX-02 | P1: poll survives refetch failure (AC 4–5) | Pending |
| R2FIX-03 | P2: adapter comments (AC 6–7) | Pending |
| R2FIX-04 | P2: dock opening-prompt comment (AC 8) | Pending |
| R2FIX-05 | P2: deriveTracks gap doc (AC 9) | Pending |
| R2FIX-06 | P1: `classifyThrown` honours `isRetryable` (AC 10) | Pending |

**Coverage:** 6 requirements, all mapped to execution steps.

## Success Criteria

- [ ] `pnpm check` green after every step (typecheck → lint → test → depcruise → knip).
- [ ] New unit tests for R2FIX-01 (2 cases) and R2FIX-02 (1 case); no existing test weakened.
- [ ] Verifier pass writes `validation.md` — PASS, per-AC evidence, discrimination sensor.
