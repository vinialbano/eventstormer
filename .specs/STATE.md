# Project State — EventStormer

Project memory for spec-driven-development. Decisions log (durable) + Handoff snapshot (in-flight).

The strategic record lives elsewhere and outranks this file: `docs/product/PRD.md` (product
truth), `docs/domain/` (confirmed domain language), `DESIGN.md` + `docs/adr/001–011`
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

---

## Handoff

**Active feature:** `slice-0-skeleton-irreversibles` (GitHub issue #37)
**Branch:** `slice-0-skeleton-irreversibles` (off `main`)
**Phase:** **COMPLETE — verified.** All 22 tasks (T1–T21 + T9a), `f6753df`…`e66f61f`
(range `49b779a..HEAD`). `pnpm check` + `pnpm build` green, **99 tests** (19 files), depcruise +
knip clean, no DB files tracked.
**Verifier verdict: PASS ✅** (re-verify round 1) — `validation.md`. Round 0 found one Major gap
(S0-15: the read-model `reword` fold had a tautological test — mutant survived); fixed in
`e66f61f` (test-only, +7/-6); round 1 re-injected the mutation → now killed. Final sensor 7/7,
spec traceability 27 ✅ / 3 ⚠️ (non-blocking, Slice 6) / 0 ❌.
**Next:** open PR for issue #37. Then Slice 1 (F18/F03/F04/F05 — the capture loop).
**Scope size:** Large (30 requirement IDs; 10 components; 22 tasks).

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
- README stale layout → Slice 6 (per DESIGN.md).

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
- `DECISIONS-PENDING.md` is gitignored local scratch, superseded by ADRs 001–011 + DESIGN.md —
  do not treat it as authoritative; do not commit it.
