# Slice 2 — The Money Shot Validation

**Date**: 2026-08-31
**Spec**: `.specs/features/slice-2-money-shot/spec.md`
**Diff range**: `main..HEAD` (`7a0b168` planning + T1–T17 through `3148418`; HEAD `aad2522`)
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

Every T1–T17 Done-when checkbox in `tasks.md` is `[x]`. No partial or blocked task.

| Task | Status  | Notes |
| ---- | ------- | ----- |
| T1   | ✅ Done | decide: `withdrawn-target` / `already-withdrawn`; vacuous `[withdraw]` |
| T2   | ✅ Done | `applyOperation` lifted; target-bearing kinds return `target` |
| T3   | ✅ Done | `readBoardSnapshot` includes withdrawn; empty log `{ position: -1, blocks: [] }` |
| T4   | ✅ Done | `artifactSource` quotes + coverage inputs |
| T5   | ✅ Done | DAG skeleton + `domain/AGENTS.md`; no `CONTEXT.md` |
| T6   | ✅ Done | `renderReadableAccount` + `listReferences` |
| T7   | ✅ Done | GET account + GET references |
| T8   | ✅ Done | `edit-model` POST F06 only |
| T9   | ✅ Done | host mounts both routers via `api.ts` |
| T10  | ✅ Done | 4th Pinia store; empty account is 200 |
| T11  | ✅ Done | withdrawn ghosts + dashed-ghost |
| T12  | ✅ Done | confirm popover + POST reword |
| T13  | ✅ Done | withdraw / reinstate controls |
| T14  | ✅ Done | drawer + `board-dirty` refetch |
| T15  | ✅ Done | capture-loop brief patched; `DESIGN.md` untouched |
| T16  | ✅ Done | one e2e spec extended |
| T17  | ✅ Done | `minor` changeset; `package.json` `version` still `0.2.0` |

---

## Spec-Anchored Acceptance Criteria

### P1: Reword a building block and watch derived text move

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| ------------------------- | -------------------- | ----------------------- | ------ |
| S2-01 WHEN a committed non-withdrawn sticky is activated (pencil / Enter / E) THEN dashed-ghost with current label and ✓ / ✕ — never for a pending proposal | `.sticky--reword` + input value = current label; proposals never receive this treatment | `src/app/capture-loop/board/BoardWall.test.ts:80` — `expect(sticky.classes()).toContain('sticky--reword')`; `:82` — `expect((field.element as HTMLInputElement).value).toBe('Order confirmed')`; `:103-104` Enter opens same editor; `:46-47` — `expect(wrapper.find('.sticky--ghost').exists()).toBe(false)` (wall has no pending-proposal ghost) | ✅ PASS |
| S2-02 WHEN they confirm the ghost THEN a confirmation popover lists `GET …/references` and SHALL NOT append until popover confirm | GET references, zero POSTs until confirm | `src/app/capture-loop/board/RewordConfirm.test.ts:64-65` — `expect(fetchMock).toHaveBeenCalledWith('/api/workshops/w1/board/blocks/b1/references')`; `expect(postsOf(fetchMock)).toHaveLength(0)`; `BoardWall.test.ts:160-165` — references GET true, operations POST false | ✅ PASS |
| S2-02 WHEN they cancel the ghost or the popover THEN previous label retained, nothing appended | Esc restores label; cancel POSTs zero times | `BoardWall.test.ts:88-90` — `expect(wrapper.find('.sticky--reword').exists()).toBe(false)` and `.text()` contains `'Order confirmed'`; `RewordConfirm.test.ts:110` — `expect(postsOf(fetchMock)).toHaveLength(0)` | ✅ PASS |
| S2-03 WHEN listed references are confirmed and the new label is non-empty THEN exactly one `reword`, author `{ accepter: { name: creatorName } }`, id retained | 200 `{ position }`; one appended op; accepter-only; id unchanged | `src/domain-model-capture/capabilities/edit-model/http.test.ts:50-56` — `expect(response.status).toBe(200)` / `toEqual({ position: 1 })` / `logOf(deps)` length 2 / `toMatchObject({ label: 'Loan was recorded', withdrawn: false })`; `:182-186` — `toMatchObject({ kind: 'reword', author: { accepter: { name: 'Dana' } } })` and `not.toHaveProperty('proposer')`; `RewordConfirm.test.ts:86-97` — one POST with that author | ✅ PASS |
| S2-03 WHEN the new label is empty or whitespace-only THEN 422 `empty-label`, previous label retained, nothing appended | 422 `empty-label` not 400; log unchanged; client inline reject | `edit-model/http.test.ts:96-105` — `expect(empty.status).toBe(422)` / `toEqual({ error: 'empty-label', classification: 'systemic' })` (same for `'   '`); `:105` — `expect(logOf(deps)).toHaveLength(1)`; `BoardWall.test.ts:200-201` — `toContain("Name can't be empty.")` / `expect(fetchMock).not.toHaveBeenCalled()` | ✅ PASS |
| S2-04 WHEN reword is applied THEN every rendered reference in the live account carries the new label; the site set equals the popover set | Same building-blocks site; only that id's line changes | `render-readable-account.test.ts:91-107` — `expect(after.markdown).toBe(\`…- Event: Sales order\n- Event: Order placed…\`)`; `list-references.test.ts:23` — `toEqual([{ kind: 'readable-account', path: 'building-blocks' }])`; `e2e/capture-loop.spec.ts:70-71` — `toBeVisible()` on `Event: ${rewordedLabel}` and `toHaveCount(0)` on `Event: ${originalLabel}` | ✅ PASS |
| S2-05 WHEN quoted evidence contains the old label as literal text THEN after reword those passages are byte-identical and marked as quotes | Quote body unchanged; markdown `>` / HTML `<blockquote>` | `render-readable-account.test.ts:73-107` — before and after both pin `> The Order sat in the basket.`; `artifact-source.test.ts:63-68` — `expect(source.quotes).toEqual([{ id: 'c_1', text: 'A member borrowed a book.' }, …])`; `render-account-html.test.ts:15-19` — `toContain('<blockquote>')` and quotes array length 1 not containing `'Event:'`; `e2e/capture-loop.spec.ts:69` — `getByRole('blockquote')` `toContainText(originalLabel)` | ✅ PASS |
| S2-06 WHEN A's label is a substring of B's and A is reworded THEN B's rendered references are unchanged | `Order placed` line identical after rewording `Order` | `render-readable-account.test.ts:84-103` — before `- Event: Order placed`, after `- Event: Order placed` (only `Order` → `Sales order`) | ✅ PASS |
| S2-07 WHEN the reword is applied THEN the in-app account reflects the new label in the same interaction, no manual refresh | `board-dirty` reloads board + account; e2e sees new line without a second open | `CaptureScreen.test.ts:190-191` — board URL count `beforeBoard + 1` and readable-account `beforeAccount + 1`; `e2e/capture-loop.spec.ts:70` — `Event: ${rewordedLabel}` visible after confirm | ✅ PASS |
| S2-08 WHEN a `reword` names an unknown or withdrawn target THEN reject (systemic); snapshot unchanged | `unknown-target` / `withdrawn-target`; log unchanged | `decide.test.ts:66-70` — `toEqual({ kind: 'unknown-target', classification: 'systemic', target: 'e9' })`; `:103-107` — `toEqual({ kind: 'withdrawn-target', classification: 'systemic', target: 'e1' })`; `edit-model/http.test.ts:129-133` — status 422 / `error: 'withdrawn-target'`; `:155` — `expect(logOf(deps)).toHaveLength(3)` | ✅ PASS |

### P1: Withdraw and reinstate without erasing the record

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| ------------------------- | -------------------- | ----------------------- | ------ |
| S2-09 WHEN they withdraw a present non-withdrawn block THEN exactly one `withdraw`; id kept; `withdrawn: true`; ghosted struck-through sticky, distinct from dashed-ghost | one op; snapshot `withdrawn: true`; `.sticky--withdrawn` not `.sticky--reword` | `decide.test.ts:123-124` — `toHaveLength(1)` / `toMatchObject({ kind: 'withdraw', target: 'e1' })`; `edit-model/http.test.ts:163-165` — 200 / log length 2 / `toMatchObject({ withdrawn: true })`; `BoardWall.test.ts:62-63` — `toContain('sticky--withdrawn')` and `not.toContain('sticky--reword')`; `e2e/capture-loop.spec.ts:75` — `toHaveAttribute('data-withdrawn', 'true')` | ✅ PASS |
| S2-10 WHEN they reinstate THAT block THEN exactly one `reinstate`; `withdrawn: false`; same id; naked (no relations) | one `reinstate`; id + label unchanged | `decide.test.ts:169` — `expect(result.value).toEqual([op({ kind: 'reinstate', target: 'e1' })])`; `edit-model/http.test.ts:167-173` — 200 / log length 3 / `toMatchObject({ withdrawn: false, label: 'Loan recorded' })`; `e2e/capture-loop.spec.ts:78-79` — `data-withdrawn` `'false'` and one sticky with the same label | ✅ PASS |
| S2-11 WHEN they withdraw an already-withdrawn target, reinstate a non-withdrawn target, or name an unknown id THEN reject (systemic) and append nothing | `already-withdrawn` / `not-withdrawn` / `unknown-target`; log unchanged | `decide.test.ts:146-150` — `already-withdrawn`; `:177-180` — `not-withdrawn`; `:188` — `unknown-target`; `edit-model/http.test.ts:136-155` — each 422 with those errors; log still length 3 | ✅ PASS |
| S2-12 WHEN an actor or event is withdrawn and no `causedBy` / hot spots exist THEN the log contains only that `withdraw` (vacuous cascade) | `ok` array length 1, that op is `withdraw` | `decide.test.ts:123-124` (event) and `:133-134` (actor) — `toHaveLength(1)` / `toMatchObject({ kind: 'withdraw', … })` | ✅ PASS |
| S2-13 WHEN a withdrawn block's id appears as a rendered reference THEN it still resolves (to the withdrawn label), not 404 or drop | `Event (withdrawn): …`; references GET non-empty | `render-readable-account.test.ts:142` — `toContain('- Event (withdrawn): Loan recorded')`; `list-references.test.ts:37` — `toEqual([buildingBlocksSite])`; `readable-account/http.test.ts:144-152` — 200 / `[buildingBlocksSite]` / account markdown is `withdrawnMarkdown` | ✅ PASS |

### P1: Live deterministic readable account

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| ------------------------- | -------------------- | ----------------------- | ------ |
| S2-14 WHEN the person opens the drawer THEN GET `/readable-account` and render sanitised Markdown; WHEN the model is empty THEN deterministic empty state | 200 empty-state document; store hydrates 200; drawer GET once | `readable-account/http.test.ts:117-118` — `expect(response.status).toBe(200)` / `toEqual({ position: -1, markdown: emptyMarkdown })`; `render-readable-account.test.ts:57` — `toBe(emptyMarkdown)`; `stores.test.ts:128-131` — one GET `/readable-account`, `store.document` equals empty snapshot, `error` null; `CaptureScreen.test.ts:213-215` — first toggle GETs once | ✅ PASS |
| S2-15 WHEN the same snapshot is requested twice with no intervening operation THEN Markdown bodies are byte-identical | `first.markdown === second.markdown` | `render-readable-account.test.ts:53` — `expect(first.markdown).toBe(second.markdown)`; `readable-account/http.test.ts:107-108` — `expect(firstBody.markdown).toBe(loanRecordedMarkdown)` and `expect(secondBody.markdown).toBe(firstBody.markdown)` | ✅ PASS |
| S2-16 WHEN any operation is applied (accept or F06) THEN the drawer re-renders in the same interaction, no staleness copy, no model call | both dock and wall bind `onBoardDirty` → `board.load` + `account.load`; no `ai` on render path | `CaptureScreen.test.ts:190-191` — wall `board-dirty` increments board and readable-account GETs; `:109-112` — dock emit increments board GET (same `onBoardDirty` at `CaptureScreen.vue:70-71` bound on dock `:90` and wall `:99`); `e2e/capture-loop.spec.ts:56-57` account shows accepted labels after accepts; render path has no `ai` / `@ai-sdk` (depcruise + knip green; grep only `domain/AGENTS.md`) | ✅ PASS |
| S2-17 WHEN the account names a building block THEN that name is a rendered reference; WHEN it reproduces a contribution body or `evidenceSpan` THEN marked quoted evidence | kind-prefixed lines vs `>` quotes | `render-readable-account.test.ts:84-88` — `- Event: Order` vs `> The Order sat in the basket.`; `artifact-source.test.ts:63-68` — bodies then spans; `render-account-html.test.ts:17-20` — one `<blockquote>`, `'Event: Book borrowed'` outside it | ✅ PASS |
| S2-18 WHEN the account states coverage THEN Big Picture, narrator count, scope, and honest **not run** (not "none" / "0") | exact coverage lines | `render-readable-account.test.ts:62-66` — `toContain('- Stakeholder check: not run')` / `'Chosen problem: not run'` / `'Timeline and relations: not run'` and `not.toContain('Stakeholder check: none')` / `'Stakeholder check: 0'`; empty markdown pins `Format: Big Picture`, `Narrators: 0`, `Scope: (not set)` | ✅ PASS |
| S2-19 WHEN DAG renders THEN it reads DMC and SF only through `api.ts`, no framework in `**/domain/**`, no aggregate, no AI SDK | host + HTTP import `api.ts`; domain is a pure function | `src/host/routes.ts:2-3` — `readableAccountRoutes` / `editModelRoutes` from context `api.ts`; `readable-account/http.ts:2-4` — `readBoardSnapshot` from DMC `api.ts`, `readArtifactSource` from SF `api.ts`; `derived-artifact-generation/domain/AGENTS.md:21` — earns **no aggregate**; `pnpm depcruise` — 0 violations (214 modules); knip clean of `ai` on this path | ✅ PASS |

### P2: Direct-edit HTTP surface and sole writer

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| ------------------------- | -------------------- | ----------------------- | ------ |
| S2-20 WHEN POST carries a valid `reword` / `withdraw` / `reinstate` THEN handler calls `applyOperation` (no `expectedPosition`) and returns the new board position; client refetches board + account | 200 `{ position }`; refetch both | `edit-model/http.test.ts:50-51` — 200 / `{ position: 1 }`; `host/routes.test.ts:81-82` — mounted POST 200 / `{ position: 1 }`; `apply-operation.ts:28-29` takes no `expectedPosition`; `CaptureScreen.test.ts:190-191` — board + account refetch | ✅ PASS |
| S2-20 WHEN the body is another frozen kind THEN 422 `not-implemented-in-slice` and append nothing | 422 + log unchanged | `edit-model/http.test.ts:83-88` — `expect(response.status).toBe(422)` / `toEqual({ error: 'not-implemented-in-slice', classification: 'systemic' })` / `expect(logOf(deps)).toHaveLength(2)` | ✅ PASS |
| S2-21 WHEN `applyOperation` is given a successful target-bearing operation THEN `resultingBuildingBlockId === operation.target` and it SHALL NOT throw | Result ok; id is `target` | `apply-operation.test.ts:69` — `expect(result.value.resultingBuildingBlockId).toBe('b_1')` (reword); `:86` withdraw; `:106` reinstate; tests complete without throw | ✅ PASS |
| S2-22 WHEN two F06 posts race THEN `applyOperation` retries `stale-position` internally; only a merits rejection reaches the client | both rewords succeed; nextPosition 3; both labels written | `apply-operation.test.ts:181-189` — `isOk(first) && isOk(second)`; `second.value.nextPosition` `toBe(3)`; labels `'Loan was recorded'` / `'Book was returned'` | ✅ PASS |

### Cross-cutting (S2-23…S2-26)

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| ------------------------- | -------------------- | ----------------------- | ------ |
| S2-23 `edit-model` capability; 4th Pinia store; `no-cross-store-imports` | store hydrates from one GET; four stores exist; depcruise rule holds | `stores.test.ts:128-131` — one GET `/readable-account`, 200 empty stored; stores `session` / `proposals` / `board` / `account`; `.dependency-cruiser.cjs` `no-cross-store-imports`; `pnpm depcruise` 0 violations | ✅ PASS |
| S2-24 `minor` changeset; do not edit `package.json` version | changeset `minor`; version still `0.2.0` | `.changeset/slice-2-money-shot.md` — `"eventstormer": minor`; `package.json` `"version": "0.2.0"` (unchanged vs `main`) | ✅ PASS |
| S2-25 `impeccable` shape of drawer + confirm popover on capture-loop | brief §3 Enter opens ghost then popover (no silent-save); 4 stores + drawer + withdraw in scope; `DESIGN.md` untouched | `.impeccable/surfaces/src-app-capture-loop.md:61-65` Enter / dashed-ghost / confirm; `:87` 4 Pinia stores; `:127-128` Withdraw / Reinstate / Readable account; `git diff main..HEAD -- DESIGN.md` empty | ✅ PASS |
| S2-26 comments on #40 / #41 / #42 already posted; comment only if Design diverges | no Execute divergence from those contracts | T17 Done-when `[x]`; no new follow-on comment required | ✅ PASS |

**Status**: ✅ All ACs covered

---

## Discrimination Sensor

Scratch state: `git worktree add /tmp/eventstormer-s2-sensor HEAD` (detached `aad2522`). Each mutant restored before the next. Worktree removed after the run. Real tree never mutated.

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ----------- | ------- |
| 1        | `src/domain-model-capture/domain/board/decide.ts:14-16` and `:26-28` | Removed `withdrawn-target` and `already-withdrawn` guards | ✅ Killed — `decide.test.ts:101` (`isErr` expected true, got false); `:144` same; `edit-model/http.test.ts:129` expected 422 got 200 |
| 2        | `src/derived-artifact-generation/domain/render-readable-account.ts` `quoteLine` | Rewrote quote text when a block label appears in it (`Order` → `«Order»`) | ✅ Killed — `render-readable-account.test.ts:73` pinned markdown (`> The Order sat in the basket.`) |
| 3        | `src/domain-model-capture/capabilities/edit-model/http.ts` `parseBody` | Skipped trim-before-parse (raw body → `Operation.safeParse`) so `""` is schema 400 | ✅ Killed — `edit-model/http.test.ts:96` expected 422 got 400 |

**Sensor depth**: lightweight
**Result**: 3/3 killed — PASS ✅

---

## Interactive UAT Results (if performed)

| #   | Test | Result  | Details |
| --- | ---- | ------- | ------- |
| —   | —    | ⏭️ Skip | not performed — orchestrator/user |

---

## Code Quality

| Principle        | Status |
| ---------------- | ------ |
| Minimum code     | ✅     |
| Surgical changes | ✅     |
| No scope creep   | ✅     |
| Matches patterns | ✅     |
| Spec-anchored outcome check (asserted values match spec) | ✅ |
| Per-layer Coverage Expectation met (domain 1:1 ACs; routes happy+edge+error) | ✅ |
| Every test maps to a spec requirement — no unclaimed tests | ✅ |
| Documented guidelines followed: `AGENTS.md`, `docs/testing.md`, `docs/adr/008-testing-eval-and-observability.md` | ✅ |

Notes: new Supporting context is a pure renderer (no aggregate). `applyOperation` lifted to `infrastructure/` so `edit-model` does not import `board-access`. Handler-only 10 000-char bound; frozen `v:1` `label: min(1)` unchanged. `DESIGN.md` and `package.json` `version` untouched. No `SPEC_DEVIATION` in this feature. No process ids under `src/**` / `e2e/**` (`pnpm check:process-ids` green).

---

## Edge Cases

- [x] Same-label reword still appends one `reword` (distinct-label used wherever a fold asserts a written label): `edit-model/http.test.ts:63-65` — 200 / log length 2
- [x] Empty board: `GET …/readable-account` 200 empty-state, not 404; `GET …/board` still 404 on empty stream; direct-edit POST 404: `readable-account/http.test.ts:117-118`; `board-access/http.test.ts:44`; `edit-model/http.test.ts:119`
- [x] Confirm popover open + another operation: `RewordConfirm` watches `revision` and refetches, no POST against the stale list: `RewordConfirm.test.ts:136-139` — references GET count 2, POSTs 0
- [x] Sanitise vs GET markdown: byte-identity ACs compare GET/render Markdown (`readable-account/http.test.ts:107-108`); HTML sanitise is view-only (`render-account-html.test.ts:15-20`); stored quotes come from the read model, not the DOM
- [x] Label > 10 000 chars → 400 at the POST boundary: `edit-model/http.test.ts:113-114`
- [x] `E` in a text field types the letter: `BoardWall.test.ts:121-122` — `defaultPrevented` false, no `.sticky--reword`
- [x] Esc cancels ghost then popover (layered): ghost Esc restores label (`BoardWall.test.ts:88-90`); popover cancel POSTs zero (`RewordConfirm.test.ts:110`); `dismissEsc` closes popover first if open, then the ghost (`BoardWall.vue:79-84`)

---

## Gate Check

- **Gate command**: `pnpm check && pnpm build`
- **Result**: 467 passed, 0 failed, 0 skipped
- **Test count before feature**: 393 named `it(` / `test(` on `main`; T1 gate recorded 408 vitest cases after the first decide additions
- **Test count after feature**: 467 vitest cases (75 files); 456 named `it(` / `test(` on HEAD
- **Delta**: +59 vitest cases from the T1 baseline (408 → 467); +63 named tests vs `main` (393 → 456). No tests deleted.
- **Skipped tests**: none
- **Failures**: none
- **Other gate steps**: `check:process-ids` / `typecheck` / `lint` / `depcruise` (214 modules, 845 deps, 0 violations) / `knip` / `vite build` all green

---

## Fix Plans (if issues found)

None.

---

## Requirement Traceability Update

Update spec.md requirement statuses:

| Requirement | Previous Status | New Status   |
| ----------- | --------------- | ------------ |
| S2-01       | Pending         | ✅ Verified  |
| S2-02       | Pending         | ✅ Verified  |
| S2-03       | Pending         | ✅ Verified  |
| S2-04       | Pending         | ✅ Verified  |
| S2-05       | Execute         | ✅ Verified  |
| S2-06       | Pending         | ✅ Verified  |
| S2-07       | Pending         | ✅ Verified  |
| S2-08       | Execute         | ✅ Verified  |
| S2-09       | Execute         | ✅ Verified  |
| S2-10       | Pending         | ✅ Verified  |
| S2-11       | Execute         | ✅ Verified  |
| S2-12       | Execute         | ✅ Verified  |
| S2-13       | Execute         | ✅ Verified  |
| S2-14       | Pending         | ✅ Verified  |
| S2-15       | Pending         | ✅ Verified  |
| S2-16       | Pending         | ✅ Verified  |
| S2-17       | Execute         | ✅ Verified  |
| S2-18       | Execute         | ✅ Verified  |
| S2-19       | Execute         | ✅ Verified  |
| S2-20       | Pending         | ✅ Verified  |
| S2-21       | Execute         | ✅ Verified  |
| S2-22       | Execute         | ✅ Verified  |
| S2-23       | Pending         | ✅ Verified  |
| S2-24       | Pending         | ✅ Verified  |
| S2-25       | Pending         | ✅ Verified  |
| S2-26       | Pending         | ✅ Verified  |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 26/26 ACs matched spec outcome | 0 spec-precision gaps
**Sensor**: 3/3 mutations killed
**Gate**: 467 passed

**What works**: Reword two-step confirm, empty-label 422, substring-safe id render, quoted evidence frozen, withdraw/reinstate (vacuous cascade), live deterministic account, F06 HTTP sole writer with internal stale-position retry, 4th store, minor changeset.

**Issues found**: none

**Next steps**: none — feature is verification-complete. Interactive UAT was not performed (orchestrator/user).
