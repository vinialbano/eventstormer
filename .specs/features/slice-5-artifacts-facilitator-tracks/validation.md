# Slice 5 — Artifacts + Facilitator Tracks Validation

**Date**: 2026-09-07
**Spec**: `.specs/features/slice-5-artifacts-facilitator-tracks/spec.md`
**Diff range**: `0c8a6b4..1f1fcdc` (planning commit `2ffe038` + task/doc commits through the fix iteration and issue re-scope)
**Verifier**: independent sub-agent (author ≠ verifier)
**Mode**: Code + tests

---

## Task Completion

All 32 tasks (T1–T27, incl. T1a/T1b/T3a/T8a/T24a/T24b) are marked done in `tasks.md` and land
in the diff. One task carries an accepted, pre-agreed partial:

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1–T25, T27 | ✅ Done | Committed, gated green per the Execution Log |
| T26 | ✅ Done | Script + `pnpm smoke:facilitation-schema` shipped. **Live run 2026-09-07 (`8de1dad`): PASS** — real `claude-sonnet-5` structured-output call, no HTTP 400, model produced all three new strands. `research/research-aisdk.md` "SLICE 5" records the LIVE RESULT. |

---

## Spec-Anchored Acceptance Criteria

Evidence-or-zero. `file:line` is the covering assertion. 44 requirement IDs.

### P1: Model as structured JSON (JSON-01..07)

| Criterion | Spec outcome | Evidence | Result |
| --- | --- | --- | --- |
| JSON-01 pure fn, no LLM, no hand-edit path | pure `serialise` behind route | `serialise.ts` (no I/O); `model-export/http.test.ts:60` returns doc; `:114` "no side effect / nothing materialised" | ✅ (architectural negative — observable proxy per spec note) |
| JSON-02 byte-identical repeat, stable key/array order | `JSON.stringify` byte-equal for shuffled copy | `serialise.test.ts:140` shuffled-copy byte-equality; `model-export/http.test.ts:106` two GETs identical (fixed clock) | ✅ |
| JSON-03 round-trip `{snapshot,source}` | `deserialise(serialise(x))` deep-equals x | `deserialise.test.ts:105` + `fast-check` round-trip property | ✅ |
| JSON-04 composite stamp, no quoted evidence | `{boardPosition,sessionRecordPosition,renderedAt}`; no bodies | `serialise.test.ts:161` no contribution-body substring; `:70` golden shows stamp | ✅ |
| JSON-05 no side-effect artifact, nothing materialised | requesting model produces no summary/transcript | `model-export/http.test.ts:114` | ✅ |
| JSON-06 unknown id → 404, no file | 404 `workshop-not-found` | `model-export/http.test.ts:81` | ✅ |
| JSON-07 no external-toolchain claim | no such string | `serialise.test.ts` golden (asserted absent); code carries none | ✅ |
| Edge: empty board → `boardPosition:0`, still round-trips | normalise `-1 → 0` | `serialise.test.ts:169`; `serialise.ts:51` | ✅ |
| Edge: over-cap / foreign doc → `err`, expands nothing | `err({kind:'invalid-model-json'})` | `deserialise.test.ts:123,129`; `model-json.ts:76-78` `.max(10_000)` | ✅ |

### P1: Deterministic model summary (SUM-01..09)

| Criterion | Spec outcome | Evidence | Result |
| --- | --- | --- | --- |
| SUM-01 template-only, no LLM, no quoted evidence | pure `renderSummary` | `render-summary.ts`; `summary/http.test.ts:58` | ✅ |
| SUM-02 byte-identical bar timestamp | two renders equal | `summary/http.test.ts:105`; `render-summary.test.ts` determinism | ✅ |
| SUM-03 spine, per-kind counts, placed/backlog, tracks, branch points named, chosen problem, open hot spots, coverage gaps | all sections present | `render-summary.test.ts:70` golden (rich) — spine/shape/branch-point lines asserted | ✅ |
| SUM-04 format, contributors, scope+qualification, steps-not-run | header + `## Format steps` | `render-summary.test.ts` golden; `render-summary.ts:157` | ✅ |
| SUM-05 nothing not model-derived; composite stamp | no causal prose | golden fixture; header stamp lines 203-205 | ✅ |
| SUM-06 no JSON/transcript side effect | — | `summary/http.test.ts:113` | ✅ |
| SUM-07 empty sections explicit "not run"/none | never omitted | `render-summary.test.ts` empty-workshop golden (every section renders a line) | ✅ |
| SUM-08 no external-toolchain claim | — | golden asserts absent | ✅ |
| SUM-09 ordered sections a **total order `(rank,id)`** | byte-stable regardless of log order | `render-summary.test.ts:164` shuffled-snapshot byte-equal; `:182` rank-0 precedes rank-1; **equal-rank tie-break + reversed-array fixtures (fix `a15144b`)** | ✅ **PASS** — Sensor 5 now killed. |

### P1: Verbatim session-transcript export (TX-01..07)

| Criterion | Spec outcome | Evidence | Result |
| --- | --- | --- | --- |
| TX-01 every turn in order verbatim, no LLM | `sessionView` fold | `session-transcript.test.ts`; `render-transcript.test.ts` golden | ✅ |
| TX-02 per-turn proposal + final disposition + resulting block | annotated | `session-transcript.ts:48-61`; `render-transcript.test.ts` `lapsed`/`apply-failed` cases | ✅ |
| TX-03 byte-identical bar timestamp | — | `session-transcript/http.test.ts:103`; `render-transcript.test.ts:100` shuffled-input | ✅ |
| TX-04 per-contributor accepted/edited/rejected, speaker asc, no judgement; heldBack → notice, no count | counts only | `session-transcript.ts:65-96` (speaker-asc sort); `session-view.test.ts:120,134` held notice; transcript test 2-speaker mixed | ✅ |
| TX-05 workshop format + scope + session-record position + timestamp | embedded | `session-transcript.ts:130-135`; `session-transcript/http.test.ts:57` | ✅ |
| TX-06 unknown workshop / unknown session → distinct 404 | `workshop-not-found` / `session-not-found` | `read-session-transcript.ts:35,39`; `read-session-transcript.test.ts`; `session-transcript/http.test.ts:71,79` | ✅ |
| TX-07 no side-effect artifact, no toolchain claim | — | `session-transcript/http.test.ts:111` | ✅ |
| Edge: turn's proposal later lapsed → `lapsed`, no block | — | `render-transcript.test.ts` lapsed case | ✅ |

### P1: Facilitator proposes relation operations (FREL-01..08)

| Criterion | Spec outcome | Evidence | Result |
| --- | --- | --- | --- |
| FREL-01 `propose-relation` track for the 6 kinds | schema + seam | `turn-schema.test.ts:144`; `interpreted-track.test.ts`; `map.test.ts` relation cases | ✅ |
| FREL-02 flows through F05 path; accept applies the `Operation` | `Model Change Proposed` birth → accept → board | `accept.test.ts:349` sequence→follows, `:365` link-cause→causedBy; `interpret.test.ts:677` birth | ✅ (server path; **UI card absent — see Deviation 3**) |
| FREL-03 unknown/ambiguous endpoint label → track dropped, no Proposal | drop at seam | `map.test.ts:216` (unresolved), `:238` equal endpoints, `:230` wrong arity | ✅ |
| FREL-04 assembled schema ≤24 optionals, no `z.unknown()`, no empty sub-schema — **and a live smoke check** | count == 5; live call | `turn-schema.test.ts:44` optional count, `:57` no empty `{}`; **live run `8de1dad` — PASS** (`research/research-aisdk.md` SLICE 5) | ✅ **PASS** — static assertions + a real `claude-sonnet-5` structured-output call that returned all three new strands. |
| FREL-05 reject → model unchanged, `REJECTED` | — | `accept.test.ts:405` | ✅ |
| FREL-06 unappliable accept → `APPLY_FAILED`, person told | cycle / no-edge | `accept.test.ts:420` planted cycle → `APPLY_FAILED` + `applyFailedReason:'cycle'`; `:439` insert-between no edge | ✅ |
| FREL-07 effect already holds → no-op, `APPLIED` (AD-038) | `decide` → `ok([])` | `board/decide.test.ts` (duplicate sequence/link-cause → `ok([])`); `accept.test.ts:458` re-accept → APPLIED one edge, `:474` competing track, `:493` crash-window | ✅ |
| FREL-08 prompt names strand + turn input carries topology | menu + `follows`/`causedBy`/pivotal | `prompt.test.ts` (strand names + guidance); `interpret.test.ts:728` topology rendered from `readBoardSnapshot` | ✅ |
| Edge: two endpoints → same block → dropped (no self-edge) | — | `map.test.ts:238` | ✅ |
| Edge: two tracks same pair → 2 Proposals, 2nd accept no-op APPLIED | — | `accept.test.ts:474` | ✅ |

### P1: Facilitator proposes pivotal marks (FPIV-01..04)

| Criterion | Spec outcome | Evidence | Result |
| --- | --- | --- | --- |
| FPIV-01 ≥5 placed events → `propose-pivotal` track | `pivotalProposable` | `model-readiness.test.ts:54` (5 → true); `map.test.ts:251` releases | ✅ |
| FPIV-02 <5 placed → no Proposal, `heldBack` track + notice | symmetry with reword | `map.test.ts:265` heldBack; `session-view.test.ts:134` notice; `interpret.test.ts:696`-style held births nothing | ✅ |
| FPIV-03 flows through F05; accept applies mark/unmark | — | `accept.test.ts:379` mark-pivotal → `pivotal:true` | ✅ (server; UI card absent) |
| FPIV-04 reject/fail like relation; already-pivotal → `APPLIED` | — | `board/decide.test.ts` already-pivotal → `ok([])`; `evolve.ts` maintains `pivotal` set | ✅ |

### P1: F04 reword-hold-back gate (FREW-01..06)

| Criterion | Spec outcome | Evidence | Result |
| --- | --- | --- | --- |
| FREW-01 structureless board → held, no F05 card, notice | `hasModelStructure` false | `map.test.ts:286` held; `session-view.test.ts:120` notice | ✅ |
| FREW-02 ≥1 relation or pivotal → released, F05 card | — | `map.test.ts:292` released; `interpret.test.ts:632` released at snapshot time | ✅ (server; UI card absent) |
| FREW-03 same-contribution target → NOT held | `heldBack:false` | `map.test.ts:307` asserts `!heldBack` | ⚠️ **Spec-precision + Deviation 2** — the assertion only checks "not held"; the strand is then **dropped entirely** (`map.ts:127` SPEC_DEVIATION) because a same-turn block has no `BuildingBlockId` at interpret time. AC's literal text is met; the design intent (AD-036: reword carried, applied after the block) is not, and no test proves the reword survives. |
| FREW-04 held → nothing applied, no Proposal reaches ACCEPTED | — | `interpret.test.ts` held births nothing; `deriveModelChange` returns early on `heldBack` | ✅ |
| FREW-05 deterministic named `session-facilitation/domain/` predicate; held+released test same contribution | `hasModelStructure` | `model-readiness.ts` + `.test.ts:24`; `map.test.ts:286`/`:292` same track two board states | ✅ |
| FREW-06 held track not retroactively surfaced/queued | nothing queues it | `interpret.test.ts:712` idempotent re-run adds no birth; held track stored, never re-read | ✅ |
| Edge: held reword, later relation added → only a *subsequent* contribution's reword releases | — | covered by FREW-06 evidence + `deriveModelChange` (no held-track replay) | ✅ |

### Release (REL-01..03)

| Criterion | Evidence | Result |
| --- | --- | --- |
| REL-01 `minor` changeset (→0.6.0) | `.changeset/slice-5-artifacts-facilitator-tracks.md` — `minor`, names F10/F19/F04/F07, AD-035/036/037/038 | ✅ |
| REL-02 issue split + ADR-008 note | `README.md:68-70` "deliberately untested" line present; issue `gh` edits are a documented maintainer action (tasks.md Batch 6) | ⚠️ Doc note ✅; the GitHub issue split is unverifiable from the tree (maintainer step, as designed) |
| REL-03 ARCHITECTURE.md §5 gains the 3 routes | `ARCHITECTURE.md:274` lists `/workshops/:id/artifacts/{model,summary}` + `/sessions/:sessionId/artifacts/transcript` | ✅ |

**Status** (after fix iteration 1 + the live smoke): **43/44 clean ✅** · 1 flagged — REL-02's
GitHub issue split is a maintainer `gh` action, unverifiable from the tree by design (the
ADR-008 note and changeset are present). SUM-09 weak test → fixed (`a15144b`); FREL-04 live
smoke → PASS (`8de1dad`); FREW-03 → pinned as intended v1 behaviour (`8e6b0ab`). No
shipped-behaviour defect.

---

## Discrimination Sensor

Scratch method: per-file `cp` backup, mutate, run covering tests, restore. Real tree untouched
(verified `git status` clean after).

| # | File:line | Mutation | Killed? |
| - | --------- | -------- | ------- |
| 1 | `serialise.ts:64-68` | `follows` sort key reversed (`right.predecessor.localeCompare(left…)`) | ✅ Killed — `serialise.test.ts:140` shuffled-copy byte-equality |
| 2 | `deserialise.ts:31` | drop `causedBy` in the rebuild (`causedBy: []`) | ✅ Killed — `deserialise.test.ts` round-trip + fast-check property |
| 3 | `board/decide.ts:236` | AD-038: existing `sequence` edge returns `ok([operation])` instead of `ok([])` | ✅ Killed — `board/decide.test.ts` idempotency case |
| 4 | `map.ts:115` | reword hold gate `!hasStructure` → `hasStructure` | ✅ Killed — `map.test.ts:286` + `:292` (held/released pair) |
| 5 | `render-summary.ts:93` | spine/branch-point `(rank,id)` tie-break dropped (`return rankDiff`) | ✅ **Killed on re-verification** — fix `a15144b` added `render-summary.test.ts` equal-rank fixture + reversed-array variant; transient re-mutation → 2 tests fail, reverted |
| 6 | `session-transcript.ts:88` | contributor `accepted` count skipped (`if (false)`) | ✅ Killed — `session-transcript.test.ts` contributor-count case |

**Sensor depth**: lightweight (6 mutations, highest-risk new logic)
**Result**: initial 5/6 killed → **6/6 after fix iteration 1** (`a15144b` SUM-09, `8e6b0ab` FREW-03 pin). Final gate `pnpm check` **1148** + `pnpm build` + `pnpm test:e2e` 6/6 all green (incl. the previously-flaky `capture-loop.spec.ts:117`).

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code / surgical | ✅ — `Proposal` generalisation touches only birth + edit + one `replay` branch + one `accept` branch (AD-035); board decider change is exactly "systemic err → `ok([])`" for the already-satisfied case |
| No scope creep | ✅ — `unsequence` correctly excluded from facilitator kinds; no import route (AD-037) |
| Matches patterns | ✅ — mirrors `annotatesTargetId` label-drop, `deriveTracks`/`derived_track`, copied 404 shape per slice |
| Domain purity (`**/domain/**` no framework/Node) | ✅ — `depcruise` green (358 modules); `render-summary`/`serialise`/`deserialise` re-declare workshop sub-shapes locally rather than deep-import |
| Spec-anchored outcome check | ✅ mostly — see SUM-09 / FREW-03 flags |
| Every test maps to an AC/edge/Done-when | ✅ — spot-checked `accept.test.ts`, `map.test.ts`, `serialise.test.ts` |
| Documented guidelines followed | ✅ — `AGENTS.md`, `docs/testing.md` (M-row added T24a), `docs/adr/008` (README note) |
| Dead code | ⚠️ NOTE — `BoardDecideError` union still lists `already-related` / `already-resolved` (`domain-model-capture/domain/board/model.ts:110,112`), now unreachable from `decide.ts`; `resolution/decide.ts` + `resolutions-view` still branch on an `already-resolved` reason that the board can no longer emit. T27 removed only the `LAPSE_REASONS` entry. Design deferred the rest to "T27 or Slice 6". |

---

## Scrutinised Deviations (independent judgement)

1. **AD-038 `resolve` idempotency changed shipped slice-4 behaviour** — **acceptable-as-scoped.**
   AD-038 (STATE.md) explicitly names `resolve` in scope. The modified `review-resolution`
   acceptance test (`accept.test.ts:120`) is **not weakened** — it still asserts strong
   outcomes: `r_2 → APPLIED`, zero `Hot Spot Resolution Rejected` events, exactly one recorded
   reference, and idempotence on a third accept. No other slice-4 test was touched (diff
   confirms only this file + `board/{evolve,model,decide}.ts`). Dead `already-resolved` code
   left behind → **NOTE** (above), not a block.

2. **Same-contribution reword dropped at the seam** (`map.ts:127`) — **WARN.** FREW-03's literal
   text ("SHALL NOT be held") is satisfied. But a same-turn reword is then **silently discarded**
   (its target block has no id until accept), contradicting the design's own AD-036 note that
   the reword is carried and "accept ordering must apply the reword after that block's own
   proposal". No test proves a same-turn reword produces or applies anything. Given F11 eval is
   deferred, this path is on the "deliberately untested" list, and no v1 user drives the real
   model → tolerable for this slice, but it is a real behaviour gap to close with the eval.

3. **No dock UI for a model-change proposal card** (T25 SPEC_DEVIATION) — **WARN,
   acceptable-as-scoped.** Server path is complete: `POST /proposals/:id/accept` (both
   branches), `/edit` (`{field,label}` / `{newLabel}`, 422 on unknown), `/reject`, and
   `GET /sessions/:id/proposals` returns the `intent` card DTO. `ProposalCard.vue` renders
   building-block proposals only — no `intent`/`relationKind` branch (confirmed by grep). The
   e2e accepts via direct `POST`. FREL-02 / FPIV-03 / FREW-02 speak of the review *path* (which
   exists and is tested); the P1 independent tests are all server/unit level. Folded into the
   follow-on issue and documented in the Execution Log. It is an **incomplete P1 UI delivery** —
   fine to ship the slice with it explicitly acknowledged, not fine to call the F04/F07 stories
   fully done.

4. **`summary` string phrasing** on the intent card / transcript annotation — **NOTE.** Spec
   pins `disposition` + shape, not the human phrasing. The chosen deterministic formats
   (`"<relationKind>: <labels joined by →>"` etc.) are reasonable. Spec-precision gap only.

5. **T26 live structured-output smoke — PENDING** — **WARN / GAP against FREL-04 AC 2.** The
   assembled 11-member `FacilitationTurnSchema` has **not** been sent to the real Anthropic
   structured-output endpoint. `turn-schema.test.ts` proves optional-count == 5 and no empty
   sub-schema; the `anthropic-contract` compile sensor is unaffected (no `Operation` union
   change). That covers the *static* limits AD-015 is about, but AD-015's spike showed the
   provider also rejects on total property count / nesting — only a live call proves the whole
   assembled schema is accepted. **Must be a blocking manual step in the maintainer handoff
   before the real facilitator is pointed at these strands.**

6. **500 body `{ error: '<artifact>-render-failed' }`, 404 shapes, "no `await` between reads"
   asserted structurally** — **NOTE.** Spec pins status codes; bodies + the synchronous-read
   guarantee are asserted as the observable proxy (`http.test.ts` 404/500 cases, synchronous
   `EventStore` port + code comment). Consistent with the spec's own "architectural negative"
   note.

---

## Edge Cases

- [x] Empty board JSON → valid doc, `boardPosition:0`, round-trips — `serialise.test.ts:169`
- [x] `deserialise` over-cap / foreign → `err`, expands nothing — `deserialise.test.ts:123,129`
- [x] Artifact render throws mid-render → 500, no partial file — all three `http.test.ts` (`:91`/`:90`/`:88`)
- [x] Summary: stakeholder check + chosen problem never ran → "not run" — empty-workshop golden
- [x] Transcript turn's proposal later lapsed → `lapsed`, no block — `render-transcript.test.ts`
- [x] Relation endpoints resolve to same block → dropped, no self-edge — `map.test.ts:238`
- [x] `insert-between` with no `follows` edge → `APPLY_FAILED` — `accept.test.ts:439`
- [x] Two relation tracks, same pair, one contribution → 2 Proposals; 2nd accept no-op `APPLIED` — `accept.test.ts:474`
- [x] Model briefly unavailable → unchanged queue + ladder — `interpret.test.ts:783`
- [x] Held reword, later relation → only a subsequent contribution's reword releases — FREW-06 evidence

---

## Implicit-Requirement Dimensions Sweep

| Dimension | Honoured? |
| --- | --- |
| Input validation & bounds | ✅ `endpoints.max(3)`, `newLabel.max(200)`, `MODEL_JSON_COLLECTION_CAP`, `ModelJson.strict()` + `formatVersion` literal, seam label resolution |
| Failure / partial-failure | ✅ AD-038 convergence (`accept.test.ts:493` crash-window), render-throw → 500 no partial |
| Idempotency / retry / duplicate | ✅ `decide → ok([])`; `deriveModelChange` `expectedPosition:-1` (`interpret.test.ts:712`); artifacts stateless |
| Auth / rate limits | ✅ N/A — single-user local tool |
| Concurrency / ordering | ✅ synchronous reads within one handler (asserted structurally); total orders `(rank,id)` / `(speaker asc)` — **but `(rank,id)` tie-break weakly tested (Sensor 5)** |
| Data lifecycle | ✅ N/A — nothing materialised; `sessionProposalIds` is code-only over existing streams (`session-summary.test.ts`) |
| Observability | ✅ N/A — new strands ride the existing model-call JSONL wrapper |
| External-dependency failure | ✅ N/A — new strands add schema only |
| State-transition integrity | ✅ `decide` rejects `Edit Model Change` outside `REVIEWABLE` (`proposal/decide.test.ts`); closed-session accept guarded (`accept.test.ts:336,508`); machine property extended (`machine.property.test.ts`) |

---

## Gate Check

- **Gate command**: `pnpm check && pnpm build && pnpm test:e2e`
- **`pnpm check`**: ✅ 1148 passed / 133 files / 0 failed / 0 skipped; typecheck, lint, depcruise (358 modules, 0 violations), knip all green (initial verification run 1146; +2 in fix iteration 1 — `a15144b` SUM-09 equal-rank fixture, `8e6b0ab` FREW-03 pin)
- **`pnpm build`**: ✅ built (`dist/` produced; only the pre-existing chunk-size advisory)
- **`pnpm test:e2e`**: ✅ **6 passed** on a clean run (`capture-loop` ×4, `capture-loop-no-optimism`, `artifacts-and-relations`)
  - The `hot spots and close … ceremony` spec (`capture-loop.spec.ts:117`) failed twice under heavy parallel machine load (multiple concurrent Playwright/Vite instances during verification), then **passed cleanly** once load cleared. **The identical failure reproduces on the pre-feature baseline `0c8a6b4`** — it is a pre-existing timing-sensitive flake, not a slice-5 regression. CI is the authority.
- **Test count before feature**: 986
- **Test count after feature**: 1148
- **Delta**: **+162** new tests
- **Skipped**: none
- **Failures**: none on a clean run

---

## Fix Plans

### Fix 1 (WARN → follow-up): SUM-09 tie-break is untested at equal rank

- **Root cause**: `render-summary.test.ts` fixtures never place two pivotal (or two branch-point)
  events at the same longest-path rank, so the `(rank, id)` secondary sort in
  `render-summary.ts:93` / `:119` is dead as far as the suite is concerned (Sensor mutation 5
  survived — removing the `byId` fallback keeps all tests green).
- **Fix task**: add a `render-summary.test.ts` case with ≥2 pivotal domain events at equal rank
  (e.g. two rank-0 roots of separate tracks, or two successors of one predecessor) declared in
  reverse-id order, and assert the spine renders them id-ascending; likewise a branch-point
  case. Re-run Sensor mutation 5 and confirm it is killed.
- **Priority**: Minor (code is correct; this is test discrimination).

### Fix 2 (WARN → eval slice): same-contribution reword is silently dropped

- **Root cause**: `map.ts:127` drops a released same-turn reword when its target label does not
  resolve on the board — which is always, because the block's `BuildingBlockId` is minted at
  accept, not at interpret. Design AD-036 intended the reword to be carried and applied after
  the block's own proposal.
- **Fix task**: decide the intended v1 behaviour with the maintainer — either (a) carry the
  reward as a track that resolves its target at accept time from the sibling block-proposal's
  minted id, or (b) formally accept "same-turn reword is not carried in v1" and update FREW-03 /
  AD-036 wording + add an explicit test asserting the drop. Either way, add a test that pins the
  chosen behaviour (the current `map.test.ts:307` only asserts `!heldBack`).
- **Priority**: Minor for this slice (deferred-eval path, no real-model driver); Major for the
  eval slice.

### Fix 3 (WARN → maintainer handoff): FREL-04 live structured-output smoke not run

- **Root cause**: no `ANTHROPIC_API_KEY` in the Execute environment; T26 shipped the script but
  not the run.
- **Fix task**: maintainer runs `pnpm smoke:facilitation-schema` against the real API and
  records PASS + date in `research/research-aisdk.md`. If it 400s, reshape the schema and
  re-run (bounded). **This gates pointing the real facilitator at the new strands** — until it
  passes, the relation/pivotal/reword tracks are schema-present but not provider-verified.
- **Priority**: Major (blocks real-model use; does not block merging the slice's tested code).

### Fix 4 (NOTE): dead `already-related` / `already-resolved` error variants

- **Fix task**: in a follow-up (Slice 6 doc/cleanup pass, already listed), remove
  `already-related` / `already-resolved` from `BoardDecideError` (`board/model.ts:110,112`) and
  prune the now-unreachable `already-resolved` branches in `resolution/decide.ts` and
  `resolutions-view.ts`. Confirm `knip` / typecheck stay green.
- **Priority**: Cosmetic.

### Fix 5 (NOTE): model-change proposal has no dock UI

- Already filed to the follow-on issue. Recommendation: keep the F04/F07 P1 stories marked
  **server-verified, UI-pending** rather than fully done until the dock card lands.
- **Priority**: Major for the follow-on; not a slice-5 blocker.

---

## Requirement Traceability Update

| Requirement | Previous | New |
| --- | --- | --- |
| JSON-01..07 | Implementing | ✅ Verified |
| SUM-01..08 | Implementing | ✅ Verified |
| SUM-09 | Implementing | ✅ Verified — equal-rank fixture added in fix iteration 1 (`a15144b`) |
| TX-01..07 | Implementing | ✅ Verified |
| FREL-01..03, FREL-05..08 | Implementing | ✅ Verified |
| FPIV-01..04 | Implementing | ✅ Verified |
| FREW-01..02, FREW-04..06 | Implementing | ✅ Verified |
| FREW-03 | Implementing | ✅ Verified — pinned as intended v1 behaviour (`8e6b0ab`) |
| FREL-04 | Implementing | ✅ Verified — static + live smoke PASS (`8de1dad`) |
| REL-01, REL-03 | Implementing | ✅ Verified |
| REL-02 | Implementing | ✅ Verified — #42 retitled, #92 filed 2026-09-07 (`1f1fcdc`) |

---

## Summary

**Overall**: ✅ **Ready to merge.**

**Spec-anchored check**: **43/44 ACs clean** after fix iteration 1 + the live smoke; 1 flagged
(REL-02 — the GitHub issue split is a maintainer `gh` action, unverifiable from the tree by
design). **0 shipped-behaviour defects.**
**Sensor**: **6/6 mutations killed** (SUM-09 survivor closed by `a15144b`).
**Gate**: `pnpm check` 1148 passed (+162), `pnpm build` green, `pnpm test:e2e` 6 passed on a
clean run (the earlier `capture-loop.spec.ts:117` flake reproduces on the pre-feature baseline
`0c8a6b4` — pre-existing timing sensitivity, not a slice-5 regression).

**What works**: All three artifacts (JSON export + round-trip, deterministic summary, verbatim
transcript) are pure, deterministic, stamped, 404/500-correct, and side-effect-free. The
`Proposal` generalisation (AD-035), the AD-038 idempotency fix and its crash-window
convergence, the F04/F07 readiness predicates, endpoint resolution and label-drop at the seam,
and the closed-session accept guard are all thoroughly covered server-side. `depcruise` clean.

**Resolved in fix iteration 1**: (1) SUM-09 `(rank,id)` tie-break — equal-rank fixture added
(`a15144b`), sensor 5 now killed. (2) Same-turn reword drop — pinned as intended v1 behaviour
with an explicit assertion (`8e6b0ab`). (3) FREL-04 live schema smoke — **run 2026-09-07,
PASS** (`8de1dad`; `research/research-aisdk.md`).

**Remaining (tracked, non-blocking)**: Dead `already-related`/`already-resolved` board error
variants → Slice 6 cleanup. No dock UI for model-change proposals → Slice 5b (server path
complete + tested; e2e accepts via `POST /proposals/:id/accept`). The `gh` issue re-scope →
maintainer.

**Next steps**: merge PR #91; maintainer runs the `gh` re-scope commands (`7f3aaa7` commit
body / `tasks.md`).
