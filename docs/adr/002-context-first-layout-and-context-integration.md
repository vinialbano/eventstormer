# ADR-002: Context-First Layout and In-Process Context Integration

- **Date**: 2026-08-29
- **Status**: Accepted
- **Deciders**: Vinicius Albano
- **Tags**: architecture, structure, bounded-context, integration
- **Supersedes**: the layout section of [ADR-001](001-adopt-vite-vue-hono-node-sqlite-over-nuxt.md)
- **Source**: [#21 (G2)](https://github.com/vinialbano/eventstormer/issues/21), [#26 (G7)](https://github.com/vinialbano/eventstormer/issues/26)

## Context and Problem Statement

The scaffold organised `src/` by technical layer — `src/domain/`, `src/capabilities/`,
`src/plumbing/`, `src/app/`. `anoria-commons:code-architecture` rule #1 is that a codebase is
organised by **bounded context first, capability second, never by layer**. The confirmed domain
(`docs/domain/`) has three v1 bounded contexts, and the reason to prefer context-first is
concrete: a change should land in one context folder and not ripple.

The hard constraint from ADR-001 is unchanged — the domain model imports no framework, and that
must stay mechanically enforced.

## Decision Outcome

**Organise `src/` by bounded context. Each context folder holds its own `domain/`,
`capabilities/`, `infrastructure/`, and `api.ts`.**

```
src/
  domain-model-capture/       Core   — Board aggregate; the operation log + graph projection
  session-facilitation/       Core   — Workshop / Session / Proposal / Resolution; the facilitator
  derived-artifact-generation/ Supporting — deterministic template renders; no aggregate
  host/                       composition root: Hono app, route mounting, wiring, schedulers
  plumbing/                   Result, branded ids, EventStore port + adapter, bus, clock, logger
  app/                        Vue SPA — talks to capabilities over HTTP only
```

- **The framework-free rule becomes a glob:** `**/domain/** ↛ {hono, vue, pinia, ai, node:*}`,
  replacing ADR-001's single `src/domain` path. Still one dependency-cruiser rule, still
  build-breaking, still verified by planting a violation.
- **Cross-context imports go only through `api.ts`** — never another context's `domain/`,
  `capabilities/`, or `infrastructure/`. A second dependency-cruiser rule enforces this.
- Slices within a context still may not import each other (unchanged from ADR-001); they share
  through that context's `domain/` or through `plumbing/`.
- Routes are composed in `src/host/routes.ts` — each slice exports its Hono router, `host` mounts
  it. Composed, not discovered (unchanged from ADR-001).

### In-process context integration in v1

The domain models cross-context effects as events and policies (`Contribution Interpreted →
Propose Building Block`, `Proposal Accepted → apply operation`, the withdrawal cascades).
`code-architecture`'s default for a cross-context workflow is either choreography over a real
async bus or a Process Manager. v1 runs one process, one SQLite file, one user, with F14
(real-time collaboration) explicitly out of scope, so it uses two simpler mechanisms — named
precisely, because "synchronous choreography" is a contradiction that invites the wrong critique:

- **Fire-and-forget in-process events** — the event bus carries only effects whose loss is
  tolerable and self-correcting: `Raise Hot Spot` from the close-time question sweep, and
  `Raise Hot Spot` from a `Proposal` that is `APPLY_FAILED` at close. This is genuine
  choreography: emit, no coordinator, no awaited result. A throwing subscriber is logged, not
  retried (bus mechanics are settled in Slice 1). Confirmed by the storm — the interpretation
  fan-out is "plain choreography, no process manager".
- **Direct synchronous cross-context calls** — everything with a result the caller must act on.
  `review-proposal`'s accept handler calls `domain-model-capture`'s `api.ts` to apply the
  operation, branches on the `Operation Applied` / `Operation Rejected` result, then records the
  outcome on the `Proposal`. This is orchestration-shaped, not choreography. `code-architecture`
  calls a synchronous cross-context command a smell; v1 accepts it, contained behind the one
  handler, because the alternative (a Process Manager aggregate + async bus) is unearned for a
  single-process prototype.

**Transaction boundary — the one rule that must not slip:** each context commits its own stream
through its own `EventStore.append` call. The accept handler never wraps `domain-model-capture`'s
append and `session-facilitation`'s append in one SQLite transaction, even though they share the
file. Sequence: apply into Capture (commit) → on `Operation Applied`, record on the Proposal
(commit). A crash between the two commits leaves the operation applied and the `Proposal` still
`PENDING`; this window is acceptable because it is single-user and local. Reconciling it — how the
accept handler detects "already applied" on retry and records the outcome without a second apply —
is designed with the apply round-trip in Slice 2 (candidate: the `OperationId` correlation AD-011
defers to exactly that slice). Keeping the two commits separate is what makes the F14 move to a
real async bus a transport change, not a decider change.

The event *names* remain the domain vocabulary throughout.

## Consequences

- **Positive:** a change to one context is contained in one folder; the strategic boundaries are
  visible in the tree and enforced by two mechanical rules; no distributed-systems machinery
  (bus retries, a process-manager aggregate) for a single-process prototype.
- **Negative / accepted:** the accept path is a synchronous cross-context command — a
  `code-architecture` smell. Contained behind one handler, with the per-context transaction rule
  above as the guardrail that keeps the boundary real. F14 is the trigger that turns it async;
  nothing else should.
- **Negative:** a scaffold migration — ADR-001's layout note, `AGENTS.md`, the dependency-cruiser
  rules, the `src/domain/AGENTS.md` path scope, and the vitest/knip globs all change. Bounded:
  only health-check stubs exist. Done in Slice 0.
- **Negative:** three `domain/` folders instead of one — the "one rule" is now a glob, marginally
  less punchy as a sentence, identical in enforcement.

## Links

- [ADR-001](001-adopt-vite-vue-hono-node-sqlite-over-nuxt.md) — the stack this builds on
- [ADR-003](003-hand-rolled-event-sourcing-and-result-types.md) — what lives in `domain/`
- [ADR-007](007-frontend-architecture.md) — the client side of the synchronous accept path
- `docs/domain/context-map.md` — the three contexts and their integration patterns
  (Capture→Facilitation: "in-process command/query", the apply-confirmation round trip)
- `.specs/STATE.md` AD-016 — the per-context-transaction constraint for the accept handler
