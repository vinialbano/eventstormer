# Slice 0 — Skeleton + Irreversibles Validation

**Date**: 2026-08-29
**Spec**: `.specs/features/slice-0-skeleton-irreversibles/spec.md`
**Diff range**: `49b779a..HEAD` (26 commits `f6753df`…`39e36d5`)
**Verifier**: independent sub-agent (author ≠ verifier), evidence-or-zero
**Mode**: Code + tests (config/tooling ACs handled as build gate + planted-violation evidence)

**Verdict: ✅ PASS** (re-verify round 1, 2026-08-29). Round 0 found one surviving mutant — a
non-discriminating test for the read-model `reword` fold. Fixed in `e66f61f`: the test now
rewords `e1` from `'first'` to `'reworded'` and asserts the new label is written, `kind` stable,
the identical-label sibling `e2` untouched, `size === 2`. Re-injecting sensor mutation #2
(`project.ts:41` → `{ ...block }`) now **kills** `project.test.ts` ("expected 'first' to be
'reworded'"). Full gate re-run green (99/99), depcruise clean. All 22 tasks done, no test-count
regression. The 4 non-blocking spec-precision notes stay open for Slice 6.

---

## Task Completion

| Task | Status | Notes |
| --- | --- | --- |
| T1–T21 + T9a (22 tasks) | ✅ Done | Every `Done when` box checked in tasks.md; commit-per-task confirmed in `git log 49b779a..HEAD`. |

No partial or blocked tasks. 3 SPEC_DEVIATION markers, all judged justified (see Code Quality).

---

## Gate Check

- **Gate command**: `pnpm check` (typecheck → lint → test → depcruise → knip)
- **Result**: 99 passed, 0 failed, 0 skipped — 19 test files
- **`pnpm build`**: ✅ ok (`vue-tsc --noEmit && vite build`, 20 modules, built clean)
- **`pnpm depcruise`**: ✅ no violations (60 modules, 128 deps)
- **`pnpm knip`**: ✅ clean
- **Test count before feature**: 4 · **after**: 99 · **Delta**: +95
- **Skipped tests**: none
- **Weakened assertions**: none detected (the 4 carried tests — `schema-version` ×3, `health` ×1 —
  are byte-identical / import-path-only changes per `git diff`)

---

## Discrimination Sensor

Lightweight fault-injection, scratch edits only (`Edit` then `git checkout --`), targeting the
highest-risk new code. Tree confirmed clean before and after.

| # | File:line | Mutation | Killed? |
| --- | --- | --- | --- |
| 1 | `board/decide.ts:34` | `reword` guard flipped `!wm.has(o.target)` → `wm.has(o.target)` | ✅ Killed (4 failed) |
| 2 | `board/project.ts:41` | `reword` fold stops writing the new label (`{...block, label: op.label}` → `{...block}`) | ✅ Killed after fix `e66f61f` (round 0: ❌ survived 35/35) |
| 3 | `board/project.ts:44` | `withdraw` fold sets `withdrawn: false` instead of `true` | ✅ Killed (2 failed) |
| 4 | `board/replay.ts:11` | fold the log in reverse (`[...log].reverse().reduce(project,…)`) | ✅ Killed (3 failed) |
| 5 | `event-store/memory-store.ts:25` | stale-position guard neutralised (`!== expectedPosition` → `!== currentPosition`) | ✅ Killed (1 failed) |
| 6 | `domain/anthropic-contract.ts:22-26` | `oneOf → anyOf` override body removed | ✅ Killed (3 failed, incl. snapshot) |
| 7 | `board/evolve.ts:21` | `withdraw` write-model fold sets `withdrawn: false` instead of `true` | ✅ Killed (3 failed) |

**Sensor depth**: lightweight (7 mutations)
**Result**: round 0 — 6/7 killed; after fix `e66f61f` — **7/7 killed** ✅

### Round-0 surviving mutant — analysis (RESOLVED in `e66f61f`)

At round 0, `project(snapshot, reword)` could stop applying the new label and **no test noticed**:

- `board/project.test.ts:38` "reword changes the label but not the id" captures `e1` and `e2` both
  with label `'same'`, then rewords `e1` to `'same'` — the assertion `expect(...label).toBe('same')`
  is satisfied whether or not `project` wrote anything, because the value was already `'same'`.
- `board/replay.test.ts:29` and `:41` reword to a genuinely new label but only assert
  `replay(log)).toEqual(incremental)` where `incremental = log.reduce(project, …)` — both sides run
  the same (broken) `project`, so the equality holds under the mutation.
- `persistence-roundtrip.test.ts:42` compares `replay(fromDisk)` to `replay(ops)` — same
  self-referential shape.

Net: **spec AC "WHEN a reword targets a present `BuildingBlockId` THEN after `project` the snapshot
SHALL show the new label"** (P1 Board, criterion 4 / S0-15) had no discriminating assertion.
**Fix `e66f61f`** reworks the test to reword to a genuinely different label and assert the written
value; re-injection of mutation #2 now fails `project.test.ts:42`.

---

## Spec-Anchored Acceptance Criteria

Citations are `file:line` + assertion. `✅` = assertion targets the spec-defined outcome;
`⚠️` = spec-precision gap; `❌` = not covered / wrong.

### P1 — Context-first layout migration (S0-01…04)

| Criterion | Spec outcome | Evidence | Result |
| --- | --- | --- | --- |
| S0-01 tree shape | `src/` has `domain-model-capture/ plumbing/ host/ app/`, no `src/domain/` `src/capabilities/` `src/server.ts` | `ls src/` → `app domain-model-capture host plumbing`; `git diff --stat` shows `src/{server.ts => host/routes.ts}`, `src/{=>domain-model-capture}/domain/…` | ✅ |
| S0-02 framework-free glob is an error | `pnpm depcruise` errors on `**/domain/**` importing hono/vue/ai/node:* | `.dependency-cruiser.cjs:23-51` rules `domain-imports-no-framework` / `-no-node-builtins`, `from: '^src/[^/]+/domain/'`, `severity: error`; **re-verified live** — planted `import {Hono}` in `domain-model-capture/domain/_probe.ts` → `error domain-imports-no-framework`, exit 1 | ✅ |
| S0-03 cross-context glob is an error | importing another context's `domain/`/`capabilities/`/`infrastructure/` (not `api.ts`) fails depcruise | `.dependency-cruiser.cjs:76-88` `cross-context-only-via-api` + `:90-97` `host-imports-only-context-api` | ✅ |
| S0-04 each rule proven by a planted+reverted violation | evidence in commit message or design doc | `ad90f4c` commit body lists 7 rules each with its planted case; `7bcdf54` documents `host-imports-only-context-api`'s plant; `6981768` re-verifies `plumbing-is-a-leaf` | ✅ |
| S0-04 AGENTS.md moved, globs resolve | `domain/AGENTS.md` under the context; vitest/knip globs no orphans | `git diff` `src/{=>domain-model-capture}/domain/AGENTS.md`; `vite.config.ts:65` `include: ['src/**/*.test.ts']`; `knip.json:3-6`; gate `knip` clean | ✅ |
| S0-04 `/api/health` = `{status:"ok",opSchemaVersion:1}` | exact body | `src/host/health.test.ts:10-11` `expect(res.status).toBe(200)` + `resolves.toEqual({ status: 'ok', opSchemaVersion: 1 })` | ✅ |
| S0-04 one-file route composition, no filesystem routing | routes mounted from one `src/host/` file | `src/host/routes.ts:9` single `new Hono().route('/api', healthRoutes)`; no fs-router dep | ✅ |
| `pnpm dev` one process | Vite serves SPA + hands `/api/*` to Hono | `vite.config.ts:20-24` `devServer({ entry: 'src/host/index.ts', … })` — not automatically tested (manual `Done when` in T1) | ⚠️ config-only, unverifiable offline; T1 records a manual curl check |

### P1 — Operation-log schema SSOT (S0-05…08)

| Criterion | Spec outcome | Evidence | Result |
| --- | --- | --- | --- |
| S0-05 branded id schemas | `WorkshopId/SessionId/BuildingBlockId` via `.brand()`; bare string is a TS error | `schema/ids.ts:11-13`; `schema/ids.test.ts:18` `// @ts-expect-error` bare string; `:25-26` assignable both directions with `plumbing/ids.ts` | ✅ (OperationId omitted per AD-011 — design-confirmed) |
| S0-05 building-block union (4 kinds) | discriminatedUnion over `domainEvent/actor/system/hotSpot` | `schema/building-blocks.ts:24`; `building-blocks.test.ts:6-17` each kind parses | ✅ |
| S0-05 operation union (20 variants, entire Commands table) | discriminatedUnion over all 20 named kinds | `schema/operations.ts:120-141`; `operations.test.ts:37-42` parses a valid instance of every one of 20 | ✅ |
| S0-05 exhaustive discriminant | `switch(op.kind)` exhaustive, lint-enforced | `operations.test.ts:79-127` compile-time exhaustive switch; `decide.ts:25-74` real exhaustive switch (no `default`, `noFallthroughCasesInSwitch`) | ✅ |
| S0-06 `v: z.literal(1).default(1)`; `v` absent → 1; `v:2` rejected | | `operations.ts:20` `v: z.literal(1).default(1)`; `operations.test.ts:41` `expect(parsed.v).toBe(1)`; `:46` explicit `v:1`; `:50` `expect(() => Operation.parse({…, v: 2})).toThrow()` | ✅ |
| S0-07 author records acting party; permits proposer+accepter | | `schema/author.ts:14-17`; `author.test.ts:8` accepter alone, `:13` both, `:17` proposer-only throws | ✅ |
| S0-07 `resolve` requires `reference`, shape unconstrained | missing key fails parse | `operations.ts:116` `reference: z.unknown()` (required); `operations.test.ts:54` missing → `.toThrow()`; `:58` `reference: 42` accepted | ✅ |
| S0-07 `hotSpot.modelAffecting` boolean, default `true` (AD-014), not `kind`, not enum | | `building-blocks.ts:21` `modelAffecting: z.boolean().default(true)`; `building-blocks.test.ts:21-22` default true; `:26-32` `false` round-trips | ✅ |
| S0-08 `schema-version.ts` relocated behaviour: `canReplay(1)=true`,`canReplay(2)=false`, `REPLAYABLE` 1..N | | `schema/schema-version.ts:9-16` (moved, 0-line diff); `schema-version.test.ts` carried unchanged (3 tests pass) | ✅ |
| S0-08 zero framework/`node:*` imports in schema module | | gate `depcruise` clean; `schema/*.ts` import only `zod` | ✅ |
| S0-08 `zod` a direct `dependencies` entry | | `package.json:64` `"zod": "4.4.3"` under `dependencies` | ✅ |

### P1 — plumbing foundation (S0-09…12, S0-11b)

| Criterion | Spec outcome | Evidence | Result |
| --- | --- | --- | --- |
| S0-09 `Result<T,E>` disc-union + `ok`/`err` + `map`/`andThen`; leaf | | `plumbing/result.ts:6-24`; `result.test.ts` (7 tests): `map` skips on err, `andThen` short-circuits, narrowing; `depcruise` `plumbing-is-a-leaf` clean | ✅ |
| S0-10 id helper → nanoid value typed as brand; URL-safe slug | | `plumbing/ids.ts:23-28`; `ids.test.ts` URL-safe `/^[A-Za-z0-9_-]+$/`, 21 chars, 1000 distinct, `@ts-expect-error` bare string | ✅ |
| S0-11 synchronous `EventStore` port (no `Promise`, AD-013) | | `plumbing/event-store/port.ts:45-58` — no `Promise`, no `async`; `contract-test.ts` has no `await` | ✅ |
| S0-11 namespaced stream key `(context, aggregate, id)` | | `port.ts:8-12` `StreamKey`; `contract-test.ts:5` `{ context:'domain-model-capture', aggregate:'board', id:'w1' }` | ✅ |
| S0-11 batch-atomic append of ≥1 ops, one transaction; stale pos → transient err | | `contract-test.ts:19-25` positions `0,1,2`; `:39-53` stale → `{kind:'stale-position', classification:'transient'}`, `read` length unchanged; `:56-72` poison op mid-batch → stream at pre-batch length | ✅ |
| S0-11 sqlite row shape: workshop id, monotonic position, op_version, author, payload, timestamp | | `migrations.ts:31-41` DDL: `context,aggregate,stream_id,position,op_version,at,operation` | ⚠️ **no dedicated `author` column** — author is inside the serialized `operation` JSON, recoverable but not a distinct column. Design choice per AD-012 (author is on the `Operation`); tasks-approved. Spec-precision gap. |
| S0-11 every `node:sqlite` call in one adapter module | | `sqlite-adapter.ts:1` only file with `import … 'node:sqlite'`; `depcruise` `domain-imports-no-node-builtins` + manual (T9 `Done when`) | ✅ |
| S0-11 `BEGIN IMMEDIATE`/`COMMIT`, no partial batch | | `sqlite-adapter.ts:62-97` `BEGIN IMMEDIATE` → maxPos check → per-row insert → `COMMIT`; `ROLLBACK` on conflict/throw; `contract-test.ts` (run vs `node:sqlite` at `sqlite-adapter.test.ts:22`) | ✅ |
| S0-11 concurrent race: exactly one wins, other transient err | | modelled as stale-`expectedPosition` per `contract-test.ts:39-53`; true thread race not simulated (single-process, single-writer — spec Out-of-Scope confirms optimistic-concurrency only) | ⚠️ spec says "two appends race"; test exercises the sequential stale-position path, not a genuine concurrent race. Acceptable given the single-writer scope, but not literally the AC wording. |
| S0-11b in-memory impl enforces same semantics; lives in `plumbing/`; shared contract suite over BOTH | | `memory-store.ts`; `memory-store.test.ts:4` + `sqlite-adapter.test.ts:22` both call `eventStoreContract(...)` | ✅ |
| S0-12 `Clock` abstraction, fixed time substitutable | | `plumbing/clock.ts:6-8`; `clock.test.ts` ISO-8601 regex + fixed clock returns constant | ✅ |

### P1 — Board decider & replay (S0-13…18b)

| Criterion | Spec outcome | Evidence | Result |
| --- | --- | --- | --- |
| S0-13 `decide` pure, returns `ok`/`err`; rejection names rule + classification `systemic` | | `decide.ts:16-75` pure, no I/O; `board/model.ts:48-54` `Rejection` all `classification:'systemic'`; `decide.test.ts:44-50` `toEqual({kind:'duplicate-id', classification:'systemic', id:'e1'})` | ✅ |
| S0-13 `decide` reads ONLY the slim write model | | `decide.ts` only reads `wm.has`/`wm.get` returning `{kind,withdrawn}`; never a snapshot import | ✅ (structural — `decide.ts` imports no `project`/snapshot) |
| S0-14 capture (3 kind-specific variants) → `…Captured`/`…Identified`, block appears unplaced w/ label + provenance | | `decide.test.ts:33-41` each kind → `ok`, len 1; `project.test.ts:12-27` `toEqual({kind, label:'order placed', withdrawn:false, placement:'backlog', provenance:author})` | ✅ (Slice 0 emits the parsed operation, not a separate event type — AD per design; project records provenance) |
| S0-15 `reword` of present target → snapshot shows **new label**, same id | | `project.test.ts:38-45` (fixed `e66f61f`) — rewords `e1` `'first'`→`'reworded'`, `expect(...e1.label).toBe('reworded')` + `e1.kind` stable + `e2.label` `'first'` + `size` 2; sensor mutation #2 now killed | ✅ |
| S0-15 identical labels both exist, no dedup | | `decide.test.ts:87-93`; `project.test.ts:38-44` `blocks.size).toBe(2)`; `replay.test.ts:57-63` both survive replay | ✅ |
| S0-15 `reword` unknown target → systemic no-op | | `decide.test.ts:62-71` `toEqual({kind:'unknown-target', classification:'systemic', target:'e9'})` | ✅ |
| S0-15 empty/whitespace label rejected, previous retained | | `decide.test.ts:74-84` `'   '` → `{kind:'empty-label', …}`; schema `min(1)` catches `''` | ✅ |
| S0-16 `withdraw`/`reinstate` id preserved; reinstate returns naked block (AT-17) | | `decide.test.ts:110-118` `// AT-17` reinstate returns op naked; `project.test.ts:47-53` reinstated block `toEqual(captured)` (identical to fresh capture); `evolve.test.ts:24-29` withdrawn flips | ✅ |
| S0-16 reinstate of not-withdrawn / unknown → rejected | | `decide.test.ts:120-137` `not-withdrawn` + `unknown-target` | ✅ |
| S0-17 schema OR write-model failure → rejected, nothing emitted, state unchanged | | `decide.test.ts:141-149` malformed op → `{kind:'schema', classification:'systemic', issues.length>0}`; unchanged-state implied by pure functions + `evolve.test.ts:44-49` no-mutation | ✅ (state-identity asserted indirectly — see spec-precision note below) |
| S0-18 `replay(log) === snapshot` (AT-18a) | | `replay.test.ts:29-38` `// AT-18a` `replay(log)).toEqual(incremental)`; `:41-55` targeted sequence exact snapshot | ✅ |
| S0-18 **required** `fast-check` property `replay(log ++ [op]) === project(replay(log), op)` (ADR-008 #3) | | `replay.test.ts:74-80` `fc.assert(fc.property(fc.array(...POOL), fc.constantFrom(...POOL), …))` | ✅ |
| S0-18 author (proposer + accepter) preserved in provenance | | `project.test.ts:30-35` `provenance).toEqual({proposer:{name:'facilitator'}, accepter:{name:'Dana'}})` | ✅ |
| S0-18 inline `// AT-*` tags, no matrix file | | `decide.test.ts:108` `// AT-17`, `replay.test.ts:28` `// AT-18a`, `:73` `// ADR-008 property #3`, `:40` `// PRD F01 replay` | ✅ |
| S0-18b exhaustive `decide` switch; not-yet-implemented variants rejected explicitly | | `decide.ts:59-73` 14 kinds → `{kind:'not-implemented-in-slice', classification:'systemic', operation:o.kind}`; `decide.test.ts:151-163` loops all 14 (`NOT_IMPLEMENTED`) asserting exact rejection | ✅ (spec/tasks prose says "16 unbuilt kinds"; union is 20, 6 implemented → **14**. Code correct; spec text imprecise.) |

### P1 — Persisted log, auto-migrate, replay-on-load (S0-19…21)

| Criterion | Spec outcome | Evidence | Result |
| --- | --- | --- | --- |
| S0-19 auto-create + migrate on first construction, no manual step | | `sqlite-adapter.ts:40` `applyMigrations(db)` in constructor; `persistence-roundtrip.test.ts:72-76` fresh path → `read` returns `[]` (would throw "no such table" if unmigrated); `sqlite-adapter.test.ts:27-30` | ✅ |
| S0-19 additive migrations apply, no row mutated/dropped | | `migrations.test.ts:42-45` no `up` matches `/\bDROP\b/i`; `:74-84` idempotent (second `applyMigrations` re-runs nothing) | ✅ |
| S0-19 every `operation_log` row has non-null `op_version` | | DDL `op_version INTEGER NOT NULL` (`migrations.ts:36`); `persistence-roundtrip.test.ts:63-70` `versions).toEqual(ops.map(()=>OP_SCHEMA_VERSION))` | ✅ |
| S0-20 append → process ends → new store → replay == pre-restart projection | | `persistence-roundtrip.test.ts:42-53` two `createSqliteEventStore(path)` on same file, `replay(second.read)` `toEqual(replay(ops))` | ✅ |
| S0-20 workshop id with no stream → empty projection, not error | | `persistence-roundtrip.test.ts:55-61` `read` → `[]`, `replay([])` `toEqual(emptySnapshot())`; `replay.test.ts:24-26` | ✅ |
| S0-21 `pnpm db:reset` removes the DB file | | `package.json:21` `db:reset` `rmSync` of `data/eventstormer.db{,-wal,-shm}` | ⚠️ script present, not executed in a test (config-only; matches Test Coverage Matrix "none — manual") |

### P1 — Anthropic contract (S0-22, S0-23)

| Criterion | Spec outcome | Evidence | Result |
| --- | --- | --- | --- |
| S0-22 `z.toJSONSchema()` + `override` rewriting `oneOf`→`anyOf`; no `oneOf` at any depth | | `anthropic-contract.ts:14-27`; `anthropic-contract.test.ts:14-15` `expect(json).not.toContain('"oneOf"')`; `:18-21` 20-member `anyOf` | ✅ |
| S0-23 pure function of the SSOT, no hand-maintained copy | | `anthropic-contract.ts:15` derives from `Operation`; `:31-32` repeat call `toEqual`; snapshot `:35-36` | ✅ |
| S0-23 `knip` does not flag it; framework-free; under `domain-model-capture/domain/` | | gate `knip` clean; `depcruise` clean; path `src/domain-model-capture/domain/anthropic-contract.ts` | ✅ |
| S0-23 re-exported via `api.ts` | | `api.ts:6` `export { anthropicOperationSchema } from './domain/anthropic-contract.ts'` | ✅ |

### P1 — Changesets & release CI (S0-24…26)

| Criterion | Spec outcome | Evidence | Result |
| --- | --- | --- | --- |
| S0-24 `.changeset/config.json`: `baseBranch:main`, `commit:false`, `access:restricted`, `changelog:@changesets/changelog-github` | | `.changeset/config.json:2-9` all four present (`changelog` as `["@changesets/changelog-github", {repo}]` — T18-approved array form) | ✅ |
| S0-25 CI job fails a `src/**` PR with no `.changeset/*.md` | | `.github/workflows/ci.yml:33-55` `changeset-guard`; inert while `CHANGELOG.md` absent (documented bootstrap, AD-004) | ⚠️ logic present and reviewed; **not exercised** (no `CHANGELOG.md` yet, and CI runs are not in the diff). T19 records one manual verification. |
| S0-25 Slice 0 PR is the documented exception | | `ci.yml:31-32` comment; AD-004 in STATE.md | ✅ |
| S0-24 standing "Version Packages" PR, no `publish` | | `.github/workflows/release.yml:33-36` `changesets/action@v1`, no `publish:` input | ✅ |
| S0-26 `package.json` version stays `0.1.0` | | `package.json:3` `"version": "0.1.0"` | ✅ |
| S0-26 `pnpm check` sequence + CI (+`build`) green | | gate run green; `ci.yml:88-108` identical sequence + `build` | ✅ |
| S0-26 `coverage.thresholds.autoUpdate: true`, no hard number | | `vite.config.ts:51-53` `thresholds: { autoUpdate: true }` — no global/glob number | ✅ |

### P2 — Structured-output spike (S0-27, S0-28)

| Criterion | Spec outcome | Evidence | Result |
| --- | --- | --- | --- |
| S0-27 `ai` + `@ai-sdk/anthropic` installed at verified pins | | `package.json:29,40` `@ai-sdk/anthropic@4.0.41`, `ai@7.0.77` (devDeps) | ✅ |
| S0-27 ADR-005 exact setup: `claude-sonnet-5`, `Output.object` wrapper, `outputFormat`, no `temperature`; logs `result.warnings` | | `scripts/spike-structured-output.ts:35-69` — `anthropic('claude-sonnet-5')`, `Output.object({schema: z.object({interpretation: z.array(Operation), nextMove})})`, `structuredOutputMode:'outputFormat'`, no `temperature`, prints `result.warnings` | ✅ |
| S0-27 skip-if-no-key, exits 0 | | `spike-structured-output.ts:25-28` prints `skipped — no ANTHROPIC_API_KEY`, returns (exit 0) | ✅ |
| S0-28 findings to `.specs/STATE.md` + `research/research-aisdk.md`, incl. `oneOf→anyOf` verdict | | AD-015 in `.specs/STATE.md:30`; `research/research-aisdk.md` dated R3 block with the source-level `oneOf→anyOf` verdict | ✅ |
| S0-28 probe outside test suite, not in CI, knip-clean; no test hits the real API | | `scripts/` file, not imported by any test; gate `knip` clean; not referenced in `ci.yml` | ✅ |
| Spike UNRUN | acceptable per AD-015 (no key in build env) | probe correct, finding recorded — **not failed on "unrun"** per instruction | ✅ |

**Status**: ❌ 1 AC not covered by a discriminating test (S0-15 read-model reword) · ⚠️ 4
spec-precision gaps flagged (author column; concurrent-race wording; `pnpm dev` / `db:reset` /
changeset-guard config-only, unverifiable offline).

---

## Edge Cases

| Edge case (spec.md) | Covered? | Evidence |
| --- | --- | --- |
| Schema module loads in a `node` (non-DOM) env | ✅ | `vite.config.ts:64` domain project `environment: 'node'`; all schema tests run there green |
| Well-formed but absent `BuildingBlockId` → explicit no-op rejection, not throw | ✅ | `decide.test.ts:62-71,102-106,133-137` unknown-target rejections |
| `nanoid` id URL-safe (no `/` or `+`) | ✅ | `ids.test.ts` `/^[A-Za-z0-9_-]+$/` over 1000 draws |
| DB file present but corrupt/unreadable → fail loudly, don't start empty / don't overwrite | ⚠️ **not covered** | no test constructs a store against a corrupt file. `sqlite-adapter.ts` has no explicit corrupt-file guard beyond `DatabaseSync` throwing. Spec says "Slice 0 SHALL NOT overwrite a corrupt file" — plausibly true (no `DROP`/recreate path) but unproven. |
| Two variants serializing to same JSON still told apart on parse | ✅ | discriminated union; `operations.test.ts:63` unknown kind throws; every variant carries a literal `kind` |
| `changeset version` with no changesets → no-op, `0.1.0` intact | ⚠️ config-only | not executed; AD-004 + `package.json:3` |

---

## Code Quality

| Principle | Status | Note |
| --- | --- | --- |
| Minimum code / no features beyond ask | ✅ | Folds are ~30 lines each; `Result` is 24 lines with only earned combinators; no speculative bus/logger (AD-002) |
| Surgical changes | ✅ | T1 is a pure move (0-line diff on `schema-version.ts`); carried tests unchanged |
| No single-use abstraction | ✅ | `EventStore` port earned as test seam + 2 impls + shared contract (AD-007); `MigrationDb` structural type keeps `node:sqlite` in one file |
| Matches existing patterns | ✅ | chained Hono routes preserved with the cautionary comment; ADR-008 `Given/When/Then` test style followed |
| Tests map 1:1 to ACs, non-shallow | ✅ | Strong overall (inline `// AT-*` tags, exhaustive not-implemented loop is *stronger* than the specified `fast-check` sample). Round-0 exception (`project.test.ts` reword asserting a pre-existing value) fixed in `e66f61f`. |
| Every test maps to a spec AC / edge case / Done-when | ✅ | no unclaimed tests found |
| Documented guidelines followed | ✅ | `AGENTS.md`, `docs/testing.md` (co-location, `environment:'node'`), `docs/adr/008` (decider weight, property #3), `src/domain-model-capture/domain/AGENTS.md` |

### SPEC_DEVIATION markers — judged

1. **T7** — `.dependency-cruiser.cjs` `not-to-dev-dep` `pathNot` widened `\.(spec|test)\.` →
   `(\.(spec|test)|-test)\.` to exempt `contract-test.ts` (imports `vitest`, never ships).
   **Justified** — the shared-contract-suite pattern is mandated by S0-11b and the module genuinely
   never ships. Minor residual: a production file *named* `x-test.ts` would also be exempted from
   the dev-dep rule. Acceptable; note for Slice 6 cleanup.
2. **T18** — `@changesets/cli` pinned `2.31.1` not `3.x` (3.x needs `pnpm >=10`; repo pins
   `pnpm@8.15.4` + `engine-strict`). **Justified** — 2.x is the stable major, takes the identical
   config; the alternative is unblockable without moving the pnpm pin (out of scope).
3. **T21** — `tsconfig.json` `include` += `scripts/**/*.ts` + a `spike:structured-output` jiti
   script. **Justified** — ESLint `projectService` rejects a `.ts` file absent from every tsconfig;
   `scripts/` is outside `src/` so depcruise never scans it; jiti is the only loader that resolves
   the `~/` alias the real `Operation` union pulls in.

---

## Requirement Traceability Update

| Requirement | Previous | New |
| --- | --- | --- |
| S0-01, S0-02, S0-03, S0-04 | Pending | ✅ Verified |
| S0-05, S0-06, S0-07, S0-08 | Pending | ✅ Verified |
| S0-09, S0-10, S0-12 | Pending | ✅ Verified |
| S0-11 | Pending | ⚠️ Verified with spec-precision gaps (no `author` column; concurrent-race AC exercised as sequential stale-position) |
| S0-11b | Pending | ✅ Verified |
| S0-13, S0-14, S0-16, S0-17, S0-18, S0-18b | Pending | ✅ Verified |
| S0-15 | Pending | ✅ Verified (fix `e66f61f` — discriminating reword test; sensor mutation #2 now killed) |
| S0-19, S0-20 | Pending | ✅ Verified |
| S0-21 | Pending | ⚠️ Verified (config-only; not test-exercised) |
| S0-22, S0-23 | Pending | ✅ Verified |
| S0-24, S0-26 | Pending | ✅ Verified |
| S0-25 | Pending | ⚠️ Verified (guard logic reviewed; not exercised — inert pre-first-release, no CI run in diff) |
| S0-27, S0-28 | Pending | ✅ Verified (probe correct + finding recorded; UNRUN acceptable per AD-015) |

---

## Fix Plans

### Fix 1 — read-model `reword` fold has no discriminating test (S0-15) · Priority: Major · ✅ RESOLVED `e66f61f`

- **Root cause**: `board/project.test.ts:38-45` rewords `e1` to `'same'` when the block's label is
  already `'same'`; the replay/roundtrip tests only compare `replay` output to a `project`-built
  value, so both sides move together under a `project` regression. Result: `project` can stop
  applying the new label and the suite stays green (sensor mutation #2 survived).
- **Fix task**: In `board/project.test.ts`, change the reword case to reword `e1` from its captured
  label to a **genuinely different** label and assert:
  `expect(snap.blocks.get(bid('e1'))?.label).toBe('<new label>')` and
  `expect(snap.blocks.get(bid('e2'))?.label).toBe('<original>')` and `blocks.size === 2`.
  Optionally add a `replay.test.ts` case asserting an exact post-reword label on the replayed
  snapshot (not via `incremental`).
- **Done when**: sensor mutation #2 (`project.ts:41` → `{...block}`) fails at least one test.

---

## Summary

**Overall**: ✅ Ready (re-verify round 1). Round-0 Major fix (shallow reword test) resolved in
`e66f61f`; sensor now 7/7. The 4 spec-precision notes remain open, all non-blocking, Slice 6.

**Spec-anchored check**: ~27 AC groups verified against spec outcome · 0 not covered ·
4 spec-precision gaps flagged (non-blocking)
**Sensor**: 7/7 mutations killed (round 0: 6/7)
**Gate**: `pnpm check` 99 passed / 0 failed · `pnpm build` ok

**What works**: the whole append→replay spine (decide/evolve/project/replay, both EventStore
impls, sqlite persistence + auto-migrate + restart round-trip), the frozen 20-variant v:1 schema
with exhaustive-switch enforcement, branded ids sharing one Zod `$brand` mechanism across the
plumbing seam, the `oneOf→anyOf` compile-time sensor, Changesets wiring, and the (correct, unrun)
R3 spike. Dependency-cruiser rules are real globs and each was re-confirmed by a planted violation.

**Issues found**: Fix 1 resolved. Remaining (non-blocking, Slice 6): `not-to-dev-dep` `-test.ts`
carve-out is slightly broad; no test proves corrupt-DB-file behaviour (spec edge case);
`changeset-guard` unexercised (inert pre-first-release, by design); no dedicated `author` column.

**Next steps**: none blocking — slice is ready to merge.
