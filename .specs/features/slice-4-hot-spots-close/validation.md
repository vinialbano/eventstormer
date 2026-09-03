# Slice 4 — Hot Spots + Close Validation

**Date**: 2026-09-03
**Spec**: `.specs/features/slice-4-hot-spots-close/spec.md` (S4-01…S4-43)
**Diff range**: `main..HEAD` (HEAD = `8b3680a`, 63 commits, 156 files)
**Verifier**: independent sub-agent (author ≠ verifier), read-only over the real tree; sensor
mutations in an isolated worktree, reverted.
**Mode**: Code + tests

---

## Verdict: FAIL ❌ (gate green; one confirmed spec defect + one surviving mutant)

The merge gate is fully green and 17 of the 18 committed acceptance tests are anchored to
spec-matching assertions with strong discrimination (10/11 mutants killed). The FAIL is driven
by **one confirmed spec violation that the E2E was weakened to tolerate rather than fixed**
(scope opening question swept into a hot spot at every close — breaks acceptance test 43 /
P1-close AC1+AC4 in the real flow), plus one surviving discrimination mutant and two thin AC
coverage spots. All are low-severity; the maintainer may elect accept-and-fast-follow.

---

## Gate Check

| Gate | Command | Result |
| ---- | ------- | ------ |
| Full check | `pnpm check` (process-ids → typecheck → lint → test → depcruise → knip) | ✅ PASS — **979 tests, 118 files, 0 failed**; depcruise 0 violations (322 modules); knip clean (1 config hint only, pre-existing) |
| Build | `pnpm build` | ✅ PASS — 759 modules, built in ~1s (chunk-size warning only) |
| E2E | `pnpm test:e2e` | ✅ PASS — **5/5** Playwright specs (Chromium available), incl. `hot spots and close › flags hot spots, resolves one, and closes the session through the ceremony` |

Test-integrity: no test deletions or weakened assertions detected in the diff. **One
deliberately loosened assertion** in `e2e/capture-loop.spec.ts:150-161` — the post-close
hot-spot count is asserted `>=` the person's two flags (`/Hot spots\s*[2-9]/`) instead of an
exact total, with a code comment stating "the scripted facilitator never answers the scope
opening question, so the count is 3 today". This is the workaround for Gap 1 below.

---

## Spec-Anchored Acceptance Criteria (the 18 committed `docs/domain/acceptance-tests.md` numbers)

| # | Spec-defined outcome | `file:line` + assertion | Result |
| - | -------------------- | ----------------------- | ------ |
| 1 | question with no reply → `Hot Spot Raised` at close | `src/session-facilitation/infrastructure/hot-spot-sweep.test.ts:203` — close-sweep raises one hot spot for the still-open question; label = question text | ✅ |
| 2 | 2 absent stakeholders in one answer → 2 independent hot spots | `hot-spot-sweep.test.ts:78` — `hotSpotLabels(...)` = `['Absent: ops lead','Absent: finance partner']`; `session/decide.test.ts:540-556` two distinct `Absent Stakeholder Named` | ✅ |
| 4 | proposal-raised `Hot Spot Raised` indistinguishable from policy/direct | `review-proposal/accept.test.ts:213` "indistinguishable from a direct flag" — same `raise-hot-spot` op → same board block; `accept.test.ts:234` carries `modelAffecting` from `Proposal Kind Set` | ✅ |
| 5 | off-topic answer (proposal, no resolving event) → hot spot for the question at close | `hot-spot-sweep.test.ts` "sweeps a question left open by an off-topic contribution that produced a proposal (tests 5, 34)" | ✅ |
| 9 | accept resolution → hot spot resolved + reference recorded; stays open until accept | `review-resolution/accept.test.ts:95-101` — `block.resolved===true`, `block.reference==='added a retry with backoff'`, disposition `APPLIED`; `resolution/decide.test.ts` propose→open until Accept | ✅ |
| 10 | reject resolution → hot spot remains open, unaffected | `resolution/decide.test.ts:97-100` `Reject` → `Resolution Rejected`, no board-facing event; `review-resolution/http.test.ts:109-122` | ✅ |
| 11 | one contribution → `Resolution Proposed` **and** `Building Block Proposed` independently; reject one ≠ affect other | Partial — `interpret.test.ts:184` births a Resolution per track; multi-track independence at `interpret.test.ts:261`; separate-aggregate reject paths tested individually. **No single test with both tracks in one turn + a reject.** | ⚠️ thin (Gap 3) |
| 17 | reinstated hot spot returns naked (open, no annotation, no reference) | `board/project.test.ts:282` — after resolve+withdraw+reinstate: `{withdrawn:false, modelAffecting:true, annotates:null, resolved:false, reference:null}` | ✅ |
| 19 | reopen → open, reference retained; id distinct from a later hot spot | `board/project.test.ts:265` reopen retains `reference==='B fixed it'`, `resolved===false`; `board/decide.test.ts:1155` reopen is a single op | ✅ |
| 19a | referenced block withdrawn → hot spot stays resolved, reference unchanged, no cascade | `board/project.test.ts:273` — resolve `h1` ref "fixed in e1", withdraw `e1` → `h1.resolved===true`, `h1.reference==='fixed in e1'` | ✅ |
| 21 | withdraw annotated block → hot spot withdrawn as follow-on; no dangling annotation | `board/decide.test.ts:1083` "no dangling annotation remains in the snapshot after the cascade"; `decide.test.ts` two hot spots both withdrawn sorted | ✅ |
| 34 | proposal-worthy, no question-track judgment → hot spot for the question at close, proposal unaffected | `hot-spot-sweep.test.ts` tests 5,34 (as #5) | ✅ |
| 36 | `APPLY_FAILED` proposal at close → `LAPSED` + hot spot referencing it | `hot-spot-sweep.test.ts` "raises a hot spot for a proposal left in APPLY_FAILED at close (test 36)"; `close-session/http.test.ts:126` cause `apply-failed` | ✅ |
| 39 | 2nd resolution for a resolved hot spot → `LAPSED` "already resolved", no retry, exactly one reference | `review-resolution/accept.test.ts:120-145` — `r_2` disposition `LAPSED`, `Hot Spot Resolution Rejected.reason==='already-resolved'`, `hotSpotBlock('h_1').reference==='first fix'`, 3rd accept appends nothing | ✅ |
| 40 | reject → hot spot `Open`, no reference recorded | `resolution/decide.test.ts:97`; `review-resolution/http.test.ts:109` | ✅ |
| 43 | `Session Closed` carries exactly `[Q2]`; hot spot for Q2 only | `session/decide.test.ts:415` — `unresolvedQuestionIds: ['q_open']` exact; `hot-spot-sweep.test.ts:261` swept set == `Session Closed.unresolvedQuestionIds`. **Real-flow guarantee broken by Gap 1** (scope question also swept). | ⚠️ (Gap 1) |
| 44 | `complete-perspective` → question `Resolved` + workshop qualification set | `interpret.test.ts:440-456` — resolves `q_cp`, records `Stakeholder Check Recorded {complete:true}`, later `Problem Chosen.qualification==='firm'` | ✅ |
| 48 | frozen summary written with the unresolved-question snapshot; stable on re-read | "same set" half: `hot-spot-sweep.test.ts:261`. **"projection stable post-close" half not asserted** (trivially true under AD-023 — `sessionSummary` is a pure projection over the terminal stream). | ⚠️ thin (Gap 4) |
| 18a | fold a full hot-spot log from empty == current projection | `board/replay.test.ts:214` "folds a full hot-spot log from empty to a spelled-out snapshot" | ✅ |

**Edge cases** (spec §Edge Cases): `modelAffecting` absent → true (`board/schema/operations.ts:58`
`.default(true)`; `board/project.test.ts:210`; `artifact-source.test.ts:217` `undefined` → open
model-affecting) ✅ · `annotate` targeting a hot spot → `kind-permission` (`decide.ts:433`;
`decide.test.ts`) ✅ · `unannotate` with no edge → `missing-edge` reject (`decide.ts:447`) ✅ ·
withdraw cascade both directions (`decide.ts:160-192`) ✅ · resolution `ACCEPTED` in flight at
close left to finish (`resolution/decide.ts` `decideLapse`) ✅ · double close no-op
(`session/decide.ts` `decideClose`) ✅ · sweep runs twice → each hot spot at most once
(`hot-spot-sweep.test.ts:104` marker-gated) ✅.

**Status**: ❌ Gaps present — 1 confirmed defect, 3 thin/uncovered spots.

---

## Discrimination Sensor

Scratch state: isolated git worktree at detached `8b3680a`; each mutation applied, targeted
tests run, then `git checkout` revert. Tree verified clean after.

| # | File:line | Mutation | Killed? |
| - | --------- | -------- | ------- |
| M1 | `domain-model-capture/domain/board/decide.ts:475` | `decideResolve` already-resolved guard `=== true` → `!== true` | ✅ Killed (3 tests) |
| M2 | `board/decide.ts:489` | `decideReopen` not-resolved guard `!== true` → `== true` | ✅ Killed (2 tests) |
| M3 | `board/decide.ts:152` | `annotatingHotSpots` filter `withdrawn === false` → `=== true` | ✅ Killed (2 cascade tests) |
| M4 | `session-facilitation/infrastructure/hot-spot-sweep.ts` `raiseAll` | marker gate `if (swept.has(key)) continue` → `if (!swept.has(key)) continue` | ✅ Killed (9 tests) |
| M5 | `hot-spot-sweep.ts:203` | drop `\|\| raised.error.kind === 'duplicate-id'` from the marker-write condition | ❌ **SURVIVED** — whole `domain` project stays green (732/732) |
| M6 | `session-facilitation/domain/session/decide.ts` `decideClose` | `status === 'open'` → `status === 'resolved'` | ✅ Killed (`unresolvedQuestionIds` exact) |
| M7 | `review-resolution/accept.ts:110` | `reason: applied.error.kind` → literal `'withdrawn'` (test 39) | ✅ Killed |
| M8 | `choose-problem/http.ts:39` | drop `&& block.resolved === false` from the open-hot-spot filter | ✅ Killed |
| M9 | `session-facilitation/domain/workshop/decide.ts:78` | qualification `provisional/firm` swapped | ✅ Killed (5 tests) |
| M10 | `dock/interactions/close-ceremony/use-close-ceremony.ts` `answerStakeholder` | also POST `closeSession` on the stakeholder step (break "OPEN until confirm") | ✅ Killed (4 tests) |
| M11 | `hot-spot-sweep.ts` `raiseAll` (variant of M4) | invert marker gate | ✅ Killed (9 tests) |

**Sensor depth**: P0-expanded — 11 mutations across the slice's surface.
**Result**: 10/11 killed — ❌ 1 survivor (M5).

**M5 detail** — the sweep's second idempotency guard (crash *after* `applyOperation` succeeds
but *before* `markSwept`: board already holds the block, marker table empty → the re-run gets
`duplicate-id` and must treat it as success + write the marker). Named in `design.md`
§Error Handling and in the Verifier brief. No test exercises it; `hot-spot-sweep.test.ts:54`
only covers `markSwept`'s own `INSERT OR IGNORE`.

---

## Payload / Conjunction Rule

Spot-checked — assertions target field values/state, not just that a call happened:
`accept.test.ts:98-101` asserts `block.resolved`, `block.reference`, disposition; `:120-145`
asserts `reason` value + reference identity + append-count invariance; `hot-spot-sweep.test.ts`
asserts `hotSpotLabels` content and `readSweptKeys` contents; `session/decide.test.ts:415`
asserts the exact `Session Closed` payload; `workshop/decide.test.ts` asserts the emitted
`qualification` value. `accept.test.ts:103` asserts the two contexts commit in **separate
appends** (AD-032 choreography, no cross-context transaction). **No bus**: `src/plumbing/` and
`src/host/` contain no publish/subscribe/eventBus symbol.

---

## Known-issue assessment (from the batch workers — verified)

| Item | Finding |
| ---- | ------- |
| **Scope opening question never marked resolved** | **CONFIRMED defect (Gap 1).** `set-scope/http.ts` writes only `Scope Set` on the workshop stream; nothing emits `Question Answered` / resolves the `Question Asked {kind:'scope'}` on the `Session`. The facilitator context (`interpret.ts:107`) hands the model only open-question *texts*, no ids, so an `answer-question` track for it is not reachable either. `decideClose` has no `kind` exclusion → the scope question lands in `unresolvedQuestionIds` and `reconcileHotSpots.closeTargets` raises a `q:<scopeQuestionId>` hot spot at **every** close. Violates acceptance test 43 and P1-close AC1/AC4 in the real flow; the P1-close Independent Test implies the scope question must not appear. Masked by all three test layers. Severity: minor at v1 single-user scale — but the E2E was loosened to tolerate it rather than the bug fixed. |
| T20 — `modelAffecting: z.boolean().optional()` not `.default(true)` on the SF turn/event/track | **OK.** Consumers verified: `proposal/evolve.ts:12` `?? true`; `board-view.ts:30` `?? true`; `session-facilitation/domain/read-models/artifact-source.ts:93` `!== false`; board Operation SSOT keeps `.default(true)`. No path treats absent as `false`. `artifact-source.test.ts:217` covers `undefined` → model-affecting. |
| T50 — `mapTurn` runs `propose-resolution.hotSpotId` through `resolveBlockId` with a literal fallback | **OK.** `map.ts:85` `resolveBlockId(...) ?? BuildingBlockIdSchema.parse(...)` — a real id passes straight through `.parse`; the label→id ACL path is unaffected; an unresolvable value is rejected downstream by the board. |
| T7 — `z.unknown()` on `resolve.reference` with a `.refine` guard | **OK.** `operations.test.ts`: missing key → `.parse` fails (`:53`); present-but-`undefined` → fails (`:63`); `reference: null` → accepted (`:69`); any shape once present → accepted (`:57`). |
| Choreography / AD-032 | **Confirmed.** No event bus. `review-resolution/accept.ts` runs the resolve chain synchronously; the sweep commits each context's stream in its own `append`; `accept.test.ts:103` asserts the two contexts are never batched into one transaction. |

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code / surgical / no scope creep | ✅ — additive; reuses `finishClose`, `deriveTracks`, `derived_track`, the `accept.ts` chain; no bus built (AD-032) |
| Matches existing patterns | ✅ — `decideX` helpers per kind; `Resolution` mirrors `Proposal` skeleton; migration `id:2` additive |
| Spec-anchored outcome check | ✅ except Gaps 1/3/4 |
| Per-layer coverage (domain 1:1 ACs; routes happy+edge+error) | ✅ |
| Every test maps to a spec requirement — no unclaimed tests | ✅ (spot-checked) |
| Process ids absent from `src/**` / `e2e/**` | ✅ — `check:process-ids` green |
| Documented guidelines followed | ✅ — domain purity (depcruise green), co-location + independently-stated literals, `docs/adr/008` named properties |

---

## Ranked Gaps

1. **Scope opening question is swept into a hot spot on every `Close Session`** — acceptance
   test 43 / P1-close AC1+AC4 (real flow). No code path resolves `Question Asked {kind:'scope'}`
   on the `Session` stream. Fix: have `set-scope` (or the scope-accept path) also append a
   scope-resolving event for the session's scope question, or exclude `kind:'scope'` from
   `decideClose`'s unresolved set; then restore the exact-count assertion in
   `e2e/capture-loop.spec.ts:150-161`. `file:line` — `src/session-facilitation/capabilities/set-scope/http.ts:23-44`, `src/session-facilitation/domain/session/decide.ts` `decideClose`.
2. **Sensor survivor M5** — the sweep's `duplicate-id`-from-board → `markSwept` self-heal path
   is untested. Add a `hot-spot-sweep.test.ts` case that forces a board id collision (or
   run→wipe-marker-table→re-run) and asserts the marker is rewritten with no duplicate board
   block. `file:line` — `src/session-facilitation/infrastructure/hot-spot-sweep.ts:200-205`.
3. **Acceptance test 11 thin** — no single test drives one contribution producing both a
   `propose-resolution` and a `propose-building-block` track and then rejects one. Add it.
4. **Acceptance test 48 thin** — the "frozen summary stable when re-read after close" half is
   not asserted. Add a test computing `sessionSummary`/`readArtifactSource` twice on a closed
   session and asserting deep equality.

---

## Requirement Traceability Update

S4-01…S4-43: **Implementing → ✅ Verified**, **except** close-sweep requirements **S4-27** and
**S4-29** → **⚠️ Needs Fix** (Gap 1 — scope question wrongly swept; the sweep-set /
`Session Closed`-set consistency holds only because both wrongly include the scope question).

---

## Summary

**Overall**: ⚠️ Issues — merge gate green, 17/18 ACs solidly anchored, 10/11 mutants killed, but
one confirmed spec defect (scope question → spurious close-time hot spot, worked around in the
E2E rather than fixed) and one surviving discrimination mutant.

**What works**: all five hot-spot board operations + both withdraw cascades + naked reinstate;
the `Resolution` aggregate and synchronous resolve chain incl. acceptance test 39; the
choreographed (bus-free) close sweep with marker-table idempotency; the two-phase close ceremony
holding the session OPEN until confirm; F09 stakeholder check + chosen-problem qualification;
`GET /board` + `readArtifactSource` hot-spot projections; `pnpm check` + `pnpm build` +
`pnpm test:e2e` all green.

**Next steps**: address Gap 1 (behavioural spec fix + restore the exact E2E assertion) and Gap 2
(sensor survivor) before merge; Gaps 3–4 are coverage top-ups. Bounded fix→re-verify loop, max
3 iterations.

---

## Addendum — Verifier fix iteration 1 (2026-09-03)

Author: fix implementer (`slice4-fix1`), independent of the Verifier. All four ranked gaps
resolved; `pnpm check` (984 tests, baseline 979), `pnpm build`, and `pnpm test:e2e` (5/5) green.

| Gap | Commit | Resolution |
| --- | ------ | ---------- |
| 1 — scope question swept on every close | `9e8f100` (`fix`) | `Session` write model gains `scopeQuestions: Set<QuestionId>`, populated in `evolve` on `Question Asked {kind:'scope'}`. `decideClose` filters those ids out of `unresolvedQuestionIds`, so the close sweep (`reconcileHotSpots.closeTargets`) never sees the scope question. Acceptance test 43 / P1-close AC1+AC4 now hold in the real flow. New `decide` test (scope + free question open → `unresolvedQuestionIds` is exactly `[free]`) and `reconcileHotSpots` test (scope-only open question → zero close-sweep hot spots). **E2E exact count restored** — `e2e/capture-loop.spec.ts` asserts `/Hot spots\s*2/` after close+reload (the two the person flagged), replacing the tolerant `>=` workaround. Follow-up recorded in STATE.md: a session with *no* `Scope Set` at all is a Slice-6 concern (surface "no scope" as its own close signal). |
| 2 — surviving mutant M5 (`duplicate-id` marker write) | `7b9084e` (`test`) | `hot-spot-sweep.test.ts` gains a case: a deterministic building-block id (via `vi.mock` of `~/plumbing/ids.ts`, `mockReturnValueOnce` ×2), one successful `reconcileHotSpots` (raise + marker), then `DELETE FROM hot_spot_sweep` to simulate a crash between `applyOperation` and `markSwept`; the re-run reuses the id, the board returns `duplicate-id`, and the branch treats it as success — asserts the marker is rewritten and no second board hot spot appears. Verified kill: dropping `|| raised.error.kind === 'duplicate-id'` fails the new test. No production change. |
| 3 — acceptance test 11 thin | `d2bc234` (`test`) | `interpret.test.ts`: one `Contribution Interpreted` carrying both a `propose-building-block` and a `propose-resolution` track births `p_1` (Proposal) and `r_1` (Resolution) as separate streams; `Reject Resolution` on `r_1` → `r_1` disposition `REJECTED` while `p_1` stays `PROPOSED` with its stream unchanged. |
| 4 — acceptance test 48 thin | `006fe48` (`test`) | `session-summary.test.ts`: over the terminal (closed) stream, `sessionSummary(events, 3)` computed twice is deeply equal — the "re-reading it after close SHALL yield the same result" half of the AC. |

**Requirement traceability**: S4-27 and S4-29 move **⚠️ Needs Fix → ✅ Verified** — the close
sweep-set / `Session Closed`-set consistency now holds for the right reason (both correctly
exclude the scope question).

**Verdict**: all four gaps closed within iteration 1 of 3. Ready for Verifier re-dispatch over
`bc34642..HEAD`.

---

## Re-verification (iteration 1) — 2026-09-03

**Verifier**: fresh independent sub-agent, re-derived. Read-only over the real tree; sensor
mutations applied in an isolated git worktree on a throwaway branch (`s4-verify` @ `046b87f`),
each reverted immediately, tree verified clean.
**Diff range**: `main..HEAD` (HEAD = `046b87f`, 69 commits) — fix iteration 1 = `9e8f100`,
`7b9084e`, `d2bc234`, `006fe48`, `046b87f`.

### Verdict: PASS ✅

All four ranked gaps from the original report are genuinely closed. Gate fully green; the
iteration-1 survivor (M5) is now killed; five fresh behaviour-level mutations across the slice
core all killed (6/6 including the M5 re-run). No existing test weakened or deleted — the E2E
assertion was **tightened** (exact `Hot spots 2`, tolerant `>=` workaround removed).

### Gap closure

| Gap | Status | Evidence |
| --- | ------ | -------- |
| 1 — scope question swept on every close | ✅ **Closed** | `session/model.ts` adds `scopeQuestions: Set<QuestionId>`; `evolve.ts` populates it on `Question Asked {kind:'scope'}` and copies it in the immutable-clone header; `decide.ts:206` `decideClose` filter is `status === 'open' && !writeModel.scopeQuestions.has(id)`. `decide.test.ts:439` asserts EXACT `unresolvedQuestionIds: ['q_free']` for scope+free open (the spec-test-43 exact assertion). `hot-spot-sweep.test.ts:264` — scope-only open question → `hotSpotLabels` `[]` and `sweptQuestionIds` `[]`, so `reconcileHotSpots.closeTargets` raises nothing. `e2e/capture-loop.spec.ts:155` restored to `toHaveText(/Hot spots\s*2/)` after close+reload, apologetic comment gone. |
| 2 — surviving mutant M5 (`duplicate-id` marker self-heal) | ✅ **Closed** | `hot-spot-sweep.test.ts:164` "rewrites the marker with no duplicate board block when the re-raise returns duplicate-id": mocks `~/plumbing/ids.ts` `newBuildingBlockId` (`mockReturnValueOnce` ×2 same id), one clean `reconcileHotSpots` (asserts label + `readSweptKeys` = `{kg:q_1}`), `DELETE FROM hot_spot_sweep` to simulate a crash between `applyOperation` and `markSwept`, re-run → asserts board hot-spot count **unchanged** (`hotSpotLabels` still `['Who else?']`) **and** the marker row present again (`readSweptKeys` = `{kg:q_1}`). Re-ran the exact iteration-1 mutant → now **KILLED** (see sensor M-B). No production change. |
| 3 — acceptance test 11 thin | ✅ **Closed** | `interpret.test.ts:214` drives one `Contribution Interpreted` (`turn([propose('domain-event',…), {track:'propose-resolution', hotSpotId:'h_1', …}])`) → births `p_1` (`['Building Block Proposed']`) and `r_1` (`['Resolution Proposed']`) as separate streams; `Reject Resolution` on `r_1` → asserts `replayResolution(...).disposition === 'REJECTED'` **and** `p_1` stream event list unchanged **and** `replayProposal(p_1).disposition === 'PROPOSED'` (state, not just a call). |
| 4 — acceptance test 48 thin | ✅ **Closed** | `session-summary.test.ts:88` — the module `events` fixture (line 62) contains `Session Closed` (line 69), so `sessionSummary(events, 3)` is computed over the terminal stream twice and asserted `expect(second).toEqual(first)` (deep equal). Thin by nature (pure projection) but exactly the "re-reading after close SHALL yield the same result" half of the AC. |

### Discrimination sensor (re-sweep)

Scratch: isolated worktree branch `s4-verify`; each mutation applied with `perl -pi`, targeted
tests run, `git checkout` revert, tree confirmed clean.

| # | File:line | Mutation | Killed? |
| - | --------- | -------- | ------- |
| M-A (Gap 1 sensor) | `session/decide.ts:206` | flip scope-exclusion filter `!writeModel.scopeQuestions.has(id)` → `writeModel.scopeQuestions.has(id)` | ✅ Killed — 3 tests (`decide.test.ts` exact-set, `hot-spot-sweep.test.ts` consistency + scope-only) |
| M-B (Gap 2 / iteration-1 survivor re-run) | `hot-spot-sweep.ts:203` | drop `\|\| raised.error.kind === 'duplicate-id'` from the marker-write condition | ✅ **Killed** (was SURVIVED in iteration 1) — `hot-spot-sweep.test.ts` new case fails |
| M-C | `hot-spot-sweep.ts:163` | `closeTargets` proposal filter `if (!applyFailed) continue` → `if (applyFailed) continue` | ✅ Killed — 3 tests |
| M-D | `choose-problem/http.ts:39` | drop `&& block.resolved === false` from the open-hot-spot filter | ✅ Killed — 1 test (distinct from iteration-1 M8 which dropped `!withdrawn`) |
| M-E | `review-resolution/accept.ts:104` | invert `if (LAPSE_REASONS.has(applied.error.kind))` → `if (!LAPSE_REASONS.has(...))` (resolution accept chain) | ✅ Killed — 1 test |
| M-F | `board/project.ts:131` | reinstate not naked — `{ annotates: null, resolved: false, reference: null }` → `{ annotates: null }` (board decider not touched in iteration 0) | ✅ Killed — 1 test (`board/project.test.ts`) |

**Result**: 6 injected / 6 killed / 0 survived.

### Gate (worktree, HEAD `046b87f`)

| Gate | Command | Exit | Result |
| ---- | ------- | ---- | ------ |
| Full check | `pnpm check` | 0 | ✅ **984 tests, 118 files, 0 failed**; depcruise 0 violations (322 modules); knip clean (1 pre-existing config hint) |
| Build | `pnpm build` | 0 | ✅ built in ~1s (chunk-size warning only) |
| E2E | `pnpm test:e2e` | 0 | ✅ **5/5** Playwright specs, incl. `hot spots and close › flags hot spots, resolves one, and closes the session through the ceremony` |

### Regression check

- Test count 979 (baseline) → **984** (+5): Gap 1 +2 (`decide.test.ts`, `hot-spot-sweep.test.ts`), Gap 2 +1, Gap 3 +1, Gap 4 +1. No decrease.
- Fix diffs scanned: `9e8f100` is the only one touching production (`session/{model,evolve,decide}.ts` — additive field + filter clause). `7b9084e`, `d2bc234`, `006fe48` are test-only. `046b87f` is docs-only.
- No assertion weakened. `e2e/capture-loop.spec.ts` assertion **strengthened** (tolerant `/Hot spots\s*[2-9]/` + dynamic `countBefore` replaced by exact `/Hot spots\s*2/`).

### Requirement traceability

S4-27 and S4-29 confirmed **✅ Verified** — the close sweep-set / `Session Closed`-set
consistency now holds for the right reason (both correctly exclude the scope question). All of
S4-01…S4-43 Verified.

### Overall: ✅ Ready to merge

No open items. Follow-up already recorded in STATE.md (a session with no `Scope Set` at all is a
Slice-6 concern) — not a blocker.
