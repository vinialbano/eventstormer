# Slice 3 — Relations + the Board Specification

GitHub issue: [#40](https://github.com/vinialbano/eventstormer/issues/40) ·
Blocked by #39 (Slice 2) · Blocks #41 (Slice 4) ·
Parent effort map #9 · Version target **0.4.0** (`minor` changeset)

## Problem Statement

The model can capture, reword, and withdraw building blocks, but they all sit in the
backlog. A domain expert cannot sequence events, branch the flow, attach who or what
caused an event, or see a timeline. The EventStorming wall — the thing the product is
named for — does not exist yet. This slice is that wall: remaining Board operations,
derived layout, live rendering.

## Goals

- [ ] A person places events on a left-to-right timeline, sequences them (including
      branches), inserts between two sequenced events, and attaches actors/systems as
      causes — each mutation a logged operation, cycle-checked, kind-checked.
- [ ] The board shows backlog and timeline together; actors/systems sit under the event
      they caused; position is derived (no stored pixel); the board updates on every
      applied operation.
- [ ] Withdrawing an actor or system batch-appends `unlink-cause` for every referencing
      event; withdrawing an event does not rejoin its neighbours; reinstate restores no
      relations.
- [ ] Pivotal marks are togglable on events only; withdrawn blocks are hidden by default
      and can be revealed.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Facilitator proposes `sequence` / `insert-between` / `place` / `link-cause` | Parked on #41. Ticket ACs are direct F06; `FacilitationTurnSchema` is against AD-015's 24-optional ceiling. |
| Facilitator proposes `mark-pivotal` (F07 PRD path) | Parked on #41. Direct mark/unmark satisfies this issue's AC. |
| Reword-hold-back gate (F04) | Parked on #41. "The model has structure" is what this slice *creates*. |
| Eval assertions for those F04/F07 facilitator behaviours | Parked on #42, blocked on #41 shipping the tracks. |
| ADR-010 / ARCHITECTURE.md slice-table reword | Parked on #43. |
| `annotate` / `raise-hot-spot` / `resolve` / `reopen`; withdraw → hot-spot cascade | Slice 4 (#41). |
| JSON export, model summary, session-transcript export, `pnpm seed`, eval suite | Slice 5 (#42). Live account **extends** the existing walk; it does not grow a second renderer. |
| `OperationId`; accept-chain crash-window reconciliation | AD-030. Still unearned. |
| Invitations, multiplayer, SSE, optimistic client updates | F14 / ADR-007. |
| A language model on any projection path | Product thesis. |
| Free-position drag (a person parks a sticky at a pixel of their choosing) | F02 / ADR-006: position is derived. Drag-to-place is semantic. |
| A before/after/between **picker** widget for pivotal landmarks | F07's "relative to a milestone" is the visual bars + semantic drop, not a separate control. |

---

## Assumptions & Open Questions

Every ambiguity is resolved or recorded here — nothing is left silently unclear.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Facilitator relation / pivotal tracks + reword-hold-back | **Out of this slice.** Direct F06/F07 on the wall. Parked on #41/#42/#43. Record as **AD-031** at Design. | User: "do whatever you think is better" + keep the backlog. Ticket ACs never mention the facilitator; AD-015 makes a schema extension a second sitting. | **y** — delegated 2026-08-31; comments posted |
| `place` / `unplace` | **Event-only**, independent of `sequence`. A placed event with no `follows` edge is its own single-member track. Actors/systems are never `place`d — they appear under a placed event iff a `causedBy` edge exists (derived display). | Canvas / open-question #35; ticket AC "cannot be given a placement position". | **y** — canvas `[storm]` |
| `sequence` of an unplaced event | The client POSTs one `sequence`. `decide` emits **`[sequence]` only** — no follow-on `place` ops. `project(sequence)` / `project(insert-between)` set `placement: 'timeline'` on participating events. Explicit `place` remains the orphan-track factory (canvas #35). Placement stays off the write model (AD-005). | HTTP is still one op per gesture. Prepending `place` would duplicate a display fact the snapshot fold already derives. Design 2026-08-31. | **y** — spec confirm + Design refinement |
| `unplace` | Event-only. `decide(unplace)` emits `unsequence` for every incident `follows` edge, then `unplace`, one batch. Neighbours are **not** rejoined. | Canvas: "severs the event's `follows` edges and returns it to the backlog." | **y** — canvas |
| Event `withdraw` vs `follows` | Log is **`withdraw` only** (no `unsequence` follow-ons). `evolve` drops adjacency incident to the withdrawn id. Neighbours are not rejoined. Reinstate: backlog, not pivotal, no edges. | Ticket comment: event with no causes → only `withdraw`; "does not rejoin neighbours"; F01 lists unlink-cause / hot-spot cascades, not unsequence. | **y** — #40 comment |
| Actor/system `withdraw` | `decide(withdraw)` → `[withdraw, ...unlink-cause per referencing event]`, batch-atomic. | AD-006, AD-028, #40 comment. Pin the two-event test. | **y** |
| Duplicate `follows` / `causedBy` | **Rejected** (`already-related`, systemic). Not a silent no-op. | Discriminable tests (L-001 spirit); an accidental double-drop must not look like success. | **y** — agent default |
| `insert-between` when `A→B` is absent | **Rejected** (`missing-edge`, systemic). Graph unchanged. | The op *replaces* an edge; there is nothing to replace. | **y** |
| Cycle rejection | `{ kind: 'cycle', classification: 'systemic', path: BuildingBlockId[] }` — ordered ids of the offending path. SPA resolves current labels for display. Whole-graph, including prior sessions. | F01; AD-008. | **y** |
| Kind-permission | `decide` rejects (systemic `kind-permission`), not only Zod. Actor/system: no `follows`, no pivotal, no `place`. `causedBy` only actor\|system → event. | Ticket: "rejected by its kind's schema" — the frozen op schema cannot encode endpoint kinds (ids are untyped); the guard lives in `decide` where the write model has `kind`. | **y** |
| `applyOperation` for relation ops | Must **not** throw. `resultingBuildingBlockId` is set when the initiating op has `id` or `target`; for `sequence` / `unsequence` / `insert-between` / `link-cause` / `unlink-cause` the HTTP response is `{ position }` only. | Today's helper reads `id` else `target` — sequence has neither. | **y** |
| `POST …/board/operations` | Widen the allow-list to the F01-rest kinds this slice handles. Hot-spot kinds stay 422 `not-implemented-in-slice`. Same author as Slice 2 (`{ accepter: { name: creatorName } }`). | Existing seam; AD-024. | **y** |
| `GET /board` | Adds `follows`, `causedBy`, per-event `pivotal`, and event `placement: 'backlog' \| 'timeline'`. Actors/systems keep `placement: 'backlog'`; attachments are layout, not a stored placement. | Client and DAG both need topology; pixels still never cross this boundary. | **y** |
| `computeTimelineLayout` | Lives in `domain-model-capture/domain/timeline/`. Emits per-event `rank` + `order` + `attachments` + `pivotal` and per-track `follows` edges. **No pixel.** The SPA imports this **file** directly (hide-withdrawn is a local view flag). Do **not** import `api.ts`, `decide.ts`, or `infrastructure/` from `src/app/`. GET `/board` carries topology, not a precomputed `timeline` key. Vue Flow/dagre (or the grid fallback) is an `src/app/` adapter. | ADR-006. Hide-withdrawn must not round-trip. | **y** — Design 2026-08-31 |
| Renderer | **Primary Vue Flow + dagre** (`@vue-flow/core@1.48.2`, `@dagrejs/dagre@3.1.1`, `rankdir: 'LR'`). **1h reflow spike first**; if variable-height re-layout cannot be tamed by fixed sticky width, **switch to the CSS-grid-by-rank fallback in this same slice** — do not leave a broken Vue Flow board. | ADR-006. | **y** — ADR-006 |
| Drag-to-place | Semantic drop onto the timeline: empty region → `place`; onto an event → `sequence` (event) or `link-cause` (actor/system); onto a `follows` edge → `insert-between`. Never writes a coordinate. `sequence` / `insert-between` of an unplaced event is still **one POST** — `project` sets `placement: 'timeline'`. Pan/zoom is view-only. Keyboard: equivalent actions exist (WCAG 2.2 AA). Exact affordances: `impeccable` Operate on the existing capture-loop brief, no new world. | Brief §3/§4; F02; ticket AC; Design 2026-08-31. | **y** |
| Hide-withdrawn | **View filter**, default **hidden**. Reveal shows Slice 2 ghost treatment (graphite, struck through) in the block's last placement. Snapshot still contains them. Persistence unchanged. Toggle lives on the board (client state is fine; not a logged operation). | #40 comment vs Slice 2 ghosts. | **y** |
| Pivotal | Snapshot/read-model only (canvas: nothing depends on it). Direct toggle from a selected non-withdrawn event sticky. Visually: tall thin yellow bar (brief / `--color-pivotal`). | F07 ticket AC; canvas write-model table. | **y** |
| Readable account this slice | Placed events walked in `follows` order (each connected track its own run); backlog remainder still capture/log order. Coverage line "Timeline and relations" becomes a real walk, not "not run". Relation endpoints become `listReferences` sites (`follows` predecessor/successor, `causedBy` cause/effect) in **addition** to the building-blocks line. Same render function; no LLM. | Slice 2 template fills slots; #42 still owns the downloadable summary reduction. | **y** |
| Live coupling | Unchanged: successful POST or accept → `board-dirty` → refetch board + account. | Slice 2. | **y** |
| Auth / rate limits | **N/A** — single-user, local. | ADR-011. | — |
| Data lifecycle / expiry | **N/A** — append-only; withdraw is not delete. | ADR-004. | — |
| Idempotency / retry | `applyOperation` still owns stale-position retry (AD-022). Duplicate edges rejected (above). Client does not retry a 422. | AD-008. | — |
| Observability | **N/A** — no new model call. | — | — |
| External-dependency failure | Vue Flow reflow → grid fallback (above). No new network. | ADR-006. | — |
| Concurrency | Single-writer board; AD-022. | F01. | — |

**Open questions:** none — remaining timeline chrome (drop-target highlighting, pan/zoom
keyboard chords, dock-collapsed vs wall) is `impeccable` shape at Design, inside the
capture-loop brief.

---

## User Stories

### P1: Sequence, branch, insert, and reject cycles ⭐ MVP

**User Story**: As a domain expert, I want to put events in time order — including a split
— so the wall reads as the business's flow, not a pile of stickies.

**Why P1**: This is F01 rest + the F02 timeline. Independently demoable with Slice 2
captured events and no facilitator change.

**Acceptance Criteria**:

1. WHEN the person sequences event A then event B (B may still be in the backlog) THEN the
   system SHALL append **exactly one** `sequence` and both events SHALL appear on the
   timeline in `follows` order (`project` sets their placement; no extra `place` op).
2. WHEN event A is given two successors B and C THEN the system SHALL retain **both**
   `follows` edges; the board SHALL render both branches and SHALL hide neither.
3. WHEN `sequence` or `insert-between` would close a `follows` cycle THEN the system SHALL
   reject with `cycle` (systemic) naming the offending path as ordered building-block ids;
   the graph SHALL be unchanged.
4. WHEN `insert-between(A, C, B)` runs and `A→B` exists THEN the system SHALL append
   **exactly one** `insert-between` such that no observable snapshot has both `A→B` and
   the two new edges; C SHALL sit on the timeline; other successors of A SHALL be
   untouched.
5. WHEN `insert-between` names an `A→B` that does not exist THEN the system SHALL reject
   (`missing-edge`, systemic) and append nothing.
6. WHEN `sequence` / `unsequence` names a duplicate existing edge, a withdrawn or unknown
   endpoint, or a non-event THEN the system SHALL reject (systemic: `already-related` /
   `withdrawn-target` / `unknown-target` / `kind-permission`) and append nothing.

**Independent Test**: Capture three events; sequence A→B and A→C; see two branches; try
C→A and see a named-path rejection; insert D between A and B without losing A→C.

---

### P1: Place, unplace, and the two surfaces ⭐ MVP

**User Story**: As a domain expert, I want unplaced work in the backlog and placed events
on the timeline, both always visible, so I can sort without losing what is still loose.

**Why P1**: F02's two surfaces; the canvas's independent `place` op.

**Acceptance Criteria**:

1. WHEN a newly captured event has not been placed THEN it SHALL appear in the backlog and
   SHALL NOT occupy a timeline position.
2. WHEN the person places an event (semantic drop onto empty timeline, or `place`) THEN it
   SHALL move to the timeline as its own track if it has no `follows` edge; the backlog
   SHALL no longer show it.
3. WHEN the person unplaces a sequenced event THEN the system SHALL sever its `follows`
   edges (batch `unsequence` then `unplace`) without rejoining neighbours, and the event
   SHALL return to the backlog.
4. WHEN `place` / `unplace` targets an actor, a system, a withdrawn block, or a missing id
   THEN the system SHALL reject (`kind-permission` / `withdrawn-target` / `unknown-target`)
   and append nothing.
5. WHEN the person pans or zooms the view THEN the model SHALL be unchanged (no pixel,
   rank, or coordinate stored on any operation or snapshot field).

**Independent Test**: Place one event onto an empty timeline (orphan track); sequence a
second onto it; unplace the first; the second stays, no new edge appears between whoever
was around the first.

---

### P1: Causes, and withdraw that unlinks them ⭐ MVP

**User Story**: As a domain expert, I want to say who or what caused an event, and I want
withdrawing that actor or system to drop those links so the graph never dangles.

**Why P1**: F01 `causedBy` + the cascade Slice 2 deferred (AD-028).

**Acceptance Criteria**:

1. WHEN the person links an actor or system C to event E THEN the system SHALL append one
   `link-cause` and the board SHALL render C **beneath** E, never as a timeline slot of
   C's own.
2. WHEN `link-cause` pairs anything other than actor\|system → event, or names a
   withdrawn/missing endpoint, or repeats an existing pair THEN the system SHALL reject
   (`kind-permission` / `withdrawn-target` / `unknown-target` / `already-related`).
3. WHEN the person unlinks that pair THEN one `unlink-cause` SHALL be appended and C SHALL
   leave E's attachments; if C causes no remaining **placed** event it SHALL sit in the
   backlog.
4. WHEN the person withdraws an actor (or system) that `causedBy`-links **two** events THEN
   the log SHALL be `withdraw` plus **two** `unlink-cause` in one batch; both events SHALL
   lose that cause; ids SHALL be preserved.
5. WHEN the person withdraws an event that has `follows` edges on both sides and no
   causes THEN the log SHALL be **only** `withdraw`; neighbours SHALL NOT gain a new
   `follows` edge to each other.
6. WHEN a withdrawn block is reinstated THEN it SHALL return to the backlog with **no**
   `follows`, **no** `causedBy`, and not pivotal.

**Independent Test**: Link one actor to two placed events; withdraw the actor; both events
keep their ids and lose the actor; reinstate the actor — it sits naked in the backlog.

---

### P1: The live timeline board ⭐ MVP

**User Story**: As a domain expert, I want the wall to look like Big-Picture EventStorming
— orange events left-to-right, causes underneath, branches visible — so I recognise the
business I just described.

**Why P1**: F02 is the named feature of this issue. Without it the operations are an API.

**Acceptance Criteria**:

1. WHEN placed events exist THEN they SHALL render in `follows` order along the timeline;
   events in separate connected tracks SHALL each render as their own left-to-right run.
2. WHEN an event has several successors THEN the flow SHALL visibly split and both
   branches SHALL be readable.
3. WHEN `computeTimelineLayout(snapshot)` is called THEN it SHALL return ranks, order,
   attachments, pivotal flags, and `follows` edges with **no pixel coordinate**, SHALL live
   under `domain-model-capture/domain/timeline/`, and SHALL be unit-tested with no Vue/DOM.
4. WHEN an operation is applied from **any** source (direct POST or Slice-1 accept) THEN
   the board SHALL update in the same interaction (existing `board-dirty` refetch).
5. WHEN sticky width is fixed and a label wraps THEN a re-layout SHALL NOT be required for
   correctness; IF the 1h Vue Flow reflow spike still shows a whole-board jump on edit
   THEN this slice SHALL ship the CSS-grid-by-rank fallback instead, still driven by
   `computeTimelineLayout`.
6. WHEN the person drags (or uses the keyboard equivalent) a backlog event onto the
   timeline THEN the client SHALL POST the matching operation (`place` / `sequence` /
   `insert-between`) and SHALL NOT write a coordinate.

**Independent Test**: Two disconnected tracks plus one branch; `computeTimelineLayout` goldens
in node tests; the SPA shows both tracks; accept a new event from the dock and see the
board refetch without a manual refresh.

---

### P2: Pivotal marks

**User Story**: As a domain expert, I want to mark a few events as milestones so placing
the rest has visible reference points.

**Why P2**: F07 is in the ticket; the wall is usable without marks.

**Acceptance Criteria**:

1. WHEN the person marks a non-withdrawn domain event pivotal THEN the system SHALL append
   **exactly one** `mark-pivotal` and change nothing else (no edges, no placement).
2. WHEN they unmark it THEN one `unmark-pivotal` SHALL leave the event and its edges
   intact.
3. WHEN `mark-pivotal` / `unmark-pivotal` targets a non-event, a withdrawn block, or a
   missing id THEN the system SHALL reject (`kind-permission` / `withdrawn-target` /
   `unknown-target`).
4. WHEN an event is pivotal THEN the board SHALL show it as visually distinct (pivotal
   bar; `--color-pivotal`) so it can act as a landmark for semantic drop.

**Independent Test**: Mark two events; sequence a third relative to one of them; unmark;
the third's edges remain.

---

### P2: Hide withdrawn, and references that include relations

**User Story**: As a domain expert, I want withdrawn structure out of the way until I ask
for it, and I want the reword confirm list to name the relations that point at a block.

**Why P2**: Ticket ACs; extends Slice 2 rather than inventing a new surface.

**Acceptance Criteria**:

1. WHEN withdrawn blocks exist THEN the board SHALL hide them by default; WHEN the person
   reveals withdrawn THEN those blocks SHALL appear in Slice 2 ghost treatment at their
   last placement.
2. WHEN `GET …/board/blocks/:blockId/references` runs for a block that participates in
   `follows` or `causedBy` THEN the list SHALL include those relation endpoints **and**
   the existing readable-account building-blocks site; resolution SHALL be by id (Slice 2
   substring AC still holds).
3. WHEN the live readable account renders THEN placed events SHALL be walked in `follows`
   order (one run per track) and the coverage line SHALL no longer say timeline/relations
   were "not run"; quoted evidence SHALL stay byte-identical across a reword.

**Independent Test**: Sequence A→B, reword A through the confirm popover, see a `follows`
row plus the account line, both carrying the new label; a quoted contribution that
contains the old spelling is unchanged. Toggle hide/reveal on a withdrawn event.

---

### P3: Gate, properties, changeset

**User Story**: As the maintainer, I want the new invariants property-tested and the slice
versioned, so a later op cannot sneak a cycle through.

**Why P3**: ADR-008 named properties; ADR-009 versioning. Not independently demoable as a
user story, but the slice is not done without them.

**Acceptance Criteria**:

1. WHEN `fast-check` runs THEN no generated **accepted** operation sequence SHALL yield a
   `follows` cycle, and no operation targeting a kind that does not permit it SHALL be
   accepted.
2. WHEN the incremental-replay property runs over the newly handled kinds THEN
   `replay(log ++ ops) === fold(replay(log), ops)` on the snapshot (and the matching
   write-model `evolve` fold).
3. WHEN this slice ships THEN a `minor` changeset SHALL be present and `package.json`
   `version` SHALL be untouched (ADR-009). `edit-model` SHALL still 422 hot-spot kinds.

**Independent Test**: Property tests in `domain-model-capture/domain/`; `pnpm check` green;
changeset file exists.

---

## Edge Cases

- WHEN `sequence` names the same id as predecessor and successor THEN the system SHALL
  reject (`cycle` or `kind-permission` — a self-loop is a cycle); graph unchanged.
- WHEN two POSTs race THEN `applyOperation` SHALL retry `stale-position` internally
  (AD-022); only a merits rejection reaches the client.
- WHEN `decide` returns a batch (`unsequence*`+`unplace`, `withdraw`+`unlink-cause*`) THEN
  `EventStore.append` SHALL commit all of them or none (AD-006); a crash mid-batch is a
  SQLite rollback, not a partial graph.
- WHEN a confirm popover is open and a relation POST lands THEN the client SHALL refetch
  references or cancel (Slice 2 stale-popover rule, unchanged).
- WHEN the board has zero placed events THEN the timeline is empty and the `time →` guide
  remains; the backlog frame stays (Slice 1 empty state, not a new screen).
- WHEN Vue Flow is the renderer and `prefers-reduced-motion` is set THEN the card-to-sticky
  grammar already in the brief still honours it; pan/zoom remains available.
- WHEN `GET /board` is called on an empty log THEN it remains 404 (Slice 1); relation
  fields appear only once a workshop has a board stream.

---

## Requirement Traceability

| ID | Story | Phase | Status |
| --- | --- | --- | --- |
| S3-01 | P1 Sequence (one `sequence`; snapshot places endpoints) | Execute | ✅ Verified |
| S3-02 | P1 Sequence (two successors / both branches) | Execute | ✅ Verified |
| S3-03 | P1 Sequence (cycle named, graph unchanged) | Execute | ✅ Verified |
| S3-04 | P1 Sequence (insert-between atomic; other successors untouched) | Execute | ✅ Verified |
| S3-05 | P1 Sequence (missing-edge / duplicate / kind / withdrawn / unknown) | Execute | ✅ Verified |
| S3-06 | P1 Place (unplaced → backlog only) | Execute | ✅ Verified |
| S3-07 | P1 Place (place → orphan track) | Execute | ✅ Verified |
| S3-08 | P1 Place (unplace severs follows, no rejoin) | Execute | ✅ Verified |
| S3-09 | P1 Place (kind-permission / withdrawn / unknown) | Execute | ✅ Verified |
| S3-10 | P1 Place (pan/zoom stores nothing) | Execute | ✅ Verified |
| S3-11 | P1 Causes (link-cause; actor under event) | Execute | ✅ Verified |
| S3-12 | P1 Causes (illegal pairing / duplicate / withdrawn) | Execute | ✅ Verified |
| S3-13 | P1 Causes (unlink-cause; backlog if no remaining placed effect) | Execute | ✅ Verified |
| S3-14 | P1 Causes (withdraw actor/system → batch unlink-cause × N) | Execute | ✅ Verified |
| S3-15 | P1 Causes (withdraw event: only withdraw; no rejoin) | Execute | ✅ Verified |
| S3-16 | P1 Causes (reinstate naked) | Execute | ✅ Verified |
| S3-17 | P1 Board (follows order; separate tracks) | Execute | ✅ Verified |
| S3-18 | P1 Board (visible split) | Execute | ✅ Verified |
| S3-19 | P1 Board (`computeTimelineLayout` framework-free, no pixels) | Execute | ✅ Verified |
| S3-20 | P1 Board (live refetch any source) | Execute | ✅ Verified |
| S3-21 | P1 Board (Vue Flow spike / grid fallback; fixed sticky width) | Execute | ✅ Verified |
| S3-22 | P1 Board (semantic drag-to-place / keyboard equivalent) | Execute | ✅ Verified |
| S3-23 | P2 Pivotal (exactly one op; reversible; events only) | Execute | ✅ Verified |
| S3-24 | P2 Pivotal (visual landmark) | Execute | ✅ Verified |
| S3-25 | P2 Hide-withdrawn default + reveal ghosts | Execute | ✅ Verified |
| S3-26 | P2 References include relation endpoints; substring AC holds | Execute | ✅ Verified |
| S3-27 | P2 Account follows-order walk; coverage line; quotes frozen | Execute | ✅ Verified |
| S3-28 | P3 fast-check cycle + kind-permission + incremental replay | Execute | ✅ Verified |
| S3-29 | P3 `minor` changeset; hot-spot kinds still 422 | Execute | ✅ Verified |
| S3-30 | cross (`impeccable` shape of timeline / drop / toggle on capture-loop) | Execute | ✅ Verified |
| S3-31 | cross (`applyOperation` must not throw on ops without `id`/`target`) | Execute | ✅ Verified |
| S3-32 | cross (comments on #41 / #42 / #43 — already posted; keep in sync if Design diverges) | Execute | ✅ Verified |

**Coverage:** 32 requirement IDs, all Verified. Spec **Edge Cases**
fold into existing IDs: self-loop → S3-03; stale-position → S3-31/AD-022; batch atomicity →
S3-08/S3-14; stale popover → S3-26 (Slice 2 rule); empty timeline → S3-06; empty-log
GET → S3-20.

---

## Success Criteria

- [ ] Demo: capture several events and an actor → place/sequence a branched timeline →
      link the actor under one event → insert between → cycle attempt named and refused →
      withdraw the actor (both unlink-causes) → hide/reveal a withdrawn event.
- [ ] `computeTimelineLayout` goldens with no Vue import; `pnpm check` green.
- [ ] Reword confirm list names a `follows` site; quoted evidence unchanged.
- [ ] A `minor` changeset is present; `package.json` `version` untouched (ADR-009).
