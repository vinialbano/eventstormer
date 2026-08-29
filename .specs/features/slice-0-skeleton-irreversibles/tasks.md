# Slice 0 — Skeleton + Irreversibles Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `spec-driven-development` skill (plugin-qualified:
`anoria-engineering:spec-driven-development`): **activate it by name and follow its Execute flow
and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source
of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier,
discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Design**: `.specs/features/slice-0-skeleton-irreversibles/design.md`
**Status**: Approved (2026-08-29) — tools: context7 for API lookups, no per-task skills; execution: batch sub-agents (3 batches)

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec — confirm before Execute. Guidelines
> found: `AGENTS.md`, `docs/testing.md`, `docs/adr/008-testing-eval-and-observability.md`,
> `src/domain/AGENTS.md` (→ moves to `src/domain-model-capture/domain/AGENTS.md`),
> `vite.config.ts` (vitest `projects`: domain=node / app=jsdom; v8 coverage, `autoUpdate` ratchet).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Domain — schema (Zod SSOT) | unit | Every operation variant + every building-block kind parses; brand rejects bare string (`@ts-expect-error`); `v` defaults to 1 and rejects `v:2`; `resolve` rejects missing `reference`; `hotSpot.kind` defaults. 1:1 to S0-05…08. | `src/domain-model-capture/domain/schema/*.test.ts` | `pnpm test` |
| Domain — `Board` decide/evolve/project/replay | unit (**heaviest weight** — ADR-008) | All branches; 1:1 to spec ACs S0-13…18b; `Given(ops)/When(op)/Then(events\|rejection)` through the operation; `replay(log)===snapshot` (AT-18a); **required** `fast-check` property `replay(log ++ [op]) === evolve(replay(log), op)` + a kind-permission property; inline `// AT-*` / `// PRD F01` tags | `src/domain-model-capture/domain/board/*.test.ts` | `pnpm test` |
| Domain — anthropic-contract sensor | unit | Output has no `oneOf` at any depth; `io:'input'` picks up the `v` default; snapshot of the shape | `src/domain-model-capture/domain/anthropic-contract.test.ts` | `pnpm test` |
| Plumbing — `Result`, `ids`, `Clock` | unit | All branches; combinators; ids URL-safe + distinct + branded; fixed-clock substitutable | `src/plumbing/*.test.ts` | `pnpm test` |
| Plumbing — `EventStore` (both impls) | integration | One shared contract-test suite run against the in-memory impl **and** the `node:sqlite` adapter: batch of 3 → positions 0,1,2; stale `expectedPosition` → transient `err`; mid-batch failure leaves stream at pre-batch length | `src/plumbing/event-store/*.test.ts` | `pnpm test` |
| Persistence — migrations + replay-on-load | integration | Auto-create + additive auto-migrate against a temp-file DB; no migration `up` contains `DROP`; append → dispose → new instance same DB → `read` → `replay` equals pre-restart snapshot; empty stream → empty snapshot; `op_version` non-null | `src/plumbing/event-store/*.test.ts` | `pnpm test` |
| Host — `/api/health` route | integration (Hono `testClient`, chained routes — ADR-008) | Status 200 + `{ status:'ok', opSchemaVersion:1 }`; the moved test keeps working | `src/host/health.test.ts` | `pnpm test` |
| Config / tooling — dependency-cruiser rules | none (build gate) **+ manual plant-a-violation verification per rule** (repo non-negotiable) | Each new/changed rule: plant a real violation, observe `pnpm depcruise` fail, revert; commit message lists each | `.dependency-cruiser.cjs` | `pnpm depcruise` / `pnpm check` |
| Config / tooling — `vite.config.ts`, `knip.json`, Changesets, CI workflows, `package.json` | none (build gate) | `pnpm check` green; CI green; spec Independent Tests (throwaway-branch changeset-guard check) run once manually | — | `pnpm check` (+ CI) |
| Spike script | none | Deliverable is the recorded finding in `.specs/STATE.md` + `research/research-aisdk.md` | `scripts/spike-structured-output.ts` | manual, once |

**Provenance:** ADR-008 sets the domain-decider weight and the `fast-check` properties;
`docs/testing.md` sets co-location + `environment:'node'` for domain; `vite.config.ts` sets the
`projects` globs and the coverage ratchet; the plant-a-violation rule is `AGENTS.md` + the
existing `.dependency-cruiser.cjs` comments.

## Gate Check Commands

> Generated from codebase — confirm before Execute.

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | After a task with unit tests only | `pnpm test` |
| Full | After a task with integration tests (`EventStore`, persistence, health) | `pnpm test` |
| Build | After a phase, or a config/tooling-only task | `pnpm check` (typecheck → lint → test → depcruise → knip) |

*(There is no separate e2e/integration runner in this repo — everything runs under `vitest` via
`pnpm test`. CI additionally runs `pnpm build`.)*

---

## Execution Plan

Phases run sequentially; tasks within a phase run in order.

### Phase 1: Migration & rules

```
T1 → T2 → T3
```

### Phase 2: plumbing foundation

```
T4 → T5 → T6 → T7 → T8
```

### Phase 3: sqlite adapter & schema SSOT

```
T9 → T10 → T11 → T12
```

### Phase 4: Board, contract sensor

```
T13 → T14 → T15 → T16
```

### Phase 5: round-trip, release rails, spike

```
T17 → T18 → T19 → T20 → T21
```

---

## Task Breakdown

### T1: Migrate the scaffold to the context-first tree

**What**: Relocate the layer-first scaffold to ADR-002's bounded-context tree — a pure move, no
new behaviour.
**Where**: `src/domain/schema-version.ts` + `.test.ts` → `src/domain-model-capture/domain/schema/`;
`src/domain/AGENTS.md` → `src/domain-model-capture/domain/AGENTS.md` (fix its internal `docs/…`
reference paths); `src/capabilities/health/http.ts` + `.test.ts` → `src/host/health.ts` +
`health.test.ts`; `src/server.ts` → `src/host/index.ts` + `src/host/routes.ts`; update
`vite.config.ts` (`@hono/vite-dev-server` `entry` → `src/host/index.ts`; `coverage.exclude`
`src/server.ts` → `src/host/index.ts`, `src/host/routes.ts`) and `knip.json` (`entry` →
`src/host/index.ts`).
**Depends on**: None
**Reuses**: every file above verbatim; `health.ts` keeps its chained shape; its import of
`OP_SCHEMA_VERSION` points at the moved `schema-version.ts` directly for now (T3 rewires it
through `api.ts`).
**Requirement**: S0-01, S0-04

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [x] `src/domain/`, `src/capabilities/`, `src/server.ts` no longer exist; the tree matches
  design component 1 (only `domain-model-capture/`, `plumbing/` *(empty dir ok — populated
  Phase 2)*, `host/`, `app/`)
- [x] `pnpm dev` serves the SPA and `curl localhost:5173/api/health` → `{"status":"ok","opSchemaVersion":1}`
- [x] The moved `schema-version` and `health` tests pass unchanged
- [x] Gate check passes: `pnpm check`
- [x] Test count: 4 pass (3 in `schema-version.test.ts` + 1 health) — baseline, no deletions

**Tests**: none (move only — existing tests carried) · **Gate**: build
**Commit**: `refactor: migrate scaffold to context-first layout (ADR-002)`

---

### T2: Rewrite dependency-cruiser rules for the context-first tree

**What**: Replace the path-anchored rules with the context-first rule set from design component 2,
and verify each by planting a violation.
**Where**: `.dependency-cruiser.cjs`
**Depends on**: T1
**Reuses**: the existing config wholesale (`tsPreCompilationDeps`, the pnpm `node_modules`
anchor, `no-circular`, `not-to-dev-dep`, `no-orphans`); only `from`/`to` anchors change.
**Requirement**: S0-02, S0-03

**Tools**: MCP: `context7` (dependency-cruiser rule syntax if needed) · Skill: NONE

**Done when**:
- [x] Rules present per design component 2: `domain-imports-no-framework` (glob `[^/]+/domain/`),
  `domain-imports-no-node-builtins`, `domain-imports-nothing-above`, `plumbing-is-a-leaf`,
  `cross-context-only-via-api`, `ui-does-not-import-server-code`,
  `no-cross-slice-imports` (path generalised), plus the unchanged three.
  `host-imports-only-context-api` is added in T3 (SPEC_DEVIATION — see commit), the task that
  creates `api.ts` and rewires `host/health.ts` so the gate stays green.
- [x] Each new/changed rule verified: a planted violation was committed transiently, `pnpm depcruise`
  failed on it, and it was reverted — the commit message lists every rule and its planted case
- [x] A type-only framework import in `domain-model-capture/domain/` still fails (`tsPreCompilationDeps`)
- [x] Gate check passes: `pnpm check`
- [x] Test count: 4 pass (unchanged)

**Tests**: none (build gate + manual plant-a-violation) · **Gate**: build
**Commit**: `build: context-first dependency-cruiser rules, each verified by a planted violation`

---

### T3: Add `domain-model-capture/api.ts` seam and route health through it

**What**: Create the context's single public surface with its first re-exports, and rewire
`host/health.ts` to consume it.
**Where**: `src/domain-model-capture/api.ts` (new); `src/host/health.ts` (modify)
**Depends on**: T1
**Reuses**: the moved `schema-version.ts`
**Requirement**: S0-04, S0-23 (partial — the seam)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `api.ts` re-exports `OP_SCHEMA_VERSION`, `canReplay`, `REPLAYABLE_OP_SCHEMA_VERSIONS`
- [ ] `host/health.ts` imports `OP_SCHEMA_VERSION` from `../domain-model-capture/api.ts` (not a
  `domain/` path)
- [ ] `pnpm depcruise` proves `host/` importing a context `domain/` file directly would fail
  (`host-imports-only-context-api`) — planted + reverted
- [ ] Gate check passes: `pnpm check`
- [ ] Test count: 3 pass

**Tests**: none (covered by the carried health `testClient` test) · **Gate**: build
**Commit**: `feat(domain-model-capture): api.ts cross-context seam`

---

### T4: `plumbing/result.ts` — `Result<T, E>`

**What**: The hand-rolled discriminated-union `Result` and its combinators.
**Where**: `src/plumbing/result.ts` + `src/plumbing/result.test.ts`
**Depends on**: T1
**Reuses**: ADR-003's stated shape
**Requirement**: S0-09

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Exports `type Result<T,E>`, `ok`, `err`, `isOk`, `isErr`, `map`, `andThen`
- [ ] `plumbing/` imports nothing from a context / `host` / `app` (`plumbing-is-a-leaf`)
- [ ] Unit tests: `ok`/`err` construction, `map` skips on `err`, `andThen` chains and
  short-circuits, narrowing works
- [ ] Gate check passes: `pnpm test`
- [ ] Test count: 3 (carried) + ~6 new = ~9 pass

**Tests**: unit · **Gate**: quick
**Commit**: `feat(plumbing): Result<T,E> and combinators`

---

### T5: `plumbing/ids.ts` — brand symbols + nanoid generators

**What**: The branded-id *symbol* types (so `plumbing` stays a leaf) and the `nanoid`-backed
generators + workshop-URL slug helper.
**Where**: `src/plumbing/ids.ts` + `src/plumbing/ids.test.ts`; `package.json` (+`nanoid`)
**Depends on**: T1
**Reuses**: `research/research-server.md` (nanoid pin), design Risks note (brand-symbols home)
**Requirement**: S0-10, AD-001

**Tools**: MCP: `context7` (nanoid v6 API) · Skill: NONE

**Done when**:
- [ ] `nanoid@6` added to `dependencies`
- [ ] Exports brand symbol types `WorkshopId`, `SessionId`, `BuildingBlockId` (and the marker
  used to build them) and generators `newWorkshopId()`, `newSessionId()`, `newBuildingBlockId()`
  returning the branded type; `workshopUrlSlug(id): string`
- [ ] Unit tests: generated ids are URL-safe (`/^[A-Za-z0-9_-]+$/`), 21 chars, mutually distinct
  across 1000 draws; a bare string is not assignable to `WorkshopId` (`@ts-expect-error`)
- [ ] Gate check passes: `pnpm test` + `pnpm knip` (nanoid used)
- [ ] Test count: ~9 + ~5 = ~14 pass

**Tests**: unit · **Gate**: quick
**Commit**: `feat(plumbing): branded id symbols and nanoid generators`

---

### T6: `plumbing/clock.ts` — `Clock`

**What**: The injectable clock abstraction.
**Where**: `src/plumbing/clock.ts` + `src/plumbing/clock.test.ts`
**Depends on**: T1
**Reuses**: AD-012
**Requirement**: S0-12

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Exports `type Clock = () => string` and `systemClock` (ISO-8601 UTC)
- [ ] Unit tests: `systemClock()` matches an ISO-8601 UTC regex; a fixed test clock is
  substitutable and returns its constant
- [ ] Gate check passes: `pnpm test`
- [ ] Test count: ~14 + ~3 = ~17 pass

**Tests**: unit · **Gate**: quick
**Commit**: `feat(plumbing): Clock abstraction`

---

### T7: `plumbing/event-store/` — port + in-memory impl + shared contract suite

**What**: The `EventStore` port, the in-memory implementation, and the reusable contract-test
factory (run against the in-memory impl here; T9 plugs the sqlite adapter into the same factory).
**Where**: `src/plumbing/event-store/port.ts`, `memory-store.ts`, `contract-test.ts`,
`memory-store.test.ts`
**Depends on**: T4
**Reuses**: `Result` (T4); design component 6
**Requirement**: S0-11 (port + semantics), S0-11b

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `port.ts` exports `StreamKey`, `StoredOperation`, `StoredOperationInput`, `AppendConflict`
  (`classification:'transient'`), and `interface EventStore { append(stream, expectedPosition,
  ops): Promise<Result<{nextPosition}, AppendConflict>>; read(stream): Promise<StoredOperation[]> }`
- [ ] `memory-store.ts` enforces `expectedPosition` (`-1` for a new stream) and batch-atomicity
- [ ] `contract-test.ts` exports a `describe`-factory `eventStoreContract(name, makeStore)`:
  3-op batch → positions `0,1,2`; stale `expectedPosition` → transient `err`; a batch whose 2nd
  op throws leaves the stream at its pre-batch length; reads return log order
- [ ] `memory-store.test.ts` runs `eventStoreContract('memory', …)`
- [ ] Gate check passes: `pnpm test`
- [ ] Test count: ~17 + ~5 = ~22 pass

**Tests**: integration · **Gate**: full
**Commit**: `feat(plumbing): EventStore port, in-memory impl, shared contract suite`

---

### T8: `plumbing/event-store/migrations.ts` — additive migration runner + migration 001

**What**: The ordered-migration mechanism and the `operation_log` DDL, with the no-`DROP` guard.
**Where**: `src/plumbing/event-store/migrations.ts` + `migrations.test.ts`
**Depends on**: T1
**Reuses**: design component 7
**Requirement**: S0-19 (mechanism)

**Tools**: MCP: `context7` (`node:sqlite` DDL / PRAGMA) · Skill: NONE

**Done when**:
- [ ] Exports `MIGRATIONS: Migration[]` (`{ id:number; up:string }`) with migration `001` =
  the `operation_log` table (3-column stream key + `position` + `op_version` + `at` + `operation`,
  `PRIMARY KEY (context,aggregate,stream_id,position)`)
- [ ] Exports `applyMigrations(db)` — creates `_migrations`, applies each absent id in order inside
  one `BEGIN IMMEDIATE`, records it
- [ ] Unit test: no migration `up` string contains `DROP` or `ALTER … DROP` (S0-19 AC2 guard)
- [ ] Gate check passes: `pnpm test`
- [ ] Test count: ~22 + ~2 = ~24 pass

**Tests**: unit · **Gate**: quick
**Commit**: `feat(plumbing): additive migration runner + operation_log DDL`

---

### T9: `plumbing/event-store/sqlite-adapter.ts` — the `node:sqlite` adapter

**What**: The single module that touches `node:sqlite`; implements `EventStore`; runs migrations
on construction; plugs into the shared contract suite. Adds `db:reset`.
**Where**: `src/plumbing/event-store/sqlite-adapter.ts` + `sqlite-adapter.test.ts`;
`package.json` (`db:reset` script)
**Depends on**: T7, T8
**Reuses**: `research/research-server.md` verified facts (`DatabaseSync`, `BEGIN IMMEDIATE`,
`PRAGMA journal_mode=WAL` asserted with `.get()`, null-proto rows, `.iterate()`)
**Requirement**: S0-11 (adapter), S0-21

**Tools**: MCP: `context7` (`node:sqlite` API) · Skill: NONE

**Done when**:
- [ ] `createSqliteEventStore(path)` constructs `DatabaseSync`, sets WAL (asserted), runs
  `applyMigrations`
- [ ] `append` = `BEGIN IMMEDIATE` → re-read `MAX(position)` per stream → compare to
  `expectedPosition` → insert the whole batch (each row stamped `op_version = OP_SCHEMA_VERSION`,
  `at` from the passed value) → `COMMIT`; conflict → `ROLLBACK` + transient `err`; never calls
  `row.hasOwnProperty`
- [ ] `read` uses `stmt.iterate()` and returns log order
- [ ] DB path from `EVENTSTORMER_DB` env (default `./data/eventstormer.db`); tests use a temp file
- [ ] `sqlite-adapter.test.ts` runs `eventStoreContract('node:sqlite', …)` — same suite as T7
- [ ] `package.json` `db:reset` deletes `data/eventstormer.db`, `-wal`, `-shm`
- [ ] `pnpm depcruise` shows `node:sqlite` imported **only** here
- [ ] Gate check passes: `pnpm test`
- [ ] Test count: ~24 + ~5 (contract suite) = ~29 pass

**Tests**: integration · **Gate**: full
**Commit**: `feat(plumbing): node:sqlite EventStore adapter`

---

### T10: `domain-model-capture/domain/schema/ids.ts` + `author.ts`

**What**: The branded id *schemas* (Zod, applying T5's symbols) and the `Author` value object.
**Where**: `src/domain-model-capture/domain/schema/ids.ts`, `author.ts`, `ids.test.ts`,
`author.test.ts`
**Depends on**: T5
**Reuses**: T5 brand symbols; `research/harness-tools.md` (`.brand()` is static-only)
**Requirement**: S0-05 (ids), S0-07 (author)

**Tools**: MCP: `context7` (Zod 4 `.brand()`) · Skill: NONE

**Done when**:
- [ ] `ids.ts` exports `WorkshopId`, `SessionId`, `BuildingBlockId` Zod schemas
  (`z.string().brand<…>()`), whose inferred types are assignable to/from T5's symbol types
- [ ] `author.ts` exports `Author = z.object({ proposer: PartyRef.optional(), accepter: PartyRef })`
  (`PartyRef` = a minimal `z.object` naming the party)
- [ ] Tests: a bare string fails `.parse` narrowing to the brand at compile time
  (`@ts-expect-error`); `Author` accepts `{ accepter }` alone and `{ proposer, accepter }`;
  rejects `{ proposer }` alone
- [ ] `pnpm depcruise` — schema dir imports no framework
- [ ] Gate check passes: `pnpm test`
- [ ] Test count: ~29 + ~6 = ~35 pass

**Tests**: unit · **Gate**: quick
**Commit**: `feat(domain-model-capture): branded id schemas and Author`

---

### T11: `domain-model-capture/domain/schema/building-blocks.ts`

**What**: The 4-kind building-block discriminated union.
**Where**: `src/domain-model-capture/domain/schema/building-blocks.ts` + `.test.ts`
**Depends on**: T10
**Reuses**: the canvas building-block kinds; `research/harness-tools.md` (discriminated unions
compose in v4)
**Requirement**: S0-05 (building blocks), S0-07 (`hotSpot.kind`)

**Tools**: MCP: `context7` (Zod 4 `z.discriminatedUnion`) · Skill: NONE

**Done when**:
- [ ] `z.discriminatedUnion('kind', [domainEvent, actor, system, hotSpot])`; each carries
  `id: BuildingBlockId`, `label: z.string()`
- [ ] `hotSpot` carries `kind: z.enum(['informational','model-affecting']).default('model-affecting')`
- [ ] Tests: each kind parses; `hotSpot` without `kind` → `model-affecting`; a bad discriminant
  fails
- [ ] Gate check passes: `pnpm test`
- [ ] Test count: ~35 + ~6 = ~41 pass

**Tests**: unit · **Gate**: quick
**Commit**: `feat(domain-model-capture): building-block schema union`

---

### T12: `domain-model-capture/domain/schema/operations.ts` — the frozen `v:1` operation union

**What**: The full 20-variant discriminated union, frozen at `v: z.literal(1)`, plus the schema
barrel and `api.ts` re-exports; promote `zod` to a direct dependency.
**Where**: `src/domain-model-capture/domain/schema/operations.ts`, `index.ts`, `operations.test.ts`;
`src/domain-model-capture/api.ts` (modify); `package.json` (`zod` → `dependencies`)
**Depends on**: T10, T11
**Reuses**: the canvas Commands table (verbatim shapes for all 20); AD-003, AD-011 (`OperationId`
omitted), AD-012 (`at` not on the op)
**Requirement**: S0-05, S0-06, S0-07, S0-08

**Tools**: MCP: `context7` (Zod 4 `z.literal().default()`, discriminatedUnion) · Skill: NONE

**Done when**:
- [ ] `opBase = { v: z.literal(1).default(1), author: Author }` spread into every variant
- [ ] `Operation = z.discriminatedUnion('kind', [...20])`: `capture-domain-event`, `identify-actor`,
  `identify-system`, `raise-hot-spot`, `reword`, `withdraw`, `reinstate`, `place`, `unplace`,
  `sequence`, `unsequence`, `insert-between`, `link-cause`, `unlink-cause`, `annotate`,
  `unannotate`, `mark-pivotal`, `unmark-pivotal`, `resolve`, `reopen`
- [ ] `resolve` carries `reference: z.unknown()` **required** (a missing key fails `.parse`)
- [ ] `schema/index.ts` re-exports `Operation`, `BuildingBlock`, `Author`, the id schemas,
  `OP_SCHEMA_VERSION`, `canReplay`; `api.ts` re-exports the same
- [ ] `zod` moved to `dependencies`
- [ ] Tests: a valid instance of **every** variant parses; `v` absent → `1`; `v:2` → parse error;
  `resolve` without `reference` → parse error; `switch (op.kind)` over `Operation` is exhaustive
  (a deliberately missing branch fails `pnpm lint` via `switch-exhaustiveness-check`)
- [ ] `pnpm depcruise` — zero framework / `node:*` imports in the schema module
- [ ] Gate check passes: `pnpm check`
- [ ] Test count: ~41 + ~25 = ~66 pass

**Tests**: unit · **Gate**: build
**Commit**: `feat(domain-model-capture): frozen v:1 operation schema union`

---

### T13: `domain-model-capture/domain/board/model.ts` — write model, snapshot, Rejection

**What**: The two fold-state types and the classified `Rejection` type.
**Where**: `src/domain-model-capture/domain/board/model.ts` + `model.test.ts`
**Depends on**: T12
**Reuses**: AD-005 (write/read split), AD-008 (classification), `Result` (T4)
**Requirement**: S0-13 (types), S0-17 (Rejection classification)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `BoardWriteModel = Map<BuildingBlockId, { kind: BuildingBlockKind; withdrawn: boolean }>`,
  `emptyWriteModel`
- [ ] `BoardSnapshot` per design (blocks map with `kind/label/withdrawn/placement:'backlog'/provenance`,
  `position`), `emptySnapshot` (`position: -1`)
- [ ] `Rejection = { kind: 'schema'|'unknown-target'|'empty-label'|'duplicate-id'|'not-withdrawn'|'not-implemented-in-slice'; classification: 'systemic'; …detail }`
- [ ] Tests: `emptySnapshot`/`emptyWriteModel` shape; a `Rejection` is a valid `Result` `E`
- [ ] Gate check passes: `pnpm test`
- [ ] Test count: ~66 + ~3 = ~69 pass

**Tests**: unit · **Gate**: quick
**Commit**: `feat(domain-model-capture): Board write model, snapshot, Rejection types`

---

### T14: `domain-model-capture/domain/board/decide.ts` + `evolve.ts`

**What**: The pure guard (`decide`) and the write-model fold (`evolve`).
**Where**: `src/domain-model-capture/domain/board/decide.ts`, `evolve.ts`, `decide.test.ts`,
`evolve.test.ts`
**Depends on**: T13
**Reuses**: AD-009 (functional core), the canvas guard rules, ADR-008 test style
**Requirement**: S0-13, S0-14, S0-15, S0-17, S0-18b

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `decide(wm, op): Result<Operation[], Rejection>` — pure, zero I/O; re-parses `op` (maps
  `ZodError` → `{kind:'schema',classification:'systemic'}`); handles `capture-domain-event` /
  `identify-actor` / `identify-system` (duplicate-id guard), `reword` (unknown-target +
  empty-label), `withdraw` (unknown-target), `reinstate` (unknown-target + not-withdrawn);
  `switch (op.kind)` is exhaustive — the other 16 kinds return
  `{kind:'not-implemented-in-slice',classification:'systemic'}`
- [ ] `evolve(wm, op): BoardWriteModel` — folds capture (adds id→{kind,withdrawn:false}),
  withdraw (`withdrawn:true`), reinstate (`withdrawn:false`); reword is a no-op on the write model
- [ ] Tests, `Given(prior ops)/When(op)/Then(events|rejection)` **through the operation**, 1:1 to
  S0-13…17; a `fast-check` kind-permission property (no unimplemented kind returns `ok`); inline
  `// AT-17` tag on the reinstate-is-naked case
- [ ] Gate check passes: `pnpm test`
- [ ] Test count: ~69 + ~18 = ~87 pass

**Tests**: unit · **Gate**: quick
**Commit**: `feat(domain-model-capture): Board decide + evolve`

---

### T15: `domain-model-capture/domain/board/project.ts` + `replay.ts`

**What**: The snapshot fold and the replay entry points, plus the `replay(log)===snapshot` and
incremental-consistency guarantees.
**Where**: `src/domain-model-capture/domain/board/project.ts`, `replay.ts`, `project.test.ts`,
`replay.test.ts`; `src/domain-model-capture/api.ts` (modify — re-export Board fns);
`package.json` (+`fast-check` dev)
**Depends on**: T14
**Reuses**: `evolve` structure (T14); ADR-008 property #3
**Requirement**: S0-13, S0-14, S0-18

**Tools**: MCP: `context7` (`fast-check` property API) · Skill: NONE

**Done when**:
- [ ] `project(snap, op): BoardSnapshot` — folds capture (adds block w/ label + `provenance` from
  `op.author`, `placement:'backlog'`), reword (new label, same id, no dedup), withdraw
  (`withdrawn:true`), reinstate (`withdrawn:false`); bumps `position`
- [ ] `replay(log): BoardSnapshot = log.reduce(project, emptySnapshot)`;
  `replayWriteModel(log): BoardWriteModel = log.reduce(evolve, emptyWriteModel)`
- [ ] `fast-check` added to `devDependencies`
- [ ] Tests: `replay(log) === snapshot` on targeted sequences (inline `// AT-18a`);
  **required property** `replay(log ++ [op]) === evolve(replay(log), op)` equivalent for
  `project` (`replay(log ++ [op])` deep-equals `project(replay(log), op)`); two identical labels
  both survive replay
- [ ] `api.ts` re-exports `decide`, `evolve`, `project`, `replay`, `replayWriteModel` + the model
  types
- [ ] Gate check passes: `pnpm check`
- [ ] Test count: ~87 + ~10 = ~97 pass

**Tests**: unit · **Gate**: build
**Commit**: `feat(domain-model-capture): Board project + replay`

---

### T16: `domain-model-capture/domain/anthropic-contract.ts` — compatibility sensor

**What**: The compile-time `z.toJSONSchema` derivation with the `oneOf → anyOf` override (AD-010).
**Where**: `src/domain-model-capture/domain/anthropic-contract.ts` + `.test.ts`;
`src/domain-model-capture/api.ts` (modify)
**Depends on**: T12
**Reuses**: `research/research-aisdk.md` (`oneOf`/`anyOf` facts); context7-verified Zod 4
`override` is a mutating void callback
**Requirement**: S0-22, S0-23

**Tools**: MCP: `context7` (Zod 4 `z.toJSONSchema` params) · Skill: NONE

**Done when**:
- [ ] `anthropicOperationSchema()` calls `z.toJSONSchema(Operation, { target:'draft-2020-12',
  io:'input', unrepresentable:'throw', override })` where `override` rewrites any `oneOf` →
  `anyOf` in place
- [ ] Framework-free (`z.toJSONSchema` is Zod-native) — `pnpm depcruise` clean
- [ ] `api.ts` re-exports `anthropicOperationSchema`; `pnpm knip` does not flag it
- [ ] Tests: `JSON.stringify(anthropicOperationSchema())` contains no `"oneOf"`; the `v` field
  appears as optional under `io:'input'`; a shape snapshot
- [ ] Gate check passes: `pnpm check`
- [ ] Test count: ~97 + ~3 = ~100 pass

**Tests**: unit · **Gate**: build
**Commit**: `feat(domain-model-capture): Anthropic-contract compatibility sensor`

---

### T17: Persistence round-trip integration test

**What**: The end-to-end proof that a workshop's model survives a process restart — the wiring
Approach A keeps in test code until Slice 2.
**Where**: `src/plumbing/event-store/persistence-roundtrip.test.ts` (or
`src/domain-model-capture/domain/board/persistence.test.ts` — co-locate with whichever it exercises
more; design says the store, so `event-store/`)
**Depends on**: T9, T15
**Reuses**: `createSqliteEventStore` (T9), `replay` (T15), `Operation` (T12), a fixed `Clock` (T6)
**Requirement**: S0-19, S0-20

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Test: build a store on a temp DB → `append` a batch of capture+reword+withdraw ops (stamped
  `at` from a fixed clock) → dispose → build a **second** store on the same file → `read` →
  `replay` → snapshot deep-equals the snapshot from `replay` of the same ops in-memory
- [ ] Test: `read` on a never-written stream → `[]` → `replay([])` → `emptySnapshot`
- [ ] Test: every persisted row has a non-null `op_version` equal to `OP_SCHEMA_VERSION`
- [ ] Test: auto-migrate — pointing a fresh store at a non-existent path creates + migrates it with
  no manual step
- [ ] Gate check passes: `pnpm test`
- [ ] Test count: ~100 + ~4 = ~104 pass

**Tests**: integration · **Gate**: full
**Commit**: `test(domain-model-capture): workshop model survives a process restart`

---

### T18: Changesets setup

**What**: `@changesets/cli` + config + the release workflow (no publish).
**Where**: `.changeset/config.json` (new), `.changeset/README.md` (cli default),
`.github/workflows/release.yml` (new), `package.json` (devDeps + `changeset` script)
**Depends on**: T1
**Reuses**: ADR-009 config values
**Requirement**: S0-24, AD-004

**Tools**: MCP: `context7` (`@changesets/cli` config, `changesets/action`) · Skill: NONE

**Done when**:
- [ ] `@changesets/cli` + `@changesets/changelog-github` in `devDependencies`
- [ ] `.changeset/config.json`: `baseBranch:"main"`, `commit:false`, `access:"restricted"`,
  `changelog:["@changesets/changelog-github",{ "repo":"vinialbano/eventstormer" }]`
- [ ] `release.yml`: `changesets/action@v1` on push to `main`, `contents: write` +
  `pull-requests: write`, **no** `publish:` input, maintains the "Version Packages" PR
- [ ] `package.json` `version` still `0.1.0`; `changeset` script present
- [ ] `pnpm changeset --help` runs
- [ ] Gate check passes: `pnpm check`
- [ ] Test count: ~104 pass (unchanged)

**Tests**: none (build gate) · **Gate**: build
**Commit**: `build: Changesets + release workflow (ADR-009)`

---

### T19: CI changeset-guard + lefthook reminder

**What**: The PR check that a `src/**` diff carries a changeset (no-op until first release), plus
a local pre-push nudge.
**Where**: `.github/workflows/ci.yml` (modify), `lefthook.yml` (modify)
**Depends on**: T18
**Reuses**: existing `ci.yml` job shape; existing `lefthook.yml`
**Requirement**: S0-25

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `ci.yml` `changeset-guard` job on `pull_request`: checkout `fetch-depth: 0`; if
  `git diff --name-only origin/${{ github.base_ref }}...HEAD` matches `^src/` **and** no
  `.changeset/*.md` added in range → `exit 1` naming the fix; **skips (passes) while
  `CHANGELOG.md` is absent** (pre-first-release bootstrap)
- [ ] `lefthook.yml` pre-push: non-blocking job printing a reminder if staged `src/` changes have
  no staged `.changeset/*.md` (exit 0)
- [ ] Verified once manually per spec Independent Test: a throwaway branch touching `src/` with a
  `CHANGELOG.md` present fails the job; adding a changeset passes it
- [ ] Gate check passes: `pnpm check`; CI green on this PR (guard skips — no `CHANGELOG.md` yet)
- [ ] Test count: ~104 pass

**Tests**: none (build gate + one manual verification) · **Gate**: build
**Commit**: `ci: changeset guard on PRs (enforced from the first release)`

---

### T20: Flip the coverage ratchet

**What**: Turn on `coverage.thresholds.autoUpdate` now that real domain tests exist.
**Where**: `vite.config.ts` (modify), `src/domain-model-capture/domain/AGENTS.md` (note)
**Depends on**: T15
**Reuses**: the existing coverage block + its explanatory comment
**Requirement**: S0-26

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `test.coverage.thresholds = { autoUpdate: true }` — no global or per-glob number (the hard
  `**/domain/** ≥ 90%` glob is ADR-010 Slice 6); the old "no thresholds yet" comment updated to
  say the ratchet is on and a threshold bump from `pnpm test:coverage` is a deliberate committed change
- [ ] `pnpm test:coverage` runs and writes back thresholds; the resulting `vite.config.ts` is
  committed
- [ ] `domain-model-capture/domain/AGENTS.md` notes the ratchet behaviour
- [ ] Gate check passes: `pnpm check`
- [ ] Test count: ~104 pass

**Tests**: none (build gate) · **Gate**: build
**Commit**: `test: enable the v8 coverage autoUpdate ratchet`

---

### T21: Structured-output round-trip spike

**What**: The one-off probe of ADR-005's exact structured-output setup, recorded as a finding.
**Where**: `scripts/spike-structured-output.ts` (new); `package.json` (devDeps `ai`,
`@ai-sdk/anthropic`; `knip.json` — script as `entry` or `ignore`); `.specs/STATE.md` +
`research/research-aisdk.md` (findings)
**Depends on**: T16
**Reuses**: `anthropicOperationSchema` (T16) / the `Operation` Zod union (T12);
`research/research-aisdk.md` prior findings
**Requirement**: S0-27, S0-28

**Tools**: MCP: `context7` (AI SDK 7 `generateText` + `Output.object`) · Skill: NONE

**Done when**:
- [ ] `ai@7` + `@ai-sdk/anthropic@4` added (devDependencies — spike-only)
- [ ] `scripts/spike-structured-output.ts`: `generateText({ model: anthropic('claude-sonnet-5'),
  output: Output.object({ interpretation: z.array(Operation), nextMove: <minimal schema> }),
  providerOptions: { anthropic: { structuredOutputMode: 'outputFormat' } } })` — **no
  `temperature`**; prints the result, the parsed output, and `result.warnings`; prints
  `"skipped — no ANTHROPIC_API_KEY"` and exits 0 if the key is absent
- [ ] Not imported by any test; `pnpm knip` clean (listed as `entry` or `ignore`); not in CI
- [ ] A dated findings block appended to `research/research-aisdk.md` and a decision entry to
  `.specs/STATE.md` stating whether the wrapped discriminated union round-tripped and whether
  `oneOf → anyOf` sanitisation was needed/applied
- [ ] Gate check passes: `pnpm check`
- [ ] Test count: ~104 pass

**Tests**: none (deliverable is the finding) · **Gate**: build
**Commit**: `chore: structured-output round-trip spike (R3) + findings`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5

Phase 1:  T1 ──→ T2 ──→ T3
Phase 2:  T4 ──→ T5 ──→ T6 ──→ T7 ──→ T8
Phase 3:  T9 ──→ T10 ──→ T11 ──→ T12
Phase 4:  T13 ──→ T14 ──→ T15 ──→ T16
Phase 5:  T17 ──→ T18 ──→ T19 ──→ T20 ──→ T21
```

Execution is strictly sequential. Batch packing (≈7 tasks/worker, whole phases): **batch 1** =
Phase 1 + Phase 2 (8 tasks), **batch 2** = Phase 3 + Phase 4 (8 tasks), **batch 3** = Phase 5
(5 tasks) → ~3 workers. Verifier runs automatically after T21.

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1 | scaffold move (many files, one mechanical migration, cohesive) | ✅ Granular (move, not new code) |
| T2 | one file (`.dependency-cruiser.cjs`) | ✅ Granular |
| T3 | one new file + one edit | ✅ Granular |
| T4 | one module + tests | ✅ Granular |
| T5 | one module + tests | ✅ Granular |
| T6 | one module + tests | ✅ Granular |
| T7 | port + in-memory impl + contract factory (one cohesive unit in one dir) | ✅ Granular (cohesive) |
| T8 | one module + tests | ✅ Granular |
| T9 | one module + tests | ✅ Granular |
| T10 | two small schema files (ids + author), same dir, cohesive | ✅ Granular (cohesive) |
| T11 | one module + tests | ✅ Granular |
| T12 | one module + barrel + api re-export | ✅ Granular (cohesive) |
| T13 | one module (types) + tests | ✅ Granular |
| T14 | decide + evolve (one cohesive pair) + tests | ✅ Granular (cohesive) |
| T15 | project + replay (one cohesive pair) + tests | ✅ Granular (cohesive) |
| T16 | one module + tests | ✅ Granular |
| T17 | one test file | ✅ Granular |
| T18 | changesets config + workflow (one cohesive setup) | ✅ Granular (cohesive) |
| T19 | one CI job + one hook job | ✅ Granular (cohesive) |
| T20 | one config edit | ✅ Granular |
| T21 | one script + findings | ✅ Granular |

## Diagram-Definition Cross-Check

| Task | Depends On (body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | (phase start) | ✅ |
| T2 | T1 | T1→T2 | ✅ |
| T3 | T1 | T2→T3 (chain); body dep is T1 — T3 only truly needs T1, chain arrow is phase order | ✅ (T1 is earlier-or-equal) |
| T4 | T1 | (phase 2 start) — cross-phase back-dep to T1 | ✅ |
| T5 | T1 | T4→T5 | ✅ (T1 earlier) |
| T6 | T1 | T5→T6 | ✅ (T1 earlier) |
| T7 | T4 | T6→T7 | ✅ (T4 earlier, same phase) |
| T8 | T1 | T7→T8 | ✅ (T1 earlier) |
| T9 | T7, T8 | T8→T9 | ✅ (both earlier) |
| T10 | T5 | T9→T10 | ✅ (T5 earlier) |
| T11 | T10 | T10→T11 | ✅ |
| T12 | T10, T11 | T11→T12 | ✅ (both earlier) |
| T13 | T12 | T12→T13 | ✅ |
| T14 | T13 | T13→T14 | ✅ |
| T15 | T14 | T14→T15 | ✅ |
| T16 | T12 | T15→T16 | ✅ (T12 earlier) |
| T17 | T9, T15 | T16→T17 | ✅ (both earlier) |
| T18 | T1 | T17→T18 | ✅ (T1 earlier) |
| T19 | T18 | T18→T19 | ✅ |
| T20 | T15 | T19→T20 | ✅ (T15 earlier) |
| T21 | T16 | T20→T21 | ✅ (T16 earlier) |

All dependencies point backward or within-phase. The linear diagram arrows encode phase/execution
order; every task-body `Depends on` is an earlier task. ✅ Consistent.

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 | scaffold move (no new logic) | none (carried tests) | none | ✅ |
| T2 | dependency-cruiser rules | none + plant-a-violation | none (manual verify) | ✅ |
| T3 | `api.ts` seam | none (health test covers) | none | ✅ |
| T4 | Plumbing `Result` | unit | unit | ✅ |
| T5 | Plumbing `ids` | unit | unit | ✅ |
| T6 | Plumbing `Clock` | unit | unit | ✅ |
| T7 | Plumbing `EventStore` (port + memory impl) | integration | integration | ✅ |
| T8 | Plumbing migrations | unit (no-DROP guard) | unit | ✅ |
| T9 | Plumbing sqlite adapter | integration | integration | ✅ |
| T10 | Domain schema (ids/author) | unit | unit | ✅ |
| T11 | Domain schema (building blocks) | unit | unit | ✅ |
| T12 | Domain schema (operations) | unit | unit | ✅ |
| T13 | Domain `Board` model types | unit | unit | ✅ |
| T14 | Domain `Board` decide/evolve | unit (heaviest) | unit | ✅ |
| T15 | Domain `Board` project/replay | unit (heaviest + property) | unit | ✅ |
| T16 | Domain anthropic-contract | unit | unit | ✅ |
| T17 | Persistence round-trip | integration | integration | ✅ |
| T18 | Changesets config/workflow | none (build gate) | none | ✅ |
| T19 | CI job + hook | none (build gate + 1 manual) | none | ✅ |
| T20 | `vite.config.ts` | none (build gate) | none | ✅ |
| T21 | spike script | none (finding) | none | ✅ |

No `Tests: none` hides a deferral — every task that creates testable logic tests it in the same
task. ✅

---

## Task Verification Standards

Every task follows `Done when` + `Tests` + `Gate`. Test counts are cumulative estimates to catch
silent deletions — the Verifier re-derives coverage independently after T21.
