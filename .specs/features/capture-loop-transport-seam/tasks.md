# Capture-loop transport seam — tasks

## Test Coverage Matrix

**Provenance:** `docs/testing.md`, `AGENTS.md` (`pnpm check`), co-located `*.test.ts` under
`src/app/capture-loop/`.

### Coverage Expectation

| Layer | Test type | What to cover | Location pattern | Gate |
| ----- | --------- | ------------- | ---------------- | ---- |
| Transport POST shapes | unit (jsdom) | Each concern's POST path/body | `transport/*.test.ts` or moved from `dock/mutations.test.ts` | `pnpm test` |
| Board view-state | unit | default hidden withdrawn; toggle no fetch | `view-state/board-view.test.ts` | `pnpm test` |
| Board store | unit | projection load only; no showWithdrawn | `stores/stores.test.ts` | `pnpm test` |
| FacilitatorDock | unit | blockLabels prop; no board store | `dock/FacilitatorDock.test.ts` | `pnpm test` |
| RewordConfirm | unit | portals to #reword-portal only | `board/RewordConfirm.test.ts` | `pnpm test` |
| Architecture | static | `no-cross-store-imports` if dock touched | `.dependency-cruiser.cjs` | `pnpm depcruise` |

### Gate Check Commands

```bash
pnpm check
```

---

## Phase 1: Transport module

### T1: Add `transport/{proposals,session,board}.ts`

**What**: Split POST adapters from `dock/mutations.ts` into three transport modules. Move
`BoardEdit` to `transport/board.ts`. Add `startSession` to session transport.

**Verify**: `transport/board.test.ts` (moved from `dock/mutations.test.ts`); proposal/session
smoke via existing dock tests.

**Deps**: none

### T2: Shim `dock/mutations.ts`

**What**: Re-export all symbols from transport modules for backward compatibility.

**Verify**: Existing imports from `dock/mutations.ts` compile; `pnpm test` green.

**Deps**: T1

---

## Phase 2: Hidden dependencies

### T3: Shell-provided block labels

**What**: Remove `useBoardStore` from `FacilitatorDock.vue`. `CaptureScreen` passes
`blockLabels`. Update `FacilitatorDock.test.ts`.

**Verify**: Receipt label test uses `blockLabels` prop; dock file has no board store import.

**Deps**: T2

### T4: Single reword portal

**What**: Remove `ensurePortal()` from `RewordConfirm.vue`. Portal target is only
`CaptureScreen`'s `#reword-portal`.

**Verify**: `RewordConfirm.test.ts` / grep — no `createElement` portal fallback.

**Deps**: none (parallel with T3)

### T5: Withdrawn toggle in view-state

**What**: Extract `showWithdrawn` + timeline from board store to `view-state/board-view.ts`.
Wire `CaptureScreen` + `BoardWall`. Update `stores.test.ts` and add view-state test.

**Verify**: Toggle does not fetch; board store has no `showWithdrawn`/`timeline`.

**Deps**: none (parallel with T3–T4)

---

## Phase 3: Close-out

### T6: Gate + STATE handoff

**What**: Run `pnpm check`. Update `.specs/STATE.md` handoff. Add patch changeset.

**Verify**: `pnpm check` exit 0.

**Deps**: T1–T5
