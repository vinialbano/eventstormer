# ADR-011: Local-Only Delivery, No Container

- **Date**: 2026-08-29
- **Status**: Accepted
- **Deciders**: Vinicius Albano
- **Tags**: deployment, execution-isolation, demo
- **Source**: [#29 (G10)](https://github.com/vinialbano/eventstormer/issues/29)

## Context and Problem Statement

The way people encounter EventStormer is a repository they clone and run. The stack helps:
`node:sqlite` needs no database server, and the only external dependency is the Anthropic API
(which needs a key).

## Decision Outcome

- **Local-only. No hosted deployment.** You clone and run it with your own `ANTHROPIC_API_KEY`.
  A public deploy would mean paying for everyone's API usage and managing a shared key — not
  worth it for a prototype. A Node-host deploy is a ~1 hour add later if a live link is wanted;
  not v1.
- **No Docker, no devcontainer.** Single process, embedded `node:sqlite`, one external API — the
  README says so. The only reproducibility risk is the Node version → ship a `.node-version`
  matching the `>=24.16.0` engines pin (`engine-strict=true` already enforces it). Revisit only
  if someone genuinely cannot get Node 24.
- **Run from a fresh clone — three documented steps, no wizard:**
  ```
  pnpm install
  cp .env.example .env      # then add ANTHROPIC_API_KEY
  pnpm dev                  # Vite + Hono, one process
  ```
  `pnpm dev` fails fast with a clear message if `ANTHROPIC_API_KEY` is missing.
- **Database lifecycle:** the SQLite file lives at gitignored `./data/eventstormer.db`,
  auto-created and auto-migrated on startup (additive-only DDL). A fresh clone's first `pnpm dev`
  yields a working DB with no manual step. `pnpm db:reset` wipes it.
- **Demo artifacts, since local-only makes them load-bearing:**
  - a 3–4 minute screen recording — the restaurant narration → proposals → accept → board fills →
    the reference-count-then-rename beat → download an artifact.
  - **`pnpm seed`** — replays the transcribed narration as an operation log into a fresh DB and
    prints the workshop URL, so the rename cascade is demonstrable in seconds. A script, **not**
    a UI "load demo" button (keeps the product surface clean).

## Consequences

- **Positive:** nothing to install, run, or explain beyond Node + pnpm + a key; the demo covers
  anyone who won't run it themselves.
- **Negative:** no one-click live link; mitigated by the recording and the ~1 hour deploy escape
  hatch.

## Links

- [ADR-001](001-adopt-vite-vue-hono-node-sqlite-over-nuxt.md) — `node:sqlite`, one process
- [ADR-010](010-tracer-bullet-build-order.md) — `pnpm seed` and the recording land in slice 5
