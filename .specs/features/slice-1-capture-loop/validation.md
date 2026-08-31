# Slice 1 — The Capture Loop · Validation

**Date**: 2026-08-30 (iteration 1) · re-verified 2026-08-30 (iteration 2, HEAD `a3533cb`)
**Spec**: `.specs/features/slice-1-capture-loop/spec.md`
**Diff range**: `main..HEAD` (`0120e22..a3533cb`, 40 commits)
**Verifier**: independent sub-agent (author ≠ verifier), evidence-or-zero
**Mode**: Code + tests

---

## Verdict: PASS ✅

Every user-story acceptance criterion traces to passing test evidence, the full build
gate is green, and manual re-derivation confirms all sampled behaviour is correct. The
discrimination sensor now kills all 6 of 6 mutants.

### Re-verification (iteration 2)

Two fix commits closed the only two open gaps (surviving sensor mutants M4 + M6 —
missing assertions, no behaviour defect):

- `b0ab862` test(session-facilitation): assert double-accept does not re-run the apply
  chain (M6 / S1-47). `accept.test.ts:144-145` now counts board-stream reads
  (`applyOperation` is the sole reader on this path) and asserts
  `boardReadsAfterSecond` equals `boardReadsAfterFirst` (`> 0`). Sensor re-run: flip
  the `APPLIED` short-circuit to `'REJECTED'` → `accept.test.ts:145` fails
  (`expected 2 to be 1`). **Killed.**
- `a3533cb` test(session-facilitation): assert `deriveTracks` skips per already-marked
  track (M4 / AD-021 / S1-56). New `describe` block `interpret.test.ts:241-271`:
  interpret a two-track contribution, delete one `derived_track` marker row, re-run
  `reconcilePendingDerivations`, assert `markDerivedTrackRuns` is exactly `1`
  (`interpret.test.ts:262`), no extra model call (`interpretCalls` `0`), no duplicate
  proposal births. Sensor re-run: remove the per-track skip guard →
  `interpret.test.ts:262` fails (`expected 2 to be 1`). **Killed.**

Everything else in this report stood at PASS in iteration 1 and was not re-litigated.

---

## Task Completion

All T1–T32 marked `[x]` in `tasks.md` (94 checked boxes, 0 unchecked). Spot-verified:
T5/T10/T16/T22/T25 depcruise planted-violation claims — `pnpm depcruise` green with
all rules active (182 modules, 709 deps). No task partial or blocked.

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1–T32 | ✅ Done | 3 documented deviations (see Code Quality); all gates green |

---

## Spec-Anchored Acceptance Criteria (sampled — highest-risk + edge)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| P1 Workshop AC1 — create → nanoid URL | 201 + 21-char slug + resumable URL | `capabilities/start-workshop/http.test.ts` — `toHaveLength(21)` / URL assert | ✅ |
| P1 Workshop AC5 — Set Scope after a block applied | rejected 409, scope unchanged | `capabilities/set-scope/http.test.ts` — `expect(res.status).toBe(409)` + no `Scope Set` | ✅ |
| P1 Workshop AC6 — over-length statement | rejected before any event | `domain/workshop/decide.test.ts` (≤10 000) + `set-scope` 400 | ✅ |
| P1 Capture AC1 — segment fields | sessionId / speaker=creatorName / Clock `at` / `source:'typed'` | `capabilities/make-contribution/http.test.ts` — field-by-field `toBe` | ✅ |
| P1 Capture AC3 — whitespace-only | no segment, no facilitator call → 204 | `make-contribution/http.test.ts` — `toBe(204)`, stream unchanged | ✅ |
| P1 Capture AC4 — closed session | `Contribution Made` rejected 409 | `make-contribution/http.test.ts` + `domain/session/decide.test.ts` `session-closed` | ✅ |
| P1 Facilitator AC1 — one merged call, SDK config | `generateText`+`Output.object`, `outputFormat`, `effort:'low'`, no temperature, warnings logged | `infrastructure/facilitator/anthropic-adapter.test.ts` | ✅ |
| P1 Facilitator AC2a — >12 tracks / >200 label | schema rejects | `infrastructure/facilitator/turn-schema.test.ts` — 13-track + long-label reject | ✅ |
| P1 Facilitator AC9 — interpret-at-most-once | 2nd `Interpret Contribution` for a seen id → `ok([])` | `domain/session/decide.test.ts:~120` — `expect(result.value).toEqual([])` | ✅ (mutant M3 kills) |
| P1 Facilitator AC9a — crash between ledger + derived stream | reconcile repairs, **zero** extra model calls | `interpret-contribution/reconcile.test.ts` — call-counter `toBe(1)` | ✅ |
| P1 Facilitator AC10/11 — provider-down | `Contribution Made` kept, no `Contribution Interpreted`, retried next tick | `interpret.test.ts` + `anthropic-adapter.test.ts` ladder | ✅ |
| P1 Facilitator AC12 — schema-invalid | one retry total, then `Contribution Interpretation Failed` (own event) | `anthropic-adapter.test.ts` + `interpret.test.ts` + `domain/schema/events.test.ts` | ✅ |
| P1 Proposal AC2 — cap of 7 overflow | 8th+ grouped overflow, not dropped | `domain/read-models/proposals-view.test.ts:93` — `toEqual([f,f,f,f,f,f,f,t,t])` | ✅ |
| P1 Proposal AC4 — sync apply chain, per-context txn | two contexts never one SQLite txn | `review-proposal/accept.test.ts:111` — distinct-stream assertion (`Set(...).size >= 2`) | ✅ |
| P1 Proposal AC5 — proposer/accepter recorded | `{proposer:{name:'facilitator'}, accepter:{name:creatorName}}` | `accept.test.ts:102` — `toEqual({proposer:{name:'facilitator'},accepter:{name:'Dana'}})` | ✅ |
| P1 Proposal AC7 — APPLY_FAILED re-acceptable | not terminal, re-applies on retry | `accept.test.ts:132` + `domain/proposal/decide.test.ts` | ✅ |
| P1 Proposal AC8 — reject terminal | `REJECTED` terminal, nothing left behind | `domain/proposal/decide.test.ts` + `machine.property.test.ts` (fast-check) | ✅ |
| P1 Proposal — disposition machine | no command sequence reaches an illegal transition | `machine.property.test.ts` — fast-check property | ✅ (M1 kills) |
| Edge — double-accept | reuse stored `buildingBlockId`, **NOT call `applyOperation` again once APPLIED**, exactly one block | `accept.test.ts` — id-reuse + `toHaveLength(1)` + board-read count unchanged across 2nd accept (`:144-145`) | ✅ (M6 kills) |
| Edge — reconcile skips a `derived_track`-marked track | marked track skipped on re-run (AD-021) | `interpret.test.ts:241-271` — drop one marker row, `reconcilePendingDerivations` → `markDerivedTrackRuns` `toBe(1)` | ✅ (M4 kills) |
| P1 Session AC1 — one open session | 2nd `Start Session` → 409 (partial unique index) | `capabilities/start-session/http.test.ts` + `infrastructure/session-index.test.ts` | ✅ |
| P1 Session AC3 — close mechanic | `Session Closed {unresolvedQuestionIds, closedAt}` only; lapse non-terminal proposals; self-heal | `close-session/http.test.ts` + `domain/session/decide.test.ts` (no summary struct) | ✅ |
| P1 Session AC5 — reopen → identical model | rebuilt from log | `board-access` + `close-session` + E2E | ✅ |
| P1 Session AC6 — later session sees prior `sessionSummary` | projected on demand, no model call | `interpret-contribution/interpret.test.ts` (3rd-session context) + `read-models/session-summary.test.ts` | ✅ |
| P2 AC2 — question↔answer correlation | unknown/resolved `questionId` rejected, logged, no `Question Answered` | `domain/session/decide.test.ts` `unknown-question` / `question-already-resolved` | ✅ |
| Capture screen AC2b — poll until fully-derived | stops only once every contribution fully derived | `composables/use-interpretation-poll.test.ts` — keeps polling on `interpreted`-not-derived | ✅ (M5 kills) |
| Capture screen AC4 — HTTP-only, cold GET stores | 3 Pinia stores hydrate from one GET; no store imports another | `stores/*.test.ts` + depcruise `no-cross-store-imports` | ✅ |
| Success criterion — full loop in SPA | create → scope → 3 contributions → accept → backlog | `e2e/capture-loop.spec.ts` — 1 passed | ✅ |

**Status**: ✅ All user-story + edge-case ACs covered with exact assertions.
Behaviour-quality ACs S1-21/22/24 correctly deferred to the Slice-5 eval per the
confirmed "facilitator seam for testing" decision — translation-layer plumbing
(`bar`/`evidenceSpan`/past-tense track kinds) is tested here (`interpret.test.ts`,
`map.test.ts`).

---

## Edge Cases

- [x] Contribution for a session closed between render and POST → rejected (`make-contribution` closed → 409)
- [x] Partial/truncated model response → schema failure path, not provider-down (`anthropic-adapter.test.ts`)
- [x] Double-accept → reuse stored id + exactly one block + board-read count unchanged across the 2nd accept ("SHALL NOT call `applyOperation` again once APPLIED") (M6 kills)
- [x] Interpretation selected FIFO by `Session` stream position, not `at` (`interpret.test.ts` order assertion)
- [x] `decide` → `ok([])` never calls `append` with an empty batch (`appendSession`/`appendProposal` guard + tests)
- [x] Crash between Capture append and Proposal-outcome append accepted (no reconcile this slice) — documented
- [x] Punctuation-only / single-char contribution still captured, may interpret to zero tracks (`session/decide.test.ts`)
- [x] `Set Scope` with empty statement → rejected (`workshop/decide.test.ts`)

---

## Gate Check

- **Gate command**: `pnpm check` (typecheck → lint → test → depcruise → knip); iteration 1 also ran `pnpm build` ✅ + `pnpm test:e2e` ✅ (1 passed, chromium)
- **Result (iteration 2)**: `pnpm check` ✅ — 64 files, **357 tests passed, 0 failed**, 0 skipped; depcruise no violations (182 modules, 709 deps); knip clean
- **Test count before feature (Slice 0)**: 99
- **Test count after feature**: 357 unit (64 files) + 1 e2e
- **Delta**: +258 unit, +1 e2e
- **Skipped tests**: none
- **Failures**: none
- **depcruise**: no violations (182 modules, 709 dependencies); all architecture rules active

---

## Discrimination Sensor

**Depth**: lightweight fault-injection (scratch edits, reverted via `git checkout`; working tree was clean)

| # | File:line | Mutation | Covering tests | Killed? |
| - | --------- | -------- | -------------- | ------- |
| 1 | `session-facilitation/domain/proposal/decide.ts:59` | Removed `ACCEPTED\|APPLIED` accept-idempotency short-circuit | `domain/proposal/*` | ✅ Killed (2 failed) |
| 2 | `domain-model-capture/capabilities/board-access/apply-operation.ts:9` | `MAX_RETRIES = 8` → `1` (kill internal stale-position retry) | `board-access/*` | ✅ Killed (1 failed — the two-accept race) |
| 3 | `session-facilitation/domain/session/decide.ts:85` | Removed `Interpret Contribution` interpret-once ledger guard | `domain/session/*` | ✅ Killed (2 failed) |
| 4 | `session-facilitation/capabilities/interpret-contribution/interpret.ts:89` | `deriveTracks` no longer skips a track already marked in `derived_track` | `interpret.test.ts:241-271` | ✅ Killed (iter 2 — `expected 2 to be 1` at `:262`) |
| 5 | `src/app/capture-loop/composables/use-interpretation-poll.ts:29` | Inverted the in-flight predicate (`IN_FLIGHT.has` → `!IN_FLIGHT.has`) | `use-interpretation-poll.test.ts` | ✅ Killed (2 failed) |
| 6 | `session-facilitation/capabilities/review-proposal/accept.ts:75` | `if (wm.disposition === 'APPLIED')` early-return guard → `'REJECTED'` (re-run apply chain on an already-APPLIED proposal) | `accept.test.ts:144-145` | ✅ Killed (iter 2 — `expected 2 to be 1` at `:145`) |

**Result**: 6/6 killed — **PASS**

Iteration 1 left M4 + M6 alive (missing assertions over *defence-in-depth* idempotency
guards — observable outcome unchanged because downstream `decide` no-ops and the
board's `duplicate-id` signal both hold without the guards). Commits `a3533cb` (M4) and
`b0ab862` (M6) added assertions that pin the guards directly; both mutants now fail a
test. Sensor mutations were applied in scratch state and reverted via `git checkout`.

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum code / no scope creep | ✅ — capabilities are thin handlers; deferred bus/opus/reword all held out per spec Out-of-Scope |
| Surgical changes / only required files | ✅ — additive params on `applyMigrations` documented (T5 DEVIATION); no unrelated edits |
| No single-use abstractions | ✅ — `finishClose` / `streams.ts` / `deps.ts` are genuine multi-consumer seams (AD-024) |
| Matches existing patterns | ✅ — mirrors Slice-0 decide/evolve/replay + frozen-union + `plumbing/ids.ts` mirror |
| Spec-anchored outcome check | ⚠️ — 2 edge-case assertions missing (M4, M6); all else exact |
| Per-layer coverage expectation | ✅ — domain 1:1 to ACs + fast-check property; routes cover happy+edge+error; 1 E2E per ADR-008 |
| Every test maps to a requirement — no unclaimed tests | ✅ — sampled; tests trace to S1-* / edge cases / Done-when |
| Documented guidelines followed | ✅ — `AGENTS.md`, `docs/testing.md` (literals not cross-projection), `src/*/domain/AGENTS.md` framework-free rule (depcruise-enforced) |

**AGENTS.md hard rules:**
- `**/domain/**` imports no framework / Node builtin — ✅ depcruise `domain-imports-no-framework` active, green
- Cross-context only via `api.ts` — ✅ `cross-context-only-via-api` green; `session-facilitation` reaches `domain-model-capture` only through `api.ts` (`applyOperation`, `readBuildingBlocks`, `Operation`)
- No machine-specific absolute paths in committed files — ✅ `git grep` for `/Users/`, `/home/`, `C:\Users` over `src/`, `e2e/`, configs → clean
- Two contexts never share a SQLite transaction (AD-016) — ✅ `accept.test.ts:111` seam test asserts distinct streams / separate `append` calls; each context owns its `DatabaseSync` handle

**Documented deviations in the diff (all legitimate):**
- T1 `SPEC_DEVIATION`: `Author` parties are `{ name }` refs, not plain strings — frozen Slice-0 schema unchanged, accept path wraps names. Sound.
- T2 `DEVIATION`: generic `domain-imports-no-framework` rule already covered the new context — no glob extension needed. Sound.
- T5 `DEVIATION`: `applyMigrations` gained two additive default params — backward compatible, Slice-0 tests unchanged. Sound.
- T22 `SPEC_DEVIATION`: a genuine `Operation Rejected → APPLY_FAILED` through the accept seam is unreachable for the 3 slice-1 kinds (all mint an id, no target → only `duplicate-id`, which is the idempotency signal). The branch is retained + covered at the decider layer (T8) and via a seeded precondition (T22). Sound and well-reasoned.

---

## Fix Plans — RESOLVED in iteration 2

Both fixes below landed (`a3533cb`, `b0ab862`) and each now kills its mutant. Retained
for the record.

### Fix 1: `deriveTracks` does not verify the `derived_track` skip (M4)

- **Root cause**: `interpret.ts:89` skips a track whose `${contributionId}::${index}` key is
  in `derived_track`, but no test asserts this — idempotency is currently only proven
  through the downstream `decide` no-ops, so a regression that removed the marker check
  (or the `markDerivedTrack` write) would pass CI.
- **Fix task**: In `interpret-contribution/reconcile.test.ts` (or `interpret.test.ts`),
  add a case: interpret a contribution with a `flag-phase` **and** an `attribute` track,
  then spy on `deps.store.append` and call `reconcilePendingDerivations` again — assert
  zero further appends to the session stream *and* that removing the `derived_track` row
  for one track makes exactly that track re-derive. Pin `markDerivedTrack` is called
  once per track per turn.
- **Priority**: Minor (behaviour correct via redundant guards; test integrity gap)

### Fix 2: double-accept does not verify `applyOperation` is skipped once APPLIED (M6)

- **Root cause**: `accept.ts:75` short-circuits an already-`APPLIED` proposal before the
  apply chain, but `accept.test.ts:122` only asserts id-reuse + one building block —
  both of which also hold if the guard is removed (`duplicate-id` path). The spec edge
  case "SHALL NOT call `applyOperation` again once the proposal is APPLIED" is unverified.
- **Fix task**: In `accept.test.ts`, wrap `applyOperation` (or the `domain-model-capture`
  `api.ts` call) in a spy; in the double-accept test assert it is called exactly once
  across the two accepts. Alternatively assert `board` stream length is unchanged by the
  second accept.
- **Priority**: Minor (behaviour correct; explicit spec edge case unasserted)

Both are ≤3-iteration, single-assertion fixes; re-verify with `pnpm test` on the two
affected files.

---

## Requirement Traceability Update

The spec's traceability table carries stale `Pending` / `◐` markers from mid-execution.
Re-derived against the final diff, all requirement IDs are Verified except the two
below (covered behaviourally, assertion missing):

| Requirement | Spec status | New status |
| --- | --- | --- |
| S1-01…S1-20, S1-26…S1-28, S1-30, S1-31, S1-50, S1-57, S1-59, S1-60, S1-62, S1-64, S1-66, S1-67, S1-68, S1-69 | mixed ✅/◐ | ✅ Verified |
| S1-21, S1-22, S1-24 | Design/Pending | ✅ Verified (plumbing here; judgment quality = Slice-5 eval, per confirmed decision) |
| S1-23, S1-25, S1-29, S1-32, S1-33, S1-34, S1-35, S1-36, S1-37, S1-40, S1-41, S1-43, S1-51a, S1-52, S1-53, S1-54, S1-55, S1-56, S1-58, S1-61, S1-63, S1-65 | Design/Pending/◐ | ✅ Verified |
| S1-42 | ✅ | ✅ Verified (per-context txn seam test) |
| S1-47 (double-accept idempotency — `applyOperation` not re-invoked) | ✅ | ✅ Verified (iter 2, `b0ab862` — board-read count assertion, M6 kills) |
| S1-56 (derived-stream idempotent / worker reconciles — `derived_track` skip) | Design/Pending | ✅ Verified (iter 2, `a3533cb` — per-track skip assertion, M4 kills) |
| S1-51b | ◐ | ◐ (Slice-6 doc reconciliation — note only, by design) |

---

## Summary

**Overall**: ✅ Ready (iteration 2 — both open assertion gaps closed)

**Spec-anchored check**: all user-story + edge-case ACs covered with exact assertions.
0 spec-precision gaps — the spec is unusually precise.
**Sensor**: 6/6 mutants killed.
**Gate**: `pnpm check` green (357 unit tests, 0 failed); `pnpm build` + `pnpm test:e2e`
green in iteration 1 (1 e2e), from a 99 baseline.

**What works**: the entire capture loop end to end — workshop birth, forced scope
question, async interpretation with the provider-down / schema-invalid failure split,
the disposition machine (fast-check property), the synchronous per-context accept
chain with AD-016 proven at the seam, session close/resume with self-healing, the
board-first SPA wired over HTTP only. All architecture rules depcruise-enforced and
planted-violation-verified. No machine paths. Documented deviations all sound.

**Issues found**: none open. The two iteration-1 gaps (M4, M6 — missing assertions, no
behaviour defect) are closed by `a3533cb` and `b0ab862`.

**Next steps**: none — slice is Ready.
