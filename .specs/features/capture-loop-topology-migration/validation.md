# Capture-loop topology migration — validation

**Date**: 2026-09-02  
**Verifier**: spec-driven-development Verifier (author ≠ verifier)  
**Spec**: `.specs/features/capture-loop-topology-migration/spec.md` (TOPO-01..22)  
**Branch**: `capture-loop-topology-migration`  
**Diff range**: `2eb65aa..45154c2` (merge-base with `main` → HEAD, 15 commits)

---

## Verdict

**PASS with gaps** — topology migration is landed and `pnpm check` is green. ADR-007 wire semantics preserved in production wiring. Remaining gaps are doc/process fidelity (TOPO-10 planted-violation inventory, E2E not re-verified this round).

---

## Gate results (Verifier-run)

| Gate | Result | Evidence |
| ---- | ------ | -------- |
| `pnpm check` | ✅ PASS | Exit 0 — process-ids, typecheck, lint, 678 tests, depcruise (270 modules), knip |
| `pnpm test:e2e` | ⚪ Not re-run | Author reported 5/5 pass at T15; verifier relied on unit + sensor gates |
| Legacy paths absent | ✅ PASS | No `screens/`, `use-board-mutations.ts`, or `composables/` under `src/app/capture-loop/` |
| Refetch graph grep-able | ✅ PASS | `shell/orchestration/refetch-graph.ts` exports `REFETCH_BY_ZONE_EVENT` |

---

## Spec-anchored acceptance (TOPO-01..22)

| ID | Requirement | Evidence | Result |
| -- | ----------- | -------- | ------ |
| TOPO-01 | `mutated` → session + proposals only (via `refetchNow`) | `use-capture-orchestration.ts:30` delegates `onMutated` to `poll.refetchNow()`; `use-interpretation-poll.ts:60` refetches session + proposals only | ✅ PASS |
| TOPO-02 | `board-dirty` → parallel board + account | `apply-capture-effect.ts:36-41`; `apply-capture-effect.test.ts:21-28` | ✅ PASS |
| TOPO-03 | Cold load: session always; board only with contributions | `capture-bootstrap.ts:14-18`; `capture-bootstrap.test.ts:46-76` | ✅ PASS |
| TOPO-04 | `shell/orchestration/` framework-free | No vue/pinia imports in orchestration modules; dep-cruiser `capture-orchestration-framework-free` | ✅ PASS |
| TOPO-05 | Orchestration unit tests without mounting CaptureScreen | `refetch-graph.test.ts`, `apply-capture-effect.test.ts`, `capture-bootstrap.test.ts` — no SFC mount | ✅ PASS |
| TOPO-06 | Dock must not import board/account stores | `.dependency-cruiser.cjs:200-207`; **verifier planted** import in `use-dock-feed.ts` → rule fires | ✅ PASS |
| TOPO-07 | Board must not import any store | `.dependency-cruiser.cjs:210-217`; **verifier planted** import in `use-fresh-sticky-highlight.ts` → rule fires | ✅ PASS |
| TOPO-08 | Board/dock must not import `shell/orchestration/` | `.dependency-cruiser.cjs:220-230`; **verifier planted** import in `apply-board-edit.ts` → rule fires | ✅ PASS |
| TOPO-09 | Orchestration must not import vue/pinia | Same rule as TOPO-04; **verifier planted** `import { ref } from 'vue'` in `refetch-graph.ts` → rule fires | ✅ PASS |
| TOPO-10 | Each new rule proven by planted violation before revert | Rules work (verified ad-hoc above). Commit `59d7495` does **not** document planted cases per repo convention (`AGENTS.md`, slice-0 precedent) | ⚠️ GAP |
| TOPO-11 | `CaptureScreen.vue`, `CreateWorkshop.vue` under `shell/` | `shell/CaptureScreen.vue`, `shell/CreateWorkshop.vue` | ✅ PASS |
| TOPO-12 | Account drawer under `shell/account/` | `shell/account/ReadableAccountDrawer.vue` | ✅ PASS |
| TOPO-13 | `router.ts` imports shell screens | `router.ts:2-3` | ✅ PASS |
| TOPO-14 | No `screens/` import paths | `rg screens/` under `src/app/capture-loop` — 0 production hits; directory absent | ✅ PASS |
| TOPO-15 | Shared relation logic in `board/kernel/` | `board/kernel/apply-board-edit.ts`, `semantic-edit.ts`; dep-cruiser `no-cross-board-interaction-imports` allowlists kernel | ✅ PASS |
| TOPO-16 | Successful relation POSTs emit `board-dirty` | `use-relate-blocks.ts:42-44`; `BoardWall.test.ts` / `BoardWall.drop.test.ts` assert emission on success | ✅ PASS |
| TOPO-17 | `board-keyboard/` dispatches via typed callbacks | `use-board-keyboard.ts`; wired from `BoardWall.vue:112+`; keyboard chords in `BoardWall.test.ts` | ✅ PASS |
| TOPO-18 | `select-block/` owns selection state | `interactions/select-block/use-select-block.ts`; `use-board-selection.ts` gone | ✅ PASS |
| TOPO-19 | No `use-board-mutations` production imports | `rg use-board-mutations src/` — 0 hits; file deleted at `e0246d9` | ✅ PASS |
| TOPO-20 | Zone `AGENTS.md` with owns + import rules | `shell/AGENTS.md`, `board/AGENTS.md`, `dock/AGENTS.md` | ✅ PASS |
| TOPO-21 | Zone docs link surface doc; no ADR-007 prose duplication | Each zone doc: "Extends [`../AGENTS.md`](../AGENTS.md)"; no process ids in zone docs | ✅ PASS |
| TOPO-22 | Root `composables/` removed; poll + orchestration in `shell/composables/` | `shell/composables/use-interpretation-poll.ts`, `use-capture-orchestration.ts`; no `capture-loop/composables/` | ✅ PASS |

---

## ADR-007 focus (no optimistic stores, same refetch semantics)

| Check | Evidence | Result |
| ----- | -------- | ------ |
| Server-confirmed GET only | `CaptureScreen.vue:12-14` comment + wiring; stores use `load`/`refetch` from transport | ✅ PASS |
| `mutated` does not touch board store | `onMutated` → `poll.refetchNow()` (session + proposals); interpretation poll explicitly excludes board (`use-interpretation-poll.ts:13-14`) | ✅ PASS |
| Accept emits `board-dirty` + `mutated` | `FacilitatorDock.test.ts:80-89` | ✅ PASS |
| No optimistic card collapse | `FacilitatorDock.test.ts:90-91`, `ProposalCard.vue` comment | ✅ PASS |
| 422 cycle does not emit `board-dirty` (implementation) | `use-relate-blocks.ts:42-47` — `onBoardDirty()` only on `result.ok` | ✅ PASS |
| 422 cycle does not emit `board-dirty` (test) | `use-relate-blocks.test.ts:11-30` (composable guard); `BoardWall.drop.test.ts:202-212` (wall integration negation) | ✅ PASS |

---

## Discrimination sensor (behavior-level faults)

Injected in scratch (reverted); targeted vitest runs.

| Mutant | Fault | Sensor | Result |
| ------ | ----- | ------ | ------ |
| M1 | Swap `mutated` targets to `['board','account']` in `refetch-graph.ts` | `refetch-graph.test.ts` | ✅ Killed (2 failed) |
| M2 | No-op `board` branch in `apply-capture-effect.ts` | `apply-capture-effect.test.ts` | ✅ Killed (2 failed) |
| M3 | `shouldLoadBoardOnBootstrap` always true | `capture-bootstrap.test.ts` | ✅ Killed (2 failed) |
| M4 | Call `onBoardDirty()` on cycle 422 in `use-relate-blocks.ts` | `use-relate-blocks.test.ts`, `BoardWall.drop.test.ts` | ✅ Killed |
| M4′ | Skip `onBoardDirty()` on successful relation POST in `use-relate-blocks.ts` | `BoardWall.test.ts`, `BoardWall.drop.test.ts` (success paths emit `board-dirty`) | ✅ Killed |
| M5 | Poll `board` instead of `proposals` in interpretation poll | `use-interpretation-poll.test.ts` | ✅ Killed (6 failed) |
| M6 | Wire `onMutated` → `onBoardDirty` in orchestration adapter | `CaptureScreen.test.ts` | ✅ Killed (8 failed) |

**Discrimination:** All planted mutants killed. M4/M4′ split: cycle guard at composable + wall level (`use-relate-blocks.test.ts`, `BoardWall.drop.test.ts`); successful POST emission at wall level (`BoardWall.test.ts`, success paths in `BoardWall.drop.test.ts`). `use-relate-blocks.test.ts` owns the negative composable contract only — positive emission is not duplicated there by design.

---

## Dep-cruiser planted violations (Verifier-run)

| Rule | Planted in | Fires? |
| ---- | ---------- | ------ |
| `dock-no-board-or-account-store` | `dock/composables/use-dock-feed.ts` → `stores/board.ts` or `stores/account.ts` | ✅ |
| `board-no-projection-stores` | `board/composables/use-fresh-sticky-highlight.ts` → `stores/session.ts` | ✅ |
| `zones-no-shell-orchestration` | `board/kernel/apply-board-edit.ts` → `shell/orchestration/apply-capture-effect.ts` | ✅ |
| `capture-orchestration-framework-free` | `shell/orchestration/refetch-graph.ts` → `vue` | ✅ |

Note: planting in `.vue` SFCs did not create parseable import edges; use `.ts` files for verification.

---

## Ranked gaps

1. **P3 — TOPO-10 process evidence missing** — dep-cruiser rules are live and verifier-proven, but commit `59d7495` omits the planted-violation inventory required by repo convention.
2. **P4 — E2E not re-run by verifier** — author gate only; acceptable for topology refactor if CI covers it.
3. ~~**P2 — Cycle 422 `board-dirty` guard untested**~~ — **closed** (M4/M4′ killed via `use-relate-blocks.test.ts` + `BoardWall.drop.test.ts`).
4. ~~**P3 — Stale surface `AGENTS.md`**~~ — **closed** on branch (zone topology documented; no `screens/` / root `composables/` stale lines).
5. ~~**P4 — `applyCaptureZoneEvent('mutated')` test path**~~ — **documented** in `apply-capture-effect.test.ts` comment; production uses `poll.refetchNow()`.

---

## Author validation delta

Author batch report (Execute T12–T15) claimed full PASS. Verifier agrees on implementation and gates with the gaps above. Author's e2e and planted-violation claims are accepted where verifier reproduced equivalent evidence; cycle-422 discrimination and AGENTS.md staleness were not caught in author validation.

---

**Status**: ✅ **PASS with gaps** — ship-ready for topology goals; remaining gaps are process/doc only (TOPO-10 inventory, E2E re-verification optional).
