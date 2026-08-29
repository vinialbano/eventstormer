# ADR-009: Versioning and Release Process

- **Date**: 2026-08-29
- **Status**: Accepted
- **Deciders**: Vinicius Albano
- **Tags**: release, versioning, semver, harness
- **Source**: [#32 (G12)](https://github.com/vinialbano/eventstormer/issues/32)

## Context and Problem Statement

EventStormer is released as an open-source project. It needs Semantic Versioning over a clearly
defined contract, a controlled and mostly-automated release process, and a delivery convention
that AI agents working the build can follow and that the harness can enforce.

## Decision Outcome

### The public contract (what SemVer versions)

- The **JSON export format** (F10 — engineers build against it; it round-trips).
- The **`/api/*` HTTP routes**.
- The **CLI / run commands** — `pnpm dev`, `pnpm seed`, environment variables.

**Not** part of the contract: the operation-log `op_version`
([ADR-004](004-operation-log-schema-and-versioning.md)) — internal, append-only, with its own
never-mutate rule.

### Pre-1.0 scheme

- `0.1.0` when Slice 0 lands (skeleton runs, `pnpm check` green).
- **Each delivered tracer-bullet slice → one minor bump.** Fixes between slices → patch.
- Breaking changes to the contract during 0.x need **no major bump** (SemVer's 0.x rule) — they
  are called out prominently in the changelog.

### The 1.0.0 trigger

Declared when the maintainer will promise backward compatibility for the JSON export + HTTP API
— concretely, *the export format has gone ~3 releases / a few weeks of real use without a
breaking change.* **Decoupled from PRD-v1 feature scope** — 1.0.0 is a stability promise, PRD-v1
is a feature set; they are not expected to coincide.

### Tooling — Changesets, single-package mode

`@changesets/cli`, configured `baseBranch: main`, `commit: false`, `access: restricted`,
changelog via `@changesets/changelog-github`. `changeset publish` is never run (unpublished app).

- `pnpm changeset` → a reviewable `.changeset/*.md` declaring `patch` / `minor` / `major` + a
  one-line summary.
- `changeset version` → deterministic `package.json` bump + `CHANGELOG.md` regeneration.
- `changeset tag` → the `v0.x.y` git tag.

Chosen over `semantic-release`: commit-derived bumps are less explicit and fight the "each slice
is one deliberate minor" intent, which matters more with agents authoring the changesets.

### Harness control

| Gate | Mechanism |
|---|---|
| Every delivery declares its version impact | CI check on PRs: a diff touching `src/**` with no `.changeset/*.md` fails |
| Release is one action | `changesets/action` maintains a standing "Version Packages" PR; merging it performs the release — version bump, `CHANGELOG.md`, tag, GitHub Release |
| Commit convention | `commitlint` (unchanged from the existing harness) |
| Local reminder | optional lefthook pre-push warning if `src/` changed and no changeset is staged |

### AI-agent automation

`AGENTS.md` gains a rule: on completing a slice or a user-facing change, run `pnpm changeset` and
declare the bump (`minor` for a completed slice capability, `patch` for a fix); an agent may write
the `.changeset/*.md` directly. The CI check is the backstop — a forgotten changeset is a red PR
with a clear message, the same pattern as the lint hooks. Changesets bumps by the highest pending
type once per `version` run, so releasing once per slice yields exactly one minor bump per slice.

## Consequences

- **Positive:** the version bump is a reviewed, authored decision, not a side effect; the release
  is a single merge; the convention is enforced, not documented-and-hoped.
- **Negative:** a dependency and a small amount of ceremony for a solo pre-1.0 app — accepted,
  because the stated goal is exactly standardised, harness-controlled, agent-followable deliveries.

## Links

- [ADR-010](010-tracer-bullet-build-order.md) — the slices that map to minor bumps
- [ADR-004](004-operation-log-schema-and-versioning.md) — the `op_version` that is *not* SemVer
