# Slice 3 — Relations + the Board · Context

**Gathered:** 2026-08-31
**Spec:** `.specs/features/slice-3-relations-board/spec.md`
**Status:** Design approved. Tasks written — awaiting Execute confirmation.

---

## Feature Boundary

The EventStorming wall on the existing capture screen: remaining Board operations
(`place` / `sequence` / `insert-between` / `link-cause` / `mark-pivotal` and inverses),
derived timeline layout, semantic drag-to-place, hide-withdrawn as a view filter, live
account walk in `follows` order, relation sites on the reference list. Direct F06/F07 from
the person's hands. No facilitator schema change. No hot spots. No downloads.

---

## Implementation Decisions

### Facilitator stays capture-only this sitting (AD-031 at Design)

- User delegated 2026-08-31 ("do whatever you think is better") after the ADR-010 vs
  ticket-AC tension was named.
- Direct operations on the wall; `FacilitationTurnSchema` unchanged.
- Parked: relation tracks, `mark-pivotal` proposals, reword-hold-back → **#41**; eval of
  those behaviours → **#42**; ADR-010 / ARCHITECTURE.md wording → **#43**.
- Comments posted on those issues the same day.

### `place` and `sequence` are both real (canvas #35)

- `place` births an orphan track. `sequence` / `insert-between` grow or merge tracks;
  `project` sets participating events' `placement: 'timeline'` — no extra `place` ops.
- `unplace` severs `follows` (batch `unsequence`) then returns the event to the backlog.
- Actors/systems are never `place`d; `causedBy` is their only way onto the wall, as
  attachments.

### Cascades stay inside `Board.decide` (AD-006 / AD-028)

- Withdraw actor/system → `[withdraw, ...unlink-cause]`.
- Withdraw event → `[withdraw]` only; `evolve` drops incident `follows`; no rejoin.
- `applyOperation` already appends the array. No second cascade writer.

### Layout: domain ranks, app pixels (ADR-006)

- `computeTimelineLayout` in `domain-model-capture/domain/timeline/`, no pixels.
- Vue Flow + dagre primary; 1h reflow spike; CSS-grid fallback in **this** slice if
  reflow cannot be tamed. Fixed sticky width so text wraps.
- `src/app/capture-loop/board/layout.ts` becomes (or yields to) an adapter over the
  domain ranks — it must not grow a second topology.

### Drag is semantic, not spatial

- Drop on empty timeline → `place`. Drop as successor → `sequence`. Drop between →
  `insert-between`. Pan/zoom writes nothing.
- F07 "relative to a milestone" = pivotal bars as landmarks, not a picker widget.
- Keyboard equivalent required (brief WCAG). Micro-affordances: `impeccable` **shape**
  during Design, same capture-loop brief, Operate, no new visual world.

### Hide-withdrawn is a view filter

- Default hidden. Reveal = Slice 2 ghosts at last placement. Not a logged operation.
- Snapshot still contains withdrawn blocks (reinstate, references).

### References + account extend, they do not move

- `listReferences` (DAG, AD-029) gains `follows` / `causedBy` sites.
- Live account walks placed events in `follows` order; coverage line updates.
- #42 still owns JSON / summary / transcript and must reuse this walk.

### Agent's Discretion

- Exact drop-target chrome, pan/zoom keyboard chords, dock-collapsed vs wall: shape.
- Write-model adjacency representation (`Map` of sets vs edge list), as long as `decide`
  reads only the slim write model and the snapshot carries display fields.
- Whether the Vue Flow adapter lives as `BoardWall.vue` internals or a sibling module.

### Declined / Undiscussed Gray Areas → Assumptions

- Sequence of an unplaced event places it via `project` (no extra `place` op), duplicate-edge
  rejection, `missing-edge` on insert-between, and `applyOperation` not throwing on ops
  without `id`/`target` are logged in `spec.md` Assumptions.

---

## Specific References

- GitHub [#40](https://github.com/vinialbano/eventstormer/issues/40) ACs (branching, cycle
  path, insert-between atomicity, kind-permission, derived position, hide-withdrawn,
  pivotal one-op, live board, `computeTimelineLayout`, changeset).
- [#40 comment](https://github.com/vinialbano/eventstormer/issues/40#issuecomment-5487513146)
  — this sitting's cut.
- Slice 2 [#40 comment](https://github.com/vinialbano/eventstormer/issues/40) — withdraw
  cascade tests, reference-list extension, hide-withdrawn as filter.
- ADR-006, capture-loop brief §3–§6, canvas Commands / Policies / write-model table.
- `--color-pivotal` already reserved in `DESIGN.md`.

---

## Deferred Ideas

- Facilitator proposes relations / pivotal / reword-hold-back → #41 (and eval → #42).
- Hot-spot callouts on the timeline → #41 (the board this slice builds is what they
  annotate).
- Downloadable summary's pivotal spine / named branch points → #42, consuming this
  slice's `follows` walk.
- ADR-010 slice-table reword → #43.
