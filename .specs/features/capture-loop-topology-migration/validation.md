# Capture-loop topology migration — validation

**Date**: 2026-09-02
**Spec**: `.specs/features/capture-loop-topology-migration/spec.md`
**Branch**: `capture-loop-topology-migration`
**Batch**: Execute Batch 2 (T12–T15); Batch 1 (T1–T11) at `e0246d9`
**Author**: Execute batch worker (orchestrator Verifier runs separately)

---

## Batch 2 Task Completion

| Task | Commit | Gate | Result |
| ---- | ------ | ---- | ------ |
| T12: select-block interaction | `9aaca3f` | `pnpm check` (678 tests) | ✅ PASS |
| T13: zone AGENTS.md | `1385ea2` | `pnpm check:process-ids` + `pnpm check` | ✅ PASS |
| T14: shell composables move | `0a15959` | `pnpm check` (678 tests) | ✅ PASS |
| T15: final verification | (this commit) | `pnpm check` + `pnpm test:e2e` | ✅ PASS |

---

## Spec-Anchored Acceptance (Batch 2)

| Criterion | Evidence | Result |
| --------- | -------- | ------ |
| TOPO-18: select-block interaction | `board/interactions/select-block/use-select-block.ts`; `use-board-selection.ts` removed; BoardWall tests green | ✅ PASS |
| TOPO-20/21: zone AGENTS.md | `shell/AGENTS.md`, `board/AGENTS.md`, `dock/AGENTS.md` — owns + import rules; link surface doc | ✅ PASS |
| TOPO-22: root composables removed | No `src/app/capture-loop/composables/`; poll + reduced-motion under `shell/composables/` | ✅ PASS |
| P3 AC3: poll + orchestration colocated | `use-interpretation-poll.ts`, `use-capture-orchestration.ts` in `shell/composables/` | ✅ PASS |

---

## Success Criteria (full migration)

| Criterion | Evidence | Result |
| --------- | -------- | ------ |
| `pnpm check` passes | Exit 0; 678 unit tests; depcruise clean | ✅ PASS |
| `pnpm test:e2e` capture-loop happy path | 5/5 passed (`e2e/capture-loop.spec.ts`) | ✅ PASS |
| Refetch graph in orchestration | `shell/orchestration/refetch-graph.ts` present | ✅ PASS |
| No legacy paths | No `screens/`, `use-board-mutations.ts`, or root `composables/` | ✅ PASS |

---

## Deviations

- **T12**: `use-select-block.ts` defines local `SelectBlockView` instead of importing `BoardBlockInput` from `layout.ts` — required by `no-cross-board-interaction-imports` dep-cruiser rule (layout not in interaction allowlist post-T11).
- **T15 e2e**: Playwright Chromium was not pre-installed in the sandbox; `pnpm exec playwright install chromium` was run once before e2e gate passed.

---

**Status**: ✅ PASS — Batch 2 complete; full migration Execute (T1–T15) ready for Verifier.
