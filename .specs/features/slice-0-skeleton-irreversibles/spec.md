# Slice 0 — Skeleton + Irreversibles Specification

> Source: GitHub issue [#37](https://github.com/vinialbano/eventstormer/issues/37) ·
> [ADR-002](../../../docs/adr/002-context-first-layout-and-synchronous-choreography.md) ·
> [ADR-003](../../../docs/adr/003-hand-rolled-event-sourcing-and-result-types.md) ·
> [ADR-004](../../../docs/adr/004-operation-log-schema-and-versioning.md) ·
> [ADR-009](../../../docs/adr/009-versioning-and-release.md) ·
> [ADR-010](../../../docs/adr/010-tracer-bullet-build-order.md) ·
> `docs/domain/bounded-contexts/domain-model-capture/canvas.md`

## Problem Statement

EventStormer has a scaffold organised by technical layer (`src/domain/`, `src/capabilities/`,
`src/app/`) and no model code at all. Before any feature is built, the decisions that are
expensive to reverse — the context-first folder structure, the append-only operation-log schema
and its versioning, the persistence port, and the release process — must be in place and
exercised. This slice migrates the layout to bounded-context-first, stands up the `Board`
aggregate as an event-sourced projection over a persisted single-writer log, and wires
Changesets so every later slice ships one deliberate version bump.

## Goals

- [ ] `src/` is organised bounded-context-first per ADR-002; the framework-free rule and the
      cross-context rule are dependency-cruiser globs, each verified by a planted violation.
- [ ] One framework-free Zod-4 module is the single source of truth for building-block and
      operation schemas, with `v: z.literal(1)` on every operation variant and an `op_version`
      column on every log row, from this first commit.
- [ ] A minimal `Board` decider (`capture` / `reword` / `withdraw` / `reinstate`) folds an
      append-only log into a graph projection; `replay(log)` from empty reproduces the current
      snapshot exactly.
- [ ] The log is persisted through an `EventStore` port with a `node:sqlite` adapter; a workshop
      is rebuilt by replay on load; the DB auto-migrates on startup with additive-only DDL.
- [ ] `pnpm check` (typecheck → lint → test → depcruise → knip) is green, and CI fails a
      `src/**` diff that carries no changeset.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
| --- | --- |
| `sequence` / `unsequence` / `insert between` / `place` / `unplace` / `link cause` / `annotate` / `mark pivotal` / `resolve` / `reopen` **behaviour** | Slices 3–4. Their schema variants ARE defined and frozen here (see S0-05); the decider does not handle them yet. |
| Withdrawal **cascades** (`unlink cause` / hot-spot `withdraw` follow-ons) | No `causedBy` or annotation edges exist until slices 3–4; there is nothing to cascade. The cascade tests (acceptance-tests 20, 21) belong to those slices. |
| Hot-spot capture, `modelAffecting` behaviour, resolution | Slice 4. The `hotSpot` building-block schema and its `modelAffecting` boolean (AD-014) are defined here (frozen), unused by the decider. |
| Workshop / Session aggregates, the one-open-session index | Slice 1. This slice's `Board` is keyed by a `WorkshopId` it does not itself mint through a lifecycle. |
| The AI facilitator, the interpret call, prompt assembly | Slice 1. |
| In-process event bus, JSONL model-call logger | Deferred to Slice 1 where the first consumer (the facilitator) lands — see Assumptions. |
| Readable account, JSON export, any Derived Artifact Generation code | Slices 2 and 5. `src/derived-artifact-generation/` is not created in this slice. |
| Any Vue UI beyond what already exists | No user-facing surface in Slice 0. The existing `App.vue` stub is carried, not extended. |
| `better-sqlite3` escape-hatch adapter as running code | ADR-003 requires the escape hatch stay *one file wide*; this slice satisfies that by keeping all `node:sqlite` calls in one adapter module, not by writing a second adapter. |
| Snapshot caching of the log | ADR-004: replay every load; revisit only if a real session proves slow. |
| `ts-reset` adoption | Still an open judgement call (DECISIONS-PENDING §12h); not this slice. |
| Any distributed-systems machinery — outbox, idempotent-consumer dedup tables, saga/process-manager coordination, retry ladders | Slice 0 is a single **in-process, synchronous, single-writer** log. The append path's only concurrency control is **optimistic concurrency** (an expected-position check). The outbox question is real but first bites Slice 4 (the close-time `Raise Hot Spot` on the fire-and-forget bus); the `EventStore.append` batch-atomic contract (S0-11) is the seam that keeps it cheap to add there. |
| `.node-version` file | ADR-010 puts it in Slice 6 (`harden`). ADR-011 wants it eventually; not this slice. CI already pins `node-version: 24.16.0` and `engine-strict=true` enforces the `engines` pin locally. |
| `pnpm dev` fail-fast when `ANTHROPIC_API_KEY` is missing (ADR-011) | Slice 0 makes **no** Anthropic call from the running app — the key check lands in Slice 1 with the first consumer (the facilitator). The Slice 0 spike (S0-27) reads the key itself, in its own script. |
| The hard `**/domain/** ≥ 90%` coverage glob threshold | ADR-010 Slice 6. Slice 0 only flips `thresholds.autoUpdate: true` (S0-26) now that real domain tests exist. |

---

## Assumptions & Open Questions

Every ambiguity is resolved or recorded here — nothing is left silently unclear.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Id generation for `BuildingBlockId` / `WorkshopId` / `SessionId` / operation ids, and the resumable workshop URL | `nanoid` (pin `nanoid@6.0.1`, pre-verified in the research phase); the workshop URL is a nanoid slug | URL-safe, short, one small runtime dep; DECISIONS-PENDING §2's own recommendation | y — user, 2026-08-29 |
| Bus + model-call JSONL logger | Deferred to Slice 1 | Neither has a consumer until the facilitator; building them now would leave unused exports that knip flags and violates the "no speculative abstraction" quality bar. Deviates from ADR-010's slice-0 plumbing list, deliberately. | y — user, 2026-08-29 |
| Operation-schema breadth in Slice 0 | The **full** discriminated union — every operation variant from the `[storm]`-confirmed `domain-model-capture` canvas Commands table — with `v: z.literal(1)`, frozen. The `Board` decider handles only `capture` / `reword` / `withdraw` / `reinstate`. | ADR-004 wants the schema "written first, in Slice 0, with the canvas open"; `switch-exhaustiveness-check` over the union forces every later consumer to handle new kinds; the canvas shapes are confirmed, so freezing them now is low-risk | y — user, 2026-08-29 |
| Version handling for the Slice 0 PR | `package.json` stays `0.1.0` as the skeleton baseline; **no changeset is consumed** for Slice 0. The "`src/**` diff ⇒ `.changeset/*.md` required" CI check is added here and first enforced on Slice 1. Slice 0's PR is the documented bootstrap exception. | Matches ADR-009's "`0.1.0` when Slice 0 lands"; avoids a spurious `0.2.0` bump on the first `changeset version` run | y — user, 2026-08-29 |
| Write model vs read model are **distinct folds**, not one "projection" | `decide`/`evolve` guard on a **slim write model** — for Slice 0 just `BuildingBlockId → { kind, withdrawn }` (the canvas write-model table). The label, placement, pivotal marker, and per-block provenance live in a **separate read-model fold** — the snapshot that `replay(log) === snapshot`, the board, and the artifacts consume. Cycle-check adjacency state (Slice 3) attaches to the *write* model. | domain-modeling: "slim the write model to what invariants read"; keeps Slice 3's cycle state off a fat projection; the canvas already draws this line | y — lens review, 2026-08-29 |
| `EventStore.append` is **batch-atomic** | `append(workshopId, expectedPosition, operations: Operation[])` commits an ordered batch of ≥1 operations in one `BEGIN IMMEDIATE` transaction. A single `capture` passes a 1-element array. | `insert between` is one atomic operation and withdrawal cascades are N operations in one transaction (canvas Policies); retrofitting batch semantics onto a one-op-at-a-time API is expensive; it is also the co-commit seam a Slice 4 outbox row needs | y — lens review, 2026-08-29 |
| Why the `EventStore` port exists (single implementation in Slice 0) | It is earned as (a) the **test seam** for decider/replay tests via a first-class **in-memory implementation**, and (b) **API-shaping** over `node:sqlite`'s awkward surface (no `db.transaction(fn)`, null-proto rows, PRAGMA WAL). The `better-sqlite3` swap is a *side benefit the seam happens to contain*, **not** the justification — "we might swap someday" does not earn an interface (software-design). No second adapter is built. | software-design earn-it test: name the concrete present value (seam + API-shaping), not speculative optionality | y — lens review, 2026-08-29 |
| Functional core / imperative shell | 100% of validation, kind-permission, cycle-checking (Slice 3), and cascade derivation (Slice 3) lives in pure `decide`/`evolve` under `domain-model-capture/domain/`. The `node:sqlite` adapter is a dumb append/read shell. The capability handler (when one exists) is thin orchestration: load stream → replay → `decide` → `append`. No business logic in `infrastructure/` or `capabilities/`. | software-design (cheapest seam is no seam — pure core); ADR-003's decide/evolve intent; makes the test boundary unambiguous | y — lens review, 2026-08-29 |
| Rejection classification | The `Rejection` type distinguishes **systemic** (schema-invalid, cycle, unknown/withdrawn target, empty label — a human fixes the input, never auto-retried) from **transient** (stale expected position — the handler reloads the stream, re-runs `decide`, re-appends). | software-design: classify by retry-behaviour, not severity; Slice 1's handler needs to know which to auto-retry | y — lens review, 2026-08-29 |
| `EventStore` streams are **namespaced per context + aggregate** | The port keys a stream by `(context, aggregate, id)` — Slice 0 uses `domain-model-capture` / `board` / `<workshopId>`. Slice 1's `Session` / `Proposal` / `Resolution` streams (in `session-facilitation`) are separate; no context reads another's streams. | ADR-003 verbatim: "streams are namespaced per context + aggregate, and no context reads another's streams" | y — ADR-003 |
| `OperationId` branded id | **Added** beyond ADR-004's `WorkshopId` / `SessionId` / `BuildingBlockId` list. Kept: an operation needs a stable client-supplied id for the Slice 1 apply round-trip's correlation and for interpret-at-most-once idempotency (ADR-005 keys on contribution id, but the operation the proposal produces still needs one for `Operation Applied`'s payload). | ADR-004 doesn't forbid it; the canvas's `Operation Applied` carries "the resulting Building Block id" and needs a correlation handle. Confirm in Design; if Design finds the log position is a sufficient identity, drop it. | n — Design to confirm |
| `fast-check` incremental-replay-consistency property | Slice 0 installs `fast-check` (devDep) and implements ADR-008's named property #3: `replay(log ++ [op]) === evolve(replay(log), op)` for the four implemented operations. Not "if cheap" — ADR-008 names it. | ADR-008 §property tests | y — ADR-008 |
| Coverage `thresholds.autoUpdate: true` flips ON in Slice 0 | `vite.config.ts`'s own comment says "Enable autoUpdate once real tests exist, per the plan." Slice 0 is when real domain tests first exist. The hard `**/domain/** ≥ 90%` glob stays Slice 6 (ADR-010). | ADR-008 (`thresholds.autoUpdate: true` ratchet) + the config's own TODO | y — ADR-008 |
| `capture` is kind-specific | Three operation variants — `capture-domain-event`, `identify-actor`, `identify-system` — not one generic `capture` with a `kind` payload field | Canvas Commands table: "Kind-specific, not a generic 'Create Building Block'"; `src/domain/AGENTS.md` invariant | y — canvas `[storm]` |
| `hotSpot` capture variant | The `raise-hot-spot` operation variant and the `hotSpot` building-block schema (incl. `modelAffecting: z.boolean().default(true)` — AD-014) are defined and frozen, but the decider rejects `raise-hot-spot` as "not yet implemented" | Slice 4 owns hot-spot behaviour; the frozen shape must still exist now per ADR-004 and #32's settlement in ADR-004 | y — inferred from ADR-004 |
| DB file location and lifecycle | `./data/eventstormer.db`, created and migrated on first store construction; `data/` is gitignored; `pnpm db:reset` deletes the file | DESIGN.md §7 states this path and `pnpm db:reset` | y — DESIGN.md |
| Structured-output round-trip spike | Run as a P2 story: install `ai` + `@ai-sdk/anthropic`, one throwaway probe **outside the test suite**, findings recorded as a decision in `.specs/STATE.md` and appended to `research/research-aisdk.md`. Not a blocking gate. | ADR-010 lists it as a ~1h spike at the head of the slice; it de-risks Slice 1's schema shape without adding a paid CI call | y — inferred from ADR-010 |
| `health` route after the migration | Moves to `src/host/` (it is composition-root infrastructure, not a bounded context); keeps exposing `opSchemaVersion` | ADR-002's tree has no generic `capabilities/`; `host/` is the composition root | y — inferred from ADR-002 |
| `derived-artifact-generation/` and `session-facilitation/` folders | Not created in this slice — created by the slice that first needs them (2 and 1 respectively). Only `domain-model-capture/`, `plumbing/`, `host/`, `app/` exist after Slice 0. | An empty context folder trips the `no-orphans` rule and adds nothing | y — inferred |
| `DECISIONS-PENDING.md` | Left in place, untouched (it is gitignored local scratch). Superseded content is not this slice's cleanup. | Out of scope; deleting it is a separate housekeeping call | y |

**Open questions:** none — all resolved or logged above.

---

## User Stories

### P1: Context-first layout migration ⭐ MVP

**User Story**: As a developer (human or agent), I want `src/` organised by bounded context so
that a change to one context lands in one folder and the strategic boundaries are visible in the
tree and mechanically enforced.

**Why P1**: ADR-002 supersedes the current layout; every other Slice 0 module is placed by it.
Doing it later means moving live model code.

**Acceptance Criteria**:

1. WHEN the migration is complete THEN `src/` SHALL contain `domain-model-capture/` (with its own
   `domain/`, `capabilities/`, `infrastructure/`, `api.ts`), `plumbing/`, `host/`, and `app/`, and
   SHALL NOT contain a top-level `src/domain/` or `src/capabilities/`.
2. WHEN a file under any `**/domain/**` imports from `hono`, `vue`, `pinia`, `ai`, `@ai-sdk/*`,
   `@vue-flow/*`, `@dagrejs/*`, `vite`, or a `node:*` builtin THEN `pnpm depcruise` SHALL fail
   with an error (not a warning).
3. WHEN a file under one context's folder imports from another context's `domain/`,
   `capabilities/`, or `infrastructure/` (anything other than that context's `api.ts`) THEN
   `pnpm depcruise` SHALL fail with an error.
4. WHEN each new dependency-cruiser rule is added THEN a planted violation SHALL have been
   committed transiently, observed to fail the rule, and reverted — evidenced in the task's commit
   message or the design doc.
5. WHEN the migration is complete THEN `src/domain-model-capture/domain/AGENTS.md` SHALL carry the
   path-scoped domain rules (moved from `src/domain/AGENTS.md`), and the vitest `projects` globs
   and `knip` entry/project globs SHALL resolve against the new paths with no orphaned config.
6. WHEN `pnpm dev` starts THEN Vite SHALL serve the SPA and hand `/api/*` to the Hono app in one
   process, and `GET /api/health` SHALL return `{ status: "ok", opSchemaVersion: 1 }`.
7. WHEN the Hono route composition is inspected THEN all routes SHALL be mounted from one
   composition file in `src/host/` — no filesystem routing.

**Independent Test**: `pnpm check` green after the move; `curl localhost:5173/api/health` returns
the health JSON; a hand-planted `import { Hono } from 'hono'` in `domain-model-capture/domain/`
fails `pnpm depcruise`.

---

### P1: Operation-log schema — the Zod single source of truth

**User Story**: As the system, I want one framework-free module defining every building-block and
operation shape, versioned from the first commit, so that the domain reducer, the persistence
layer, and (later) the AI facilitator all validate against the same definition and a v1
operation stays replayable forever.

**Why P1**: ADR-004 — retrofitting `op_version` or a schema version is "the single most expensive
possible change". It must exist before the first operation is ever written.

**Acceptance Criteria**:

1. WHEN the schema module is loaded THEN it SHALL export branded id schemas `WorkshopId`,
   `SessionId`, `BuildingBlockId` (ADR-004's list), and — pending Design confirmation —
   `OperationId`, all via Zod `.brand()`, such that assigning a bare `string` or a
   differently-branded id to one of them is a TypeScript compile error.
2. WHEN the schema module is loaded THEN it SHALL export one `z.discriminatedUnion` over
   per-kind building-block schemas — `domainEvent`, `actor`, `system`, `hotSpot` — and one
   `z.discriminatedUnion` over per-kind operation variants covering the entire
   `domain-model-capture` canvas Commands table: `capture-domain-event`, `identify-actor`,
   `identify-system`, `raise-hot-spot`, `reword`, `withdraw`, `reinstate`, `place`, `unplace`,
   `sequence`, `unsequence`, `insert-between`, `link-cause`, `unlink-cause`, `annotate`,
   `unannotate`, `mark-pivotal`, `unmark-pivotal`, `resolve`, `reopen`.
3. WHEN any operation variant is parsed THEN it SHALL carry `v: z.literal(1)` (with
   `.default(1)`), and a parsed operation with `v` absent SHALL yield `v === 1`, and one with
   `v: 2` SHALL fail to parse.
4. WHEN an operation is parsed THEN it SHALL carry an `author` object that records at least the
   acting party, and the schema SHALL permit recording both a `proposer` and an `accepter` for a
   facilitator-originated operation.
5. WHEN a `resolve` operation is parsed with no `reference` field THEN parsing SHALL fail; the
   `reference` field SHALL be required and its value unconstrained in shape.
6. WHEN a `hotSpot` building-block schema is parsed THEN it SHALL carry a boolean field
   `modelAffecting` defaulting to `true` (AD-014 — the informational/model-affecting split;
   `false` = informational, `true` = model-affecting). It SHALL NOT be named `kind` (the union
   discriminant) and SHALL NOT be an enum.
7. WHEN `OP_SCHEMA_VERSION` and `canReplay` are imported THEN `canReplay(1)` SHALL be `true`,
   `canReplay(2)` `false`, and `REPLAYABLE_OP_SCHEMA_VERSIONS` SHALL contain every version from 1
   to `OP_SCHEMA_VERSION` (the existing `schema-version.ts` behaviour, relocated).
8. WHEN `pnpm depcruise` runs THEN the schema module SHALL show zero framework or `node:*`
   imports.
9. WHEN `zod` is inspected in `package.json` THEN it SHALL be a direct `dependencies` entry, not
   transitive.

**Independent Test**: unit tests parse a valid instance of every operation variant and every
building-block kind; a TS-level test (`// @ts-expect-error`) proves the id brands reject a bare
string; `resolve` without `reference` throws.

---

### P1: `plumbing/` foundation

**User Story**: As the domain and persistence layers, I want a hand-rolled `Result<T, E>`, id
helpers, error types, and an `EventStore` port with a `node:sqlite` adapter **and a first-class
in-memory implementation**, so that the domain returns explicit outcomes and never throws for a
rejection, and decider/replay logic is testable without touching a file.

**Why P1**: ADR-003 — `decide` returns `Result<Event[], Rejection>`. Per the lens review the port
is earned as the **test seam** (in-memory impl) + **API-shaping** over `node:sqlite`; the
`better-sqlite3` swap is a side benefit, not the reason.

**Acceptance Criteria**:

1. WHEN `plumbing/` is inspected THEN it SHALL export a discriminated-union `Result<T, E>`
   (`{ ok: true, value } | { ok: false, error }`) with `ok` / `err` constructors and at least
   `map` / `andThen` or equivalent, and SHALL NOT import from `domain-model-capture/`, `host/`, or
   `app/` (enforced by the existing `plumbing-is-a-leaf` dependency-cruiser rule).
2. WHEN an id helper is called THEN it SHALL produce a `nanoid`-based value typed as the requested
   brand, and a workshop-URL helper SHALL produce a URL-safe slug.
3. WHEN `plumbing/` is inspected THEN it SHALL export a **synchronous** `EventStore` port
   (interface — no `Promise`, per AD-013) whose `append(stream, expectedPosition, operations)`
   takes a **namespaced stream key** (`(context, aggregate, id)` — Slice 0 uses
   `domain-model-capture` / `board` / `<workshopId>`, per ADR-003) and an **ordered batch of ≥1
   operations**, committing them in one transaction (rejecting with a *transient* error on a stale
   `expectedPosition`), plus a read that returns a stream's full operation list in log order. No
   consumer reads a stream outside its own context.
4. WHEN the `node:sqlite` adapter appends a batch THEN each row SHALL include the workshop id, a
   monotonic per-workshop position, the `op_version`, the author, the serialized operation
   payload, and a timestamp; the whole batch SHALL be one `BEGIN IMMEDIATE` / `COMMIT` unit (no
   partial batch ever observable); and every `node:sqlite` API call in the codebase SHALL live in
   that one adapter module.
5. WHEN two appends race for the same `expectedPosition` THEN exactly one SHALL succeed and the
   other SHALL return a *transient* `err` (no partial write, no duplicate position) — driven by
   `BEGIN IMMEDIATE` / `COMMIT` per DECISIONS-PENDING §2, not a `db.transaction(fn)` wrapper.
6. WHEN the in-memory `EventStore` implementation is used in a test THEN it SHALL enforce the same
   `expectedPosition` and batch-atomic semantics as the `node:sqlite` adapter (it is the seam the
   decider/replay tests run against), and SHALL live in `plumbing/` (test-usable, not test-only —
   Slice 1's decider tests import it too).
7. WHEN a clock is needed THEN `plumbing/` SHALL export a `Clock` abstraction so tests can supply
   a fixed time.

**Independent Test**: one shared contract-test suite run against BOTH implementations — append a
3-operation batch, read back in order, assert positions `0,1,2`; a stale-position append returns a
transient `err`; a batch that fails mid-way leaves the stream at its pre-batch position; `Result`
combinator unit tests.

---

### P1: Minimal `Board` decider and replay

**User Story**: As the system, I want a `Board` aggregate as a module of pure functions —
`decide(writeModel, operation) → Result<Event[], Rejection>`, `evolve(writeModel, event) →
writeModel`, and a separate read-model fold `project(snapshot, event) → snapshot` with
`replay = log.reduce(project, empty)` — that handles capture, reword, withdraw, and reinstate, so
that guards run against the slim write model and replaying reproduces the full snapshot exactly.

**Why P1**: The PRD's `replay(log) === snapshot` is F01's headline criterion; every later slice
adds operations to this same decider; and the write/read split must exist before Slice 3 attaches
cycle-adjacency state to it (domain-modeling — slim the write model to what invariants read).

**Acceptance Criteria**:

1. WHEN `decide` is called THEN it SHALL be pure (no mutation of its arguments, no I/O) and return
   either `ok(events)` or `err(rejection)`; the rejection SHALL name the failing field/rule and
   carry its classification (*systemic* — a human fixes the input; never auto-retried).
2. WHEN `decide` runs THEN it SHALL read ONLY the slim write model — for Slice 0,
   `BuildingBlockId → { kind, withdrawn }` — and SHALL NOT consult labels, placement, or
   provenance (read-model detail).
3. WHEN a `capture-domain-event` / `identify-actor` / `identify-system` operation is decided THEN
   it SHALL emit the corresponding `…Captured` / `…Identified` event, and after `project` the
   block SHALL appear in the snapshot unplaced (backlog) with a stable `BuildingBlockId`, the
   given label, and its author recorded in provenance.
4. WHEN a `reword` operation targets a `BuildingBlockId` present in the write model THEN after
   `project` the snapshot SHALL show the new label and the SAME `BuildingBlockId`; two building
   blocks with identical labels SHALL both exist and SHALL NOT be merged or deduplicated.
5. WHEN a `reword` targets a `BuildingBlockId` absent from the write model THEN it SHALL be
   rejected (*systemic*, no-op) and both write model and snapshot SHALL be unchanged.
6. WHEN a `reword` sets an empty or whitespace-only label THEN it SHALL be rejected and the
   previous label retained.
8. WHEN a `reinstate` operation targets a withdrawn building block THEN it SHALL return to active,
   naked — shaped exactly like a freshly captured block (acceptance-tests 17) — with no relations
   restored (there are none to restore in this slice).
9. WHEN an operation fails schema validation OR fails validation against the current write model
   THEN it SHALL be rejected, nothing emitted, and the write model and snapshot before and after
   SHALL be identical.
10. WHEN a full operation log is folded from empty THEN the reproduced snapshot SHALL be deep-equal
    to the snapshot produced by applying the same operations incrementally (acceptance-tests 18a,
    F01 line 625).
11. WHEN `raise-hot-spot`, `sequence`, `place`, or any not-yet-implemented operation variant is
    decided THEN it SHALL be rejected with an explicit "not implemented in this slice" rejection
    rather than silently ignored or throwing (the `decide` switch is exhaustive over the frozen
    union — `switch-exhaustiveness-check` enforces it).
12. WHEN every operation in the log carries an `author` THEN `project` SHALL preserve it in the
    snapshot's per-block provenance (proposer and accepter both, when present).

**Independent Test**: two distinct test classes, per ADR-008 —
(a) **decider tests**: `Given(prior operations) / When(operation) / Then(events | rejection)`,
asserting on the emitted events or the rejection *through the operation*, never on decider
internals — covering the capture / reword / withdraw / reinstate criteria and the systemic
rejections;
(b) **replay tests**: `replay(log) === snapshot` on targeted sequences (acceptance-test 18a), plus
the required `fast-check` property `replay(log ++ [op]) === evolve(replay(log), op)` (ADR-008
property #3) over the four implemented operations.
Each case carries an inline traceability tag (`// AT-17`, `// AT-18a`, `// PRD F01 replay`) — no
separate matrix file (ADR-008).

---

### P1: Persisted append-only log with auto-migration and replay-on-load

**User Story**: As a domain expert, I want the workshop and its log to survive the process, so
that closing everything and reopening the workshop by its id presents the same model, rebuilt
from the log.

**Why P1**: F01 — "the workshop survives the process that created it and is rebuilt by replaying
its log."

**Acceptance Criteria**:

1. WHEN the store is constructed and `./data/eventstormer.db` does not exist THEN it SHALL be
   created and the schema migrated, with no manual step.
2. WHEN the store is constructed and the DB already exists at an older additive migration state
   THEN pending additive migrations SHALL apply and no existing row SHALL be mutated or dropped.
3. WHEN operations are appended, the process ends, a new store is constructed, and the workshop's
   stream is replayed THEN the resulting projection SHALL equal the projection before the process
   ended.
4. WHEN the `operation_log` table is inspected THEN every row SHALL have a non-null `op_version`.
5. WHEN a workshop id with no stream is loaded THEN replay SHALL yield the empty projection (not
   an error).
6. WHEN `pnpm db:reset` is run THEN the DB file SHALL be removed so the next start recreates it.

**Independent Test**: an integration test that appends via one store instance, disposes it,
constructs a second against the same temp DB, replays, and asserts projection equality.

---

### P1: Anthropic contract derived from the schema

**User Story**: As the system, I want the Anthropic tool/output JSON Schema derived from the Zod
SSOT at module load, so that the AI contract and the domain schema cannot drift.

**Why P1**: ADR-004 — "derived … via `z.toJSONSchema()` … Never hand-written", and it must exist
"from the first F01 commit".

**Acceptance Criteria**:

1. WHEN the derivation runs THEN it SHALL call `z.toJSONSchema()` on the operation union with an
   `override` callback that rewrites `oneOf` → `anyOf`, and the output SHALL contain no `oneOf`
   key at any depth.
2. WHEN the derived schema is produced THEN it SHALL be a pure function of the Zod SSOT — no
   hand-maintained copy of any operation shape exists in the codebase.
3. WHEN `pnpm knip` runs THEN the derivation module SHALL NOT be reported as unused (it is
   exercised by its unit test and exported for Slice 1's facilitator).
4. WHEN the derivation module is inspected THEN it SHALL live under `domain-model-capture/domain/`
   (the schema's owning context) and import no framework (`z.toJSONSchema` is Zod-native).
5. WHEN Slice 1's facilitator needs the derived contract THEN it SHALL reach it through
   `src/domain-model-capture/api.ts` (re-export), never by importing the domain module across the
   context boundary — code-architecture: cross-context access goes through `api.ts` only.

**Independent Test**: a unit test snapshots the derived schema and asserts `JSON.stringify(schema)`
contains no `"oneOf"`.

---

### P1: Changesets and release CI

**User Story**: As the maintainer, I want Changesets configured and a CI check that a `src/**`
diff carries a changeset, so that every delivered slice is one deliberate version bump.

**Why P1**: ADR-009 — the version bump must be "a reviewed, authored decision, not a side effect",
enforced from the start.

**Acceptance Criteria**:

1. WHEN `@changesets/cli` is configured THEN `.changeset/config.json` SHALL set `baseBranch: main`,
   `commit: false`, `access: restricted`, and `changelog: "@changesets/changelog-github"`.
2. WHEN a pull request changes any file under `src/` and contains no `.changeset/*.md` THEN a CI
   job SHALL fail with a message naming the missing changeset. (This slice's own PR is the
   documented exception and MAY be merged without one.)
3. WHEN the `changesets/action` workflow is present THEN it SHALL maintain a standing "Version
   Packages" PR on `main`; `changeset publish` SHALL NOT be wired (unpublished app).
4. WHEN `package.json` is inspected after this slice THEN `version` SHALL still be `0.1.0`.
5. WHEN `pnpm check` runs THEN it SHALL pass: `typecheck` → `lint` → `test` → `depcruise` →
   `knip`, in that order, and CI SHALL run the identical sequence plus `pnpm build`.
6. WHEN the pre-push hook runs THEN it SHALL run the same gate as CI (unchanged from the existing
   `lefthook.yml`), and MAY additionally warn if `src/` changed with no staged changeset.
7. WHEN `vite.config.ts` coverage is inspected THEN `test.coverage.thresholds.autoUpdate` SHALL be
   `true` (real domain tests now exist — the config's own TODO), and no hard global or
   `**/domain/**` number SHALL be set (that glob threshold is ADR-010 Slice 6).

**Independent Test**: open a throwaway branch touching `src/`, push, observe the changeset CI job
fail; add a changeset, observe it pass; `pnpm check` green locally.

---

### P2: Structured-output round-trip spike

**User Story**: As the developer of Slice 1, I want empirical confirmation that ADR-005's exact
structured-output setup round-trips against a real Claude model, so that Slice 1's facilitator
contract is not built on an assumption.

**Why P2**: ADR-010 lists it as a ~1h spike; it produces a finding, not shipped code. ADR-005
§Consequences: "the R3 spike now tests the **object wrapper**, not a bare array." Slice 0 proceeds
without it, but Slice 1 depends on the answer.

**Acceptance Criteria**:

1. WHEN the spike runs THEN `ai` and `@ai-sdk/anthropic` SHALL be installed at the pins verified
   in `research/research-aisdk.md` (`ai@7.0.77`, `@ai-sdk/anthropic@4.0.41` or the current
   compatible pair).
2. WHEN the probe calls the model THEN it SHALL use ADR-005's exact setup: model `claude-sonnet-5`
   (no date suffix), `generateText` + `Output.object({ interpretation: <the derived
   discriminated-union array>, nextMove })` — the **object wrapper, not a bare `Output.array`** —
   with `providerOptions.anthropic.structuredOutputMode: 'outputFormat'` pinned, and **no
   `temperature`** (stripped on Sonnet 5 — use `output_config.effort`).
3. WHEN the probe returns THEN the result SHALL be recorded — success or the exact error — and
   `result.warnings` SHALL be logged and captured in the finding.
4. WHEN the spike concludes THEN a decision entry SHALL be added to `.specs/STATE.md` and a dated
   findings note appended to `research/research-aisdk.md`, explicitly stating whether the
   `oneOf → anyOf` sanitiser on the `outputFormat` path handled the wrapped discriminated union.
5. WHEN the probe script is committed THEN it SHALL be outside the Vitest suite (a `scripts/` or
   `research/` file), SHALL NOT run in CI, and SHALL NOT leave `knip` complaining (listed as a
   knip `entry` or `ignore`). No unit or integration test in the repo hits the real Anthropic API
   (ADR-008: "real Anthropic HTTP calls (mocked in unit tests)").

**Independent Test**: N/A — the deliverable is the recorded finding.

---

## Edge Cases

- WHEN the schema module is imported in a `node` (non-DOM) test environment THEN it SHALL load
  with no DOM or framework dependency (vitest `domain` project).
- WHEN an operation payload references a `BuildingBlockId` that is well-formed but absent THEN the
  decider SHALL reject it as a no-op with an explicit message (not throw, not partially apply).
- WHEN `nanoid` produces an id THEN it SHALL be URL-safe (no `/` or `+`) so a workshop slug needs
  no escaping.
- WHEN the DB file is present but corrupt or unreadable THEN store construction SHALL fail loudly
  (a thrown infrastructure error caught at the `capabilities`/`host` boundary per ADR-003) rather
  than silently starting empty — the F18 "corrupt log preserved, new workshop offered" behaviour
  is Slice 1's, but Slice 0 SHALL NOT overwrite a corrupt file.
- WHEN two operation variants would serialize to the same JSON THEN the discriminant key SHALL
  still tell them apart on parse (discriminated union, not a loose object).
- WHEN `changeset version` is eventually run for the first time THEN with no pending changesets it
  SHALL be a no-op and leave `0.1.0` intact.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| S0-01 | P1: Layout migration | Verify | ✅ Verified |
| S0-02 | P1: Layout migration — framework-free glob + planted violation | Verify | ✅ Verified |
| S0-03 | P1: Layout migration — cross-context-via-api.ts glob + planted violation | Verify | ✅ Verified |
| S0-04 | P1: Layout migration — AGENTS.md move, vitest/knip globs, health → host, one-file route composition, `pnpm dev` | Verify | ✅ Verified |
| S0-05 | P1: Schema SSOT — branded ids, full building-block + operation unions | Verify | ✅ Verified |
| S0-06 | P1: Schema SSOT — `v: z.literal(1)` + `.default(1)`, reject `v:2` | Verify | ✅ Verified |
| S0-07 | P1: Schema SSOT — author (proposer/accepter), `resolve` requires `reference`, `hotSpot.modelAffecting` boolean default `true` (AD-014) | Verify | ✅ Verified |
| S0-08 | P1: Schema SSOT — `schema-version.ts` relocated; `zod` a direct dep; zero framework imports | Verify | ✅ Verified |
| S0-09 | P1: plumbing — `Result<T,E>` + combinators, leaf rule | Verify | ✅ Verified |
| S0-10 | P1: plumbing — nanoid id + brand helpers, workshop-slug helper (nanoid contained to this one seam) | Verify | ✅ Verified |
| S0-11 | P1: plumbing — `EventStore` port; **namespaced stream key** `(context, aggregate, id)` (ADR-003); **batch-atomic** `append(stream, expectedPos, ops[])`; `node:sqlite` adapter; row shape; single-adapter rule; `BEGIN IMMEDIATE` concurrency | Verify | ⚠️ Verified* |
| S0-11b | P1: plumbing — first-class **in-memory `EventStore`**; one shared contract-test suite over both impls | Verify | ✅ Verified |
| S0-12 | P1: plumbing — `Clock` abstraction | Verify | ✅ Verified |
| S0-13 | P1: Board decider — pure `decide`/`evolve` over the **slim write model** (`id → {kind, withdrawn}`); separate `project`/`replay` read-model fold; functional core, zero I/O | Verify | ✅ Verified |
| S0-14 | P1: Board decider — capture (3 kind-specific variants); snapshot shows label + provenance | Verify | ✅ Verified |
| S0-15 | P1: Board decider — reword (id stable, empty rejected, unknown-target systemic no-op, no dedup) | Verify | ✅ Verified |
| S0-16 | P1: Board decider — withdraw / reinstate (naked, id preserved) | Verify | ✅ Verified |
| S0-17 | P1: Board decider — reject on schema or write-model failure; `Rejection` carries systemic/transient classification; write model + snapshot unchanged | Verify | ✅ Verified |
| S0-18 | P1: Board decider — decider tests `Given/When/Then(events\|rejection)`; replay tests `replay(log)===snapshot` (AT-18a); **required `fast-check` property** `replay(log ++ [op]) === evolve(replay(log), op)` (ADR-008 #3); inline `// AT-*` tags, no matrix file; author (proposer + accepter) preserved in provenance | Verify | ✅ Verified |
| S0-18b | P1: Board decider — exhaustive `decide` switch over the frozen union; not-yet-implemented variants rejected explicitly | Verify | ✅ Verified |
| S0-19 | P1: Persistence — auto-create + additive auto-migrate; `op_version` non-null on every row | Verify | ✅ Verified |
| S0-20 | P1: Persistence — replay-on-load equals pre-restart snapshot; empty stream → empty snapshot | Verify | ✅ Verified |
| S0-21 | P1: Persistence — `pnpm db:reset` | Verify | ⚠️ Verified* |
| S0-22 | P1: Anthropic contract — `z.toJSONSchema()` + `oneOf`→`anyOf` override; no `oneOf` at any depth | Verify | ✅ Verified |
| S0-23 | P1: Anthropic contract — pure derivation in `domain-model-capture/domain/`; no hand-copy; knip-clean; framework-free; re-exported via `api.ts` | Verify | ✅ Verified |
| S0-24 | P1: Changesets — config values; standing Version Packages PR; no `publish` | Verify | ✅ Verified |
| S0-25 | P1: Changesets — CI check fails a `src/**` diff with no changeset | Verify | ⚠️ Verified* |
| S0-26 | P1: Release — `package.json` stays `0.1.0`; `pnpm check` + CI (+`build`) green; `coverage.thresholds.autoUpdate: true` flipped on | Verify | ✅ Verified |
| S0-27 | P2: Spike — install `ai`/`@ai-sdk/anthropic`; probe with ADR-005's exact setup (`claude-sonnet-5`, `Output.object` wrapper, `outputFormat`, no temperature); record `result.warnings` | Verify | ✅ Verified |
| S0-28 | P2: Spike — findings to `.specs/STATE.md` + `research/research-aisdk.md` (incl. `oneOf→anyOf` verdict); probe outside test suite, knip-clean; no test hits the real API | Verify | ✅ Verified |

**Coverage:** 30 total. Verified 2026-08-29 — 27 ✅ Verified · 3 ⚠️ Verified with spec-precision gaps
(marked `*`: S0-11 no `author` column / race exercised as sequential; S0-21 & S0-25 config-only,
not test-exercised). S0-15 fixed in `e66f61f` (re-verify round 1). See `validation.md`.

---

## Success Criteria

How we know the slice is successful:

- [ ] `pnpm check` is green and CI (including `pnpm build`) is green on the Slice 0 PR.
- [ ] A planted framework import in `**/domain/**` and a planted cross-context import each fail
      `pnpm depcruise` — demonstrated, not assumed.
- [ ] `replay(log)` from empty reproduces an incrementally-built projection exactly, proven by a
      test mirroring acceptance-test 18a.
- [ ] A workshop's model survives a simulated process restart (new store instance, same DB) with
      an identical projection.
- [ ] Every operation variant from the canvas Commands table parses under `v: 1`; a `v: 2`
      operation is rejected.
- [ ] `package.json` is `0.1.0`; a `src/**` change with no changeset fails the new CI job.
- [ ] The structured-output spike's result — pass or the exact failure — is recorded in
      `.specs/STATE.md`.
