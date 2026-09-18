# Slice 5c — Honest-Record Hardening Validation

**Date**: 2026-09-18
**Spec**: `.specs/features/slice-5c-honest-record-hardening/spec.md`
**Diff range**: `main..HEAD` (`6c58c30`..`dbf592e`, 20 commits)
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

All 17 tasks (T1–T17) marked `[x]` in `tasks.md`, including T15's mid-execution correction
(`proposals-view.ts` widening) — verified as authorized scope (design's own AC1 for HREC-15
required the field mapping) and confirmed against the real diff, not just the task's own claim.

| Task | Status  | Notes |
| ---- | ------- | ----- |
| T1–T3 (F5, blocksAdded) | ✅ Done | Verified against `interpret.ts`, `decide.ts`, `model.ts`, `events.ts` |
| T4–T8 (F4, transcript lane) | ✅ Done | Verified against contract, derivation, wiring, render, e2e test |
| T9 (F6, review-resolution) | ✅ Done | Verified recording happens before either response branch |
| T10–T13 (F7, stuck-ACCEPTED sweep) | ✅ Done | Extraction verified byte-for-byte behavior-preserving; sweep + wiring verified |
| T14 (F9, decide.ts comment) | ✅ Done | Comment present, no `AD-NNN`/`.specs/` id |
| T15–T17 (P2, dock endpoint edit) | ✅ Done | Verified emit payloads, 422 path, type-mirror guard |

---

## Spec-Anchored Acceptance Criteria

### P1: The F19 transcript accounts for resolutions

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AC1: resolution lane present, one entry per `propose-resolution` track | `resolutionId`, `hotSpotId`, `reference`, `disposition`, optional `supersededByReference` | `src/session-facilitation/domain/read-models/session-transcript-contract.ts:41-55` (schema) + `src/session-facilitation/domain/read-models/session-transcript.test.ts:220-230` — `expect(transcript.resolutions).toEqual([...])` with 3 entries | ✅ PASS |
| AC2: applied+superseded reads as `superseded`, not plain applied | disposition literal `'superseded'` | `src/session-facilitation/domain/read-models/session-transcript.ts:72` — `card.superseded === true ? 'superseded' : ...`; asserted at `session-transcript.test.ts:227` (`disposition: 'superseded'`) | ✅ PASS |
| AC3: `renderTranscript` stays pure | same contract in → byte-identical Markdown out | `src/derived-artifact-generation/domain/render-transcript.test.ts:170-182` — two renders with different `renderedAt`, stripped comparison `toBe` | ✅ PASS |
| AC4: no resolutions → lane absent, not empty heading | no `## Resolutions` heading | `render-transcript.test.ts:141-144` — `expect(markdown).not.toContain('## Resolutions')`; domain-level `session-transcript.test.ts:173` — `expect(build().resolutions).toEqual([])` | ✅ PASS |
| Independent Test: applied+lapsed+superseded fold, snapshot markdown | 3 entries, right dispositions; rendered markdown shows all 3 | `session-transcript.test.ts:220-230` (fold) + `render-transcript.test.ts:146-167` (render) + e2e `src/derived-artifact-generation/capabilities/session-transcript/http.test.ts:120-181` (`expect(body.markdown).toContain('## Resolutions')` through real HTTP routes) | ✅ PASS |

### P1: `blocksAdded` counts only what the board holds

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AC1: excludes superseded | not counted | `src/session-facilitation/capabilities/interpret-contribution/interpret.ts:137` — `if (replayProposal(proposalEvents).superseded) return count`; asserted at `interpret.test.ts:804-896` (`p_superseded` excluded, final count 2) | ✅ PASS |
| AC2: excludes `already-satisfied` | not counted | `interpret.ts:139` — `applied.outcome === 'already-satisfied'` skip; same test, `p_noop` excluded | ✅ PASS |
| AC3: happy path unchanged | count unaffected when all applied normally | same test — `p_appended` (outcome `'appended'`) and `p_historical` (no `outcome` field) both count, total asserted `'2 blocks added'` at `interpret.test.ts:896` | ✅ PASS |
| Independent Test: race → 1; superseded reword → not counted | exact counts | `interpret.test.ts:896` — `expect(captured).toContain('Session 1: 2 blocks added, ...')` (p_appended + p_historical fallback = 2; p_noop and p_superseded excluded) | ✅ PASS |
| Edge case: historical event with no `outcome` field | falls back to counting, no crash | same test, `p_historical` stream (no `outcome` key) — counted | ✅ PASS |

### P1: No stream stuck `ACCEPTED`

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AC1: every board rejection recorded before returning | `Hot Spot Resolution Rejected { reason }` appended for every `reason`, not only `LAPSE_REASONS` | `src/session-facilitation/capabilities/review-resolution/accept.ts:131-148` — append happens in the shared `else` branch before the `LAPSE_REASONS` check gates only the *response*; asserted at `accept.test.ts:250-273` (`not-implemented-in-slice`, outside allow-list, still recorded + 422) | ✅ PASS |
| AC2: sweep re-drives `ACCEPTED` with no later apply-outcome | re-driven through idempotent accept→apply, outcome recorded | `src/session-facilitation/infrastructure/stuck-accepted-sweep.ts:34-72`; asserted at `stuck-accepted-sweep.test.ts:148-166` (proposal → `APPLIED`) and `:167-189` (resolution → `APPLIED`) | ✅ PASS |
| AC3: re-drive twice is a no-op | second tick makes no additional appends | `stuck-accepted-sweep.test.ts:192-208` — `expect(store.read(...).length).toBe(lengthAfterFirst)` | ✅ PASS |
| AC4: closed session left as-is, documented | stream stays `ACCEPTED`, doc comment states the bound | `stuck-accepted-sweep.test.ts:210-226` (`proposalDisposition('p_1')` stays `'ACCEPTED'`); doc comment at `stuck-accepted-sweep.ts:26-32` and `interpret.ts:583-589` | ✅ PASS |
| AC5: `info` per re-drive; `warn` on still-stuck | exact log calls | `stuck-accepted-sweep.test.ts:163` (`toHaveBeenCalledWith('stuck-accepted-sweep: re-driving proposal p_1')`), `:188` (resolution), `:224` (`warn` — `'... still ACCEPTED after re-drive'`) | ✅ PASS |
| Independent Test: fault-injected crash heals within one tick; unclassified rejection ends `Record Resolution Rejected` | proposal reaches `APPLIED`; `Resolution` stream ends rejected, not `ACCEPTED` | `reconcile.test.ts:309-364` (end-to-end through `reconcilePendingDerivations`, asserts full event-type sequence including `Operation Applied`); `accept.test.ts:250-273` (resolution case) | ✅ PASS |

### P2: `decide.ts` states the convergence scope

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AC1: comment states deliberate scope, names both kind lists | present near convergence branches | `src/domain-model-capture/domain/board/decide.ts:515-533` — comment directly above `export const decide`, names `relation / pivotal / resolve / insert-between / unlink-cause` and `withdraw / reinstate / reopen / unsequence / unannotate` | ✅ PASS |
| AC2: no `.specs/` id, process-ids gate passes | `pnpm check:process-ids` exits 0 | Confirmed via full `pnpm check` run (process-ids step passed, see Gate Check below); comment text contains no `AD-`/`S<n>-<n>`/`M<n>-<n>` pattern (manually grepped) | ✅ PASS |

### P2: Edit a relation / pivotal endpoint from the dock

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AC1: relation card — endpoint picker + label, `POST { field, label }` | `field` from `RELATION_FIELDS[relationKind]` via server `IntentCard.endpoints[].field` | `src/session-facilitation/domain/read-models/proposals-view.ts:97-106` (server widening) + `src/app/capture-loop/dock/ProposalCard.vue:111-122` (emit); asserted at `ProposalCard.test.ts:229-255` — `expect(wrapper.emitted('edit-intent')).toEqual([[{ field: 'successor', label: 'Order ready' }]])` | ✅ PASS |
| AC2: unknown-label 422 keeps other input | form stays open, draft intact | `ProposalCard.vue:142-153` (`watch` on landed value; closes only when prop reflects the submitted label); asserted at `ProposalCard.test.ts:281-309` — select + input still present, `input.value` still `'Unknown block'` after emit with no prop update | ✅ PASS |
| AC3: pivotal `target` edit, `{ field: 'target', label }` | literal `'target'` | `ProposalCard.vue:114` — `field = props.intent.kind === 'pivotal' ? 'target' : selectedField.value`; asserted at `ProposalCard.test.ts:257-279` — `toEqual([[{ field: 'target', label: 'Order delivered' }]])` | ✅ PASS |
| AC4: app `ProposalIntent` mirrors server `IntentCard`; store test fails on drift | compile-time or runtime drift guard | `src/app/capture-loop/types.ts:65-71` (`endpoints?: { id; label; field }[]`); guard is a **typed fixture literal** at `stores.test.ts:96-142` (`cards: ProposalCard[]` — a future required field the app type declares but the fixture omits fails `pnpm typecheck`, not a runtime assertion) | ⚠️ Spec-precision note (see below) |

**Status**: ✅ All ACs covered. One spec-precision note (P2 AC4 — see Code Quality).

---

## Discrimination Sensor

Run in an isolated detached worktree (`/tmp/slice5c-sensor`, later removed via
`git worktree remove --force`); the real working tree was never modified (confirmed clean before
and after via `git status`).

| # | File:line | Description | Killed? |
| - | --- | --- | --- |
| 1 | `interpret.ts:139` | Removed the `already-satisfied` exclusion from `blocksAdded` (`if (applied === undefined \|\| applied.outcome === 'already-satisfied')` → `if (applied === undefined)`) | ✅ Killed — `interpret.test.ts` expected count 2, mutant produced 3 |
| 2 | `review-resolution/accept.ts:131-148` | Restored the old `LAPSE_REASONS` gate on *recording* (only append `Record Resolution Rejected` for a lapse reason, matching pre-slice behavior) | ✅ Killed — `accept.test.ts`'s non-lapse recording test failed (`r1Events.at(-1)` no longer matched) |
| 3 | `session-transcript.ts:72` | Removed the `card.superseded === true` override — always used `RESOLUTION_DISPOSITION[card.disposition]` | ✅ Killed — `session-transcript.test.ts` expected `'superseded'`, mutant produced `'applied'` |
| 4 | `interpret.ts` (`reconcilePendingDerivations`) | Removed the `sweepStuckAccepted(deps, sessionId)` call from the per-open-session loop | ✅ Killed — `reconcile.test.ts`'s stuck-ACCEPTED tick test expected `'Operation Applied'` as the third event, mutant stream stopped at `'Proposal Accepted'` |
| 5 | `ProposalCard.vue:114` | Changed the relation endpoint's emitted `field` from `selectedField.value` to a hardcoded wrong value | ✅ Killed — two `ProposalCard.test.ts` tests failed on the wrong `field` in the emitted payload |

**Sensor depth**: lightweight (5 targeted mutations, default tier)
**Result**: 5/5 killed — PASS ✅

---

## Code Quality

| Principle | Status |
| --- | --- |
| No features beyond what was asked | ✅ — every changed file traces to a task; T15's `proposals-view.ts` widening was an authorized, spec-required correction (HREC-15 AC1), not scope creep |
| No abstractions for single-use code | ✅ — `stuck-accepted-sweep.ts` copies the existing sweep shape (`superseded-sweep.ts`) rather than inventing a new one; no new counter/table added, matching the design's explicit rejection of that abstraction |
| No unnecessary "flexibility" added | ✅ |
| Only touched files required for task | ✅ — `DockFeed.vue`'s emit-type widening (deviation #4) is a mechanical pass-through of T15's widened type, confirmed by diff (one line, no new behavior) |
| Didn't "improve" unrelated code | ✅ |
| Matches existing patterns/style | ✅ — `acceptProposal`/`acceptResolution` extractions are literal moves (diffed against `main`, confirmed byte-for-byte behavior preservation: same status codes, same JSON shapes) |
| Would senior engineer approve? | ✅ |
| Tests map to ACs, non-shallow | ✅ — spot-checked P1 transcript story and P1 stuck-ACCEPTED story end to end; both integration-tested through real routes/ticks, not just unit-isolated |
| Spec-anchored outcome check | ✅ — see table above; every asserted value matches the spec-defined outcome |
| Per-layer Coverage Expectation met | ✅ — domain layer (`decide.ts`, `session-transcript.ts`, proposal model/decide) has 1:1 AC-mapped unit tests; routes (`accept.ts` × 2) cover happy + edge (lapse vs non-lapse, closed-session) + error (422/404/409) |
| Every test maps to a spec requirement | ✅ |
| Documented guidelines followed | AGENTS.md (process-id ban — confirmed via `pnpm check:process-ids` passing and manual grep of the new comment), `vitest.config.ts`'s domain coverage floor (not independently re-run per-file; the aggregate `pnpm test` run covers it) |

**Spec-precision note (P2 AC4)**: the spec's own wording — "a store test fails on drift" — doesn't
specify *how* it must fail. The implementation added a **type-level** guard (a typed fixture
literal that would fail `pnpm typecheck`, not `pnpm test`, if a required field were dropped), which
the commit message (`b018840`) states plainly. This satisfies the AC's intent (catching drift
before it reaches the dock) but through a different mechanism (compile-time) than "test" might
imply (runtime). Not a defect — flagged for precision only, no fix task created.

**Known deviations — resolved**:

1. **T9 spy-based test (HREC-08)**: confirmed independently against `decide.ts:486-499`
   (`decideResolve`) — the `resolve` decider can only emit `unknown-target`, `withdrawn-target`, or
   `kind-permission` (all in `LAPSE_REASONS`), plus the belt-and-suspenders `schema` rejection at
   `decide.ts:538`. `decide.test.ts:1228` explicitly asserts `decide` never returns
   `not-implemented-in-slice` for the operations this slice tests. The mock is a real `Rejection`
   variant from the domain's own error union (used elsewhere for `edit-model`'s
   `not-implemented-in-slice` path), not a fabricated kind — a legitimate way to exercise the
   widened recording logic that the real decider cannot currently reach. **Fine.**
2. **T12 `Handled` 404 widening**: diffed `review-proposal/accept.ts` and
   `review-resolution/accept.ts` against `main`. Every `404` status was already returned via
   literal `context.json({...}, 404)` calls before this slice — the `Handled` interface's status
   union just didn't include `404` in its type. The extraction is a mechanical move (same status
   codes, same JSON bodies, confirmed line-by-line in the diff); widening the type to `404` fixes a
   type-honesty gap, changes no runtime behavior. **Fine.**
3. **T16 `ProposalCard.vue` `emit()`-return claim**: confirmed against `main`'s
   `ProposalCard.vue` — `saveEdit` set `editing.value = false` synchronously for *both* the reword
   and (nonexistent-yet) intent-edit paths, before this slice, since Vue's `emit` never returns a
   listener's result. The fix (tracking `pendingEndpointLabel` and closing only on a `watch` that
   sees the submitted value reflected back through props) applies uniformly to reword and the new
   endpoint editor. `ProposalCard.test.ts:191-208`'s reword test does not assert `editing` closes
   synchronously, so no existing assertion regressed. **Fine.**
4. **`DockFeed.vue` emit-signature widening**: one-line diff, purely a type union widening to
   pass through T15's new payload shape — no new handler logic. **Fine.**

---

## Edge Cases

- [x] Superseded-but-no-`Record Hot Spot Resolved` → transcript disposition `'superseded'` with
      `supersededByReference` set (handled per AC2's explicit precedence — see note below)
- [x] Sweep re-drive racing a session close → left `ACCEPTED`, documented accepted gap
- [x] Historical proposal stream with no `outcome` field → falls back to counting, no crash

**Note on the first edge case's literal wording**: the spec's Edge Cases section says the
disposition "SHALL be APPLIED with `supersededByReference` set," which reads as contradicting
AC2 ("SHALL read as superseded... not as a plain applied resolution") and the Data Models section
("the transcript disposition is the literal `'superseded'` string... except AC2"). This is an
internal spec wording inconsistency, not a code defect — `design.md` explicitly resolved it in
favor of AC2's stronger, more specific requirement, and T5's own Done-when criteria nail down the
same choice ("The superseded entry reads `disposition: 'superseded'`, not `'applied'`"). The
implementation and tests consistently follow the AC2/design resolution. Flagged for the next spec
edit, not a gap in this validation.

---

## Gate Check

- **Gate command**: `pnpm check` (process-ids → typecheck → lint → test → depcruise → knip)
- **Result**: 0 failed. `1257` tests passed across `139` test files (test step); typecheck, lint,
  depcruise, knip all exited 0.
- **Test count before feature** (measured on `main`, `ff64689`, via a separate detached worktree):
  `1231` tests, `138` files
- **Test count after feature**: `1257` tests, `139` files
- **Delta**: `+26` new tests, `+1` new test file (`stuck-accepted-sweep.test.ts`)
- **Skipped tests**: none observed
- **Failures**: none

---

## Fix Plans

None — no gaps found.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| --- | --- | --- |
| HREC-01 | Pending | ✅ Verified |
| HREC-02 | Pending | ✅ Verified |
| HREC-03 | Pending | ✅ Verified |
| HREC-04 | Pending | ✅ Verified |
| HREC-05 | Pending | ✅ Verified |
| HREC-06 | Pending | ✅ Verified |
| HREC-07 | Pending | ✅ Verified |
| HREC-08 | Pending | ✅ Verified |
| HREC-09 | Pending | ✅ Verified |
| HREC-10 | Pending | ✅ Verified |
| HREC-11 | Pending | ✅ Verified |
| HREC-12 | Pending | ✅ Verified |
| HREC-13 | Pending | ✅ Verified |
| HREC-14 | Pending | ✅ Verified |
| HREC-15 | Pending | ✅ Verified |
| HREC-16 | Pending | ✅ Verified |
| HREC-17 | Pending | ✅ Verified (spec-precision note on the drift-guard mechanism; not a gap) |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 17/17 ACs matched spec outcome (1 spec-precision note flagged, no fix
task — HREC-17's drift guard is compile-time rather than runtime, which satisfies the AC's intent)

**Sensor**: 5/5 mutations killed

**Gate**: 1257 passed, 0 failed (+26 tests over the 1231-test baseline on `main`)

**What works**: The F19 transcript now carries a complete resolution lane (applied / lapsed /
superseded, pure render, no empty heading); `blocksAdded` excludes superseded and converged-no-op
applies while staying correct on historical data with no `outcome` field; `review-resolution`
records every board rejection before responding, closing the stuck-`ACCEPTED` gap at its source;
the new `stuck-accepted-sweep.ts` re-drives any leftover `ACCEPTED` stream through the same
idempotent accept chain a human re-click already uses, wired into the existing
open-sessions-only reconciliation tick with `info`/`warn` logging; `decide.ts` now documents the
AD-038 convergence asymmetry in prose with no process-id; the dock gained a relation/pivotal
endpoint editor whose 422 path correctly preserves in-progress input, fixing a latent bug in the
existing reword-edit path along the way.

**Issues found**: None requiring a fix task. One spec-precision note (P2 AC4 / HREC-17 — the
drift guard is a typecheck-time fixture rather than a runtime assertion) and one spec-wording
inconsistency (Edge Cases vs. AC2 on the superseded-resolution disposition, resolved correctly in
the implementation per `design.md`) are recorded above for the next spec revision, not as gaps.

**Next steps**: None blocking. Optional: tighten the Edge Cases wording in a future spec pass to
match AC2/design.md's resolution, so the next reader doesn't have to cross-reference three
sections to see which wins.
