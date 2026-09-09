# Slice 5b — Facilitator Eval + Demo Seed Validation

**Date**: 2026-09-09
**Spec**: `.specs/features/slice-5b-facilitator-eval-demo-seed/spec.md`
**Diff range**: `3224598..HEAD` (28 commits, 69 files) on `slice-5b-facilitator-eval-demo-seed`
**Verifier**: independent sub-agent (author ≠ verifier), isolated worktree, mutations scratch-only
**Mode**: Code + tests
**Verdict**: **PASS ✅**

---

## Task Completion

All 21 tasks (T1–T21) committed per the Execution Log. PCARD-04's endpoint-swap half deliberately
descoped to slice 5c (#94) — only the reword `newLabel` edit verified here, per the task brief.

---

## Spec-Anchored Acceptance Criteria

### P1 — F11 eval suite

| Criterion | Spec outcome | Evidence | Result |
| --- | --- | --- | --- |
| EVAL-01 run each fixture N=5, print `<case> <assertion>: k/5` | 5 runs/case, per-assertion line | `eval/run.ts:26` `RUNS=5`; `eval/run.ts:254` `printRow` → ``${caseId} ${assertion}: ${passed}/${runs}``; `eval/run.test.ts:33-58` pin `runs:5` per row | ✅ |
| EVAL-02 ≥1 fixture per assertion (kind/pastTense/phase-flagged/near-miss/deeper-format/kept-phrasing/relation/pivotal/reword + 2 integration) | complete set | `eval/run.ts:28-40` `FIXTURE_FILES` (11); `eval/run.test.ts:230` `expect(uncoveredF11Assertions(loadFixtures())).toEqual([])`; README table has 13 case×assertion rows incl. `integration-relation` (kind+relation) and `integration-pivotal` (kind+pivotal) | ✅ |
| EVAL-03 relation/pivotal/reword assertion = deterministic oracle over `FacilitationTrack[]` | not self-report / not fuzzy | `eval-oracles.ts:75-119` `proposesRelation`/`proposesPivotal`/`proposesReword` — pure fns, `relationKind`+ordered-endpoint match; `eval-oracles.test.ts` positive+negative per oracle | ✅ |
| EVAL-04 `--report` replaces only between `<!-- eval:results -->` markers, `Passed` = `k/N`, no aggregate | marker-scoped splice | `eval/run.ts:397-400` calls `spliceEvalResults`/`formatEvalTable` (unchanged, pre-existing splice tests in `eval/report.test.ts`); README table rows all `k/5`, no headline row | ✅ (splice logic pre-existing, not re-derived new) |
| EVAL-05 committed real `k/N` table + low-k spread note | table + note | `README.md:71-92` `<!-- eval:results -->` table, `integration-relation.relation 3/5` with a variance paragraph at `README.md:89` | ✅ |
| EVAL-06 no key → non-zero exit naming `.env.local` | unchanged | `eval/run.ts:217-221` `requireApiKey` throws naming `.env.local`; CLI catch → `process.exit(1)` (`eval/run.ts:410-413`) | ✅ (no new test; unchanged behaviour) |

### P1 — `pnpm seed`

| Criterion | Spec outcome | Evidence | Result |
| --- | --- | --- | --- |
| SEED-01 no key, no outbound HTTP, prints id + resumable URL | offline | `src/host/seed.test.ts:66-91` stubs `fetch` to throw, asserts `outcome.status==='seeded'`, `interpretCalls()===turns.length`, `outcome.url===/workshops/<id>`; `seed.ts` never reads `ANTHROPIC_API_KEY`, `seedScriptedFacilitator` is injected | ✅ |
| SEED-02 populated board (blocks, relations, ≥1 hot spot) + ordered transcript | populated | `seed.test.ts:84-87` domain-events 11, hot spots 1, `hotSpotCount` 1, `follows` 2 | ✅ |
| SEED-03 re-run refuses without `--force`; `--force` wipes prior seed streams | refuse / wipe | `seed.test.ts:93-115` refusal `{status:'refused',workshopId}`; force → new id, stale workshop board 404, re-seed whole | ✅ |
| SEED-04 board state only via real handlers (no hand-written rows) | `app.request()` only | `seed.ts:95-137` drives `createRoutes(config)` via `app.request`/`postJson` for every mutation; `seed.test.ts` reads board back through `/api/workshops/:id/board` | ✅ |
| SEED-05 typecheck+lint+test asserting pinned block/relation/hot-spot counts | pinned literals | `seed.test.ts:84-87` literals; `pnpm check` green (`scripts/**/*.test.ts` in `domain` project) | ✅ |

Note: `seed.ts:58-64` `wipe()` runs raw `DELETE FROM operation_log … WHERE context/aggregate/stream_id`
+ `DELETE FROM session_index`. Judged acceptable — dev-only tool, scoped to the marker's recorded
streams, one file, no breach of the host→context-api import rule (stream keys built as inline
literals). A senior would accept it for a `--force` dev reset.

### P1 — Superseded contribution (SUPS)

| Criterion | Spec outcome | Evidence | Result |
| --- | --- | --- | --- |
| SUPS-01 `ApplyResult.outcome` on BOTH ok arms (`appended` / `already-satisfied`); `duplicate-id` reconverge → `already-satisfied` | explicit discriminant, callers compile | `apply-operation.ts:23` field; `:82-86` duplicate-id (attempt>0) arm; `:94-100` empty-decision arm; `:112-118` real append arm; `apply-operation.test.ts` asserts `outcome` for fresh / already-satisfied / duplicate-id reconverge | ✅ |
| SUPS-02 second `Resolution` onto already-resolved hot spot w/ different ref → `Resolution Superseded` in place of `Record Hot Spot Resolved`, own txn, returns ok, disposition `APPLIED` | marker + APPLIED + payload `supersededByReference` = winner | `review-resolution/accept.ts:105-124`; `accept.test.ts:121-160` asserts last-2 events `['Resolution Accepted','Resolution Superseded']`, `superseded).toMatchObject({hotSpotId:'h_1', supersededByReference:'first fix'})`, card `{disposition:'APPLIED', superseded:true, supersededByReference:'first fix'}`, no `Hot Spot Resolution Rejected`, board keeps one ref, idempotent re-accept | ✅ |
| SUPS-03 later reword different `newLabel` → sweep appends `Model Change Superseded` to *earlier* proposal, idempotent | marker on earlier stream + payload `supersededByLabel` = winner | `superseded-sweep.ts:40-72`; `superseded-sweep.test.ts:131-141` last event `Model Change Superseded`, `toMatchObject({target:'bb_a', supersededByLabel:'order placed'})`; `:143-153` second sweep no-op | ✅ |
| SUPS-04 losing ref/label == winner → no `Superseded` event | nothing lost | `accept.test.ts:162-176` same reference → ends `Hot Spot Resolved`, no `Resolution Superseded`; `superseded-sweep.test.ts:155-163` matching label → no marker | ✅ |
| SUPS-05 `replay` folding `Superseded` keeps disposition `APPLIED` | pinned literal, not fold-vs-fold | `resolution/decide.test.ts:194-203` `expect(replay([...]).toEqual({born:true, disposition:'APPLIED', …, superseded:true, supersededByReference})`; `proposal/decide.test.ts:424-434` full-model literal `disposition:'APPLIED', superseded:true` | ✅ |
| SUPS-06 read-model `superseded` = pure fold, no board read | no store/board import in views | `resolutions-view.ts:48-55` / `proposals-view.ts:161-168` fold `writeModel.superseded`; no board import (depcruise green, logic confirmed by inspection); `resolutions-view.test.ts` / `proposals-view.test.ts` assert `superseded:true` + winning ref/label present, absent otherwise | ✅ |
| SUPS-07 dock renders a distinct superseded state, not the plain applied receipt | distinct copy | `ProposalCard.test.ts:56-70` "Superseded" + "“Order placed” was kept instead", not "added by Maria"; `ResolutionCard.test.ts:42-62` same for reference | ✅ |

### P1 — Dock model-change card (PCARD)

| Criterion | Spec outcome | Evidence | Result |
| --- | --- | --- | --- |
| PCARD-01 app `ProposalCard.intent` mirrors server `IntentCard`; store test fails on drift | mirrored shape | `src/app/capture-loop/types.ts:65-92` `ProposalIntent` mirrors `proposals-view.ts:27-33` `IntentCard`; `stores/stores.test.ts:93-118` round-trips an `intent` card unchanged | ✅ (runtime mirror only — no compile-time cross-check possible under ADR-007; matches project convention) |
| PCARD-02 render summary + kind pill + source quote + Accept/Reject/Hold (Edit for reword) | rendered | `ProposalCard.test.ts:123-161` relation/pivotal/reword each render pill+`.pc__label`+actions; `DockFeed.test.ts:34-49`, `PendingDrawer.test.ts:43-76` | ✅ |
| PCARD-03 Accept → `POST /proposals/:id/accept` + refetch, no optimistic mutation | dock click | e2e `artifacts-and-relations.spec.ts:63-67` accepts via `relationCard.getByRole('button',{name:'Accept'}).click()`; `use-review-proposal.test.ts:40-49` accept → transport once + refetch signals | ✅ |
| PCARD-04 (reword only) Edit → `POST /proposals/:id/edit` `{ newLabel }` | reword edit | `ProposalCard.test.ts:191-208` emits `edit-intent [[{newLabel:'Order submitted'}]]`; `use-review-proposal.test.ts:87-96` `editModelChangeProposal('p1',{newLabel})`; relation inline-Edit deliberately absent (`ProposalCard.test.ts:210-220`) | ✅ (endpoint-swap → 5c, per brief) |
| PCARD-05 every disposition + drawer render without error | no crash | `ProposalCard.test.ts:163-183` loops all 7 dispositions; `PendingDrawer.test.ts:43-76` overflow + parked | ✅ |
| PCARD-06 e2e accepts scripted relation via dock, no `SPEC_DEVIATION` | grep clean | `grep -rn SPEC_DEVIATION e2e/` → nothing; `artifacts-and-relations.spec.ts` docblock replaced, board `follows` + composite stamp assertions retained | ✅ |

### P2 — Docs

| Criterion | Spec outcome | Evidence | Result |
| --- | --- | --- | --- |
| DOC-01 remove stale "untested" bullet, point ADR-008 at the eval | reconciled | `docs/adr/008…md:80` "The real model's decision to propose a relation / pivotal / reword is covered — the `pnpm eval`…"; `README.md:67-69` clarifying paragraph, standalone stale bullet gone | ✅ |
| DOC-02 offline doc-link job green | green | not independently run (CI-only job); `pnpm check` (which T17 gates on) passed | ⚠️ not independently verified |

### Edge cases

- Malformed fixture throws with file name — `run.test.ts:160-168`, `parseFixtureFile` ✅
- `--report` missing markers → `spliceEvalResults` throws (pre-existing) ✅
- `pnpm seed --force` with no prior seed → seeds normally — `seed.test.ts:117-121` ✅
- Seed fixture ↔ handler disagreement → seed test fails (pinned counts) ✅
- Hot spot withdrawn mid-race → loser LAPSES, no false superseded — `accept.test.ts:178-194` ✅
- Dock card with neither `blockKind` nor `intent` → renders nothing — `ProposalCard.test.ts:185-189` ✅
- Unresolvable `intent.endpoints` id → falls back to id — `proposals-view.ts:93-94` `labelFor` ✅

**Status**: ✅ All in-scope ACs covered and spec-anchored. 1 item (DOC-02) is a CI-only job not runnable here.

---

## Discrimination Sensor

Lightweight fault-injection, scratch worktree, each mutation reverted after the run.

| # | File:line | Mutation | Tests run | Killed? |
| --- | --- | --- | --- | --- |
| 1 | `apply-operation.ts:98` | empty-decision arm `outcome:'already-satisfied'` → `'appended'` | `apply-operation.test.ts` + `review-resolution/accept.test.ts` | ✅ Killed (4 failed) |
| 2 | `review-resolution/accept.ts:111` | superseded guard `boardReference !== reference` → `=== reference` | `accept.test.ts` | ✅ Killed (2 failed) |
| 3 | `superseded-sweep.ts:58` | drop `|| boardLabel === reword.newLabel` (SUPS-04 for reword) | `superseded-sweep.test.ts` | ✅ Killed (1 failed) |
| 4 | `resolution/evolve.ts:31` | `Resolution Superseded` case drops `superseded: true` | `resolution/*.test.ts` + `resolutions-view.test.ts` | ✅ Killed (2 failed) |
| 5 | `proposal/decide.ts:177` | `decideRecordSuperseded` guard `disposition !== 'APPLIED'` → `=== 'APPLIED'` | `proposal/*.test.ts` + `superseded-sweep.test.ts` | ✅ Killed (3 failed) |
| 6 | `eval-oracles.ts:84` | `proposesRelation` drops `relationKind === expected.kind` | `-t proposesRelation` (domain project) | ✅ Killed (1 failed) |
| 7 | `proposals-view.ts:163` | `proposalCard` superseded fold drops `superseded: true` | `proposals-view.test.ts` | ✅ Killed (1 failed) |

**Sensor depth**: lightweight (7 mutations, > the 5–7 asked)
**Result**: 7/7 killed — **PASS ✅**. No surviving mutants, no ranked gaps.

Payload/conjunction rule: both `Superseded` events assert the recorded value, not just the append —
`accept.test.ts:145` (`supersededByReference: 'first fix'`), `superseded-sweep.test.ts:140`
(`supersededByLabel: 'order placed'`). ✅

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum code / no scope creep | ✅ (PCARD-04 endpoint-swap correctly deferred, not half-built) |
| Surgical changes | ✅ |
| Matches patterns/style | ✅ (marker events mirror existing `Record …` command/evolve; sweep mirrors existing reconcile passes) |
| Spec-anchored outcome check | ✅ (asserted values match spec — winning ref/label, APPLIED, 11/1/2 counts) |
| Per-layer coverage expectation | ✅ (domain 1:1 to ACs; capability happy+edge+error; e2e happy path) |
| Every test maps to a requirement | ✅ |
| Documented guidelines | `AGENTS.md`, `docs/testing.md`, `docs/adr/008` — followed |

**Non-blocking findings:**

1. **⚠️ Doc rot — `eval-oracles.ts:2-3`.** The module docstring still describes `isPastTenseLabel`
   as "the last whitespace-separated word ends in `ed` (irregulars such as \"built\" fail)". The
   T18 fix changed it to whole-label + a bounded `IRREGULAR_PAST` set that *includes* `built`. The
   header contradicts the code (`:36-44`). Violates AGENTS.md "docs as if built today". Fix task:
   update the docstring.
2. **`isPastTenseLabel` post-live-run change (T18) — judged a correctness fix, not a pass-tune.**
   The model's output did not change; the oracle was genuinely too strict (a real past-tense
   label like "Ticket sent to the line" failed on last-word-only). Whole-label + a curated
   irregular set is the right direction. Mild residual false-positive risk on non-past labels
   containing `set` / `read` / `put` / `cut` / `hit` / `let`, acceptable for domain-event labels.
3. **`src/host/seed.ts:58-64` raw SQL** — acceptable (see SEED-05 note above); dev-tool `--force`
   reset scoped to the marker's own streams.
4. **`scripts/seed/facilitator.ts:27` cites `SEED-05`** in a comment. Outside `src/**`/`e2e/**`
   so `check:process-ids` (which passed) does not reject it and it does not match the banned
   `S<n>-<n>` pattern, but it is a spec-requirement id in code — trivial nit.
5. **SUPS-01 `duplicate-id` scoping** — `already-satisfied` is only returned for a `duplicate-id`
   seen *after* a stale-position retry (`attempt > 0`); a first-attempt `duplicate-id` stays a
   merits `Rejection`. Judged consistent with spec AC-1 ("`duplicate-id` on the append path")
   and design intent (only a concurrent-writer race, not a user re-submitting an existing id,
   should converge). Acceptable.
6. **PCARD-01 drift protection** is runtime-only (hand-mirrored type + a store round-trip test).
   No compile-time cross-check is possible under ADR-007 (app must not import server code). Matches
   the convention documented in `types.ts:1-8`.

No finding blocks the slice.

---

## Gate Check

| Gate | Command | Result |
| --- | --- | --- |
| Build (`pnpm check`) | `check:process-ids → typecheck → lint → test → depcruise → knip` | **exit 0** — 138 files, **1231 tests passed**, 0 failed, 0 skipped; depcruise 0 violations (366 modules); knip clean (1 config hint only) |
| `pnpm build` | vite build | **exit 0** — 765 modules, built (chunk-size warning only) |
| `pnpm test:e2e` | playwright | **exit 0** — **6/6 passed** incl. `artifacts-and-relations.spec.ts` (dock-click relation accept) |

Test count: 1203 (pre-slice baseline per Execution Log ~1188 + prior) → **1231** after. Delta positive;
no test deleted, no assertion weakened (spot-checked resolution/proposal decide + read-model folds —
all pin literals or exact event sequences).

---

## Requirement Traceability Update

| Requirement | Previous | New |
| --- | --- | --- |
| EVAL-01…06 | Pending / Design | ✅ Verified |
| SEED-01…05 | Pending / Design | ✅ Verified |
| SUPS-01…07 | Pending / Design | ✅ Verified |
| PCARD-01…03, 05, 06 | Pending / Design | ✅ Verified |
| PCARD-04 | Implementing | ✅ Verified (reword `newLabel` only; endpoint-swap → 5c #94) |
| DOC-01 | Tasks | ✅ Verified |
| DOC-02 | Tasks | ⚠️ Not independently verified (CI-only offline doc-link job); `pnpm check` green |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 26/26 in-scope ACs covered and matched to spec outcome; 0 spec-precision
gaps. 1 AC (DOC-02) depends on a CI-only job not runnable in the worktree.
**Sensor**: 7/7 mutations killed.
**Gate**: `pnpm check` exit 0 (1231 tests) · `pnpm build` exit 0 · `pnpm test:e2e` 6/6.

**What works**: the explicit `ApplyResult.outcome` substrate; the inline `Resolution Superseded`
marker on a losing resolve race and the reconcile-sweep `Model Change Superseded` on a losing
reword; pure read-model folds (no board diff); the dock superseded receipt and model-change intent
card across every disposition; the full F11 fixture set with deterministic oracles and a committed
`k/N` table; the offline `pnpm seed` replayed through the real handlers.

**Issues found**: none blocking. Recommended fix task — refresh the stale `eval-oracles.ts` module
docstring (finding 1).

**Next steps**: merge-ready. Land the docstring fix opportunistically or in 5c.
