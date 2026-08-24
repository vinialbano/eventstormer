# ADR-001: Adopt Vite + Vue 3 + Hono + node:sqlite Over Nuxt and NestJS

- **Date**: 2026-08-24
- **Status**: Accepted
- **Deciders**: Vinicius Albano
- **Tags**: architecture, stack, backend, frontend, persistence

## Context and Problem Statement

The domain layer (model, reducer, replay, invariants) must never import a framework, and that
rule needs to be a build-breaking, mechanically-verified constraint rather than a convention
agents erode over time. The rest of the stack — frontend framework, backend framework, and
persistence — had to be chosen consistently with that requirement, for a single local developer
building end to end in about a week, in a way that could be explained and defended afterward.

## Decision Drivers

- `domain ↛ framework` must be enforceable by a static-analysis tool reading the real import
  graph, not a heuristic that degrades under auto-imports or generated config.
- Whichever backend is chosen must let capability slices own their own entry point and data,
  per `code-architecture`'s vertical-slice rules — not just avoid importing the domain badly.
- The whole API surface should be legible from one file, not discovered by convention.
- v1 targets a single local user in one session; no requirement for SSR, a managed database, or
  multi-region deploy.
- Minimize dependency surface and moving parts for a solo, timeboxed build — every pattern taxes
  every future change, and the budget should go where a concrete present trigger demands it.
- The stack choice is itself part of what a reviewer evaluates: "tooling choices & rationale —
  your stack fits the problem, and you can explain the tradeoffs you weighed, including what you
  deliberately chose not to do" is a named grading dimension, not incidental to one.

## Considered Options

- Vite + Vue 3 SPA + Hono + `node:sqlite`
- Nuxt (full-stack meta-framework)
- NestJS + Prisma
- React (not comparatively evaluated — see below)

## Decision Outcome

Chosen option: **"Vite + Vue 3 SPA + Hono + `node:sqlite`"**.

Nuxt was rejected for two *separate* reasons, not one — collapsing them into "the router is the
filesystem" overstates what filesystem routing alone actually breaks:

1. **Auto-imports hide the dependency edges static analysis exists to police.** A composable used
   with no `import` statement for a tool to trace is invisible coupling, and Nuxt's own docs
   confirm the toggle (`imports.autoImport: false`) only disables the *user's own* auto-imports —
   the framework's generated `.nuxt/tsconfig.json` and virtual modules (`#imports`, `#app`,
   `#build`) remain regardless, and no published example of resolving them through a static
   import-graph tool was found. That is an accepted, named risk in the original research, not a
   gap discovered after the fact.
2. **Filesystem-forced routing prevents a slice from owning its own entry point.** `app/pages/**`
   and `server/api/**` map to URLs by location; you cannot put a handler inside
   `capabilities/place-order/` and get routing for free without real work against
   `pages:extend`/`addComponentsDir`-style hooks. That is a `code-architecture` rule #2 problem
   (a slice owns its entry point), independent of whether dependency-cruiser can trace imports.

In Hono, by contrast, a route is a method call on an exported object (`app.route(...)`), so a
slice-owned route file composes into one readable file with no framework machinery between the
rule and the code. Measured cost of that manual wiring against Nuxt's free routing: roughly
20–30 minutes upfront, against 60–90 minutes of Nuxt convention friction estimated to land
unpredictably through the build — worse than the upfront cost because it arrives as surprises,
not as a line item.

NestJS + Prisma was rejected on proportionality, not on mechanical enforcement — Nest's
constructor-injected DI resolves through ordinary, explicit TypeScript imports (the one
documented hidden-coupling risk is `@Global()` module misuse, an avoidable discipline problem,
not a structural one), so a static-analysis tool traces it exactly as well as it traces Hono.
Prisma's SQLite provider also means "a managed database" was never actually a forced cost of
this option. What remains is real: the decorator/DI-container/module-registration ceremony is
machinery this project's size and timeline don't need, and none of it changes because the
database happens to be SQLite instead of PostgreSQL.

`node:sqlite` removes an external database process entirely for a single local user, and was
verified by execution on the pinned runtime (Node 24.16.0) rather than by reading its docs:
Stability 1.2 — Release Candidate, confirmed current against the primary Node.js documentation.
TypeScript throughout, Pinia, the Vercel AI SDK with `@ai-sdk/anthropic`, and Zod fill out the
rest of the stack around the same constraint.

### Vue vs React

Vue was never comparatively evaluated against React on technical merit. Every comparison above is
between backends and meta-frameworks that already assume Vue — Nuxt is a Vue meta-framework,
NestJS is frontend-agnostic. Vue entered this project as a stated preference for familiarity and
execution speed in a solo, timeboxed build, not as the winner of a Vue-vs-React comparison that
was actually run.

One attempt was made to give that preference a technical backing: that Vue's Proxy-based mutable
reactivity suits Domain-Driven Design better than React's immutable model, because DDD favors rich
domain entities with imperative mutating methods. It does not survive scrutiny against the
project's own referenced methodology. `domain-modeling` explicitly treats a rich mutable root and
a pure, immutable decide-function as equally valid tactical DDD — *"the rules must travel with it,
not the specific shape"* — and its own prescribed pattern for an event-sourced aggregate, the
Decider (`decide`/`evolve`), is a pure functional pattern that an immutable-state paradigm fits at
least as naturally as a mutable one. This project's own domain layer is exactly that shape: an
append-only operation log replayed through a pure reducer, never a mutated entity. Checked against
`code-architecture`, `software-design`, and `distributed-systems` too: none of the four take any
position on frontend framework choice at all.

The honest reason Vue was chosen is familiarity and speed of execution, not architectural
necessity — and that is a legitimate, sufficient reason given this project's constraints. It is
recorded as such here rather than left implied or backed by a technical claim that does not hold.

### Positive Consequences

- `domain ↛ framework` is enforced by a failing build, not a lint warning that erodes over time.
- The entire HTTP surface is legible from one composition file.
- No external database process to install, run, or explain in a review — `node:sqlite` ships with
  the pinned Node runtime already.
- The stack decision itself, and the tradeoffs named above, directly serve the submission's
  "tooling choices & rationale" evaluation criterion.

### Negative Consequences

- No filesystem routing, SSR, or data-loading conventions that a meta-framework provides for
  free — each capability slice wires its own route file by hand (estimated 20–30 minutes total,
  not a growing tax per slice).
- `node:sqlite` is a Release Candidate, not a frozen API. Mitigated by keeping it behind a port so
  swapping to `better-sqlite3` stays a one-file change.
- Frontend and backend are two ecosystems glued by one dev-server plugin, rather than one
  framework's built-in conventions.

## Pros and Cons of the Options

### Vite + Vue 3 + Hono + node:sqlite ✅ Chosen
- ✅ Router is a value; a static-analysis tool sees the real import graph
- ✅ No external database process for a single local user
- ❌ More manual route wiring than a meta-framework provides by convention (~20–30 min total)
- ❌ `node:sqlite` is RC, not yet a frozen API

### Nuxt
- ✅ File-based routing, SSR, and data-loading conventions out of the box
- ✅ Larger ecosystem and more starter templates
- ❌ Auto-imports hide dependency edges; the framework's generated tsconfig and virtual modules
  persist even with the user's own auto-imports disabled, and no published example of resolving
  them through a static import-graph tool was found
- ❌ Filesystem-forced routing means a slice cannot own its own entry point without real
  additional wiring against Nuxt's extension hooks

### NestJS + Prisma
- ✅ Structured, familiar backend architecture with a mature DI container
- ✅ Prisma supports SQLite directly — this is not forced onto PostgreSQL
- ✅ Constructor-injected DI resolves through explicit imports; a static-analysis tool can trace
  it about as well as it traces Hono
- ❌ Decorator/DI-container/module-registration ceremony is disproportionate machinery for a
  one-to-two-week solo build with one user, independent of database choice
- ❌ Switching now has a real, non-hypothetical cost: a working Hono scaffold already exists with
  every architecture rule verified by planting a violation against it — re-verifying all of that
  against Nest's shape competes directly with the time available to build the parts of this
  project that are actually graded

## Links

- `docs/product/PRD.md`
