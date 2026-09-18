# Slice 5c — Honest-Record Hardening Specification

GitHub issue: [#94](https://github.com/vinialbano/eventstormer/issues/94) · Blocked by #92
(Slice 5b) · Blocks #43 (Slice 6) · Parent effort map #9 · Version target **0.8.0** (`minor`
changeset — it adds a `Resolution` event surface and a transcript contract field) · The version
PR is the only writer of `package.json` `version`
([ADR-009](../../../docs/adr/009-versioning-and-release.md)).

**Status**: Design — spec confirmed (2026-09-18).

## Problem Statement

The slice-5b model audit (`.specs/features/slice-5b-facilitator-eval-demo-seed/model-audit.md`)
found that `applyOperation`'s converged no-op propagates past the accept chain into every
derived surface. Slice 5b fixes the proposal / resolution **card** (the `Superseded` marker +
an explicit `ApplyResult` outcome). This slice closes the rest of that surface — the parts that
lean "harden the record" rather than "the racing user's card":

- **F4** — the F19 session transcript folds only `Proposal` streams, so a hot-spot resolution
  (applied, lapsed, bounced, or — post-5b — superseded) leaves **no trace** in the "verbatim
  account" F19 promises.
- **F5** — `sessionSummary.blocksAdded` counts converged no-op `Operation Applied` events,
  inflating the F10 summary past what the board actually holds.
- **F6** — a board rejection outside `review-resolution`'s curated `LAPSE_REASONS` returns 422
  and writes nothing, leaving the `Resolution` stuck `ACCEPTED` with no recorded outcome and no
  reconciliation backstop.
- **F7** — a crash between the board append and the outcome append (AD-016's known window)
  leaves a `Proposal` / `Resolution` stuck `ACCEPTED`; nothing re-drives it — only the human
  re-accepting heals it.
- **F9** — the board decider's convergence-to-`ok([])` is deliberately scoped to the
  facilitator-reachable kinds, but `decide.ts` says so nowhere, so a future reader reads the
  `decideWithdraw` / `decideUnsequence` asymmetry as a bug.

## Goals

- [ ] The F19 transcript is a complete account — every `propose-resolution` track appears with
      its disposition, reference, and (if any) superseded-by, folded from the `Resolution`
      streams.
- [ ] The F10 summary's `blocksAdded` equals the number of building blocks the board holds for
      that session's applied proposals — never inflated by a converged no-op.
- [ ] No `Proposal` / `Resolution` can sit `ACCEPTED` indefinitely with no recorded apply
      outcome; the reconciliation tick finishes it.
- [ ] `decide.ts` states the convergence-scope decision in one line.

## Out of Scope

| Feature | Reason |
| --- | --- |
| The `Superseded` marker event, `ApplyResult` outcome discriminant, dock superseded state | Slice 5b (`SUPS-01…07`) — this slice consumes them, does not build them. |
| Widening `BoardWriteModel` with placement / labels (`decideReword` / `decidePlace` converge to `ok([])`) | Slice 6 (STATE handoff). |
| Removing the dead `already-related` / `already-resolved` board error variants (audit F8) | Slice 6 (issue #43). |
| Making `decideWithdraw` / `decideReinstate` / `decideReopen` / `decideUnsequence` / `decideUnannotate` converge like the AD-038 family (audit F9's *change*) | Deferred — not needed for single-user v1. This slice only adds the **comment** recording the deliberate scope. |
| A new eval / seed / facilitator behaviour | Slice 5b. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| `blocksAdded` honesty mechanism | Once 5b's `ApplyResult` outcome + `Superseded` marker exist, `sessionSummary` counts an `Operation Applied` only when it is not on a superseded stream and its proposal's recorded apply outcome was `appended` (not `already-satisfied`) | The recorded facts already distinguish the cases after 5b; no board read needed | y |
| Stuck-`ACCEPTED` sweep scope | Extend `reconcilePendingDerivations` (open sessions only, per AD-021's accepted bound) to re-drive any `Proposal` / `Resolution` that is `ACCEPTED` with no subsequent apply-outcome event, through the existing idempotent accept→apply path | Reuses AD-021's pattern and its documented open-sessions-only limitation; the apply chain is already idempotent (AD-038, `duplicate-id`) | y |
| `review-resolution` rejection recording | Keep the `LAPSE_REASONS` allow-list gating the write: only `kind-permission` / `withdrawn-target` / `unknown-target` append `Record Resolution Rejected { reason }` (→ terminal `LAPSED`, per `resolution/model.ts`'s "no `APPLY_FAILED`" invariant). A `classification: 'systemic'` reason (e.g. `kind: 'schema'`) is left unrecorded — the `Resolution` stays `ACCEPTED`, the 422 keeps resurfacing on retry, and `stuck-accepted-sweep.ts` re-drives + warns on it every tick | The allow-list was a curated guess, but widening it to cover `schema` too would let a genuine bug convert into a silent, permanent false-success on the very next retry (`LAPSED` short-circuits to 200 with no reopen path) — the opposite of an honest record. Since F7's sweep now exists in this same slice, a systemic rejection staying visibly `ACCEPTED` (retried and logged every tick) is more honest than a false terminal success | y |
| Transcript resolution lane shape | One entry per `propose-resolution` track in `SessionTranscriptContract`: `{ resolutionId, hotSpotId, reference, disposition, supersededByReference? }`, ordered by `sessionResolutionIds` (stream order); `renderTranscript` gains a formatting branch, stays pure | Mirrors the existing proposal lane; `resolutionsView` already computes all of it | y |
| Version bump | `minor` (0.8.0) | Adds a `Resolution` event and a transcript contract field — additive but a schema change | y |

**Open questions:** none — all resolved or logged above.

---

## User Stories

### P1: The F19 transcript accounts for resolutions ⭐ MVP

**User Story**: As a domain expert exporting the verbatim session transcript, I want every hot
spot I resolved (or tried to) to appear with what happened to it, so that the transcript is the
complete record F19 promises and not just the proposal half.

**Why P1**: Without it, 5b's superseded-resolution marker is invisible in the one artifact meant
to be the full account.

**Acceptance Criteria**:

1. WHEN `sessionTranscript` is folded THEN the `SessionTranscriptContract` SHALL carry a
   resolution lane — one entry per `propose-resolution` track — with `resolutionId`, `hotSpotId`,
   `reference`, `disposition`, and `supersededByReference` when the `Resolution` stream carries a
   `Resolution Superseded` event.
2. WHEN a resolution is `APPLIED` and superseded THEN its transcript entry SHALL read as
   superseded (another contribution's reference was kept), not as a plain applied resolution.
3. WHEN `renderTranscript` renders the lane THEN it SHALL remain a pure function of the contract
   (same contract in → byte-identical Markdown out — ADR-008).
4. WHEN a session proposed no resolutions THEN the lane SHALL be absent from the rendered
   transcript, not an empty heading.

**Independent Test**: Fold a session with one applied, one lapsed, and one superseded
resolution; assert three contract entries with the right dispositions; snapshot the rendered
Markdown.

---

### P1: `blocksAdded` counts only what the board holds

**User Story**: As either user reading the F10 summary, I want the "blocks added" count to match
the board, so that a race or a converged no-op does not make the session look more productive
than it was.

**Why P1**: A wrong count in the headline summary is a visible integrity defect.

**Acceptance Criteria**:

1. WHEN `sessionSummary` computes `blocksAdded` THEN it SHALL exclude any `Operation Applied`
   whose proposal stream carries a `Model Change Superseded` event.
2. WHEN a proposal's recorded apply outcome is `already-satisfied` (converged no-op, per 5b's
   `ApplyResult` outcome) THEN it SHALL NOT contribute to `blocksAdded`.
3. WHEN every proposal applied normally THEN `blocksAdded` SHALL be unchanged from today's
   value (no regression on the happy path).

**Independent Test**: Given two proposals racing one relation (one `appended`, one
`already-satisfied`), assert `blocksAdded` counts one. Given a superseded reword, assert it is
not counted.

---

### P1: No stream stuck `ACCEPTED`

**User Story**: As the system, I want any proposal or resolution left mid-apply to be finished by
the reconciliation tick, so that a crash or an unclassified rejection never leaves a permanent
in-flight record.

**Why P1**: Audit F6/F7 — a reachable state (crash window AD-016; a domain-legitimate board
rejection outside the curated set) with no backstop.

**Acceptance Criteria**:

1. WHEN `review-resolution` receives a board rejection whose `reason` is `kind-permission`,
   `withdrawn-target`, or `unknown-target` THEN it SHALL append a `Hot Spot Resolution Rejected
   { reason }` event to the `Resolution` stream (via the `Record Resolution Rejected` command)
   before returning 200 — this is the only path to a terminal `LAPSED` `Resolution`.
2. WHEN `review-resolution` receives a board rejection whose `classification` is `'systemic'`
   (a reason outside the set in (1), e.g. `kind: 'schema'`) THEN it SHALL append nothing, leave
   the `Resolution` `ACCEPTED`, and return 422 with that reason and classification — a systemic
   rejection SHALL NOT be able to reach the terminal `LAPSED` disposition, because `Resolution`
   has no `APPLY_FAILED` state to recover from once there (see `resolution/model.ts`).
3. WHEN `reconcilePendingDerivations` runs and finds a `Proposal` or `Resolution` that is
   `ACCEPTED` with no later apply-outcome event THEN it SHALL re-drive it through the existing
   idempotent accept→apply path and record the outcome (or, for a systemic rejection per (2),
   leave it `ACCEPTED` and log a `warn` — the sweep is what keeps a systemic bounce visible).
4. WHEN the re-drive runs twice (two ticks) on the same stream THEN the second SHALL be a no-op
   (idempotent — `duplicate-id` / `already-satisfied` / terminal disposition), and for a
   systemic rejection SHALL re-surface the identical 422 rather than silently succeeding.
5. WHEN the stuck stream belongs to a closed session THEN it SHALL be left as-is (consistent
   with AD-021's accepted open-sessions-only sweep bound) and the limitation SHALL be noted in
   the sweep's doc comment.
6. WHEN the sweep re-drives a stream THEN it SHALL log at `info`; a stream still stuck after a
   bounded number of ticks SHALL log at `warn`. A re-drive that throws SHALL be caught and
   logged per candidate, never abort the sweep for any other stuck candidate in the same tick.

**Independent Test**: Fault-inject a crash between the board append and the outcome append;
run the tick; assert the proposal reaches `APPLIED`. Return a `kind-permission`/`withdrawn-target`/
`unknown-target` board rejection from `review-resolution`; assert the `Resolution` stream ends
`Hot Spot Resolution Rejected` (disposition `LAPSED`), not `ACCEPTED`. Return a `classification:
'systemic'` rejection (e.g. `kind: 'schema'`); assert the `Resolution` stream is unchanged (stays
`ACCEPTED`) and a second call returns the same 422, not a `200`. Make one of two stuck-`ACCEPTED`
candidates in the same session throw during re-drive; assert the other candidate still converges
in that same sweep pass.

---

### P2: `decide.ts` states the convergence scope

**User Story**: As the next person to read the board decider, I want one line saying why
`decideWithdraw` and friends return an error where the AD-038 family returns `ok([])`, so that
the asymmetry does not read as a bug.

**Acceptance Criteria**:

1. WHEN `decide.ts` is read THEN a comment near the convergence branches SHALL state that
   `ok([])` convergence is deliberately scoped to the facilitator-reachable kinds
   (relation / pivotal / `resolve` / `insert-between` / `unlink-cause`) and that
   `withdraw` / `reinstate` / `reopen` / `unsequence` / `unannotate` stay genuine failures for
   single-user v1.
2. WHEN `pnpm check`'s process-ids step runs THEN the comment SHALL carry no `.specs/` id
   (AGENTS.md) — it may cite `AD-038` and `docs/adr` only.

**Independent Test**: `grep` the comment; run `pnpm check:process-ids`.

---

### P2: Edit a relation / pivotal endpoint from the dock

**User Story**: As a participant reviewing a facilitator-proposed relation or pivotal, I want to
correct a wrong endpoint from the card, so that I do not have to reject it and wait for a
re-propose.

**Why P2 / here**: Descoped from slice 5b PCARD-04 (2026-09-09) — the reword `newLabel` edit
shipped in 5b (`6953ead`); the endpoint swap needs an endpoint selector + `RELATION_FIELDS`
mapping + `unknown-label` handling, which is real UI beyond 5b. The server contract already
exists (`POST /proposals/:id/edit { field, label }`).

**Acceptance Criteria**:

1. WHEN a `relation` model-change card is edited THEN the dock SHALL let the person choose an
   endpoint (mapped to its `field` via `RELATION_FIELDS[relationKind]`) and enter the
   replacement block's current board label, and `POST /proposals/:id/edit { field, label }`.
2. WHEN the entered label matches no current board block THEN the card SHALL surface the server's
   `unknown-label` 422 without losing the person's other input.
3. WHEN a `pivotal` card's `target` is edited THEN it SHALL `POST … { field: 'target', label }`.
4. WHEN the app `ProposalIntent` type is extended THEN it SHALL mirror the server `IntentCard`
   exactly (a store test fails on drift).

**Independent Test**: Component-test the endpoint selector + label input for a `sequence` card;
assert the POST body; assert the 422 path keeps the form open.

---

## Edge Cases

- WHEN a `Resolution` stream has a `Superseded` event but no `Record Hot Spot Resolved` (5b's
  in-place substitution) THEN the transcript lane disposition SHALL read `superseded` (per AC2 —
  not a plain `applied`) with `supersededByReference` set.
- WHEN `reconcilePendingDerivations` re-drives an `ACCEPTED` proposal whose session closed
  between the tick's read and its write THEN the apply SHALL be rejected `session-closed` and
  the proposal left for the next open-session pass (there is none — accepted gap, documented).
- WHEN `blocksAdded` is computed for a session predating this slice (no `ApplyResult` outcome
  recorded on old streams) THEN it SHALL fall back to counting all `Operation Applied` (no
  crash on historical data).

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| HREC-01 | P1: transcript resolution lane (contract) | Verify | ✅ Verified |
| HREC-02 | P1: transcript superseded rendering | Verify | ✅ Verified |
| HREC-03 | P1: `renderTranscript` stays pure | Verify | ✅ Verified |
| HREC-04 | P1: no empty lane heading | Verify | ✅ Verified |
| HREC-05 | P1: `blocksAdded` excludes superseded | Verify | ✅ Verified |
| HREC-06 | P1: `blocksAdded` excludes `already-satisfied` | Verify | ✅ Verified |
| HREC-07 | P1: `blocksAdded` happy-path unchanged | Verify | ✅ Verified |
| HREC-08 | P1: `review-resolution` records every rejection | Verify | ✅ Verified |
| HREC-09 | P1: sweep re-drives stuck `ACCEPTED` | Verify | ✅ Verified |
| HREC-10 | P1: sweep re-drive idempotent | Verify | ✅ Verified |
| HREC-11 | P1: closed-session bound documented | Verify | ✅ Verified |
| HREC-12 | P1: sweep logging levels | Verify | ✅ Verified |
| HREC-13 | P2: `decide.ts` convergence-scope comment | Verify | ✅ Verified |
| HREC-14 | P2: comment carries no `.specs/` id | Verify | ✅ Verified |
| HREC-15 | P2: dock relation-endpoint edit (`field` + `label` POST) | Verify | ✅ Verified |
| HREC-16 | P2: `unknown-label` 422 keeps the form open | Verify | ✅ Verified |
| HREC-17 | P2: pivotal `target` edit; app `ProposalIntent` mirrors server | Verify | ✅ Verified |

**Coverage:** 17 total, 17 verified. See
`.specs/features/slice-5c-honest-record-hardening/validation.md` for the full evidence report
(spec-anchored AC table, discrimination sensor, gate results). HREC-17 carries one
spec-precision note (the drift guard is a typecheck-time fixture, not a runtime assertion — not a
gap). (HREC-15–17 descoped from 5b PCARD-04.)

---

## Implicit-Requirement Dimensions Sweep

| Dimension | Resolution |
| --- | --- |
| Input validation & bounds | Transcript contract fields are folded from validated `Resolution` events; no new external input. |
| Failure / partial-failure states | HREC-08/09 are the failure-recording and backstop this slice exists for. |
| Idempotency / retry / duplicate handling | HREC-10: the sweep re-drive is idempotent through the existing apply chain (AD-038). |
| Auth boundaries & rate limits | N/A — local single-user tool. |
| Concurrency / ordering | HREC-09 handles the crash-window and unclassified-rejection races; the sweep is the existing tick, one pass at a time. |
| Data lifecycle / expiry | Edge case: historical streams with no `ApplyResult` outcome fall back gracefully (HREC-06 edge). |
| Observability | HREC-12: `info` per re-drive, `warn` on a persistently stuck stream. |
| External-dependency failure | N/A — no external call added. |
| State-transition integrity | HREC-09 ensures `ACCEPTED` is always transient; the `Superseded` marker (5b) is annotation, not a transition. |

---

## Success Criteria

- [ ] `pnpm test:e2e` (or an integration test) shows a resolved hot spot in the exported F19
      transcript.
- [ ] A converged-no-op race leaves `blocksAdded` equal to the board's block count for the
      session.
- [ ] A fault-injected crash in the accept chain self-heals within one reconciliation tick.
- [ ] `pnpm check` green; changeset present; `decide.ts` comment in place.
