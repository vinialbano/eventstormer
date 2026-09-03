# Slice 4 — PR #90 review fixes Validation

**Date**: 2026-09-03
**Spec**: `.specs/features/slice-4-review-fixes/spec.md`
**Diff range**: `a03e40b..HEAD` (6 commits)
**Verifier**: independent sub-agent (author ≠ verifier)
**Mode**: Code + tests

---

## Task Completion

| Requirement | Status | Notes |
| --- | --- | --- |
| RF-1 (B1) | ✅ Done | `sweptBlockId(workshopId, key)` — sha256 base64url, 21 chars; replaces `newBuildingBlockId()` |
| RF-2 (B2) | ✅ Done | `closeIndexRow` moved to end of `finishClose`, after lapse loop + `reconcileHotSpots` |
| RF-3 (W1) | ✅ Done | `decide.ts:79` — `stakeholderComplete === true ? 'firm' : 'provisional'` |
| RF-4 (W2) | ✅ Done | `SPEC_DEVIATION` / "design says" framing dropped; type-widening rationale kept |
| RF-5 (W3+NOTE3) | ✅ Done | Four parent-slice docs describe AD-032; `detail?` field name; Verifier PASS status |

---

## Spec-Anchored Acceptance Criteria

### RF-1 (B1) — sweep idempotent across a lost marker write

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| `reconcileHotSpots` run twice with the `hot_spot_sweep` row deleted between runs leaves exactly one hot spot for the key | one hot spot, label unchanged | `src/session-facilitation/infrastructure/hot-spot-sweep.test.ts:184` — `expect(hotSpotLabels(store)).toEqual(['Who else?'])` | ✅ PASS |
| the id is derived from `workshopId` + sweep key, not random (stable across crash+retry) | board block id identical across the two passes | `hot-spot-sweep.test.ts:185` — `expect(hotSpotBlockIds(store)).toEqual([raisedId])` | ✅ PASS |
| marker rewritten after the duplicate-id answer | swept key set restored | `hot-spot-sweep.test.ts:186` — `expect(readSweptKeys(db)).toEqual(new Set(['kg:q_1']))` | ✅ PASS |

Implementation: `hot-spot-sweep.ts:73-74` `createHash('sha256').update(\`${workshopId}::${key}\`).digest('base64url').slice(0, 21)`, consumed at `hot-spot-sweep.ts:200`.

### RF-2 (B2) — partial `finishClose` retried

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| board append fails on first pass → `finishClose` leaves index row `open` | index row still `open`, proposal not lapsed | `src/session-facilitation/capabilities/interpret-contribution/reconcile.test.ts:400` — `expect(sessionIdsFor(db, workshopId).open).toBe(sessionId)` and `:402` `...toEqual(['Building Block Proposed'])` | ✅ PASS |
| next `reconcilePendingDerivations` tick completes the close (hot spots raised, row `closed`) | `{ closed: [sessionId] }`, hot spot on board, proposal lapsed | `reconcile.test.ts:409` — `expect(sessionIdsFor(db, workshopId)).toEqual({ closed: [sessionId] })`; `:410` `boardHotSpotLabels()...toEqual(['What is the fulfilment phase?'])`; `:412` proposal stream `['Building Block Proposed', 'Proposal Lapsed']` | ✅ PASS |
| a fully successful `finishClose` still ends with the row `closed` | row `closed` | pre-existing `reconcile.test.ts` close-sweep suite (e.g. `:349` region) + `session-close` order at `session-close.ts:61` | ✅ PASS |

Implementation: `session-close.ts` — `closeIndexRow` is now the last statement (line 61), after the lapse loop (37-52) and `reconcileHotSpots` (56).

### RF-3 (W1) — Choose Problem qualification

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| `Choose Problem` with no `Stakeholder Check Recorded` | `qualification: 'provisional'` | `src/session-facilitation/domain/workshop/decide.test.ts:231` — `expect(result.value[0]).toMatchObject({ type: 'Problem Chosen', qualification: 'provisional' })`; `src/session-facilitation/capabilities/choose-problem/http.test.ts:72` — `expect(workshopEvents(store).at(-1)).toMatchObject({ type: 'Problem Chosen', qualification: 'provisional' })` | ✅ PASS |
| with a complete check | `qualification: 'firm'` | `decide.test.ts:218` — `...toMatchObject({ ..., qualification: 'firm' })`; `http.test.ts` "firm after a complete stakeholder check" `expect(response...qualification).toBe('firm')` region | ✅ PASS |
| with an incomplete check | `qualification: 'provisional'` | `decide.test.ts:203` — `expect(result.value).toEqual([{ ..., qualification: 'provisional' }])`; `http.test.ts` "incomplete" case | ✅ PASS |

Implementation: `decide.ts:79`.

### RF-4 (W2) — doc-only

| Criterion | `file:line` + evidence | Result |
| --- | --- | --- |
| `grep -R "SPEC_DEVIATION\|design says" src/` returns nothing | run: exit 1, no matches | ✅ PASS |
| the type reason is still documented | `events.ts:218-224` and `interpreted-track.ts:31-38` — "`.optional()` rather than `.default(true)` because `.default()` widens the Zod output type…" | ✅ PASS |

### RF-5 (W3+NOTE3) — doc-only

| Criterion | Evidence | Result |
| --- | --- | --- |
| No "event bus" / "AD-019 built here" / "Verifier pending" / "absentDetail" left in the four parent-slice docs except where marked superseded | grep of `spec.md`/`context.md`/`design.md`/`tasks.md`: every "event bus" hit is negated ("no event bus", "NOT built", "superseded by AD-032"); no "Verifier pending"; `design.md:5` + `spec.md:7` + `tasks.md:21` read "Verifier PASS"; `design.md:268,275` use `detail?`; no `absentDetail` in any of the four | ✅ PASS |
| S4-25 row rewritten to marker-table choreography | `spec.md:359` — "superseded by AD-032: no bus. Replaced by the `hot_spot_sweep` marker table + `reconcileHotSpots` choreography" | ✅ PASS |

**Status**: ✅ All ACs covered, asserted values match spec outcomes.

---

## Discrimination Sensor

Scratch state: mutation applied in place, target test run, then `git checkout <file>` restore (verified clean each time).

| Mutation | File:line | Description | Killed? |
| --- | --- | --- | --- |
| a | `hot-spot-sweep.ts:74` | `sweptBlockId` made non-deterministic — appended `::${Math.random()}` to the hash input | ✅ Killed — `hot-spot-sweep.test.ts:184` "rewrites the marker with no duplicate board block…" fails (two "Who else?" blocks) |
| b | `session-close.ts:37` | Restored `closeIndexRow(deps.db, sessionId, closed.at)` to the top of `finishClose` (before the lapse loop) | ✅ Killed — `reconcile.test.ts:400` "retries a partial finishClose…" fails (`sessionIdsFor(db, workshopId).open` is `undefined`) |
| c | `decide.ts:79` | Flipped to `stakeholderComplete === false ? 'provisional' : 'firm'` | ✅ Killed — `decide.test.ts` and `choose-problem/http.test.ts` both fail (2 failed / 22 passed): absent-check qualification is `firm` not `provisional` |

**Sensor depth**: lightweight (3 targeted behaviour-level mutations)
**Result**: 3/3 killed — PASS ✅

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum code | ✅ — one helper (`sweptBlockId`), one statement move, one boolean-expression flip, two comment rewrites |
| Surgical changes | ✅ |
| No scope creep | ✅ — diff touches only `hot-spot-sweep.ts`, `session-close.ts`, `decide.ts`, `events.ts`, `interpreted-track.ts`, their tests, and `.specs/` docs |
| Matches patterns | ✅ — `node:crypto` in `infrastructure/` is allowed and depcruise-clean (323 modules, 0 violations); `base64url` digest sliced to the 21-char `BuildingBlockId` shape |
| Spec-anchored outcome check | ✅ |
| Per-layer coverage (domain 1:1 ACs; routes happy+edge+error) | ✅ — `decide.test.ts` covers all three qualification branches; `choose-problem/http.test.ts` covers absent/complete/incomplete at the route |
| Every test maps to a spec requirement — no unclaimed tests | ✅ |
| Documented guidelines followed | ✅ — `AGENTS.md` (no process ids in code — none present in the new comments/test names; `docs/agents/framework-gotchas.md`) |

Note: the mock removed from `hot-spot-sweep.test.ts` (`vi.mock('~/plumbing/ids.ts')`) is a genuine strengthening — the test now proves real determinism rather than a stubbed id. Commit `0102701` (`return realAppend(...)`) is a correctness fix to the crash-stub required by `vue-tsc`, not a weakening.

---

## Edge Cases

- [x] Lost `markSwept` after committed board append — retry collides on derived id → `duplicate-id` (success), no second hot spot (RF-1)
- [x] Crash inside the proposal-lapse loop of `finishClose` — index row stays `open`, retried next tick (RF-2)
- [x] Absent stakeholder check (`stakeholderComplete === undefined`) → `provisional` (RF-3)
- [x] Incomplete stakeholder check (`=== false`) → `provisional` (RF-3)

---

## Gate Check

- **Gate command**: `pnpm check` (process-ids → typecheck → lint → test → depcruise → knip)
- **Result**: all steps green. Tests: 986 passed / 0 failed / 0 skipped (118 files). depcruise: 0 violations. knip: 1 non-fatal configuration hint (`eval/run.ts` redundant entry pattern — pre-existing, unrelated).
- **Test count before batch**: 984 (per `.specs/STATE.md` handoff)
- **Test count after batch**: 986
- **Delta**: +2 (`reconcile.test.ts` partial-close retry; `choose-problem/http.test.ts` provisional-when-absent). No tests deleted; `decide.test.ts` / `hot-spot-sweep.test.ts` assertions modified in the strengthening direction.
- **Failures**: none

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| --- | --- | --- |
| RF-1 (B1) | Execute | ✅ Verified |
| RF-2 (B2) | Execute | ✅ Verified |
| RF-3 (W1) | Execute | ✅ Verified |
| RF-4 (W2) | Execute | ✅ Verified |
| RF-5 (W3+NOTE3) | Execute | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 5/5 requirements matched spec outcome, 0 spec-precision gaps
**Sensor**: 3/3 mutations killed
**Gate**: 986 passed, 0 failed

**What works**: All five review fixes are implemented surgically, each anchored to a test whose asserted value matches the spec outcome. The two BLOCK fixes (deterministic sweep id, index-row-flips-last) are each guarded by a crash+retry test that the sensor confirms is discriminating. Doc-hygiene fixes verified by grep.

**Issues found**: none

**Next steps**: none — batch ready to fold into the slice-4 PR.
