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
| AD-001 | Id generation uses `nanoid` (pin `nanoid@6.0.1`). Branded ids (`WorkshopId`, `SessionId`, `BuildingBlockId`, `OperationId`) wrap nanoid values; the resumable workshop URL is a nanoid slug. | ADR-004 fixed `.brand()` but not the generator. nanoid is URL-safe, short, one small dep, and the pin was pre-verified in the research phase (DECISIONS-PENDING §2). Rejected `node:crypto.randomUUID()` — longer, less friendly as a URL slug. | 2026-08-29 | Slice 0 + all later slices |
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

---

## Handoff

**Active feature:** `slice-0-skeleton-irreversibles` (GitHub issue #37)
**Branch:** `slice-0-skeleton-irreversibles` (off `main`)
**Phase:** Execute — tasks approved; batch sub-agents accepted (3 batches: P1+P2 / P3+P4 / P5).
Baseline `pnpm test` = 4 passing. Dispatching Batch 1 (T1–T8).
**Scope size:** Large (30 requirement IDs; 10 components; 21 tasks).
**Batch status:** Batch 1 (T1–T8) — dispatched. Batch 2 (T9–T16), Batch 3 (T17–T21) — pending.

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

**Open for Design to settle:** `OperationId` brand — added beyond ADR-004's list; keep only if the
apply round-trip / correlation genuinely needs an id the log position can't serve.

**Next step:** user approves `tasks.md` and answers the per-task tools question → Execute.
21 tasks > 8 → offer batch sub-agents (batch 1 = P1+P2, batch 2 = P3+P4, batch 3 = P5).

**Not yet started:** any code.

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
