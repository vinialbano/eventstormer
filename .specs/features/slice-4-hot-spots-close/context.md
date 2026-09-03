# Slice 4 — Hot Spots + Close · Context

**Gathered:** 2026-09-02
**Spec:** `.specs/features/slice-4-hot-spots-close/spec.md`
**Status:** Spec awaiting confirmation → Design

---

## Feature Boundary

F08 (hot spots — both creation routes, the two-kind split, the annotation cascade, the count,
the close-time sweep, the deliberate resolve/reopen mechanic), F09 (stakeholder check and
chosen problem, recorded on the workshop), F18 (the `close-session` step — question sweep +
summary consistency). The facilitator learns three question-track judgments and two proposal
tracks (hot spot, resolution) — nothing else. `Raise Hot Spot` is delivered as choreography
over persisted facts (AD-032), not an event bus. No downloadable artifact, no facilitator
relation/pivotal tracks, no reword-hold-back gate.

---

## Implementation Decisions

### Scope: strictly #41 (F08/F09/F18) — AD-031's label is corrected

- User 2026-09-02: "Out — strictly #41."
- The facilitator relation / `insert-between` / `place` / `unplace` / `link-cause` /
  `unlink-cause` / `mark-pivotal` proposal tracks **and** the F04 reword-hold-back gate move
  to **#42**. A new AD (Design) supersedes AD-031's `(#41)` slice label the way AD-017
  corrected AD-016.
- Doc reconciliation (ADR-010 / ARCHITECTURE.md slice table, ADR-005/007 rewords,
  `docs/domain/` "kind"→`modelAffecting`) stays **#43**.
- Comments posted on #41, #42, #43; #42 body updated.

### Two hot-spot creation routes, one `Hot Spot Raised`

- **Facilitator route** — a `Proposal` with `blockKind: 'hot-spot'`, `modelAffecting`
  (person-editable on the F05 card, default `true`), and optional `annotatesTargetId`. Accept
  mints the id, applies `raise-hot-spot`, then `annotate` as a batch follow-on when the target
  is set and live.
- **Direct route** — a person capability: `raise-hot-spot` (+ optional `annotate`), no review,
  author `{ accepter: { name: creatorName } }`. UI: a minimal "flag a hot spot" affordance on
  a selected building block or on nothing.
- **Close sweep + question-track route** — raised by the `reconcileHotSpots` pass over persisted
  facts (AD-032), no review.
- Acceptance test 4: all three are indistinguishable once raised.

### Hot-spot `kind` is a create-time choice, never mutated

- Facilitator proposes it; the person flips it on the card before accepting; direct creation
  offers the same toggle, default model-affecting.
- The frozen `v:1` operation union has no kind-change operation. ADR-004's "changeable by a
  reword-style operation" has no frozen home — a v2 additive, out of scope. Note for #43.
- Issue #41's "human review should confirm the field survives" — build it in; flag for review.

### Resolution is its own aggregate; the resolve chain is synchronous

- New `session-facilitation/domain/resolution/` + a `review-resolution` capability.
- Accept → `applyOperation(resolve-op)` synchronously (AD-016/AD-017 pattern), read the
  `Result`, record `Hot Spot Resolved` or `Hot Spot Resolution Rejected` on the `Resolution`
  stream. Each context commits its own stream — never one transaction. No persistent
  correlation id (AD-030 stays deferred).
- `resolve` requires the `reference` key present (any value); the turn-schema projection
  types it `z.string().min(1)` (AD-015 — no `z.unknown()` in the turn schema).
- `reopen` is a direct person action, not a facilitator judgement.

### The close is a two-phase ceremony

- "Close session" → a **closing** phase: session stays OPEN while the facilitator asks the
  stakeholder question, the person answers (interpreted — acceptance test 44), and the problem
  picker runs. `Close Session` fires on final confirmation, running the atomic sweep.
- Pin the phase model + the guard (what is still accepted during closing) as an AD in Design.

### `Raise Hot Spot` delivery — choreography, no event bus (AD-032, supersedes AD-019)

- Design reversed the AD-019 event-bus direction. `session-facilitation` writes its facts
  (`Session Closed`, `Knowledge Gap Revealed`, `Absent Stakeholder Named`) on its own streams;
  a `reconcileHotSpots` pass folded into `reconcilePendingDerivations` + `finishClose` reads
  them and calls `applyOperation(raise-hot-spot)` idempotently.
- A `hot_spot_sweep` marker table gates each key (`kg:<qId>` | `absent:<qId>:<slug>` |
  `q:<qId>` | `proposal:<pId>` | `absent-sc:<slug>`); a `duplicate-id` from the board counts
  as success. The raise id is derived from the workshop id + sweep key so a retry collides.
- A synchronous 1-publisher/1-subscriber in-process bus is a disguised orchestrator `knip`
  would flag — choreography over persisted facts is the shape AD-018 / AD-021 established.

### Close summary "freeze" rides on terminality (AD-023 stands)

- `Session Closed` carries only `{ unresolvedQuestionIds, at }`. "Consistent as of the close"
  is guaranteed because `CLOSED` is terminal and `sessionSummary(...)` is a pure projection.
- The AC is met by a test that the projection is stable post-close and that the sweep set
  equals the `Session Closed` set.

### F09 workshop state

- New `Workshop` events: `Stakeholder Check Recorded { complete, absentNames }`,
  `Problem Chosen { problemHotSpotId, qualification }`, `Problem Choice Skipped { reason }`.
- Chosen-problem candidates are exactly the hot spots open when the picker renders.
- Surfaced through `readArtifactSource` for #42; not model-log operations (F09/F18).

### The board renderer

- `GET /board` gains per hot-spot `{ annotates, resolved, reference }` + top-level
  `hotSpotCount`. No pixels cross the boundary (ADR-006).
- Callouts render on the annotated sticky; unannotated hot spots in a list; the count visible
  during the session. Live on every applied operation, like the rest of the board.
- `/impeccable` **Operate/Shape** on the existing capture-loop brief for the callout + count
  treatment; a **new** per-surface brief for the in-dock close ceremony.

### Agent's Discretion

- Exact `unannotate` idempotency (rejected no-op vs accepted no-op) — pin in Design, keep the
  log discriminable from a real change (L-001 spirit).
- Whether `reopen`'s snapshot keeps `reference` visible or only in the log (F08 experience
  says an open hot spot shows no reference — so snapshot `resolved:false` and the client hides
  it; the value stays in the log and MAY stay on the snapshot as `reference` for #42's needs).
- Bus port shape (topic enum vs typed channels) — one real topic, keep it minimal.

### Declined / Undiscussed Gray Areas → Assumptions

None declined — all four gray areas were answered. The five **Design** rows in the spec's
Assumptions table are resolved directions carrying a chosen default, each to be pinned as an
AD in the Design phase.

---

## Specific References

- The existing capture accept path (`session-facilitation/capabilities/review-proposal/
  accept.ts`) is the template for the hot-spot proposal accept and the resolution accept.
- `session-close.ts` / `reconcilePendingDerivations` is the template for the idempotent,
  self-healing close sweep — extend it, do not add a second close writer.
- AD-017's correction of AD-016's slice label is the precedent for S4-42's AD.

---

## Deferred Ideas

- A hot-spot kind-change operation (v2 additive to the frozen union).
- Rendering the "no hot spots is a signal" message richly (F09 interpretation) — this slice
  states it plainly; #42's summary elaborates.
- Persisting a per-close snapshot struct — rejected (AD-023); revisit only if a read-time
  projection proves too slow at real scale (it will not at v1 scale).
