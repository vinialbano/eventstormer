# ADR-004: Operation-Log Schema, Versioning, and the Zod Single Source of Truth

- **Date**: 2026-08-29
- **Status**: Accepted
- **Deciders**: Vinicius Albano
- **Tags**: domain, persistence, schema, versioning
- **Source**: [#20 (G1)](https://github.com/vinialbano/eventstormer/issues/20), [#18 (R9)](https://github.com/vinialbano/eventstormer/issues/18)

## Context and Problem Statement

The operation log is append-only *forever* — a v1 operation must stay replayable after the schema
changes. The schema is also shared three ways: the domain reducer validates against it, the
persistence layer replays against it, and the AI facilitator's output is constrained by it. It
needs one definition and a versioning rule that does not require retrofitting.

## Decision Outcome

### One framework-free Zod-4 module in `src/domain-model-capture/domain/`

- Branded id schemas (`WorkshopId`, `SessionId`, `BuildingBlockId` — `.brand()`, zero wire cost,
  compile error on a string-vs-string mixup).
- One `z.discriminatedUnion("kind", [...])` over per-kind operation variants and per-kind
  building-block schemas.
- The Anthropic tool/output contract is **derived** from it via `z.toJSONSchema()` at module
  load, with an `override` callback rewriting `oneOf` → `anyOf` (Zod emits `oneOf` for a
  discriminated union; Anthropic rejects `oneOf`). Never hand-written.
- `zod` moves from a transitive dependency to a direct runtime dependency in the first F01 commit.

### The operation-kind catalog is the Domain Model Capture canvas Commands table

`capture` (kind-specific) · `reword` · `sequence` / `unsequence` · `insert between` ·
`place` / `unplace` · `link cause` / `unlink cause` · `annotate` / `unannotate` ·
`mark pivotal` / `unmark pivotal` · `withdraw` / `reinstate` · `resolve` / `reopen`.

The PRD F01 list is the stale one — it is reconciled in the maintainer's owned PRD pass (#29),
and per `AGENTS.md` the domain doc wins.

### Versioning

- `v: z.literal(1).default(1)` on **every** operation variant; an `op_version` column on every
  `operation_log` row — both from the **first F01 commit**. Retrofitting either is the single
  most expensive possible change.
- **A v1 operation shape is never mutated.** A future change adds `z.literal(2)` variants beside
  the frozen v1 ones; upcasters live in the persistence adapter; DDL is additive-only.
- `src/domain-model-capture/domain/schema-version.ts` holds `OP_SCHEMA_VERSION` and a `canReplay`
  gate.

### Replay and the write model

- **Replay every load.** No snapshot cache in v1 — the fold is sub-millisecond at the elicited
  scale (low hundreds of building blocks, single-digit thousands of operations per workshop). A
  snapshot is added only if a real session proves slow.
- **Archive is not a choice:** `Withdraw`/`Reinstate` are operations; `withdrawn?` is derived
  projection state. The op is the truth, the flag is the fold. Withdrawal cascades are follow-on
  operations on the same serialized log.
- The **write model** (what the guards read) is the canvas table: id → {kind, withdrawn?},
  `follows` adjacency, `causedBy` endpoints, hot-spot open/resolved state + annotation target id.
  Everything else — label, pivotal marker, placement-for-display, the resolution reference value
  — is projection detail, reconstructable from the log.

### Two domain open questions, settled

- **#32 — a Hot Spot's `kind` (informational / model-affecting) IS a stored field**, set at
  `Raise Hot Spot` time, default model-affecting, changeable by a reword-style operation. PRD F08
  leans on the distinction; the facilitator picks it from conversational context absent from the
  graph at replay time; there is nothing to derive it from.
- **#33 — no `destroy` operation.** Conflicts with the confirmed no-merge / no-destructive-delete
  stance; `Withdraw` already covers "stop showing this"; F01 deliberately preserves duplicates.

## Consequences

- **Positive:** one schema, no drift between domain / persistence / AI contract; replay stays
  sound across schema evolution; `switch-exhaustiveness-check` (already enabled) forces every
  consumer to handle a new operation or building-block kind.
- **Positive:** F12/F13 (Process Modelling, Design-Level) extend the unions by adding variants;
  no existing variant changes.
- **Negative:** the discipline is permanent — a sloppy v1 shape is frozen forever. Mitigated by
  writing the schema first, in Slice 0, with the canvas open.

## Links

- [ADR-003](003-hand-rolled-event-sourcing-and-result-types.md) — the reducer that replays this
- [ADR-005](005-ai-facilitator.md) — the AI contract derived from this schema
- `docs/domain/bounded-contexts/domain-model-capture/canvas.md`
