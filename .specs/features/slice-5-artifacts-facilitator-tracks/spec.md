# Slice 5 — Artifacts + Facilitator Tracks Specification

GitHub issue: [#42](https://github.com/vinialbano/eventstormer/issues/42) (re-scoped — see
Issue Reconciliation) · Blocked by #41 (Slice 4, merged) · Blocks #43 (Slice 6) ·
Parent effort map #9 · Version target **0.6.0** (`minor` changeset)

**Status**: Specify — awaiting confirmation.

**Scope split (maintainer decision, 2026-09-03).** Issue #42 as written bundles four tracks:
artifact exports, the facilitator behaviours moved from #41, the F11 eval suite, and
`pnpm seed` + the recorded demo. The eval suite, the seed workshop, the demo recording, and
the README eval-results publication all depend on a **maintainer-owned deliverable** — the
~3–4 minute restaurant / kitchen-order narration recorded and transcribed (DESIGN.md §8) —
which does not exist yet. Those tracks are **re-filed to a new follow-on issue** (see Issue
Reconciliation). This slice is the two tracks that have no recording dependency:

1. The three remaining **derived artifacts** — JSON export, deterministic summary, verbatim
   session-transcript export (F10 rest, F19).
2. The **facilitator proposal tracks** moved from #41 — relation-op proposals,
   `mark-pivotal` / `unmark-pivotal` proposals, and the F04 reword-hold-back gate.

## Problem Statement

The model can be built, rendered live, relation-linked, hot-spotted, and closed, but an
engineer still cannot take the model away as structured data, a domain expert cannot hand
someone the gist or the raw annotated conversation, and the facilitator can only ever propose
*new building blocks* — it cannot propose an ordering, a cause, a placement, or a milestone,
and it will offer a reword before the model has any structure for the reword to matter
against. This slice closes both gaps.

## Goals

- [ ] On request, a person downloads the model as **structured JSON** that is a direct
      serialisation of the Board snapshot + workshop record, carries no quoted evidence, and
      **round-trips** — deserialising it reproduces a byte-identical snapshot.
- [ ] On request, a person downloads a **deterministic Markdown summary** — the model's own
      outline (scope, format, narrator count, pivotal spine in `follows` order, per-kind
      counts, placed-vs-backlog / disconnected-track / branch-point counts, every branch
      point named, chosen problem with qualification, open model-affecting hot spots,
      model-derived coverage gaps, format steps not run) with nothing not derivable from the
      model and no quoted evidence.
- [ ] On request, a person downloads a **verbatim session-transcript export** — every turn
      of one session in order, each annotated with the proposal it produced, that proposal's
      disposition, and the resulting building block; plus per-contributor accept / edit /
      reject counts stated without judgement; nothing summarised.
- [ ] Every downloaded artifact is byte-identical for the same source state (bar the render
      timestamp) and embeds the composite version stamp (`boardPosition`,
      `sessionRecordPosition`, `renderedAt`). Each artifact is also a **live panel** in the
      app, re-rendering on every applied operation.
- [ ] Requesting one artifact never produces another; nothing is materialised between
      requests; no artifact path calls a language model or claims external-toolchain
      compatibility.
- [ ] The facilitator **proposes relation operations** — `sequence`, `insert-between`,
      `place`, `unplace`, `link-cause`, `unlink-cause` — through the F05 accept / edit /
      reject review path, and `FacilitationTurnSchema` stays within the AD-015 limits
      (≤ 24 optional parameters, no `z.unknown()`, no empty sub-schema).
- [ ] The facilitator **proposes `mark-pivotal` / `unmark-pivotal`** (F07's "suggested
      milestones" path) through the same review path, only once the model has enough events.
- [ ] The facilitator **holds a reword proposal back** until the model has structure for the
      change to be meaningful (F04 reword-hold-back gate) — a deterministic, testable gate,
      not a model self-report.
- [ ] A `minor` changeset (target 0.6.0) is present.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
| --- | --- |
| **F11 facilitator eval suite** — CLI run against the real model, N=5, per-assertion `k/N`, README publication | Depends on the maintainer narration recording + golden fixture (DESIGN.md §8), which does not exist yet. **Re-filed — see Issue Reconciliation.** The relation / pivotal / reword behaviours this slice builds go on the ADR-008 "deliberately untested until the eval slice" list until then. |
| **`pnpm seed`** — loads the demo workshop | Same recording dependency (the seed session *is* the transcribed narration). **Re-filed.** |
| **The recorded walkthrough** + its transcription | Maintainer-owned deliverable. **Re-filed** (it unblocks the two rows above). |
| A new golden eval fixture for any facilitator track | No fixtures without the recording; "do not invent golden fixtures for tracks that do not exist" (#40 comment). **Re-filed.** |
| An HTTP **import** endpoint / "load a workshop from JSON" user flow | F14 multiplayer / import is out of v1. The round-trip AC is satisfied by a pure deserialise function + property test, not a route. See Assumptions. |
| The facilitator proposing `annotate` / `raise-hot-spot` / `resolve` / `reopen` relation-like ops | Slice 4 shipped the hot-spot / resolution facilitator tracks; this slice adds only the Board *relation* + *pivotal* proposal tracks. |
| A hot-spot kind-change op; carrying the chosen problem forward to seed a later workshop | Unchanged from Slice 4 — v2 / explicitly out of v1 (PRD §7, ADR-004). |
| `OperationId`-correlated crash-window reconciliation for the relation-proposal apply round trips | AD-030 — still unearned. The accept→apply chain is synchronous (AD-016/AD-017); each context commits its own stream; the sub-millisecond crash window is accepted at v1 single-user scale. **AD-038** makes the re-accept retry converge to `APPLIED` (not a spurious `APPLY_FAILED`) for already-satisfied relation/pivotal/`resolve` effects — the missing piece the id-minting kinds had via `duplicate-id`. **Late accept onto a *closed* session is guarded** (`accept.ts` → 409 `session-closed`), not left to the window. |
| ADR-010 slice-table wording (slice 3 still lists "facilitator proposes relations; reword-hold-back gate; F07 pivotal"), `docs/domain/` `Proposal` single-birth canvas reconciliation | Slice 6 (#43) doc pass — already on the STATE.md Slice-6 list. **ARCHITECTURE.md §5 is NOT deferred** — this slice adds the three artifact routes to the `/api` surface list there (T27), using §5's already-committed `/workshops/:id/artifacts/*` shape. |
| Invitations, multiplayer, concurrent sessions, SSE, optimistic client updates; a language model on any artifact path | F14 / ADR-007 / product thesis. Unchanged. |

---

## Assumptions & Open Questions

Every ambiguity is resolved or recorded here — nothing is left silently unclear.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| **JSON round-trip is verified by a pure `serialise` / `deserialise` pair + a property test**, not by an HTTP import route. | `deserialise(serialise(x)) === x` as a `fast-check` property in `domain/`; `serialise` behind the export route; no import route. `deserialise` bounds block/edge counts — a hostile document is rejected, not expanded. | No v1 user story imports a workshop; multiplayer/import is F14. A pure function satisfies "importing it reproduces an identical snapshot" literally and is the stronger determinism assertion. | **y (AD-037)** |
| **The JSON export serialises the Board snapshot + `ArtifactSource` workshop record — not the operation log.** Version stamp is **composite**: `{ boardPosition, sessionRecordPosition, renderedAt }`. | Serialise blocks, both relation kinds, hot-spot annotation + open/resolved + reference, pivotal, placement, per-block provenance, scope, format, stakeholder answer, chosen problem + qualification. Empty board → `boardPosition: 0` (normalised from `readBoardSnapshot`'s `-1`). | PRD F10 "direct serialisation of the model … round-trips" — the model is the snapshot. A board-position-only stamp fails the P1 "matches a known version" goal because `scope`/`stakeholderCheck`/`chosenProblem` are re-recordable with no board op. | **y (AD-037)** |
| **"Viewable in the app"** for JSON / summary / transcript = a **live panel** that re-renders on every applied operation, like the readable account (Slice 2). | A panel beside the board renders the selected artifact and re-fetches on model change; a download action produces the point-in-time file (stamped). | Maintainer decision 2026-09-05. PRD F10/F19 "viewable in the app **and** downloadable"; keeps the artifact never behind the model on screen, consistent with the readable-account coupling. The *download* is still on-request and stamped. | **y (maintainer 2026-09-05)** |
| **The transcript export covers one session at a time.** | Route `GET /workshops/:id/sessions/:sessionId/artifacts/transcript`. No "default to the one closed session" convenience — the id is always explicit. | PRD F19 Consumes "Session record"; per-contributor counts + per-turn lifecycle + the position stamp are all session-scoped. Dropping the convenience keeps one code path. | **y** |
| **`/api` route shape** for the three artifacts uses ARCHITECTURE.md §5's committed `/workshops/:id/artifacts/*`. | `GET /workshops/:id/artifacts/model` (JSON), `/artifacts/summary` (Markdown), `/sessions/:sessionId/artifacts/transcript` (Markdown). Content type by `Accept` / route, not a file extension. T27 adds these to the §5 surface list. | §5 already commits this shape; `/api` is a SemVer contract (ADR-009) — no divergence, no new AD. | **y (maintainer 2026-09-05)** |
| **The reword-hold-back and pivotal-readiness gates are named `session-facilitation/domain/` predicates**, applied at the seam. | `hasModelStructure(snapshot)` = ≥ 1 `follows`/`causedBy` edge **or** ≥ 1 pivotal mark; `pivotalProposable(snapshot)` = ≥ `PIVOTAL_MIN_PLACED_EVENTS = 5` placed domain events (named constant). A same-contribution reword target is never held; since it cannot resolve to a board id at interpret time (ids minted at accept), the released strand is dropped in v1 — the person's block proposal already carries the wording (pinned by `map.test.ts`). | "Enough structure" (F04) / "a handful … a long board" (F07) is domain vocabulary and a product decision — it must be named, not a magic number in the infra ACL (domain-modeling review). Deterministic; the outcome is baked into `Contribution Interpreted`. | **y (AD-036)** |
| **A below-threshold `propose-pivotal` is recorded as a `heldBack` track**, symmetric with a held reword (both are "the facilitator wanted X, a readiness gate blocked it"). | Store the track `heldBack: true`, no `Proposal`, `sessionView` notice. | Asymmetric visibility (reword noticed, pivotal silently dropped) would blind the transcript and the future eval to half the gated cases (domain-modeling review m5). | **y (AD-036)** |
| **`boardState` for the gates is read from one `readBoardSnapshot` taken after the model call returns**, at the same point as endpoint-label resolution. | The interpret capability takes the snapshot post-`await` and passes `boardState` + `resolveBlockId` from that one read into `mapTurn`. | Mirrors AD-025's post-`await` discipline — a board that gained its first edge *during* the multi-second model call must gate against the post-call state, or a held/released decision is stale (reliability review MINOR-4). | **y (AD-036)** |
| **Relation proposals reference endpoints by exact current label**, resolved to `BuildingBlockId` at the seam; the stored `Intent` carries **named** id fields matching the `Operation` (`predecessor`/`successor`/`inserted`/`cause`/`effect`/`target`) — not a positional array. | The Anthropic-shaped track carries a label array (the AD-015 optional ceiling forces that shape *there*); the seam expands it into named ids because `InterpretedTrack`/`ProposalEvent` have no optional limit and a frozen event must not encode meaning by position. | domain-modeling review M1 — a positional array re-expanded "by position" in `accept.ts` is where an off-by-one silently makes a wrong edge, on a frozen event, on the eval-deferred path. | **y (design)** |
| **A relation / pivotal / reword proposal that fails to apply** on accept is `APPLY_FAILED` and surfaced, as a building-block apply-failure is; the recorded event is `Operation Rejected` (→ `APPLY_FAILED`) — **no event is renamed**. | Reuse `recordApplyOutcome`; no new outcome states. An **already-satisfied** relation/pivotal/`resolve` effect is **not** a failure — AD-038 makes `decide` return `ok([])` and the accept path records `APPLIED`. | The `Proposal` machine already models the lifecycle; AD-038 closes the crash-window convergence gap the id-minting kinds had via `duplicate-id`. | **y (AD-035/038)** |
| **Editing a relation / pivotal proposal before accept** swaps an endpoint / target / `newLabel`; the kind is fixed at birth. `Model Change Edited` carries only the mutable fields. | The F05 edit card swaps an endpoint for another board block or rejects. | Mirrors `Proposal Edited` (carries only the new `label`, not a re-assertion of kind); ADR-004's frozen operation union. | **y (design)** |
| **Late accept of a model-change proposal onto a *closed* session is rejected** — `accept.ts` checks `replaySession(session).closed` → 409 `session-closed`, Proposal re-lapsable. | Guard in the accept handler; the sub-millisecond window otherwise lets a crash-window `ACCEPTED` proposal apply an edge to a closed board (`finishClose` skips `ACCEPTED`). | Maintainer decision 2026-09-05. Extends AD-025's "a closed session rejects late interpretation" to the accept path. | **y (maintainer 2026-09-05)** |
| **Schema budget.** Current `FacilitationTurnSchema` = 5 optionals. The 3 new discriminated members carry **all-required** fields → count stays 5. | `propose-relation { relationKind, endpoints: string[1..3], rationale }`, `propose-pivotal { pivotalKind, eventLabel }`, `propose-reword { targetLabel, newLabel }`. `turn-schema.test.ts` asserts the count; T26 runs a live structured-output smoke check of the assembled schema (out of CI per AD-027). | AD-015 is a live provider limit; the spike proved the *optional-count* failure specifically. | **y (design)** |
| **The facilitator must be taught the new strands and given board topology.** `prompt.ts` strand menu + per-strand guidance grow; `buildTurnInput` surfaces `follows`/`causedBy`/placement/pivotal/placed-count from `readBoardSnapshot`. | Two dedicated tasks (T1a, T1b). Without them the model cannot reference an endpoint pair or know structure exists — the tracks would be schema-present but unreachable end-to-end. | spec-quality review B1 — the deferred F11 eval is exactly what would otherwise catch a green-but-dead track. A scripted-facilitator e2e (T25) drives the full prompt→seam→accept→board path in this slice. | **y (design)** |
| **AD-031's slice label** — no new superseding AD is needed. | AD-033 (2026-09-02) already redirects the relation/pivotal/reword tracks to Slice 5; ADR-010's slice-table *wording* is the Slice-6 doc pass. AD-035/036/037/038 record this slice's *new* decisions. | A fourth "which slice" AD would be redundant with AD-033's scope line. | **y (design)** |
| **`unsequence` is not a facilitator-proposed relation kind** (the facilitator proposes `sequence`/`insert-between`/`place`/`unplace`/`link-cause`/`unlink-cause` only). | The person removes an order directly (F06); `unplace` already cascades `incidentUnsequences` in the board decider. | Issue #42's AC list names exactly those six; removing an order the facilitator itself proposed would be an odd loop. | **y** |
| **Determinism of per-contributor counts** with no recorded speaker. | `Contribution Made` always carries `speaker` (F03) — every count has a key. | F03 guarantee; no fallback branch. | **y** |

**Open questions:** none — all resolved or logged above.

---

## Implicit-Requirement Dimensions Sweep

Large/Complex — every dimension resolves to a requirement or an explicit `N/A because …`.

| Dimension | Resolution |
| --- | --- |
| Input validation & bounds | `endpoints` `.max(3)`, `newLabel` `.max(200)`, `label` `.max(200)` (T1). `deserialise` caps block/edge counts and rejects a document over the cap (T17, AD-037). `ModelJson.parse` rejects a foreign document / `formatVersion ≠ 1` (T15). Endpoint labels resolved-or-dropped at the seam (T4). |
| Failure / partial-failure states | Accept→apply is two commits per AD-016; a lost outcome-record commit is recovered by re-accept, converging to `APPLIED` for already-satisfied effects (AD-038, T8a) or `APPLY_FAILED`+surfaced for a genuine failure (T9). Artifact render is a pure read — a throw from `readBoardSnapshot`/`readArtifactSource`/`readSessionTranscript` surfaces as a 500 with no partial file (T18/T20/T22 error assertions). |
| Idempotency / retry / duplicate handling | AD-038 (relation/pivotal/`resolve` already-satisfied → `ok([])`). `deriveTracks` idempotent via `derived_track` + `expectedPosition: -1` (T7, AD-021). Two relation tracks for the same pair in one contribution → two `Proposal`s; the second to apply is a no-op `APPLIED` under AD-038 (spec Edge Cases). Artifacts are stateless — re-request is byte-identical bar the timestamp field. |
| Auth boundaries & rate limits | `N/A because` single-user local tool, no auth surface (F14 / ADR-007). |
| Concurrency / ordering | The three artifact reads run synchronously within one Hono handler on a single-threaded runtime — no `await` between them, so the interval interpret worker cannot interleave (the cut is consistent; capability tasks carry a "reads stay synchronous, no `await` between them" note). Spine, branch-point list and `contributorCounts` are pinned to total orders (`(rank, id)`, `(speaker asc)` — T19/T21) and covered by a shuffled-snapshot determinism test. `applyOperation` owns board concurrency (AD-022). |
| Data lifecycle / expiry | `N/A because` artifacts materialise nothing between requests (JSON-05); no new marker/migration table — `sessionProposalIds` generalisation (T8) is code-only over existing streams. |
| Observability | The three new interpreted strands ride `deps.facilitator.interpret()` and are captured by the existing ADR-008 model-call JSONL wrapper unchanged — `N/A because` no new logging surface; T1a's prompt test asserts the strand menu, not the log. |
| External-dependency failure | Model unavailability is unchanged — the deferred-interpretation queue + retry ladder (AD-018) carries the contribution; the new strands add schema only, no new failure path. `N/A because` no new external dependency. |
| State-transition integrity | The `Proposal` disposition machine is unchanged (AD-035 adds a birth event, not a state); `decide` rejects `Edit Model Change` outside `REVIEWABLE` and a kind-mismatched edit (T5); the reword-hold-back gate is a pure predicate whose outcome is frozen into `Contribution Interpreted` (replay-stable). Closed-session accept guarded (T9). |

---

## Issue Reconciliation

Issue #42 ("Slice 5 — artifacts + eval + demo") is **split**:

- **Stays in #42** (retitle to "Slice 5 — artifacts + facilitator tracks"): all artifact-export
  ACs, the three facilitator-behaviour ACs, the `minor` changeset AC. Blocks #43.
- **Moves to a new issue** (e.g. "Slice 5b — facilitator eval + demo seed", child of #9,
  **blocked by** the new #42, **blocks** #43): the eval-suite ACs, the near-miss / kept-phrasing
  fixture ACs, "the README carries the per-assertion results", `pnpm seed`, and the DESIGN.md §8
  recording note. #43's blocked-by list gains the new issue.
- The relation / pivotal / reword behaviours built here are added to the ADR-008 README
  "deliberately untested" list until the eval slice lands (a one-line entry, not a doc pass).

The issue-body edits and the new issue are a maintainer action (or an Execute task if the
maintainer delegates); this spec records the intended shape.

---

## User Stories

### P1: Model as structured JSON ⭐ MVP

**User Story**: As an engineer, I want the model as structured JSON so that I can build
against it without retyping anything, and be sure the file I hold matches a known version of
the model.

**Why P1**: F10's engineering payoff and the ADR-010 "thesis-complete" cut-line artifact.

**Acceptance Criteria**:

1. WHEN a person requests the JSON export for a known workshop THEN the system SHALL return a
   JSON document that is a pure function of the Board snapshot and the workshop record, with
   no language-model call and no hand-editable path.
2. WHEN the same source state is exported twice THEN the system SHALL return byte-identical
   JSON (stable key order, stable array order, no wall-clock in the body except the explicit
   render-timestamp field).
3. WHEN the JSON export is deserialised THEN the system SHALL reproduce a `{ snapshot, source }`
   byte-identical to the one it was serialised from (round-trip), including building blocks,
   both relation kinds, hot-spot annotations with open/resolved state and recorded reference,
   pivotal marks, placement, per-block provenance, and the workshop-record fields.
4. WHEN the JSON export is produced THEN it SHALL embed the **composite version stamp**
   (`boardPosition`, `sessionRecordPosition`, `renderedAt`) and SHALL contain no quoted
   evidence (no contribution bodies, no stored rationale, no evidence spans).
5. WHEN the JSON export is requested THEN the system SHALL NOT produce the summary or the
   transcript as a side effect, and SHALL NOT materialise anything between requests.
6. WHEN the workshop id is unknown THEN the system SHALL return 404 and produce no file.
7. WHEN the JSON export is produced THEN it SHALL NOT declare compatibility with any external
   documentation toolchain.

**Independent Test**: `GET` the export for a seeded multi-block, multi-relation, hot-spotted,
closed workshop; assert the body against a golden fixture; feed the body to `deserialise` and
assert equality with the source snapshot; `fast-check` round-trip property over generated
snapshots.

---

### P1: Deterministic model summary ⭐ MVP

**User Story**: As a domain expert, I want a short summary of my model — its spine, its
shape, and its open problems — so that I can give someone the gist without walking them
through the whole board.

**Why P1**: F10's "give me the gist" artifact; fills the coverage slots Slice 2 left as
"not run".

**Acceptance Criteria**:

1. WHEN a person requests the summary for a known workshop THEN the system SHALL return a
   Markdown document rendered by template from the snapshot and workshop record alone — no
   language-model call, no quoted evidence.
2. WHEN the same source state is summarised twice THEN the system SHALL return byte-identical
   Markdown **except the explicit render-timestamp field**.
3. WHEN the summary is produced THEN it SHALL contain: the pivotal events in `follows` order
   (the spine); a count per building-block kind; counts of placed-vs-backlog events,
   disconnected tracks, and branch points; every branch point named; the chosen problem with
   its qualification (or "not run" / "skipped: <reason>"); the open model-affecting hot
   spots; and the model-derived coverage gaps (events with no cause, unplaced events).
4. WHEN the summary is produced THEN it SHALL name the format, the number of contributors,
   the scope with its qualification, and which format steps were not run — so a reader can
   tell a skipped step from a step that ran and found nothing.
5. WHEN the summary is produced THEN it SHALL contain nothing not derivable from the model
   (no causal prose, no cross-board interpretation) and SHALL embed the composite version
   stamp (`boardPosition`, `sessionRecordPosition`, `renderedAt`).
6. WHEN the summary is requested THEN the system SHALL NOT produce the JSON export or the
   transcript as a side effect.
7. WHEN a model has no hot spots / no pivotal marks / no relations THEN the summary SHALL
   render those sections as an explicit empty / "not run" signal, never omit them.
8. WHEN the summary is produced THEN it SHALL NOT declare compatibility with any external
   documentation toolchain (mirrors JSON-07 / TX-07 — #42 "no artifact claims compatibility").
9. WHEN the summary's spine, branch-point list, or any ordered section is rendered THEN the
   order SHALL be a total order (`(rank, id)` for the spine and branch points) — byte-stable
   across two renders of the same model regardless of operation-log insertion order.

**Independent Test**: golden-fixture assertion for a rich workshop and for an empty workshop;
determinism test (two renders byte-equal); assert no substring of any contribution body
appears in the output.

---

### P1: Verbatim session-transcript export ⭐ MVP

**User Story**: As a domain expert, I want the verbatim session transcript, annotated with
what each turn produced, so that I can feed the raw conversation into another tool; and I
want to see how many proposals each contributor accepted, edited, and rejected.

**Why P1**: F19 — the raw-conversation artifact; the per-contributor counts live here because
an edit and a rejection never reach the operation log.

**Acceptance Criteria**:

1. WHEN a person requests the transcript for a known session THEN the system SHALL return a
   document reproducing every turn of that session in order (contributions, questions,
   notices) verbatim, with nothing summarised and no language-model call.
2. WHEN a turn produced one or more proposals THEN each SHALL be annotated with its proposal,
   the proposal's final disposition (proposed / edited / accepted / rejected / applied /
   apply-failed / lapsed), and the resulting building block where one exists.
3. WHEN the same session record is exported twice THEN the system SHALL return a
   byte-identical document **except the explicit render-timestamp field**.
4. WHEN the transcript is produced THEN it SHALL report, per contributor (ordered `speaker`
   ascending), how many proposals they accepted, edited, and rejected — counts only, with no
   judgement stated about them. A `heldBack` reword / pivotal renders a notice turn and
   contributes to no count.
5. WHEN the transcript is produced THEN it SHALL state the workshop format and scope and
   embed the session-record position and the render timestamp.
6. WHEN the workshop id is unknown, or the workshop has no session with the given id, THEN
   the system SHALL return 404 (`workshop-not-found` / `session-not-found` respectively) and
   produce no file.
7. WHEN the transcript is requested THEN the system SHALL NOT produce another artifact as a
   side effect, and SHALL NOT claim external-toolchain compatibility.

**Independent Test**: seed a session with accepted / edited / rejected / apply-failed
proposals across two speakers; golden-fixture assertion; determinism test; assert counts
match the seeded lifecycle.

---

### P1: Facilitator proposes relation operations ⭐ MVP

**User Story**: As a domain expert, I want the facilitator to say what follows what and who
caused what — not only to name new building blocks — so that I do not have to draw every
edge by hand.

**Why P1**: F04 — the facilitator's job is the whole model, not just the stickies; ADR-010
listed it under slice 3.

**Acceptance Criteria**:

1. WHEN a contribution implies an ordering, a cause, a placement, or their removal THEN the
   facilitator SHALL be able to produce a `propose-relation` interpretation track for
   `sequence`, `insert-between`, `place`, `unplace`, `link-cause`, or `unlink-cause`.
2. WHEN a `propose-relation` track is produced THEN it SHALL flow through the F05 accept /
   edit / reject review path as a `Proposal`, and accepting it SHALL apply the corresponding
   `Operation` via the synchronous cross-context apply chain.
3. WHEN a `propose-relation` track names an endpoint by a label not present on the board (or
   ambiguous) THEN the anticorruption seam SHALL drop the track (no `Proposal` is born), the
   same way an unknown `annotatesTargetId` is handled today.
4. WHEN the assembled `FacilitationTurnSchema` is converted to JSON Schema THEN it SHALL have
   ≤ 24 optional parameters, no `z.unknown()`, and no empty sub-schema — verified by a
   `turn-schema` test asserting the optional count and by a live structured-output smoke
   check before Execute closes.
5. WHEN a person rejects a relation proposal THEN the model SHALL be unchanged and the
   `Proposal` SHALL be `REJECTED`.
6. WHEN an accepted relation proposal cannot be applied (endpoint withdrawn, cycle, kind not
   permitted, `insert-between` with no edge) THEN the `Proposal` SHALL be `APPLY_FAILED` and
   the person SHALL be told, as for a building-block apply-failure.
7. WHEN an accepted relation proposal's effect **already holds** (the edge / pivotal mark
   exists) THEN the apply SHALL be a no-op and the `Proposal` SHALL be `APPLIED`, not
   `APPLY_FAILED` (AD-038).
8. WHEN the facilitator's instructions are built THEN they SHALL name the `propose-relation`
   strand with when-to-use guidance, and the turn input SHALL surface the board's `follows` /
   `causedBy` edges, placement, and pivotal marks — so the model can reference an endpoint
   pair it can see.

**Independent Test**: fixture contribution → interpret (stubbed model output for the unit
path) → assert a `propose-relation` track → accept → assert the `follows` / `causedBy` /
placement edge on the board snapshot; reject path; apply-failure path; `turn-schema` optional
count test.

---

### P1: Facilitator proposes pivotal marks ⭐ MVP

**User Story**: As a domain expert, I want the facilitator to suggest which few events are
the milestones so that a long board becomes something I can navigate.

**Why P1**: F07's "suggested milestones" path.

**Acceptance Criteria**:

1. WHEN the board has ≥ 5 placed domain events and a contribution (or the facilitator's own
   review of the board) identifies a milestone THEN the facilitator SHALL be able to produce
   a `propose-pivotal` track for `mark-pivotal` or `unmark-pivotal`, targeting an event by
   label.
2. WHEN the board has < 5 placed domain events (`pivotalProposable` false) THEN a
   `propose-pivotal` track SHALL NOT produce a `Proposal`, and SHALL be recorded as a
   `heldBack` track with a `sessionView` notice (symmetry with a held reword).
3. WHEN a `propose-pivotal` track is produced THEN it SHALL flow through the F05 review path,
   and accepting it SHALL apply `mark-pivotal` / `unmark-pivotal` via the apply chain.
4. WHEN a person rejects or the operation fails to apply THEN the lifecycle SHALL behave
   exactly as for a relation proposal (REJECTED / APPLY_FAILED, person told on failure); an
   already-pivotal target accepts as `APPLIED` (AD-038).

**Independent Test**: fixture with 5+ placed events → assert `propose-pivotal` track → accept
→ assert `pivotal: true` on the snapshot; below-threshold fixture → assert no track; reject
path.

---

### P1: F04 reword-hold-back gate ⭐ MVP

**User Story**: As a domain expert, I want the facilitator to wait before offering a reword
until my model has enough shape for the reword to matter, so that I am not polishing wording
on a board with three loose stickies.

**Why P1**: F04 — "my own wording kept wherever it is usable" only becomes a reword *proposal*
once there is a model to reword against; ADR-010 listed it under slice 3.

**Acceptance Criteria**:

1. WHEN the facilitator would propose a reword of an existing building block AND the Board
   snapshot has no relation (`follows` or `causedBy`) and no pivotal mark THEN the proposal
   SHALL be **held** — the interpreted track is recorded, no F05 card is produced, and the
   person sees a held-back notice (as with `attribute-to-other-format`).
2. WHEN the Board snapshot has ≥ 1 relation or ≥ 1 pivotal mark THEN a reword proposal SHALL
   be **released** — it produces an F05 card on the normal accept / edit / reject path.
3. WHEN the reword targets a building block created in the *same* contribution THEN it SHALL
   NOT be held (the person is still authoring that block). Pinned v1 behaviour: because
   the target block has no `BuildingBlockId` at interpret time (ids are minted at accept),
   the released strand cannot resolve and is **dropped** — not held, not carried. The
   person's own block proposal already carries their wording. Pinned by `map.test.ts`
   ("drops — does not hold — a reword whose target was proposed earlier in the same turn").
4. WHEN the gate holds a proposal THEN nothing SHALL be applied to the model and no
   `Proposal` aggregate SHALL reach `ACCEPTED`.
5. The gate SHALL be a deterministic named `session-facilitation/domain/` predicate
   (`hasModelStructure`) over the snapshot, not a facilitator self-report; a test SHALL cover
   both the held and the released case with the same contribution and two board states.
6. WHEN a held reword's board later gains structure THEN only a *subsequent* contribution's
   reword is released — the held track is not retroactively surfaced or queued.

**Independent Test**: one fixture reword contribution run against a structureless board
(assert held, no card, notice present) and against a board with one `follows` edge (assert
card present); same-contribution carve-out test; `hasModelStructure` unit test.

---

## Edge Cases

- WHEN the JSON export runs on an empty board THEN it SHALL return a valid document with
  empty collections and `boardPosition: 0` (normalised from `readBoardSnapshot`'s `-1`), and
  SHALL still round-trip.
- WHEN `deserialise` is given a document over the block/edge count cap or with a foreign
  shape THEN it SHALL return `err({ kind: 'invalid-model-json' })` and expand nothing.
- WHEN an artifact render throws (a read fails mid-render) THEN the route SHALL return 500
  with no partial file — never a truncated artifact.
- WHEN the summary runs on a workshop where the stakeholder check and chosen problem never
  ran THEN it SHALL render both as "not run" (not blank, not an error).
- WHEN a transcript turn produced a proposal that later lapsed THEN the annotation SHALL say
  `lapsed` and name no resulting building block.
- WHEN a relation proposal's two endpoints resolve to the same building block THEN the track
  SHALL be dropped at the seam (no self-edge proposal).
- WHEN `insert-between` names endpoints with no existing `follows` edge between them THEN the
  accepted operation SHALL fail to apply and be recorded `APPLY_FAILED` (the domain rule
  owns the check).
- WHEN two relation tracks in one contribution target the same pair THEN each SHALL be a
  separate `Proposal` (no dedup at the seam); accepting the first applies the edge, accepting
  the second is a no-op `APPLIED` (AD-038) — not a user-facing failure.
- WHEN the facilitator model is briefly unavailable THEN the deferred-interpretation queue +
  retry ladder SHALL carry the contribution exactly as today — the new tracks add schema
  only, no new failure path (F04).
- WHEN a reword proposal is held and the person later adds a relation THEN a *subsequent*
  contribution's reword is released; the held track is not retroactively surfaced (it was
  recorded, not queued).

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| JSON-01 |  P1: Model as structured JSON |  Design | ✅ Verified |
| JSON-02 |  P1: Model as structured JSON |  Design | ✅ Verified |
| JSON-03 |  P1: Model as structured JSON |  Design | ✅ Verified |
| JSON-04 |  P1: Model as structured JSON |  Design | ✅ Verified |
| JSON-05 |  P1: Model as structured JSON |  Design | ✅ Verified |
| JSON-06 |  P1: Model as structured JSON |  Design | ✅ Verified |
| JSON-07 |  P1: Model as structured JSON |  Design | ✅ Verified |
| SUM-01 |  P1: Deterministic model summary |  Design | ✅ Verified |
| SUM-02 |  P1: Deterministic model summary |  Design | ✅ Verified |
| SUM-03 |  P1: Deterministic model summary |  Design | ✅ Verified |
| SUM-04 |  P1: Deterministic model summary |  Design | ✅ Verified |
| SUM-05 |  P1: Deterministic model summary |  Design | ✅ Verified |
| SUM-06 |  P1: Deterministic model summary |  Design | ✅ Verified |
| SUM-07 |  P1: Deterministic model summary |  Design | ✅ Verified |
| SUM-08 |  P1: Deterministic model summary (no external-toolchain claim) |  Design | ✅ Verified |
| SUM-09 |  P1: Deterministic model summary (total-order rendering) |  Design | ⚠️ Verified (weak test) |
| TX-01 |  P1: Verbatim session-transcript export |  Design | ✅ Verified |
| TX-02 |  P1: Verbatim session-transcript export |  Design | ✅ Verified |
| TX-03 |  P1: Verbatim session-transcript export |  Design | ✅ Verified |
| TX-04 |  P1: Verbatim session-transcript export |  Design | ✅ Verified |
| TX-05 |  P1: Verbatim session-transcript export |  Design | ✅ Verified |
| TX-06 |  P1: Verbatim session-transcript export |  Design | ✅ Verified |
| TX-07 |  P1: Verbatim session-transcript export |  Design | ✅ Verified |
| FREL-01 |  P1: Facilitator proposes relation operations |  Design | ✅ Verified |
| FREL-02 |  P1: Facilitator proposes relation operations |  Design | ✅ Verified |
| FREL-03 |  P1: Facilitator proposes relation operations |  Design | ✅ Verified |
| FREL-04 |  P1: Facilitator proposes relation operations |  Design | ⚠️ Partial (live smoke pending) |
| FREL-05 |  P1: Facilitator proposes relation operations |  Design | ✅ Verified |
| FREL-06 |  P1: Facilitator proposes relation operations |  Design | ✅ Verified |
| FREL-07 |  P1: Facilitator proposes relation operations (already-satisfied → APPLIED) |  Design | ✅ Verified |
| FREL-08 |  P1: Facilitator proposes relation operations (prompt strand + board topology) |  Design | ✅ Verified |
| FPIV-01 |  P1: Facilitator proposes pivotal marks |  Design | ✅ Verified |
| FPIV-02 |  P1: Facilitator proposes pivotal marks (below-threshold → heldBack) |  Design | ✅ Verified |
| FPIV-03 |  P1: Facilitator proposes pivotal marks |  Design | ✅ Verified |
| FPIV-04 |  P1: Facilitator proposes pivotal marks |  Design | ✅ Verified |
| FREW-01 |  P1: F04 reword-hold-back gate |  Design | ✅ Verified |
| FREW-02 |  P1: F04 reword-hold-back gate |  Design | ✅ Verified |
| FREW-03 |  P1: F04 reword-hold-back gate |  Design | ✅ Verified (pinned v1 behaviour — same-turn reword dropped, not held) |
| FREW-04 |  P1: F04 reword-hold-back gate |  Design | ✅ Verified |
| FREW-05 |  P1: F04 reword-hold-back gate (named domain predicate, held/released test) |  Design | ✅ Verified |
| FREW-06 |  P1: F04 reword-hold-back gate (held track not retroactively surfaced) |  Design | ✅ Verified |
| REL-01 |  `minor` changeset (target 0.6.0) present |  Execute | ✅ Verified |
| REL-02 |  Issue #42 split + follow-on issue filed; ADR-008 "deliberately untested" note added |  Execute | ⚠️ Verified (maintainer step) |
| REL-03 |  ARCHITECTURE.md §5 `/api` surface list gains the three artifact routes |  Execute | ✅ Verified |

**ID format:** `[CATEGORY]-[NUMBER]`

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 44 total (JSON 7 · SUM 9 · TX 7 · FREL 8 · FPIV 4 · FREW 6 · REL 3). Mapped to
tasks in `tasks.md` — see its Requirement-ID → task coverage table.

**Spec-precision notes for the Verifier:** JSON-01 ("no hand-editable path") and JSON-05 ("not
materialise anything between requests") are architectural negatives — the tests assert the
observable proxy (pure function; requesting one artifact returns/writes no other), not the
negative directly.

---

## Success Criteria

- [ ] `GET` each of the three artifacts for a rich seeded workshop returns a byte-identical
      document on repeat, stamped with position + timestamp, with zero language-model calls
      on the path.
- [ ] `deserialise(serialise(snapshot))` equals the source snapshot for every generated case
      in a `fast-check` property run.
- [ ] The facilitator, given fixture contributions, produces `propose-relation` and
      `propose-pivotal` tracks that accept into the expected board edges, and holds a reword
      on a structureless board while releasing it on a structured one.
- [ ] `FacilitationTurnSchema` → JSON Schema has ≤ 24 optionals and passes a live
      structured-output smoke check; `prompt.ts` names the three strands and the turn input
      carries board topology.
- [ ] A scripted-facilitator e2e drives one full contribution → `propose-relation` →
      accept → board edge path (the real model / recording not required).
- [ ] The re-accept of an already-applied relation proposal converges to `APPLIED` (AD-038).
- [ ] `pnpm check` + `pnpm build` + `pnpm test:e2e` green; `minor` changeset present; issue
      #42 re-scoped and the eval/seed follow-on issue filed; ARCHITECTURE.md §5 updated.
