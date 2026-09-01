# Slice 2 — The Money Shot · Context

**Gathered:** 2026-08-31
**Spec:** `.specs/features/slice-2-money-shot/spec.md`
**Status:** Design approved. Tasks written — see `tasks.md`. Awaiting task confirmation before Execute.

---

## Feature Boundary

The thesis beat on the existing capture screen: reword / withdraw / reinstate a committed
building block; a two-step rename-cascade confirm that lists rendered-reference sites; a live
in-app readable account that re-renders on every applied operation. No timeline, no relation
edits, no hot spots, no JSON/summary/transcript downloads. Cascades that need adjacency are
specified on #40 and #41, not built here.

---

## Implementation Decisions

### Withdraw cascades → later slices (AD-028)

- Slice 2: `decide(withdraw)` → `[withdraw]` only. Write model unchanged.
- Slice 3 (#40): `causedBy` adjacency; withdraw actor/system → batch `unlink-cause`.
- Slice 4 (#41): annotation target; withdraw annotated block → batch `withdraw` on those hot
  spots.
- Same `decide` array + AD-006 batch append. Comments posted on the issues.

### Rename cascade is two-step, on the capture-loop surface

- Dashed-ghost editor from `.impeccable/surfaces/src-app-capture-loop.md`.
- Confirm popover from ADR-007, fed by `GET …/references`.
- `impeccable` **shape** during Design extends that brief (drawer + popover). Do not hand-invent
  a new `src/app/` world. Visitor mode remains **Operate**.

### Readable account = toggleable drawer + 4th store

- ADR-007 zone (3). Not a new route.
- `GET /workshops/:id/readable-account`; refetch on `board-dirty`.
- `markdown-it` + `DOMPurify` (ADR-007).
- Template owned by `derived-artifact-generation` (Supporting, no aggregate).

### Reference list this slice = account sites only

- Relations / annotations empty until #40 / #41 extend the same query.
- Resolution is by id, never substring replace.
- The **wall sticky** is not a popover row. The account's building-blocks line **is** — confirm
  always has ≥1 site when the block is on the board.

### Withdrawn = ghost on the wall

- Brief §5. Slice 3 may add hide-by-default + reveal as a **view filter**.

### `applyOperation` is the sole F06 writer

- Fix the capture-only `id` throw so target-bearing ops return `operation.target`.
- `edit-model` is a new `domain-model-capture` capability (AD-024). `board-access` keeps
  `GET /board`. Both artifact GETs (`readable-account` and `…/references`) live in DAG
  `readable-account` (AD-029). Capture never imports that Supporting context.

### `OperationId` stays omitted (AD-030)

- Accept-retry already closed in Slice 1. F06 is one append. AD-030 supersedes AD-017's leftover
  Slice-2 reconciliation clause; AD-011 otherwise stands.

### Agent's Discretion

- Drawer edge / width and popover density: `impeccable` shape.
- Exact Markdown headings in the backlog-only template, provided coverage disclosure and the
  reference/quote split hold.

### Declined / Undiscussed Gray Areas → Assumptions

- Logged in `spec.md` Assumptions (reword-of-withdrawn rejected; 10 000-char label wire bound;
  stale-popover refetch-or-cancel; empty board → 200 empty account).

---

## Specific References

- Issue [#39](https://github.com/vinialbano/eventstormer/issues/39)
- ADR-007 (two-step confirm, drawer, `markdown-it` + DOMPurify, 3+ stores)
- ADR-010 slice 2 row (cut line)
- Capture-loop brief §3 reword, §5 withdrawn ghost
- `docs/domain/bounded-contexts/derived-artifact-generation/canvas.md` — live account is a
  view, not a command; no aggregate
- Canvas Policies — cascades as follow-on Board operations (implemented #40 / #41)
- Acceptance tests 22–24, 27 in `docs/domain/acceptance-tests.md`

---

## Deferred Ideas

- Hide-withdrawn-by-default toggle → #40
- Relation/annotation rows in the confirm list → #40 / #41
- JSON / summary / transcript using this render function → #42
- `OperationId` → not scheduled; reopen only if a second writer appears
