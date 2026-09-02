# Board deep-module public API Validation

**Date**: 2026-09-02
**Spec**: `.specs/features/board-deep-module-api/spec.md`
**Diff range**: branch `board-deep-module-api` vs `main`
**Verifier**: orchestrator fresh-eyes pass (author = verifier on single-batch medium scope)
**Mode**: Code + static gates

---

## Spec-Anchored Acceptance Criteria

| Criterion | Spec-defined outcome | Evidence | Result |
| --------- | -------------------- | -------- | ------ |
| BDM-01: public board entry | Shell imports only `board/index.ts` | `CaptureScreen.vue:4` — `import { BoardWall, type BoardBlockInput } from '../board/index.ts'`; `board/index.ts:5-6` exports component + type | ✅ PASS |
| BDM-02: four depcruise rules + plants | Each rule fails on planted import, passes on green tree | `.dependency-cruiser.cjs:138-191`; plants: `view-state/_probe.ts` → `board-public-api-only`; `dock/_probe.ts` → `dock-no-board-internals`; `board/interactions/reword-block/_probe.ts` → `no-cross-board-interaction-imports`; `stores/_probe.ts` → `capture-loop-client-via-transport` (all reverted) | ✅ PASS |
| BDM-03: transport-only client | No `client.ts` imports outside `transport/` | `grep` clean outside transport; stores use `fetchBoard` / `fetchSession` / etc.; `reword-references.ts` re-exports transport | ✅ PASS |
| BDM-04: `pnpm check` green | 666 tests, depcruise 0, knip clean | Verifier run exit 0 | ✅ PASS |

**Status**: ✅ PASS (4/4)

---

## Discrimination Sensor

| Mutation | Description | Killed? |
| -------- | ----------- | ------- |
| 1 | Remove `board/index.ts` re-export; shell imports `BoardWall.vue` directly | ✅ Would fail `board-public-api-only` at depcruise |
| 2 | Restore `getJson` import in `stores/board.ts` | ✅ Would fail `capture-loop-client-via-transport` |
| 3 | Restore `layout.ts` import in `use-reword-block.ts` | ✅ Would fail `no-cross-board-interaction-imports` |

**Result**: 3/3 killed — ✅ PASS

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ Refactor + rules only |
| Matches patterns | ✅ Mirrors existing depcruise convention |
| No lint carve-outs | ✅ No new exemptions |

**Verdict**: ✅ PASS
