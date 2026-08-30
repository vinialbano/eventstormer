# ADR-003: Hand-Rolled Event Sourcing and Result Types

- **Date**: 2026-08-29
- **Status**: Accepted
- **Deciders**: Vinicius Albano
- **Tags**: architecture, domain, event-sourcing, error-handling
- **Source**: [#10 (R1)](https://github.com/vinialbano/eventstormer/issues/10), [#11 (R2)](https://github.com/vinialbano/eventstormer/issues/11), [#21 (G2)](https://github.com/vinialbano/eventstormer/issues/21)

## Context and Problem Statement

The domain is event-sourced by the PRD's own design — an append-only operation log, replayed to
reproduce the model (`replay(log) === snapshot` is an acceptance criterion). Two questions:
does a library carry the event-sourcing, and does a library carry the error handling? Both must
be answerable from `src/**/domain/`, which imports no framework.

## Considered Options

**Event sourcing:** Emmett, castore, EventStoreDB / message-db clients, hand-rolled
`decide`/`evolve`.
**Error handling:** Effect, neverthrow, hand-rolled `Result`, plain exceptions.

## Decision Outcome

### Event sourcing — hand-rolled `decide` / `evolve`

Per aggregate, a module exporting pure functions:

```
decide(state, command)  → Result<Event[], Rejection>   // pure, no mutation
evolve(state, event)    → state                        // fold one event
replay = events.reduce(evolve, initialState)
```

All five aggregates (Board, Session, Proposal, Resolution, Workshop) are event-sourced and take
this shape. No classes, no `this`. The `EventStore` port lives in `plumbing/` with one
`node:sqlite` adapter behind it and a one-file `better-sqlite3` escape hatch; streams are
namespaced per context + aggregate, and no context reads another's streams.

- **Emmett** rejected: pre-1.0 (active alpha/beta/rc), npm `license: Proprietary`, and its
  value — store adapters, subscriptions, projection runners, HTTP packages — is exactly what a
  single-writer in-process template-projection design never uses. Its SQLite adapter peers on
  `better-sqlite3`, not `node:sqlite`, and importing it into `domain/` needs a dependency-cruiser
  exemption this repo forbids.
- **castore** rejected: unmaintained since 2025-04, no SQLite adapter, drags `@babel/runtime`
  into the domain layer.
- **EventStoreDB / message-db** rejected: a dedicated server process, contradicting ADR-001.

The Design-Level canvas already specifies the `decide`/`evolve`/`replay` shape. It is ~100 lines
we control, and the PRD's `replay(log) === snapshot` falls straight out.

### Error handling — hand-rolled `Result<T, E>`

A discriminated-union `Result` in `plumbing/`. The domain's own design dictates it: `decide`
returns `event(s) | rejection with reason`, and every F01/F06/F18 acceptance criterion asserts
"rejected, snapshot unchanged". Rejections are a high-traffic primary path (schema-invalid,
cycle, unknown/withdrawn target, empty label), so the outcome must be explicit in the contract.

- **Effect** rejected on three independent grounds: it defines its own runtime (fibers,
  scheduler) — a direct conflict with `src/domain/AGENTS.md`'s "plain TypeScript only", which
  would itself need an ADR to override; the learning cost is unjustifiable for a timeboxed
  agent-built prototype; and the AI SDK and Hono are both exception-based, so all-in Effect adds
  `runPromise`/`tryPromise` glue at every boundary rather than removing any.
- **neverthrow** is kept in reserve as a one-import drop-in if manual `if (!r.ok) return r`
  propagation gets noisy.

**Where the boundary sits:** `domain/` returns `Result` and never throws for a rejection;
`capabilities/` wrap infrastructure (`node:sqlite`, the AI SDK) in `try/catch` and classify by
retry behaviour; `http.ts` is the sole place mapping to a status code (422 schema/projection,
409 cycle with the offending path, 500 for an unexpected throw).

## Consequences

- **Positive:** zero framework surface in the domain; the code matches the confirmed canvas; the
  `node:sqlite` RC risk stays behind one port.
- **Positive:** `op_version` (see [ADR-004](004-operation-log-schema-and-versioning.md)) and the
  append-only table are ours to shape from commit one.
- **Negative:** we own the event-store adapter, upcasters, and the `Result` plumbing — but each
  is small and none is load-bearing on a third party's release cadence.

## Links

- [ADR-004](004-operation-log-schema-and-versioning.md) — the log schema this replays
- [ADR-002](002-context-first-layout-and-context-integration.md) — where these modules live
