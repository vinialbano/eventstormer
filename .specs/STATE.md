# Project State — EventStormer

Project memory for spec-driven-development. Decisions log (durable) + Handoff snapshot (in-flight).

The strategic record lives elsewhere and outranks this file: `docs/product/PRD.md` (product
truth), `docs/domain/` (confirmed domain language), `ARCHITECTURE.md` + `docs/adr/001–011`
(architecture). This file holds only decisions made *during implementation* that those don't
capture.

---

## Decisions

| ID | Decision | Rationale | Date | Scope |
| --- | --- | --- | --- | --- |
| AD-001 | Id generation uses `nanoid` (pin `nanoid@6.0.1`). Branded ids (`WorkshopId`, `SessionId`, `BuildingBlockId`; `OperationId` **dropped from v:1 — superseded by AD-011**) wrap nanoid values; the resumable workshop URL is a nanoid slug. | ADR-004 fixed `.brand()` but not the generator. nanoid is URL-safe, short, one small dep, and the pin was pre-verified in the research phase (DECISIONS-PENDING §2). Rejected `node:crypto.randomUUID()` — longer, less friendly as a URL slug. | 2026-08-29 | Slice 0 + all later slices |
| AD-002 | The in-process event bus and the JSONL model-call logger are deferred from Slice 0 to Slice 1. | ADR-010 lists both in Slice 0's `plumbing/`, but the first consumer (the facilitator) is Slice 1. Building them in Slice 0 leaves unused exports that `knip` flags and violates the "no speculative abstraction" quality bar. Deliberate deviation from ADR-010's slice table. | 2026-08-29 | Slice 0 / Slice 1 |
| AD-003 | Slice 0's Zod SSOT defines and freezes the **full** operation discriminated union — every variant in the `domain-model-capture` canvas Commands table — with `v: z.literal(1)`. The `Board` decider handles only `capture-domain-event` / `identify-actor` / `identify-system` / `reword` / `withdraw` / `reinstate`; every other variant is rejected with an explicit "not implemented in this slice" rejection (exhaustive switch). | ADR-004: schema "written first, in Slice 0, with the canvas open"; `switch-exhaustiveness-check` over the frozen union forces every later slice to handle its new operations. Canvas shapes are `[storm]`-confirmed, so freezing now is low-risk. | 2026-08-29 | Slice 0 |
| AD-004 | Slice 0 keeps `package.json` at `0.1.0` and consumes **no** changeset. The "`src/**` diff ⇒ `.changeset/*.md` required" CI check is added in Slice 0 but first enforced from Slice 1; Slice 0's own PR is the documented bootstrap exception. | Matches ADR-009's "`0.1.0` when Slice 0 lands"; avoids a spurious `0.2.0` on the first `changeset version` run. | 2026-08-29 | Slice 0 / release process |
| AD-005 | The `Board` keeps **two distinct folds**: a slim **write model** (`BuildingBlockId → {kind, withdrawn}` in Slice 0; `follows`/`causedBy` adjacency + hot-spot state added by their slices) that `decide` guards on, and a **read-model snapshot** (labels, placement, pivotal, provenance) that `replay(log) === snapshot` and all consumers use. `decide` never reads the snapshot. | domain-modeling: slim the write model to what invariants read; keeps Slice 3's cycle-adjacency state off a fat projection; the canvas write-model table already draws this line. | 2026-08-29 | all Board slices |
| AD-006 | `EventStore.append(workshopId, expectedPosition, operations[])` is **batch-atomic** — an ordered array of ≥1 operations in one `BEGIN IMMEDIATE` transaction. A stale `expectedPosition` returns a *transient* error. | `insert between` is one atomic op; withdrawal cascades are N ops in one transaction; it is the co-commit seam a Slice 4 outbox row will need. Retrofitting batch semantics is expensive. | 2026-08-29 | all persistence slices |
| AD-007 | The `EventStore` **port** is justified as a **test seam** (first-class in-memory impl, shared contract-test suite) + **API-shaping** over `node:sqlite`. The `better-sqlite3` swap is a side benefit the seam contains, **not** the rationale. No second adapter is built until one is actually needed. | software-design earn-it test: a single-impl interface for speculative "swap someday" is unearned; a seam for testing + a genuinely awkward vendor API is earned. | 2026-08-29 | Slice 0 |
| AD-008 | `Rejection` carries a **classification**: *systemic* (schema-invalid, cycle, unknown/withdrawn target, empty label — surfaced to the human, never auto-retried) vs *transient* (stale expected position — the handler reloads, re-decides, re-appends). | software-design: classify errors by retry-behaviour, not severity; Slice 1's handler must know which to auto-retry. | 2026-08-29 | all slices |
| AD-009 | Functional core / imperative shell: **all** validation, cycle-checking, kind-permission, and cascade derivation live in pure `decide`/`evolve`/`project` under `domain-model-capture/domain/`. The `node:sqlite` adapter is a dumb append/read shell; capability handlers are thin orchestration (load → replay → decide → append). No business logic in `infrastructure/` or `capabilities/`. | software-design (cheapest seam is no seam); ADR-003's decide/evolve intent; unambiguous test boundary. | 2026-08-29 | all slices |
| AD-010 | The `z.toJSONSchema()`-derived Anthropic operation schema (`anthropic-contract.ts`) is a **compile-time compatibility sensor** run under `pnpm check`, plus what the R3 spike verifies live — **not** the facilitator's runtime schema. Per ADR-005 the facilitator passes the Zod `Output.object({ interpretation, nextMove })` union directly, and `@ai-sdk/anthropic@4.0.41` sanitises `oneOf → anyOf` itself on the `outputFormat` path. A one-line ADR-004 clarification is queued for Slice 6. | Reconciles ADR-004 ("derive it, never hand-write") with ADR-005 ("facilitator passes the Zod union"); the sensor catches a schema edit that would break Anthropic compatibility before any API call. | 2026-08-29 | Slice 0; ADR-004 clarification → Slice 6 |
| AD-011 | `OperationId` is **omitted** from the frozen `v:1` operation union. The log `(context, aggregate, stream_id, position)` tuple is a sufficient operation identity for now. A branded `OperationId` is added — as an additive field — in the slice that proves it needs one (candidate: Slice 2's apply round-trip correlation for `Operation Applied`). | ADR-004 lists only `WorkshopId` / `SessionId` / `BuildingBlockId`; adding an unused frozen field violates the "don't freeze a sloppy shape" caution. Additive later, cheap. | 2026-08-29 | Slice 0 |
| AD-012 | An operation's `at` timestamp is stamped by the **application layer** from an injected `Clock` (`plumbing/clock.ts`) and written by the store; it is **not** a field `decide` reads, nor one the facilitator supplies. `author` (`{ proposer?, accepter }`) by contrast is **on the `Operation`** and parsed as part of the frozen schema. | F01 lists both on every logged operation, but no Board invariant reads time (`software-design`: pass `now`, don't reach a clock into the domain); `author` is part of the log contract (F01: "both proposer and accepter"). | 2026-08-29 | all slices |
| AD-013 | The `EventStore` port is **synchronous** — `append(...): Result<{nextPosition}, AppendConflict>`, `read(...): StoredOperation[]`. No `Promise`. | Every implementation is synchronous (`node:sqlite` `DatabaseSync`, the `better-sqlite3` escape hatch, the in-memory impl); ADR-001 chose sync on purpose ("async everywhere means your reducer/replay call sites become async" — why `@libsql/client` was rejected); a speculative `Promise` is unearned async that `@typescript-eslint/require-await` flags, and Slice 2+ handlers call it fine from inside async Hono routes. | 2026-08-29 | all persistence slices |
| AD-014 | The hot spot's informational/model-affecting split is stored as a **boolean `modelAffecting: z.boolean().default(true)`** on the `hotSpot` building-block schema — **not** an enum, and **not** named `kind` (that word is the Building-Block / operation discriminant). Derived artifacts map `false → "informational"`, `true → "model-affecting"` at render time. | The confirmed domain vocabulary (ADR-004 #32, F08, the `session-facilitation` glossary) calls this the hot spot's "kind" — which collides with the union discriminant. The split is genuinely binary (F08: "one of two kinds"; sessions: "about whether resolution is *required*, not whether it is *possible*"), so a boolean models it exactly; a 3rd kind, if ever needed, is a v:2 additive change. `docs/domain/` still says "kind" — reconcile in the Slice 6 doc pass. | 2026-08-29 | Slice 0 (frozen v:1); Slice 4 behaviour; domain-doc reconciliation → Slice 6 |
| AD-015 | R3 structured-output spike (S0-27/28) — **RAN LIVE 2026-08-29** (`claude-sonnet-5`, real API; full write-up `research/research-aisdk.md` "LIVE RESULTS"). **Core question answered: `oneOf → anyOf` is NOT the blocker** — no `oneOf` error at any point; the provider SDK's sanitiser handles it on the pinned `outputFormat` path. **Two new blockers surfaced for Slice 1, neither affects Slice 0's frozen schema:** (1) `resolve.reference: z.unknown()` → `{}` empty schema → Anthropic HTTP 400 "Empty schema … not supported"; (2) past that, HTTP 400 "too many optional parameters (41), limit 24" — the 20 `v: z.literal(1).default(1)` optionals blow Anthropic's structured-output grammar limit. **Slice 1 consequence:** the facilitator must pass a **hand-shaped projection** of the storage schema — only the kinds it proposes, `v` dropped (app stamps it), `reference` typed `z.string()`, `author` app-supplied — **not** `z.array(Operation)`. This strengthens AD-010 (AI contract ≠ storage view; it's a smaller purpose-built schema). Spike script needed 3 fixes (it had never been run): `.env` via `process.loadEnvFile()`; `~/` alias via `JITI_TSCONFIG_PATHS=1`; AI SDK 7 `system` role → `instructions`. | ADR-010 scopes it as a ~1h de-risking spike for Slice 1, explicitly non-blocking for Slice 0. | 2026-08-29 | Slice 0 (findings recorded); **Slice 1 — the facilitator schema is a projection, designed against these two limits** |
| AD-016 | The `review-proposal` accept handler (Slice 2) integrates `session-facilitation` → `domain-model-capture` as a **direct synchronous cross-context call**, not choreography and not a Process Manager. Hard constraints: (1) each context commits its own stream via its own `EventStore.append` — **never** both contexts' appends in one SQLite transaction, even on the shared file; (2) sequence is apply-into-Capture (commit) → branch on `Operation Applied`/`Operation Rejected` → record outcome on the `Proposal` (commit); (3) the crash window between the two commits (operation applied, `Proposal` still `PENDING`) is accepted for v1 — single-user, local — and its reconciliation on retry is designed with the apply round-trip in Slice 2 (candidate: the `OperationId` correlation deferred by AD-011). The fire-and-forget bus stays for tolerable-loss effects only (`Raise Hot Spot`). | `code-architecture` names a sync cross-context command a smell and forbids a cross-boundary transaction (the boundary must survive a future split); v1 accepts the command, contained behind one handler, because a Process Manager + async bus is unearned for a single process. The per-context-transaction rule is the non-negotiable part — it is what makes F14 a transport swap, not a decider change. Sharpens ADR-002's "synchronous choreography" wording, which conflated the bus with the call chain. | 2026-08-30 | Slice 2 (accept handler); ADR-002 / ADR-007 updated |
| AD-017 | **Slice 1 clarifies AD-016's "(Slice 2)" label.** The synchronous accept→apply chain (happy path + `APPLY_FAILED`) is built in **Slice 1** — issue #38 F05 and ADR-010's slice-1 row both scope it there. Only the `OperationId`-correlated crash-window *reconciliation* stays Slice 2. AD-016's constraints (1)–(3) are unchanged and apply from Slice 1. | ADR-010 is the authoritative sequencing doc; AD-016 was written after the slice plan and its parenthetical mis-set the slice. | 2026-08-30 | Slice 1 (accept handler); Slice 2 (reconciliation) |
| AD-018 | **Contribution interpretation is always asynchronous.** `POST /sessions/:id/contributions` returns `202` + the contribution id and never carries facilitator output. A single background worker in `host/` (interval-driven, wrapped per-tick in try/catch) interprets un-interpreted contributions — one in flight per session, FIFO. The client **short-polls** `GET /workshops/:id/session` + `GET /sessions/:id/proposals` (~1s) while any contribution is `interpreting`, idle otherwise. **Supersedes ADR-005's "its message rides back on the … contributions response"** and **ADR-007's "No polling, no SSE … the stream is not built in v1"** (for the interpretation path only — the accept→apply chain stays synchronous per ADR-007/AD-016). The F14 SSE upgrade stays purely additive: mutation responses still return the op-log position. | User decision 2026-08-30. One uniform path (provider-down is the same path with retries), no held connection during the model call, crash-safe (the queue is a projection over persisted `Contribution Made`). Short-poll = a refetch of the existing cold-loadable stores — zero new infra vs SSE's lifecycle/reconnect/heartbeat/route/test cost for a single-user local tool. | 2026-08-30 | Slice 1; ADR-005 + ADR-007 updated in Slice 6 doc pass |
| AD-019 | ~~**The in-process event bus is deferred from Slice 1 to Slice 4.**~~ **Superseded by AD-032 (2026-09-02) — the bus is not built at all.** Supersedes AD-002's "the in-process event bus … deferred from Slice 0 to Slice 1". With AD-018's always-async worker, the `Contribution Made → Interpret Contribution` choreography is driven by the worker scanning un-interpreted persisted contributions (a projection), not a bus. ~~The first genuine fire-and-forget consumer (`Raise Hot Spot` from the close-time sweep) is Slice 4 — the bus is built there, with its first real subscriber.~~ | Quality bar: no speculative abstraction; `knip` flags unused exports. **AD-032:** the one real consumer (`Raise Hot Spot`) is a single synchronous in-process publisher/subscriber pair = a disguised orchestrator; it is choreography over persisted facts reconciled by the scheduler tick instead (the `deriveTracks` / `derived_track` pattern, AD-021). | 2026-08-30 / superseded 2026-09-02 | Slice 1 / ~~Slice 4~~ |
| AD-020 | **`Hold` is modelled as `Proposal Parked` / `Proposal Unparked` events** on the event-sourced `Proposal` aggregate — a reversible marker on a `PROPOSED`/`EDITED` proposal, **not** a new disposition state and **not** a boolean flag. A parked proposal stays non-terminal and reviewable, leaves the active review cluster, and is grouped `Parked by you` in the pending drawer. The cap-of-7 overflow (held `PROPOSED`-pending) populates `Awaiting review`; `Hold` is the user explicitly parking one. `Close Session` lapses parked proposals exactly as it lapses `PROPOSED`/`EDITED` (quiet). | `impeccable` capture-loop brief §3/§5 added `Hold` as a 4th action after the canvas was drawn; events keep it consistent with the event-sourced `Proposal` model (domain-modeling: the log is the record). | 2026-08-30 | Slice 1; `session-facilitation` canvas reconciliation → Slice 6 |
| AD-021 | **Multi-append operations within one context reconcile; they do not span a transaction.** `EventStore.append` is single-stream (one `StreamKey`), so a workflow that writes several streams in one logical step (Slice 1: `Contribution Interpreted` + N `Proposal` births + question events) picks **one append as the commit point** and makes every other append a **deterministic, idempotent derivation** of it — ids assigned in the commit-point event, downstream appends done with `expectedPosition: -1` (no-op if present), and a **reconciliation pass** (the worker every tick; a handler on re-run) that repairs a partial write with no re-computation and no data loss, **skipping tracks already marked done in a `derived_track` table**. No multi-stream transaction, no `EventStore` port change. **Known gap (PR #46 round-2 NOTE, accepted):** `reconcilePendingDerivations` sweeps open sessions only — a crash mid-`deriveTracks` (one track marked, next not) on a session that is then closed leaves the unmarked track underived (a missing proposal card, no corruption). The crash window is sub-millisecond; widening the sweep to closed sessions is not worth the risk to the crash-safety net at this scale. | Plan review T1: separate appends with a crash between them lost `Proposal`s and the interpret-once ledger suppressed the retry. Round 2 (domain MAJOR/MINOR 5, distsys m2): the sweep is a periodic reconciliation, not event-driven (bus deferred) — bound it to open sessions + un-marked tracks so it stays O(pending). Widening the port for cross-stream transactions would strain ADR-003's "no ES library". | 2026-08-30 | Slice 1; pattern for all later multi-stream steps |
| AD-022 | **A Boundary Command handler that is the sole writer of its target stream owns that stream's concurrency internally — it takes no `expectedPosition` from the caller.** `domain-model-capture`'s `applyOperation(workshopId, operation)` reads the current board position, `decide`s, and appends with a bounded internal retry on `stale-position`; only a genuine `decide` rejection (`duplicate-id`, `unknown-target`, cycle) is returned to the caller as a merits failure. A caller-supplied `expectedPosition` would surface a *transient* two-accepts-in-one-second conflict as a permanent `Proposal` `APPLY_FAILED` needing a manual re-accept (plan-review round 2, distsys M4). | The board stream has exactly one writer (the apply handler); optimistic-concurrency tokens are for *shared* writers. AD-008 classifies `stale-position` transient — the handler that can retry must, not the human. Generalises to every future single-writer Boundary Command. | 2026-08-30 | Slice 1 (`applyOperation`); all single-writer Boundary Commands |
| AD-023 | **Derived state is never frozen into a domain event.** An event carries the raw facts of what happened; any summary, count, or rollup a reader wants is a **read-time projection** over the (immutable) stream. Slice 1: `Session Closed` carries only `{ unresolvedQuestionIds, closedAt }`; the per-session facilitation summary (`blocksAdded`, question counts, recent turns) is `sessionSummary(...)` computed on demand from the terminal `Session` stream + that session's `Operation Applied` events. "Frozen-ness" is already guaranteed — a `CLOSED` stream cannot change. Storing the computed struct is the "payload carries derived state" anti-pattern: change the formula and the past is retroactively wrong (plan-review round 2, domain MAJOR 2/3). | domain-modeling antipatterns-and-review ("state obsession"). Also removes a needless coupling of the summary read model to `domain-model-capture`'s snapshot shape — and operations carry no `sessionId`, so `blocksAdded` *must* come from the `session-facilitation` side anyway. | 2026-08-30 | Slice 1; all event design |
| AD-025 | **A closed `Session` rejects `Interpret Contribution` / `Fail Interpretation` — the decider returns `ok([])`.** The interpretation worker marks a contribution in flight, then `await`s the model for seconds; if the human closes the session in that window, the model call still returns and would commit `Contribution Interpreted` + derive a live `Building Block Proposed` onto the now-closed session. `finishClose` has already lapsed the proposals that existed at close time, and `reconcilePendingDerivations` only sweeps open sessions, so that proposal is un-lapsable and still acceptable onto the board. Guarding in the decider (where the interpret-once ledger already lives) is the fix: a late turn writes nothing. | PR #46 review W1. Consistent with AD-021 (idempotency/guards live in `decide`, not the caller) and the `Close Session` disposition's "lapse every non-terminal `Proposal`" guarantee. | 2026-08-31 | Slice 1 |
| AD-024 | **Slice 1 `session-facilitation` capabilities are per-action, not one `capture-loop` slice:** `start-workshop`, `set-scope`, `start-session`, `make-contribution`, `review-proposal` (accept/edit/reject/hold/unhold — one use case), `close-session`, and `interpret-contribution` (tick-invoked). Each owns its Hono router (or, for `interpret-contribution`, its tick functions), all mounted/exposed through `session-facilitation/api.ts`. They share only `session-facilitation/domain/` (the 3 aggregates, the event SSOT, the read models incl. `sessionProposalIds`, the `InterpretedTrack` schema) and `session-facilitation/infrastructure/` (`session-index`, the `Facilitator` port). | ADR-010's slice-1 row already names them separately (`start-workshop`, `make-contribution`, `review-proposal`); Slice 2 adds `edit-model` as a new slice. A single mega-slice makes `no-cross-slice-imports` guard nothing and leaves the cross-context accept path un-isolated (plan-review round 2, arch M1). | 2026-08-30 | Slice 1 |
| AD-026 | **Identifiers are spelled out in full, project abbreviations included — `wm` is `writeModel`.** The `id-length` (`min: 2`) + `unicorn/name-replacements` rules from PR #49 under-enforce this: a 2-character project shorthand that isn't an English abbreviation the plugin knows (`wm`, `op`, `bid`) passes both. So the convention is carried by review and this precedent, not only by lint. `@typescript-eslint/no-shadow` + `no-self-compare` are also `error` (PR #49 review) — a shadowed inner binding once turned an identity check into an `x === x` tautology that dropped a domain event. | 2026-08-31 | PR #49 + all later code |
| AD-027 | **CI merge gate is `pnpm check` + `pnpm build` + `pnpm test:e2e`.** `pnpm check` and pre-push stay without Playwright and without `pnpm eval`. Pre-push runs `pnpm check` (lint included). Eval is `pnpm eval`, out of CI, against the real model (ADR-008). `package.json` `"test"` must name `--project domain --project app` so a third Vitest `eval` project cannot sneak onto the merge gate. | CI used to claim identity with `pnpm check` while omitting lint on pre-push and omitting the one capture-loop E2E everywhere. Iron Law 4: the real SPA+Hono+sqlite path gates merge; local Stop stays fast. | 2026-08-31 | test-suite-hardening; all later CI / eval work |
| AD-028 | Slice 2 does **not** extend the Board write model with `follows` / `causedBy` / annotation adjacency; `decide(withdraw)` emits a single `withdraw`. F01 cascades land in Slice 3 (#40: `unlink-cause` per referencing event) and Slice 4 (#41: `withdraw` on annotating hot spots) as batch-atomic follow-ons from the same `decide` (AD-006). Slice 2 ticket ACs naming those cascades are vacuously true. | User decision 2026-08-31 at Slice 2 Specify. AD-005 already deferred adjacency to those slices; implementing it in the money shot would smuggle #40/#41 into F06/F10. Comments on the issues. | 2026-08-31 | Slice 2 (vacuous); Slice 3; Slice 4 |
| AD-029 | A query whose answer is a **derived artifact** (the live readable account, the rendered-reference list) lives in `derived-artifact-generation`, even when the URL is `/workshops/:id/board/blocks/:blockId/references`. `domain-model-capture` never imports that Supporting context. `host/` mounts DAG's router at the ARCHITECTURE.md path. | Conformist arrow is Capture → DAG. Putting the reference list in `edit-model` would invert Core → Supporting. Slice 3/4 extend `listReferences`, they do not move the route. | 2026-08-31 | Slice 2; Slice 3–5 artifact reads |
| AD-031 | Slice 3 does **not** extend `FacilitationTurnSchema`. Remaining Board ops and the timeline are **direct F06/F07**. Facilitator relation / `mark-pivotal` proposal tracks and the reword-hold-back gate land in ~~Slice 4 (#41)~~ **Slice 5 (#42) — see AD-033**; eval of those behaviours in Slice 5 (#42); ADR-010 / ARCHITECTURE.md slice-table wording in Slice 6 (#43). | Ticket #40 ACs never mention the facilitator; the Anthropic projection is against the 24-optional ceiling (AD-015); "model has structure" is what Slice 3 creates. User delegated 2026-08-31; comments on #40–#43. **AD-033 (2026-09-02) corrects the `(#41)` slice label — those items are #42, not slice 4.** | 2026-08-31 | Slice 3 (out); Slice 5–6 |
| AD-032 | **`Raise Hot Spot` is choreography over persisted facts, not an event bus and not a synchronous cross-context command.** `session-facilitation` writes its triggering facts (`Session Closed` with `unresolvedQuestionIds`, `Knowledge Gap Revealed`, `Absent Stakeholder Named`, `Stakeholder Check Recorded.absentNames`) on its own streams. A **hot-spot reconciliation pass** (`infrastructure/hot-spot-sweep.ts`, called from `reconcilePendingDerivations` + `finishClose`) reads them and calls `applyOperation(raise-hot-spot)` into `domain-model-capture`, idempotently — a `hot_spot_sweep(sweep_key PRIMARY KEY, building_block_id, at)` marker table (migration `id:2`, `_sf_migrations`) gates each raise; `duplicate-id` from the board counts as success. The resolve chain stays **synchronous** (query-back shaped — the person waits on `resolved` vs `already-resolved`; AD-016/AD-017). | Supersedes AD-019. code-architecture: choreography over domain events is the default; a synchronous 1-publisher/1-subscriber in-process bus is a disguised orchestrator `knip` would flag as an unused abstraction. Identical shape to AD-018 (always-async worker) + AD-021 (reconciled, not transactional). Crash-safe: the fact is persisted before the raise; the tick repairs a partial run. | 2026-09-02 | Slice 4; all future cross-context fire-and-forget effects |
| AD-033 | **Slice 4 (#41) is strictly F08/F09/F18.** The facilitator relation / `insert-between` / `place` / `unplace` / `link-cause` / `unlink-cause` / `mark-pivotal` proposal tracks and the F04 reword-hold-back gate build in **Slice 5 (#42)**, before their eval assertions. Slice 4 extends `FacilitationTurnSchema` only with the hot-spot, resolution, and question-track (`reveal-knowledge-gap` / `name-absent-stakeholder` / `confirm-complete-perspective`) strands — net +2 optional parameters against the AD-015 ≤ 24 ceiling. | Corrects AD-031's `(#41)` parenthetical (the rest of AD-031 stands). User 2026-09-02. #41's title and ACs are hot spots + close; AD-031's label was written after the slice plan. Same correction shape as AD-017 → AD-016. Issues #41/#42/#43 bodies + comments updated. | 2026-09-02 | Slice 4 (out); Slice 5 |
| AD-034 | **The session close is a two-phase ceremony with no new `Session` state.** "Close" opens a closing phase: the facilitator asks `Question Asked { kind: 'stakeholder' }` while the session is still `OPEN`; the person answers with a normal contribution, interpreted as `complete-perspective` or `absent-stakeholder` (acceptance test 44); `record-stakeholder-check` + `choose-problem` write `Workshop` events; `Close Session` fires last, running the atomic question/absent-stakeholder/apply-failed sweep. The open stakeholder question + the absence of `Session Closed` **are** the phase. `Question Asked.kind` gains `'stakeholder'`. | domain-modeling: add state only where an invariant reads it — a `CLOSING` state would force every `Session` projection to handle a phase already fully described by existing events. F18's "stops accepting contributions" begins at `Session Closed`, unchanged. The scope question already works this way (asked while OPEN, answered by a contribution). | 2026-09-02 | Slice 4 |

---

## Handoff

- **Feature**: `slice-4-hot-spots-close` (`.specs/features/slice-4-hot-spots-close/`) — GitHub **#41** · parent effort map #9 · version target **0.5.0**
- **Phase / Task**: Execute — Batches 1–4 done (T1–T35). Next: Batch 5 (Phase 8, T36–T41 + T40b).
- **Branch**: `slice-4-hot-spots-close` (not pushed). Head `8d58eae`. `pnpm check` + `pnpm build` green, **875 tests** (baseline 718).
- **Completed**: `spec.md`/`context.md`/`design.md`/`tasks.md`. AD-032/033/034. Issues #41/#42/#43 updated. **T1–T9** (board hot-spot ops + cascades: `9e477ee`..`9b2645f`). **T10–T19** (board HTTP + `flag-hot-spot` + `Resolution` aggregate + `review-resolution` + propose-resolution track: `59d0f2e`..`6130b96`).
- **In-progress**: none (Batch 3 not yet dispatched).
- **Deviations logged** (all sound): flag-hot-spot carries `author` in the body (ADR-003); a hot spot may be the first block on a board (dropped the empty-board 404); `Hot Spot Resolution Rejected.reason` is `z.string().min(1)` passing the raw board rejection kind; **propose-resolution track built in Phase 4 (T16)**; **T20: `modelAffecting` is `z.boolean().optional()` not `.default(true)`** — `.default` widens the output type and forces the field at ~10 sites; consumers read `?? true` (SPEC_DEVIATION markers in `interpreted-track.ts` + `events.ts`); `mapTurn` gained a `resolveBlockId` param; `Propose Building Block` command carries `modelAffecting?`/`annotatesTargetId?`. `FacilitationTurnSchema` optional count now **4** (≤ 24).
- **Next step**: dispatch Batch 5 (Phase 8 F09 workshop state, T36–T41 + **T40b**: `Complete Perspective Confirmed → Stakeholder Check Recorded` append in `interpret.ts`, owns acceptance test 44 + the workshop-qualification half). Then B6 (T42–T46 app rendering), B7 (T47–T51 close ceremony + changeset), then the Verifier.
- **B4 notes**: knowledge-gap field is `detail?` (not design.md's `absentDetail?`); `FacilitationTurnSchema` optional count now **5**; T33 `closeTargets` counts a proposal apply-failed if `APPLY_FAILED` OR already lapsed-from-apple-failed (finishClose lapses before the sweep); `SessionCloseDeps`/`InterpretContributionDeps`/`CloseSessionDeps` `db` widened with `& HotSpotSweepDb`.
- **Execution notes**: SSH signing has a confirm-prompt timeout — succeeds on retry (2–3×), not a hard lock. Workers own their own commits; orchestrator stays hands-off the tree. Gate every file-adding task on `pnpm check` (not `pnpm test` — it skips `vue-tsc`/`knip`).
- **Blockers**: none
- **Branch**: none yet (still on `main`)
- **Key design points**: `Raise Hot Spot` = choreography reconciled by the scheduler tick (`hot-spot-sweep.ts` + `hot_spot_sweep` marker table, migration `id:2`); resolve chain stays synchronous (AD-016/17); `Resolution` is a new aggregate mirroring `Proposal` minus `APPLY_FAILED`; board write model gains `annotates` + `hotSpotResolved`, snapshot gains per-hot-spot `annotates`/`resolved`/`reference` + `hotSpotCount`; `Question Asked.kind` gains `'stakeholder'`; `InterpretedBlockKind` gains `'hot-spot'`. Research flag: verify `z.unknown()` on a required `reference` key actually fails `.parse` when absent (likely not — needs a `.refine`/decider re-check).

---

**Prior feature:** `capture-loop-topology-migration` — GitHub #76 · PR #87 merged (`6cbb8bf`), #88 hardened the test harness. ADR-012 + ARCHITECTURE §4 landed.

---

**Prior feature:** `reword-block-interaction` (`.specs/features/reword-block-interaction/`) — GitHub #66
**Branch:** `slice-1-capture-loop` off `main` (created; Slice 0 merged as of `d55351c`). Not pushed.
**Phase:** slice-1 EXECUTE complete + Verifier PASS. **Follow-up: `slice-1-review-fixes`** —
the PR #46 automated-review fix batch (spec + validation in
`.specs/features/slice-1-review-fixes/`). All 3 BLOCK + 3 WARN + 4 cheap NOTEs closed, plus two
dock issues found in manual testing (empty feed after scope accept; first prompt must persist
chat-style) and `.env.local` / e2e key-isolation. 13 commits `8b444b7..HEAD` on
`slice-1-capture-loop`. `pnpm check` (369 tests) + e2e green. AD-025 added. Deferred (per the
review): NOTE 1, NOTE 6, QW1 (→ PR #47), QW2. (Slice 1 landed as #46; PR #49 was rebased onto
`main` and is no longer stacked.)

slice-1 batch plan (historical): **B1** P1 (5) · **B2** P2+P3
(6) · **B3** P4+P5 (7) · **B4** P6+P7 (7) · **B5** P8 (5) · **B6** P9 (2).
- **B1 (T1–T5) ✅** — commit `264f1b3`. 159 tests.
- **B2 (T6–T11) ✅** — through `0898d86` (+ `c57eb0f` docs). 227 tests.
- **B3 (T12–T18) ✅** — through `8ae7152`. 267 tests. `pnpm check && pnpm build` green.
- **B4 (T19–T25) ✅** — through `308f5f8` (`8ff119c` T19 · `3631974` T20 · `cda7a53` T21 ·
  `77e7f58` T22 · `4fe3493` T23 · `00b5293` T24 · `ac9ea2c` T25). 312 tests. `pnpm check && pnpm
  build` green. Deviations: (a) T19 added additive `askQuestionText?` to `Contribution
  Interpreted` / `Interpret Contribution` so the derived free `Question Asked` is a pure
  derivation; (b) T22 SPEC_DEVIATION — a *genuine* `APPLY_FAILED` through the accept seam is not
  reachable for Slice-1 building-block kinds (all id-minting, no `target`; the only board
  rejection is `duplicate-id` = the idempotency signal per round-2 distsys B1); the
  `Record Operation Rejected` branch is retained for target-bearing ops; (c) T23 close tail
  (`finishClose`) lives in `infrastructure/session-close.ts`, shared by `close-session` and
  `reconcilePendingDerivations`; (d) T25 `MakeContributionDeps.inFlight` is now a
  `() => ReadonlySet<ContributionId>` accessor. New: `interpret-contribution` capability
  (`interpret.ts` tick fns + `in-flight.ts` guard), `review-proposal` capability
  (`http.ts` + `accept.ts`), `close-session` capability, `domain/read-models/proposals-view.ts`,
  `infrastructure/session-close.ts`, `host/{config,scheduler}.ts`, `session-facilitation/api.ts`
  fully populated, `plumbing/ids.ts` `newProposalId`/`newQuestionId`.
- **B5 (T26–T30) ✅** — through `9ebd269` (`0f65b05` T26 · `13e3a3f` T27 · `607665c` T28 ·
  `87e83d3` T29 · `9ebd269` T30). 355 tests. `pnpm check && pnpm build` green. The Vue SPA
  (`src/app/capture-loop/`): 3 cold-load Pinia stores + `useInterpretationPoll` (AD-018), a
  framework-free `layoutBoard` + `BoardWall` renderer (backlog only, `placed`/`arrows` reserved
  for slice 3), the `FacilitatorDock` (conversation + inline `ProposalCard`s + in-dock
  `PendingDrawer` + scope card, `reka-ui` Collapsible), `CreateWorkshop` + `CaptureScreen` +
  `vue-router@5`. `DESIGN.md` founded here. Deviations: (a) `sessionView` gained additive
  `contributionId` + `questionKind` on transcript turns (the UI welds cards to their turn and
  folds the scope question into a card); (b) `GET /workshops/:id/session` returns 200
  `{sessionId:null,sessionOpen:false,creatorName}` for a known workshop with no session (404 =
  unknown workshop only) so the browser console stays clean; (c) new depcruise rule
  `no-cross-store-imports`; (d) `@playwright/test` + `test:e2e` deferred to T31 (its
  `playwright.config.ts` lands atomically there). `@vue/test-utils` added (dev).
- **B6 (T31–T32) ✅** — `be0d87b` T31 (the one `@playwright/test` e2e — create → scope → 3
  contributions → accept → 3 blocks in the backlog, scripted facilitator; `host/config.ts` now
  `mkdirSync`s `DATA_DIR`) · T32 (this: `minor` changeset, `package.json` → `0.2.0`,
  open-questions #63 S1-51a resolution, `ARCHITECTURE.md` §4 routes + scheduler, the S1-51b
  Slice-6 reconciliation list above). 356 tests + e2e green. Then the mandatory Verifier
  sub-agent → `validation.md`.
`context7` allowed broadly; `impeccable` mandatory T27–T30; E2E via `FACILITATOR_MODE=scripted`.
Earlier: DESIGN complete (2 review rounds), AD-017…AD-024.
**Branch:** create `slice-1-capture-loop` off `main` before T1. `spec.md` (~70 requirement IDs),
`context.md`, `design.md` written and revised twice. Round 1: stress-test + 4 architecture lenses →
T1–T5. Round 2: 4 subagent reviews (distributed-systems, domain-modeling, code-architecture,
spec-quality) → 2 blockers + ~18 majors, all folded in. Recorded: AD-022 (`applyOperation` owns
board concurrency, no `expectedPosition`), AD-023 (no derived state frozen into events —
`Session Closed` carries raw facts, `sessionSummary` is a read-time projection), AD-024 (7
per-action capabilities, not one `capture-loop` slice).
**Scope size:** **Large/Complex** — ~70 requirement IDs; `session-facilitation` (new context: 3
aggregates, 7 per-action capabilities, `domain/schema` + `read-models`, `infrastructure`),
`domain-model-capture` `board-access`, `host/` scheduler + config, `plumbing/` model-call log +
`WorkshopId` promotion, `src/app/capture-loop/`. Expect ~3 task-budgeted batches → sub-agent
delegation offer at Execute.
**Decisions this slice:** AD-017…AD-024. All design-phase items resolved (see `context.md` header
+ `design.md` Tech Decisions).

**Prior slice (Slice 0) — reference:**
Slice 0 `slice-0-skeleton-irreversibles` (#37) — **PASS**, merged. 22 tasks, 99 tests. See
`.specs/features/slice-0-skeleton-irreversibles/validation.md`.

**Slice 1 execution — Batch 1 (Phase 1, T1–T5) COMPLETE** (`0120e22`…`HEAD`): 159 tests, `pnpm
check && pnpm build` green. Deviations:
- T1: design's `author: { proposer: 'facilitator', accepter: creatorName }` shorthand does not
  match the frozen Slice-0 `Author` schema (parties are `{ name }` refs). Schema left unchanged
  (append-only replayability); the accept path (T22) wraps names. `SessionId` dropped from
  `domain-model-capture` (session-facilitation's own brand).
- T2: the framework-free depcruise rule + the `CONTEXTS` const already covered `session-facilitation`
  — no glob extension needed; only a `no-orphans` `pathNot` for `src/*/api.ts` was added.
  `session-facilitation/api.ts` is a placeholder until T24.
- T3: no `schema/index.ts` barrel yet (knip flags an unimported barrel) — consumers import the
  specific files; id generators deferred to minting tasks. `at` is an `z.iso.datetime()` field on
  every event.
- T5: `applyMigrations` gained two additive default params (`migrations`, `trackingTable`) so
  `session-facilitation` tracks its own id sequence in `_sf_migrations` — backward compatible.

**Slice 1 execution — Batch 2 (Phases 2–3, T6–T11) COMPLETE:** 227 tests. Notes:
- `sessionView(...)` takes caller-supplied `scopeIsSet` / `inFlight` / `derivedTracks` (the Session
  stream can't know those); `facilitationContext` / `priorSessionHistory` are pure assembly fns
  over pre-fetched per-session data — the capability/tick code does the I/O and passes it in.
- Session decider gained an `Attribute Contribution` command (for `Contribution Attributed…`).
- `facilitationAgenda` phase-name heuristic pinned: ≤ 3 words, no `-ed`/`-ing` word.
- T10 `applyOperation(deps, workshopId, operation)` — no `expectedPosition`, returns
  `{ resultingBuildingBlockId, nextPosition }` | merits `Rejection`; internal stale-position retry.
- T11 `GET /workshops/:id/board` mounted via `createRoutes(deps)`; **404s on an empty board
  stream** (no workshop registry in this context — client fetches board only post-accept).

**Slice 1 execution — Batch 3 (Phases 4–5, T12–T18) COMPLETE:** 267 tests. Notes:
- T12 `FacilitationTurnSchema` = Anthropic-shaped projection (AD-015): no `z.unknown()`, ≤ 24
  optionals (schema-walk test), `interpretation.max(12)`, `label.max(200)`, constraints mirrored
  into `.describe()`. `mapTurn` mints per-track ids from an injected mint fn.
- T13 `Facilitator` port (`interpret`, `askOpening`) + Anthropic adapter: ladder
  `claude-sonnet-5 → sonnet → claude-haiku-4-5`, one schema-retry total across the ladder then
  terminal `schema-invalid`; `provider-down` = 5xx/timeout. `generate` + `sleep` injected seams —
  no real HTTP in tests. Promoted `ai` + `@ai-sdk/anthropic` to `dependencies`, added
  `@ai-sdk/otel@1.0.77` (registered lazily inside the real generate path so knip stays clean).
- `OpeningQuestionSchema` lives with the adapter (T13), not T12.
- T15 added `infrastructure/streams.ts` (stream-key + version-stamp helpers); nanoid slug is 21 chars.
- T16 `set-scope` revision window is a handler precondition: `readBuildingBlocks().length > 0` →
  409 `scope-locked`. `no-cross-slice-imports` re-verified (first real catch — ≥ 2 caps now).
- T18 added `infrastructure/derived-track.ts` (`readDerivedTrackKeys`); whitespace contribution
  → 204 no-op, closed → 409, over-length → 400, otherwise 202.
- Capability `deps` carry a `SessionIndexDb` / `inFlight` guard placeholder — **T24 wires the real
  SQLite file + host guard; T25 the scheduler.**

**Lessons recorded (candidates, `.specs/LESSONS.md`):**
- L-001 (`domain/fold-tests`) — assert a fold that sets a field against a value distinct from the
  prior state; a reword-to-the-same-label test + replay-vs-`project`-incremental comparison both
  let a non-writing fold pass green.
- L-002 (`plumbing/event-store`) — a spec AC listing record fields ("each row SHALL include the
  author") is satisfiable by a column OR a field in the serialized payload; pin which at Design.

**Slice 6 follow-ups (from `validation.md` non-blocking notes + earlier ADs):**
- ADR-004 one-line clarification: the derived Anthropic contract is a compile-time sensor (AD-010).
- `docs/domain/` "kind" → `modelAffecting` vocabulary reconciliation (AD-014).
- `not-to-dev-dep` `-test.ts` carve-out is slightly broad (a prod file named `x-test.ts` would be
  exempt) — tighten.
- README stale layout; `.node-version` file; the hard `**/domain/** ≥ 90%` coverage glob.
- Corrupt-DB-file edge case has no test; S0-11 concurrent-append AC is exercised only as the
  sequential stale-position path.
- ~~The R3 spike still needs a live run~~ **DONE 2026-08-29** (AD-015). Findings:
  `oneOf → anyOf` is handled by the SDK; two Anthropic limits force Slice 1's facilitator to use
  a hand-shaped projection schema (no `z.unknown()`, ≤ 24 optionals so `v` is dropped), not the
  full `Operation` union. Full write-up in `research/research-aisdk.md` "LIVE RESULTS".

**Slice-6 domain-doc / ADR reconciliation list (S1-51b — record only, do NOT make the edits now):**
- **ADR-005** — "its message rides back on the `start-session` / `contributions` response" is
  superseded by AD-018 (always-async worker + SPA short-poll). Reword.
- **ADR-007** — "No polling, no SSE … the stream is not built in v1" is superseded by AD-018 for
  the interpretation path (the accept→apply chain stays synchronous). Reword; keep the F14 SSE
  upgrade purely additive.
- **`session-facilitation` canvas** (`docs/domain/bounded-contexts/session-facilitation/canvas.md`):
  (a) scope "set exactly once" / immutable → revisable-until-first-applied-block, `Set Scope`
  repeatable (AD-021 pattern + open-questions #63, done this slice as S1-51a);
  (b) `Hold` / `Proposal Parked` / `Proposal Unparked` — a 4th proposal action added after the
  canvas was drawn (AD-020);
  (c) `Session Closed` carries only `{ unresolvedQuestionIds, closedAt }`; the per-session summary
  is a read-time projection, not a stored struct (AD-023);
  (d) the multi-stream interpret step is reconciled, not transactional — one commit-point append,
  the rest idempotent derivations skipped via `derived_track` (AD-021).
- **Big-Picture canvas** — scope as `Workshop` state "set once" diverges from the shipped
  dock-turn / revisable model (open-questions #63).
- **`docs/domain/` hot-spot "kind"** → `modelAffecting` boolean (AD-014, already listed above).
- **open-questions #66** — carry into the Slice-6 pass.

**Batch 3 deviations:**
- T17 `plumbing-is-a-leaf` `.test.ts` carve-out — **rejected & fixed** (`6981768`): the round-trip
  test moved to `src/domain-model-capture/persistence-roundtrip.test.ts` (it asserts a
  domain-model-capture property); the architecture rule reverted to `from: { path: '^src/plumbing/' }`,
  re-verified by a planted violation.
- T18 SPEC_DEVIATION: `@changesets/cli` pinned `2.31.1` (3.x needs `pnpm >=10`; repo pins
  `pnpm@8.15.4` + `engine-strict`). 2.x takes the identical config. Revisit when the pnpm pin moves.
- T21 SPEC_DEVIATION: `tsconfig.json` `include` += `scripts/**/*.ts` (ESLint `projectService`
  needs it) + a `spike:structured-output` script (jiti for the `~/` alias). `scripts/` is outside
  `src/` so depcruise never scans it.
**Batch 2 deviations (all reasoned; several are improvements — no SPEC_DEVIATION markers):**
- T14 kind-permission: an **exhaustive deterministic loop** over all 14 not-implemented op kinds
  instead of a `fast-check` property — strictly stronger than sampling over a finite domain, and
  `fast-check` isn't installed until T15. ADR-008's named property #3 (replay consistency) IS in
  T15's `replay.test.ts`.
- T9 sqlite adapter persists the **caller-supplied `opVersion`** (parity with the in-memory impl
  and the `StoredOperationInput` port contract), not a hard-stamped `OP_SCHEMA_VERSION`. Every
  Slice 0 caller passes `OP_SCHEMA_VERSION`; **Slice 2+ handlers must continue to** — note for the
  app layer.
- T13 `emptyWriteModel` / `emptySnapshot` are **factory functions**, not shared `const`s, so pure
  folds can't share mutable `Map` state.
- `raise-hot-spot` operation variant carries `modelAffecting: z.boolean().default(true)`, mirroring
  the `hotSpot` building block (AD-014).
- T12 `switch`-exhaustiveness over `Operation['kind']` verified by a transiently planted missing
  case (lint failed "Cases not matched: reopen", reverted).

**Batch 1 deviations (all reasoned, documented in commits/tasks.md):**
- `host-imports-only-context-api` depcruise rule added in T3 (not T2) so T2's gate stayed green
  while `host/health.ts` still imported domain directly; T3 does the rule + its planted violation.
- `knip.json` `entry` += `src/*/api.ts` — context public-surface re-exports aren't "unused" pre-Slice-1.
- T7 SPEC_DEVIATION: `.dependency-cruiser.cjs` `not-to-dev-dep` `pathNot` widened to also exempt
  `*-test.ts` (shared test-support like `contract-test.ts`, which imports vitest, never ships) —
  verified the rule still catches real production→devDep imports. Revisit at Verifier / cleanup.
- T8 `applyMigrations` takes a structural `MigrationDb` so `migrations.ts` imports no `node:sqlite`
  (adapter is T9 — still the only intended importer).
- README stale layout → Slice 6 (per ARCHITECTURE.md).

**Mid-execute corrections (artifacts updated):**
- **AD-013** — `EventStore` port is **synchronous** (no `Promise`); every impl is sync,
  ADR-001 chose sync, `require-await` flagged the speculative async. Worker already applied it to
  `port.ts`/`memory-store.ts`/`contract-test.ts`.
- **T9a inserted** (head of Batch 2) — T5's `plumbing/ids.ts` shipped a hand-rolled
  `interface Brand<B> { __brand: B }`, incompatible with Zod's `z.string().brand()` (→
  `string & z.$brand<'X'>`). T9a rewrites it to `z.$brand` and promotes `zod` to a direct
  dependency (was transitive-via-knip; needed by T10–T16). "Promote zod" bullet removed from T12.

**ADR-compliance pass — adjustments folded into the spec:**
- `EventStore` stream key is namespaced `(context, aggregate, id)` — ADR-003 verbatim (was Board-specific).
- Decider tests are `Given/When/Then(events|rejection)` *through the operation*; replay tests are a
  separate class — ADR-008 (was snapshot-only assertions).
- `fast-check` (new devDep) + ADR-008's named property #3 `replay(log ++ [op]) === evolve(replay(log), op)`
  is required in Slice 0, not "if cheap".
- `vite.config.ts` `coverage.thresholds.autoUpdate` flips to `true` in Slice 0 (config's own TODO;
  ADR-008 ratchet). Hard `**/domain/** ≥ 90%` glob stays Slice 6 (ADR-010).
- Spike uses ADR-005's exact setup: `claude-sonnet-5`, `Output.object({ interpretation, nextMove })`
  wrapper (not bare `Output.array`), `structuredOutputMode: 'outputFormat'`, no `temperature`.
- Deferred (were ambiguous): `.node-version` → Slice 6 (ADR-010); `pnpm dev` `ANTHROPIC_API_KEY`
  fail-fast → Slice 1 (first consumer).

**Design decisions settled (see `design.md` Tech Decisions):** Approach A; derived contract =
compile-time sensor (AD-010); `OperationId` omitted (AD-011); `at` from Clock in the app layer,
`author` on the Operation (AD-012); 3-column stream key; brand symbols in `plumbing/ids.ts`;
`changeset-guard` no-ops until `CHANGELOG.md` exists.

**Watch-outs carried into Design:**
- `node:sqlite` has no `db.transaction(fn)` — `BEGIN IMMEDIATE` / `COMMIT` / `ROLLBACK`; rows are
  null-prototype objects (DECISIONS-PENDING §2, §12h-bis).
- Hono routes must stay chained for `testClient` type inference.
- dependency-cruiser rules must each be proven by a planted violation (repo convention).
- The current scaffold's `src/domain/`, `src/capabilities/health/`, `src/server.ts` all move;
  `.dependency-cruiser.cjs`, `vite.config.ts` (vitest globs), `knip.json`, `src/domain/AGENTS.md`
  path scope all change with them.
- `DECISIONS-PENDING.md` is gitignored local scratch, superseded by ADRs 001–011 + ARCHITECTURE.md —
  do not treat it as authoritative; do not commit it.
