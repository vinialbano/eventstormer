# Slice 3 — Relations + the Board Validation

**Date**: 2026-09-01
**Spec**: `.specs/features/slice-3-relations-board/spec.md`
**Diff range**: `c2a35cb..HEAD` (`b47b52e` first slice-3 commit through HEAD `d293252`; Slice 2 merge parent `c2a35cb`)
**Verifier**: independent sub-agent (author ≠ verifier)
**Mode**: Code + tests

Out of scope: `.impeccable/critique/`, `.impeccable/live/`.

---

## Task Completion

Every T1–T22 Done-when checkbox in `tasks.md` is `[x]`. No partial or blocked task.

| Task | Status  | Notes |
| ---- | ------- | ----- |
| T1   | ✅ Done | Write model `{ blocks, follows, causedBy }`; snapshot `follows`/`causedBy`/`placement`/`pivotal` |
| T2   | ✅ Done | `evolve` adjacency; withdraw severs incident edges; no neighbour rejoin |
| T3   | ✅ Done | `project(sequence)` sets `placement: 'timeline'`; log has no extra `place` |
| T4   | ✅ Done | `place`/`unplace`; unplace batch is unsequence* then unplace |
| T5   | ✅ Done | Sequence/unsequence; cycle `{ path }` pinned ids; `already-related`/`missing-edge` |
| T6   | ✅ Done | `insert-between` one op; missing-edge; cycle |
| T7   | ✅ Done | `link-cause` actor\|system → event only |
| T8   | ✅ Done | `mark-pivotal`/`unmark-pivotal`; not-implemented list is hot-spot kinds only |
| T9   | ✅ Done | Actor withdraw `[withdraw, unlink-cause, unlink-cause]`; event withdraw `[withdraw]` |
| T10  | ✅ Done | `computeTimelineLayout` goldens; depcruise `app-imports-capture-only-via-timeline` |
| T11  | ✅ Done | `applyOperation(sequence)` maps successor; actor-withdraw one append of 3 |
| T12  | ✅ Done | GET `/board` publishes follows/placement; empty stream still 404 |
| T13  | ✅ Done | POST `sequence` 200; `raise-hot-spot` 422; cycle 422 + `path` |
| T14  | ✅ Done | Readable account follows-order walk; coverage line is a real walk |
| T15  | ✅ Done | `follows` / `caused-by` reference sites; id-stable across reword |
| T16  | ✅ Done | `showWithdrawn` default `false`; layout `includeWithdrawn` matches flag |
| T17  | ✅ Done | Vue Flow kept (`nodes-draggable=false`); spike: wrapping label does not move neighbours |
| T18  | ✅ Done | Semantic drop/connect POST pinned kinds; pan does not POST; keyboard Place/Sequence/Mark |
| T19  | ✅ Done | Hide-withdrawn default; reveal ghosts at last placement |
| T20  | ✅ Done | Capture-loop brief §3–§7 cover timeline / semantic drop / hide-withdrawn |
| T21  | ✅ Done | One e2e spec extended (place/sequence + follows walk). Verifier could not re-run Playwright (Chromium missing in this environment) |
| T22  | ✅ Done | `minor` changeset; `package.json` version `0.2.0`; #40 sequence-placement comment present |

---

## Spec-Anchored Acceptance Criteria

### P1: Sequence, branch, insert, and reject cycles

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| ------------------------- | -------------------- | ----------------------- | ------ |
| S3-01 WHEN the person sequences event A then B (B may be backlog) THEN exactly one `sequence`; both on the timeline; no extra `place` | log kinds `[capture, capture, sequence]`; both `placement: 'timeline'` | `src/domain-model-capture/domain/board/project.test.ts:87-96` — `expect(log.map((item) => item.kind)).toEqual(['capture-domain-event', 'capture-domain-event', 'sequence'])`; `expect(snap.blocks.get(bid('eA'))?.placement).toBe('timeline')` (same for `eB`); `edit-model/http.test.ts:84-89` — `expect(response.status).toBe(200)` / `toEqual({ position: 2 })` / `expect(logOf(deps)).toHaveLength(3)` / `expect(board.follows).toEqual([{ predecessor: 'eA', successor: 'eB' }])` | ✅ PASS |
| S3-02 WHEN A is given two successors B and C THEN both `follows` edges retained; both branches rendered | successors `{eB, eC}`; two layout edges with distinct successors | `decide.test.ts:383-385` — `expect(second.value).toEqual([op({ kind: 'sequence', predecessor: 'eA', successor: 'eC' })])` / `expect(folded.follows.get(bid('eA'))).toEqual(new Set([bid('eB'), bid('eC')]))`; `evolve.test.ts:65` — `toEqual(new Set([bid('e2'), bid('e3')]))`; `compute-timeline-layout.test.ts:43-53` — `edges` both pairs and `expect(layout.edges[0]?.successor).not.toBe(layout.edges[1]?.successor)`; `TimelinePane.test.ts:76-88` — nodes `['eA','eB','eC']`, both successors `x` greater than source, `y` distinct | ✅ PASS |
| S3-03 WHEN `sequence`/`insert-between` would close a `follows` cycle THEN reject `cycle` (systemic) with ordered id `path`; graph unchanged | `{ kind: 'cycle', classification: 'systemic', path: [eC, eA, eB, eC] }`; follows unchanged | `decide.test.ts:395-405` — `expect(result.error).toEqual({ kind: 'cycle', classification: 'systemic', path: [bid('eC'), bid('eA'), bid('eB'), bid('eC')] })` / `expect(writeModel.follows.get(bid('eA'))).toEqual(new Set([bid('eB')]))`; `decide.test.ts:546-556` insert-between cycle `path: [bid('eA'), bid('eC'), bid('eA')]`; `edit-model/http.test.ts:144-150` — status 422 / `toEqual({ error: 'cycle', classification: 'systemic', path: ['eC', 'eA', 'eB', 'eC'] })` / log still length 5; `BoardWall.drop.test.ts:177-179` — alert `'That sequence would loop: Loan recorded → Book returned → Loan recorded.'` | ✅ PASS |
| S3-04 WHEN `insert-between(A, C, B)` and `A→B` exists THEN exactly one `insert-between`; no snapshot with both `A→B` and the new edges; C on timeline; other successors of A untouched | decide `[insert-between]`; follows `A→D`, `A→C`, `C→B`; not `A→B`; C `placement: 'timeline'` | `decide.test.ts:508-516` — `expect(result.value).toEqual([insert])` / `expect(snap.follows).toEqual([...eA→eD, eA→eC, eC→eB])` / `not.toContainEqual({ predecessor: bid('eA'), successor: bid('eB') })` / `expect(snap.blocks.get(bid('eC'))?.placement).toBe('timeline')`; `evolve.test.ts:79-81` — `eA` successors `{eC, eD}` | ✅ PASS |
| S3-05 WHEN `insert-between` names a missing `A→B` THEN `missing-edge` (systemic), append nothing | `{ kind: 'missing-edge', classification: 'systemic' }` | `decide.test.ts:607` — `expect(result.error).toEqual({ kind: 'missing-edge', classification: 'systemic' })` | ✅ PASS |
| S3-05 WHEN `sequence`/`unsequence` names a duplicate edge, withdrawn/unknown endpoint, or non-event THEN reject `already-related` / `withdrawn-target` / `unknown-target` / `kind-permission` | duplicate → `already-related`; missing unsequence → `missing-edge`; actor → `kind-permission`; withdrawn/unknown on sequence, unsequence, and insert-between | `decide.test.ts:426-430` — `toEqual({ kind: 'already-related', classification: 'systemic' })`; `:438` — `missing-edge`; `:454-461` — `expect(result.error.kind).toBe('kind-permission')`; `:471-538` table — sequence withdrawn successor `withdrawn-target` `eB`; sequence unknown predecessor `unknown-target` `e9`; unsequence withdrawn successor `withdrawn-target` `eB`; unsequence unknown predecessor `unknown-target` `e9`; insert-between withdrawn inserted `eC`; insert-between unknown successor `e9`; `expect(writeModel).toEqual(before)` | ✅ PASS |

### P1: Place, unplace, and the two surfaces

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| ------------------------- | -------------------- | ----------------------- | ------ |
| S3-06 WHEN a newly captured event has not been placed THEN backlog only, not a timeline slot | `placement: 'backlog'`; layout tracks empty until place | `project.test.ts:20-25` — `placement: 'backlog'`; `stores.test.ts:107` — `expect(store.timeline.tracks).toEqual([])` after a backlog-only snapshot; `BoardWall.test.ts:385-386` — backlog text `['Still loose']` while placed events are Vue Flow nodes | ✅ PASS |
| S3-07 WHEN the person places an event THEN it moves to the timeline as its own track if it has no `follows`; backlog no longer shows it | `placement: 'timeline'`; single-member track; e2e leaves backlog | `project.test.ts:101-104` — after `place`, `toBe('timeline')` / `follows` `[]`; `compute-timeline-layout.test.ts:62-67` — `tracks: [{ eventIds: [bid('eA')], ranks: { eA: 0 } }]`; `e2e/capture-loop.spec.ts:95-96` — timeline visible, `backlog.getByLabel(...).toHaveCount(0)` | ✅ PASS |
| S3-08 WHEN the person unplaces a sequenced event THEN batch `unsequence*` then `unplace`; neighbours not rejoined; event returns to backlog | kinds `['unsequence','unsequence','unplace']`; A `backlog`; no follows involving A | `decide.test.ts:334-339` — `toEqual(['unsequence', 'unsequence', 'unplace'])` and the two incident pairs (no `sequence` between neighbours); `project.test.ts:113-116` — `placement: 'backlog'` / `follows` `[]` / B stays `timeline` | ✅ PASS |
| S3-09 WHEN `place`/`unplace` targets an actor, system, withdrawn block, or missing id THEN reject `kind-permission` / `withdrawn-target` / `unknown-target` | actor `kind-permission`; unknown `unknown-target`; withdrawn `withdrawn-target`; non-events exhaustive | `decide.test.ts:286-291` — `toEqual({ kind: 'kind-permission', classification: 'systemic', operation: 'place', reason: 'only a domain event may be placed or unplaced' })`; `:299-303` unknown; `:315-319` withdrawn; `:360-364` exhaustive loop `kind-permission` for actor/system/hot-spot | ✅ PASS |
| S3-10 WHEN the person pans or zooms THEN the model is unchanged (no pixel/rank/coordinate on ops or snapshot) | pan does not POST; layout/snapshot have no `x`/`y` | `BoardWall.drop.test.ts:86-90` — VueFlow `$emit('move')` / `$emit('viewportChange')` / `$emit('viewport-change')` then `expect(posted()).not.toHaveBeenCalled()`; `compute-timeline-layout.test.ts:113-116` — `not.toHaveProperty('x'|'y'|'width'|'height')`; snapshot `BoardSnapshot` has `blocks`/`follows`/`causedBy`/`position` only (`model.ts` / GET DTO tests) | ✅ PASS |

### P1: Causes, and withdraw that unlinks them

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| ------------------------- | -------------------- | ----------------------- | ------ |
| S3-11 WHEN the person links actor/system C to event E THEN one `link-cause`; C renders beneath E, never as C's timeline slot | `[link-cause]`; attachments `{ eA: [a1] }`; actor not in `eventIds` | `decide.test.ts:569-571` — `toEqual([op({ kind: 'link-cause', cause: 'a1', effect: 'eA' })])`; `compute-timeline-layout.test.ts:79-81` — `eventIds` `[eA]` / `not.toContain(bid('a1'))` / `attachments: { eA: [bid('a1')] }`; `TimelinePane.test.ts:77-84` — `nodes.some((node) => node.id === 'a1')` false / attachments `[{ id: 'a1', kind: 'actor', label: 'Clerk' }]`; `BoardWall.test.ts:391-394` same chips | ✅ PASS |
| S3-12 WHEN `link-cause` is not actor\|system → event, or withdrawn/missing, or duplicate THEN reject those kinds | event→event / actor→actor / event→actor `kind-permission`; duplicate `already-related`; unknown/withdrawn existing kinds | `decide.test.ts:596-598` — `expect(result.error.kind).toBe('kind-permission')`; `:610` `already-related`; `:638-643` `unknown-target` `a9`; `:655-659` `withdrawn-target` `a1` | ✅ PASS |
| S3-13 WHEN the person unlinks that pair THEN one `unlink-cause`; C leaves E's attachments; if C causes no remaining placed event it sits in the backlog | `[unlink-cause]`; `causedBy` `[]` | `decide.test.ts:621-622` — `toEqual([op({ kind: 'unlink-cause', cause: 'a1', effect: 'eA' })])`; `project.test.ts:154-155` — `expect(snap.causedBy).toEqual([])`. Backlog-sit is derived (`BoardWall.vue` `attachedIds` filter `:255-269`); no dedicated after-unlink DOM golden. | ✅ PASS |
| S3-14 WHEN the person withdraws an actor/system that caused **two** events THEN log is `withdraw` plus **two** `unlink-cause` in one batch; both events lose that cause; ids preserved | array length 3; kinds `withdraw`, `unlink-cause`, `unlink-cause`; one `append` of 3 | `decide.test.ts:178-188` — `toHaveLength(3)` / `toEqual(['withdraw','unlink-cause','unlink-cause'])` / both effect ids `e1`/`e2`; `apply-operation.test.ts:273-278` — `appendCalls === 1` / `lastBatchSize === 3` / log `+3` / kinds equal that triple; `evolve.test.ts:125-128` — both events' causes empty, actor `withdrawn: true` | ✅ PASS |
| S3-15 WHEN the person withdraws an event with `follows` on both sides and no causes THEN log is **only** `withdraw`; neighbours do not gain a `follows` edge | `[withdraw]`; follows size 0 | `decide.test.ts:203` — `expect(result.value).toEqual([op({ kind: 'withdraw', target: 'eM' })])`; `evolve.test.ts:112-115` — `follows.get(eA)` undefined / `follows.size === 0` | ✅ PASS |
| S3-16 WHEN a withdrawn block is reinstated THEN backlog, no `follows`, no `causedBy`, not pivotal | naked backlog `pivotal: false`; follows empty | `project.test.ts:179-187` — `toEqual({ … placement: 'backlog', pivotal: false, withdrawn: false })` / `expect(snap.follows).toEqual([])`; `evolve.test.ts:137-138` — withdrawn false, `follows.size === 0` | ✅ PASS |

### P1: The live timeline board

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| ------------------------- | -------------------- | ----------------------- | ------ |
| S3-17 WHEN placed events exist THEN they render in `follows` order; separate connected tracks are separate left-to-right runs | two tracks for two disconnected placed events; sequenced pair one track ranks 0 then 1 | `compute-timeline-layout.test.ts:22-26` — two tracks `e1` / `e2`; `:43-47` branch track `eventIds: [eA, eB, eC]` ranks `{ eA: 0, eB: 1, eC: 1 }`; `TimelinePane.test.ts:58` — `left.position.x < right.position.x`; `e2e/capture-loop.spec.ts:124` — `indexOf(rewordedLabel) < indexOf(sequencedReword)` | ✅ PASS |
| S3-18 WHEN an event has several successors THEN the flow visibly splits and both branches are readable | two successors, distinct y | `TimelinePane.test.ts:86-88` — both `x` greater than source / `first.position.y !== second.position.y`; `use-dagre-layout.test.ts:64-66` same | ✅ PASS |
| S3-19 WHEN `computeTimelineLayout(snapshot)` is called THEN ranks, order, attachments, pivotal, `follows` edges; **no pixel**; lives under `domain/timeline/`; unit-tested with no Vue/DOM | exact layout object; no `x`/`y` | `compute-timeline-layout.test.ts:107-116` — `toEqual({ tracks, edges, attachments, pivotal })` / `not.toHaveProperty('x'|'y'|'width'|'height')`; file `src/domain-model-capture/domain/timeline/compute-timeline-layout.ts`; tests `environment: 'node'` via domain project | ✅ PASS |
| S3-20 WHEN an operation is applied from any source THEN the board updates in the same interaction (`board-dirty` refetch) | dock accept and wall dirty both increment GET `/board` | `CaptureScreen.test.ts:114` — `boardCalls.length === before + 1` on dock `board-dirty`; `:204-205` — wall emit increments `/board` and `/readable-account`; `e2e/capture-loop.spec.ts:95` timeline visible after Place without a manual refresh | ✅ PASS |
| S3-21 WHEN sticky width is fixed and a label wraps THEN re-layout is not required; Vue Flow kept (spike) | Vue Flow shipped; CELL width stable; neighbour positions unchanged on wrap | T17 commit `4158c09`: "Spike: Vue Flow kept — dagre lays out fixed CELL boxes"; `use-dagre-layout.test.ts:32-34` — `width === CELL`; `:98-101` — long vs short `position` equal / `width === CELL` / height equal; `TimelinePane.test.ts:50` — `nodesDraggable === false` | ✅ PASS |
| S3-22 WHEN the person drags (or keyboard-equivalent) a backlog event onto the timeline THEN POST `place`/`sequence`/`insert-between` and SHALL NOT write a coordinate | drop/connect helpers POST those kinds; keyboard Place/Sequence | `semantic-edit.test.ts:14-16` — pane drop `{ kind: 'place', target: 'e1' }`; `:23` sequence; `:43-47` insert-between; `BoardWall.drop.test.ts:66-69` place POST; `:76-78` connect sequence; `:113-120` insert-between; `:129-157` keyboard Place / Sequence after; bodies have no coordinate fields | ✅ PASS |

### P2: Pivotal marks

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| ------------------------- | -------------------- | ----------------------- | ------ |
| S3-23 WHEN they mark a non-withdrawn domain event pivotal THEN exactly one `mark-pivotal`; nothing else (no edges, no placement) | `[mark-pivotal]`; `pivotal` false→true→false | `decide.test.ts:669` — `toEqual([op({ kind: 'mark-pivotal', target: 'eA' })])`; `project.test.ts:142-146` — `toBe(false)` then `true` then `false`; `evolve.test.ts:145` — `mark-pivotal` does not touch the write model | ✅ PASS |
| S3-23 WHEN they unmark THEN one `unmark-pivotal`; event and edges intact | `[unmark-pivotal]` | `decide.test.ts:673` — `toEqual([op({ kind: 'unmark-pivotal', target: 'eA' })])` | ✅ PASS |
| S3-23 WHEN mark/unmark targets a non-event, withdrawn, or missing id THEN reject those kinds | actor `kind-permission`; withdrawn `withdrawn-target`; unknown `unknown-target` | `decide.test.ts:691` — `kind-permission`; `:702-707` `withdrawn-target`; `:714-718` `unknown-target` | ✅ PASS |
| S3-24 WHEN an event is pivotal THEN visually distinct (pivotal bar; `--color-pivotal`) | node `pivotal: true`; bar uses token | `TimelinePane.test.ts:85` — `expect(source.data?.pivotal).toBe(true)`; `BoardWall.test.ts:395` — `data.pivotal === true`; `TimelinePane.vue:155-162` — `.event-node__bar { background-color: var(--color-pivotal) }` (CSS not asserted in a test; data flag is) | ✅ PASS |

### P2: Hide withdrawn, and references that include relations

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| ------------------------- | -------------------- | ----------------------- | ------ |
| S3-25 WHEN withdrawn blocks exist THEN hidden by default; WHEN revealed THEN Slice 2 ghost treatment at last placement | `showWithdrawn === false`; default DOM omits withdrawn; toggle shows `sticky--withdrawn` | `stores.test.ts:139,176` — `toBe(false)`; `:179` default layout `tracks === []` for a withdrawn timeline event; `:184` after toggle `tracks: [{ eventIds: ['eA'], … }]`; `BoardWall.test.ts:409-418` — default one sticky `'Order confirmed'` / no `[data-withdrawn=true]` / after `showWithdrawn: true` ghost has `sticky--withdrawn`; `:444-451` revealed timeline ghost `data.withdrawn === true`; `e2e/capture-loop.spec.ts:84-85` Show withdrawn then `data-withdrawn` `'true'` | ✅ PASS |
| S3-26 WHEN GET references for a block in `follows`/`causedBy` THEN list includes those endpoints **and** the building-blocks site; resolution by id (substring AC holds) | sites `{ readable-account, follows }` / `{ readable-account, caused-by }`; set stable across label change | `list-references.test.ts:73-74` — `[buildingBlocksSite, followsSite]` on both endpoints; `:157-158` caused-by on both; `:104-113` site set unchanged after label change / `path: 'eA>eB'`; `:130-131` `Order placed` sites unchanged when `Order` reworded; `e2e/capture-loop.spec.ts:110-112` impact list count 2, contains `'Readable account · Building blocks'` and `'>'` | ✅ PASS |
| S3-27 WHEN the live readable account renders THEN placed events walked in `follows` order; coverage line is not "not run"; quotes byte-identical across a reword | pinned Markdown walk; quotes slice equal | `render-readable-account.test.ts:159-161` — `- Event: Loan recorded` / `  - Event: Book returned`; `:170` `not.toContain('Timeline and relations: not run')`; `:191-193` quoted-evidence slices equal; `e2e/capture-loop.spec.ts:118-124` heading visible, `'not run'` count 0, walk order | ✅ PASS |

### P3: Gate, properties, changeset

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| ------------------------- | -------------------- | ----------------------- | ------ |
| S3-28 WHEN `fast-check` runs THEN no accepted op sequence yields a `follows` cycle, and no op targeting a forbidden kind is accepted | Kahn acyclicity on accepted folds; place/unplace non-event rejected | `decide.test.ts:564` — `expect(followsIsAcyclic(writeModel.follows)).toBe(true)` inside `fc.assert`; `:360-364` exhaustive place/unplace `kind-permission` for non-events. Kind-permission for sequence/pivotal is unit-tested (`:461`, `:763`), not inside the same `fast-check`. | ✅ PASS |
| S3-28 WHEN incremental-replay runs over the new kinds THEN `replay(log ++ [op]) === project(replay(log), op)` (and matching write-model `evolve` fold) | snapshot property on enlarged POOL; write-model twin plus spelled-out edge goldens | `replay.test.ts:181` — `expect(replay([...log, next])).toEqual(project(replay(log), next))` with POOL including sequence/insert/link/mark (`:23-31`). `replay.test.ts:192` — `expect(replayWriteModel([...log, next])).toEqual(evolve(replayWriteModel(log), next))`. Independent literals: `:157-158` `follows.get(e1) === Set(e2)` and `causedBy.get(e1) === Set(a1)`; `:172-173` after withdraw both maps empty. | ✅ PASS |
| S3-29 WHEN this slice ships THEN a `minor` changeset is present; `package.json` version untouched; `edit-model` still 422 hot-spot kinds | changeset `minor`; version `0.2.0`; 422 `not-implemented-in-slice` | `.changeset/slice-3-relations-board.md` — `"eventstormer": minor`; `package.json:3` — `"version": "0.2.0"`; `edit-model/http.test.ts:109-114` — status 422 / `toEqual({ error: 'not-implemented-in-slice', classification: 'systemic' })` / log length 1; `decide.test.ts:735-751` remaining not-implemented kinds are the five hot-spot ops | ✅ PASS |

### Cross-cutting

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| ------------------------- | -------------------- | ----------------------- | ------ |
| S3-30 impeccable capture-loop brief covers timeline / drop / hide-withdrawn | brief no longer treats timeline as a future slice | `.impeccable/surfaces/src-app-capture-loop.md:88-93` semantic drop POSTs `place`/`sequence`/`link-cause`/`insert-between`; `:121-124` hidden by default / Show withdrawn ghosts; `:139-140` Place/Unplace/Sequence/Mark/Show withdrawn; `:156-160` keyboard + Vue Flow 1.48 + dagre | ✅ PASS |
| S3-31 `applyOperation` must not throw on ops without `id`/`target` | sequence/insert-between/link-cause succeed; mapping successor/inserted/effect | `apply-operation.test.ts:167-174` — `isOk` / `resultingBuildingBlockId === 'eB'` / `follows` pair; `:201-206` insert-between `'eC'`; `:225-229` link-cause `'eA'` | ✅ PASS |
| S3-32 comments on #41/#42/#43 stay in sync; this sitting did not extend `FacilitationTurnSchema` | schema untouched; #40 sequence-placement note posted | `git diff c2a35cb..HEAD -- …/turn-schema.ts` empty; GitHub #40 comment 2026-09-01T11:41:20Z "Sequence of an unplaced event (Design refinement)" — one op, `project` sets placement. Design did not further diverge on facilitator tracks (AD-031). | ✅ PASS |

**Status**: ⚠️ Spec-precision gaps flagged (2) — no uncovered P1 outcome; both gaps are incomplete dedicated assertions, not wrong values.

Design locks pinned by tests:

- One POST `sequence` of unplaced events; no extra `place` in the log; `project` sets timeline placement — S3-01 citations above.
- Event withdraw = `[withdraw]` only; actor/system withdraw = `[withdraw, ...unlink-cause]` — S3-14/S3-15.
- Duplicate follows/causedBy → `already-related`; missing edge → `missing-edge`; cycle `{ path }` — S3-03/S3-05/S3-12.
- SPA imports `domain/timeline/**` only — `.dependency-cruiser.cjs:110-123` `app-imports-capture-only-via-timeline`; `pnpm depcruise` 0 violations (230 modules). App sources import `compute-timeline-layout.ts`, not `api.ts`/`decide.ts`.
- Vue Flow `nodes-draggable=false` — `TimelinePane.test.ts:50`, `BoardWall.test.ts:396`; T17 kept Vue Flow.
- Hide-withdrawn default client filter — S3-25.

---

## Discrimination Sensor

Scratch: `git worktree add /tmp/eventstormer-s3-sensor HEAD` (live tree never mutated). Restored after each mutation; worktree removed.

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ----------- | ------- |
| 1        | `src/domain-model-capture/domain/board/decide.ts:209` | Sequence cycle check disabled (`if (false && path)`) so C→A after A→B→C is accepted | ✅ Killed — `decide.test.ts:395` `expect(isErr(result)).toBe(true)` (also self-loop `:411`) |
| 2        | `src/domain-model-capture/domain/board/project.ts:124-127` | `project(sequence)` records the edge but does not set `placement: 'timeline'` | ✅ Killed — `project.test.ts:94` `expect(….placement).toBe('timeline')`; `replay.test.ts:101` snapshot literal |
| 3        | `src/app/capture-loop/stores/board.ts:42` | `showWithdrawn = ref(true)` (default reveals withdrawn) | ✅ Killed — `stores.test.ts:139` / `:176` `expect(store.showWithdrawn).toBe(false)` |

**Sensor depth**: lightweight (3 behavior-level mutations on highest-risk new code)
**Result**: 3/3 killed — PASS ✅

---

## Interactive UAT Results (if performed)

Not performed (orchestrator may do it later). User-facing board (place/sequence/hide-withdrawn) was verified by jsdom + the committed e2e spec, not a live walkthrough.

| #   | Test        | Result   | Details |
| --- | ----------- | -------- | ------- |
| —   | Interactive UAT | ⏭️ Skip | Independent verifier instruction: do not run with the user |

---

## Code Quality

| Principle        | Status |
| ---------------- | ------ |
| Minimum code     | ✅     |
| Surgical changes | ✅     |
| No scope creep   | ✅     |
| Matches patterns | ✅     |
| Spec-anchored outcome check (asserted values match spec) | ✅     |
| Per-layer Coverage Expectation met (domain 1:1 ACs; routes happy+edge+error) | ✅     |
| Every test maps to a spec requirement — no unclaimed tests | ✅     |
| Documented guidelines followed: `docs/testing.md`, `AGENTS.md`, `src/domain-model-capture/domain/AGENTS.md` | ✅     |

Notes: `FacilitationTurnSchema` is untouched (AD-031). `v:1` operation shapes unchanged. Vue Flow `@vue-flow/core@1.48.2` + `@dagrejs/dagre@3.1.1` as designed. No `src/**` process-id citations (`pnpm check:process-ids` green).

---

## Edge Cases

- [x] Self-loop `sequence` same id: rejected `cycle` with `path: [eA, eA]` — `decide.test.ts:408-417`
- [x] Two POSTs race: `applyOperation` retries `stale-position` — `apply-operation.test.ts:283-316` both ok, labels written
- [x] `decide` batch (`withdraw`+`unlink-cause*`): one `append` of length 3 — `apply-operation.test.ts:273-274`; unplace batch is the decide array (`decide.test.ts:334`)
- [x] Confirm popover + relation POST: Slice 2 stale-popover rule unchanged (`RewordConfirm.test.ts`); e2e rewords a sequenced sticky through confirm
- [x] Zero placed events: empty wall still draws backlog + `time` — `BoardWall.test.ts:43-51`
- [x] `prefers-reduced-motion`: existing `use-reduced-motion.test.ts`; brief still honours the card-to-sticky grammar (`src-app-capture-loop.md:145-147`)
- [x] `GET /board` empty log: HTTP 404 — `board-access/http.test.ts:42-48`; `readBoardSnapshot` empty follows/causedBy — `read-board-snapshot.test.ts:14-19`

---

## Gate Check

- **Gate command**: `pnpm check && pnpm build`
- **Result**: 577 passed, 0 failed, 0 skipped (vitest `--project domain --project app`); typecheck / lint / process-ids / depcruise / knip green
- **Test count before feature**: 464 named `it(` under `src/**/*.test.ts` at `c2a35cb`; vitest at Slice 2 close was 467 (`slice-2-money-shot/validation.md`).
- **Test count after feature**: 577 vitest (81 files) + 1 Playwright spec (`e2e/capture-loop.spec.ts`, still the only e2e file)
- **Delta**: vitest 577 vs ~467 at Slice 2 close. No silent deletions.
- **Skipped tests**: none in vitest
- **Failures**: none in the build gate
- **E2E**: not re-executed here — `playwright test` failed immediately (`browserType.launch`: Chromium headless shell missing in this environment). T21 commit `e3b2ba5` records `pnpm test:e2e` green; the spec asserts place/sequence + follows walk (`e2e/capture-loop.spec.ts:93-124`). Not treated as a product FAIL.

---

## Fix Plans (if issues found)

None. Sequence-family withdrawn/unknown rejections are table-driven in `decide.test.ts`. `replayWriteModel ≡ evolve` plus spelled-out topology goldens live in `replay.test.ts`.

---

## Requirement Traceability Update

(Report only — `spec.md` not mutated.)

| Requirement | Previous Status | New Status   |
| ----------- | --------------- | ------------ |
| S3-01       | Pending         | ✅ Verified  |
| S3-02       | Pending         | ✅ Verified  |
| S3-03       | Pending         | ✅ Verified  |
| S3-04       | Pending         | ✅ Verified  |
| S3-05       | Pending         | ✅ Verified  |
| S3-06       | T1              | ✅ Verified  |
| S3-07       | Pending         | ✅ Verified  |
| S3-08       | Pending         | ✅ Verified  |
| S3-09       | Pending         | ✅ Verified  |
| S3-10       | Pending         | ✅ Verified  |
| S3-11       | Pending         | ✅ Verified  |
| S3-12       | Pending         | ✅ Verified  |
| S3-13       | Pending         | ✅ Verified  |
| S3-14       | Pending         | ✅ Verified  |
| S3-15       | Pending         | ✅ Verified  |
| S3-16       | Pending         | ✅ Verified  |
| S3-17       | Pending         | ✅ Verified  |
| S3-18       | Pending         | ✅ Verified  |
| S3-19       | Pending         | ✅ Verified  |
| S3-20       | Pending         | ✅ Verified  |
| S3-21       | Pending         | ✅ Verified  |
| S3-22       | Pending         | ✅ Verified  |
| S3-23       | Pending         | ✅ Verified  |
| S3-24       | Pending         | ✅ Verified  |
| S3-25       | Pending         | ✅ Verified  |
| S3-26       | Pending         | ✅ Verified  |
| S3-27       | Pending         | ✅ Verified  |
| S3-28       | Pending         | ✅ Verified  |
| S3-29       | Pending         | ✅ Verified  |
| S3-30       | Pending         | ✅ Verified  |
| S3-31       | Pending         | ✅ Verified  |
| S3-32       | Pending         | ✅ Verified  |

---

## Lessons

Recorded via `scripts/lessons.py` (copied from the spec-driven-development plugin so the documented repo path exists):

- **L-008** (`spec_precision_gap`, candidate) — when a shared guard covers several operation kinds, assert the named rejection on each kind the spec lists, not only on a representative kind. Source: S3-05.
- **L-009** (`spec_precision_gap`, candidate) — when incremental-replay is specified for both snapshot and write-model folds, assert both `replay ≡ project` and `replayWriteModel ≡ evolve`, not only the snapshot twin. Source: S3-28.

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 32/32 ACs matched spec outcome
**Sensor**: 3/3 mutations killed
**Gate**: 577 passed

**What works**: Sequence/branch/insert with named-path cycle rejection; one `sequence` places endpoints without extra `place`; actor-withdraw batch-unlinks; event withdraw does not rejoin neighbours; framework-free layout; Vue Flow drag off; hide-withdrawn default; follows-order account + relation reference sites; minor changeset; #40 sequence-placement comment; sequence-family withdrawn/unknown rejections; write-model incremental replay.

**Issues found**: none.

**Next steps**: orchestrator may run interactive UAT.
