# ADR-002: Context-First Layout and Synchronous Choreography

- **Date**: 2026-08-29
- **Status**: Accepted
- **Deciders**: Vinicius Albano
- **Tags**: architecture, structure, bounded-context, choreography
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

### Synchronous choreography in v1

The domain models cross-context effects as events and policies (`Contribution Interpreted →
Propose Building Block`, `Proposal Accepted → apply operation`, the withdrawal cascades).
`code-architecture`'s default for a cross-context workflow is a Process Manager. **v1 deviates,
deliberately and with the domain team's `[storm]`-confirmed backing** (the interpretation
fan-out is "plain choreography — no process manager"):

- The **in-process event bus carries only fire-and-forget effects** — `Raise Hot Spot` from the
  close-time question sweep, and `Raise Hot Spot` from a `Proposal` that is `APPLY_FAILED` at
  close.
- **Everything else is a synchronous call chain inside one HTTP handler.** `review-proposal`'s
  accept handler runs Proposal-decider → apply into Capture → `Operation Applied/Rejected` →
  Proposal update, and returns the final state. The withdrawal cascades are follow-on operations
  the Board decider appends in the same `edit-model` handler.

The event *names* remain the domain vocabulary. Only the transport is simplified, and the seam is
drawn so F14 (real-time collaboration) can move these onto a real async bus without touching a
decider.

## Consequences

- **Positive:** a change to one context is contained in one folder; the strategic boundaries are
  visible in the tree and enforced by two mechanical rules; no distributed-systems machinery
  (bus retries, a process-manager aggregate) for a single-process prototype.
- **Negative:** a scaffold migration — ADR-001's layout note, `AGENTS.md`, the dependency-cruiser
  rules, the `src/domain/AGENTS.md` path scope, and the vitest/knip globs all change. Bounded:
  only health-check stubs exist. Done in Slice 0.
- **Negative:** three `domain/` folders instead of one — the "one rule" is now a glob, marginally
  less punchy as a sentence, identical in enforcement.

## Links

- [ADR-001](001-adopt-vite-vue-hono-node-sqlite-over-nuxt.md) — the stack this builds on
- [ADR-003](003-hand-rolled-event-sourcing-and-result-types.md) — what lives in `domain/`
- `docs/domain/context-map.md` — the three contexts and their integration patterns
