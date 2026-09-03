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
