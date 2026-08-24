# ADR-001: Adopt Vite + Vue 3 + Hono + node:sqlite Over Nuxt

- **Date**: 2026-08-24
- **Status**: Accepted
- **Deciders**: Vinicius Albano
- **Tags**: architecture, stack, backend, frontend, persistence

## Context and Problem Statement

The domain layer (model, reducer, replay, invariants) must never import a framework, and that
rule needs to be a build-breaking, mechanically-verified constraint rather than a convention
agents erode over time. The rest of the stack — frontend framework, backend framework, and
persistence — had to be chosen consistently with that requirement, for a single local developer
building end to end in about a week.

## Decision Drivers

- `domain ↛ framework` must be enforceable by a static-analysis tool (dependency-cruiser) reading
  the real import graph, not a heuristic that degrades under auto-imports or generated config.
- The whole API surface should be legible from one file, not discovered by convention.
- v1 targets a single local user in one session; no requirement for SSR, a managed database, or
  multi-region deploy.
- Minimize dependency surface and moving parts for a solo, timeboxed build.

## Considered Options

- Vite + Vue 3 SPA + Hono + `node:sqlite`
- Nuxt (full-stack meta-framework)
- NestJS + PostgreSQL + Prisma

## Decision Outcome

Chosen option: **"Vite + Vue 3 SPA + Hono + `node:sqlite`"**, because in Hono a route is a method
call on an exported object (`app.route(...)`) rather than a location on disk, so slice-owned route
files compose into one readable file and dependency-cruiser sees the true import graph — no
auto-imports, no virtual modules, no generated tsconfig standing between the rule and the code.
`node:sqlite` removes an external database process entirely for a single local user, and TypeScript
throughout, Pinia, the Vercel AI SDK with `@ai-sdk/anthropic`, and Zod fill out the rest of the
stack around that same constraint.

### Positive Consequences

- `domain ↛ framework` is enforced by a failing build, not a lint warning that erodes over time.
- The entire HTTP surface is legible from one composition file.
- No external database process to install, run, or explain in a review — `node:sqlite` ships with
  the pinned Node runtime already.

### Negative Consequences

- No filesystem routing, SSR, or data-loading conventions that a meta-framework provides for
  free — each capability slice wires its own route file by hand.
- `node:sqlite` is a Release Candidate, not a frozen API. Mitigated by keeping it behind a port so
  swapping to `better-sqlite3` stays a one-file change.
- Frontend and backend are two ecosystems glued by one dev-server plugin, rather than one
  framework's built-in conventions.

## Pros and Cons of the Options

### Vite + Vue 3 + Hono + node:sqlite ✅ Chosen
- ✅ Router is a value; dependency-cruiser sees the real import graph
- ✅ No external database process for a single local user
- ❌ More manual route wiring than a meta-framework provides by convention
- ❌ `node:sqlite` is RC, not yet a frozen API

### Nuxt
- ✅ File-based routing, SSR, and data-loading conventions out of the box
- ✅ Larger ecosystem and more starter templates
- ❌ The router *is* the filesystem — dependency-cruiser cannot mechanically verify
  `domain ↛ framework` without falling back to best-effort heuristics
- ❌ Auto-imports and a generated tsconfig hide the true import graph from static analysis

### NestJS + PostgreSQL + Prisma
- ✅ Structured, familiar backend architecture with a mature ORM
- ✅ PostgreSQL scales past a single local user if the product grows
- ❌ A managed database and an ORM are disproportionate infrastructure for a one-to-two-week
  solo build with one user
- ❌ More moving parts to run locally and to explain to a reviewer

## Links

- `docs/product/PRD.md`
