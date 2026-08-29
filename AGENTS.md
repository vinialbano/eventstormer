# EventStormer — agent instructions

A living domain model built by conversation with an AI facilitator, so engineering consumes a
derived projection instead of a hand-written copy that drifts.

**Package manager: pnpm.** Not npm, not yarn — `.npmrc` sets `engine-strict=true` and
`package.json` pins `engines.node`.

**Product truth lives in `docs/product/PRD.md`.** Feature ids (`F01`…`F17`) are permanent and
append-only. If an instruction here and the PRD disagree, the PRD wins and this file is wrong —
say so rather than picking one.

**Domain language is confirmed in `docs/domain/`.** Subdomains, bounded contexts, ubiquitous
language, and the context map are DDD strategic-design output, confirmed with the maintainer —
not a guess. If code or a comment uses a term the domain docs mark superseded (e.g. "Node" or
"Element" instead of the confirmed "Building Block"), the domain doc wins; fix the code.

## Commands

`pnpm check` = typecheck → lint → test → depcruise → knip, in that order, failing fast. CI and
the pre-push hook run exactly this; they must never be able to disagree about what green means.
`pnpm dev` is one process — Vite serves the SPA and hands `/api/*` to the Hono app.

## The one rule that is not negotiable

Any `**/domain/**` directory imports nothing from a framework or a Node builtin. Full detail —
including all domain invariants — is in each context's `domain/AGENTS.md` (currently
`src/domain-model-capture/domain/AGENTS.md`), auto-loaded whenever a file in that directory is open.

## Layout

Organised by bounded context first, capability second — never by technical layer (ADR-002).

```
src/domain-model-capture/       Core   — the Board: operation log + graph projection
src/session-facilitation/       Core   — Workshop / Session / Proposal / Resolution; the facilitator
src/derived-artifact-generation/ Supporting — deterministic template renders
src/host/                       composition root: Hono app, route mounting, wiring
src/plumbing/                   Result, branded ids, EventStore port + adapter, clock, bus
src/app/                        Vue SPA — talks to capabilities over HTTP only
```

Each context folder holds its own `domain/`, `capabilities/<slice>/`, `infrastructure/`, and a
single `api.ts` — added only when earned. Every arrow is enforced by dependency-cruiser, and each
rule was verified by planting a violation and watching it fail — not by reading the config:

- `**/domain/**` may not import a framework, a Node builtin, or anything above it.
- `plumbing/` is a leaf; it may not reach back into a context, `host/`, or `app/`.
- Cross-context imports go only through the other context's `api.ts` — never its `domain/`,
  `capabilities/`, or `infrastructure/`. `host/` may import a context's `api.ts` only.
- Capability slices within a context may not import each other. Share through that context's
  `domain/` or through `plumbing/`.
- `app/` talks to capabilities over HTTP, never by importing their `http.ts` or `data.ts`.

Routes are composed, not discovered. A slice exports its Hono router; `src/host/routes.ts` mounts
them all. There is no filesystem routing anywhere in this project.

## Read on demand

- `DESIGN.md` — the system's shape (three bounded contexts), the decision table, and the `/api`
  surface; the index to `docs/adr/`. Read before designing a slice or touching a cross-cutting
  concern.
- `docs/domain/README.md` — the confirmed subdomain catalog, bounded-context canvases, and context
  map. Read before naming a domain concept, designing a new capability slice, or touching a
  context's `domain/` public vocabulary.
- `docs/tooling-gotchas.md` — TypeScript/ESLint/dependency-cruiser/CI facts. Read before touching
  any of those configs.
- `docs/framework-gotchas.md` — Hono/Vue/Pinia/dagre/`node:sqlite` version facts. Read before
  touching a capability's `http.ts`, a Vue SFC, or the persistence layer.
- `docs/ai-harness-gotchas.md` — AI SDK/Anthropic facts. Read before touching the facilitator.
- `docs/testing.md` — test conventions, UI verification via `playwright-cli`, the E2E decision.
- `docs/adr/` — architecture decisions with their alternatives and reasoning.

## Memory Hygiene

- Never store issue/PR status in memory — derive from `git log` and `gh issue list` (or the repo
  status, once it has a remote).
- Never store file paths, code patterns, or architecture derivable from the codebase.
- Store only: decisions with rationale, feedback with "why", references to external systems.
- Before acting on a memory that names a file, function, or flag: verify it still exists.

## Working agreements

- **Hooks enforce what this file only explains.** A `PostToolUse` hook lints every file you edit
  and returns the errors immediately; a `Stop` hook runs the full gate and refuses to let you
  finish on a red tree; a `PreToolUse` hook blocks `--no-verify`, force pushes, and writes to
  `.env`. Do not work around them — fix what they report.
- Branch before committing; never commit to `main`. Conventional commit prefixes (`feat:`,
  `fix:`, `docs:`, `chore:`).
- When you finish a task, run the full check before claiming it works. "It should work" is not a
  result; a passing command is.
- If you cannot make something work, say so and say what you tried. Do not weaken a test, widen a
  type to `any`, or add a lint exemption to get to green — every one of those is a silent
  regression in the thing this repo exists to enforce.
- **Write documentation and comments as if the system were built today**: present tense, current
  state only. Don't narrate transitions — Git and commit messages already own that history.

  ```
  Bad:  "Refactored to use X instead of the old Y approach."
  Good: "Uses X."
  ```

  Exception: if current behavior is genuinely counter-intuitive and could mislead a reader, say
  why in one line. If the reasoning is itself a real decision — hard to reverse, surprising, a
  genuine trade-off — it belongs in an ADR (`docs/adr/`), linked from the comment, not inlined.
