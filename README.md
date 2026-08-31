# EventStormer

A living domain model built by conversation. A domain expert describes their business in plain
language; an AI facilitator proposes properly-formed EventStorming elements; the human accepts,
edits, or rejects each one. What they build is not a picture of the domain — it is the domain
model itself, a typed graph with stable identities, and every artifact engineering reads
afterwards is derived from it rather than transcribed from it.

Product definition: [`docs/product/PRD.md`](docs/product/PRD.md). Architecture and the decisions
behind it: [`ARCHITECTURE.md`](ARCHITECTURE.md) and [`docs/adr/`](docs/adr/).

> **Status: scaffold.** The harness, the model and the board are not built yet. What runs today
> is the toolchain, the architecture gates, and a health endpoint. See
> [What is real vs stubbed](#what-is-real-vs-stubbed).

## Running it

Requires **Node 24.16.0+** and **pnpm 8+**.

```bash
pnpm install
cp .env.example .env.local   # then add your Anthropic API key
pnpm dev                     # http://localhost:5173
```

One process. Vite serves the SPA and hands `/api/*` to the Hono app in the same dev server.

### Environment

`pnpm dev` loads `.env.local` then `.env` (both gitignored; `.env.local` wins, and an existing
shell/parent value beats both). Keep real secrets in `.env.local` — the test runners
(`pnpm test`, `pnpm test:e2e`) set the variables they need explicitly and never inherit your key.

| Variable | Required | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | for the facilitator | `pnpm dev` fails fast when it is unset (unless `FACILITATOR_MODE=scripted`). |
| `FACILITATOR_MODEL` | no | Primary model for the retry ladder. Defaults to `claude-sonnet-5` ([ADR-005](docs/adr/005-ai-facilitator.md)); the only other supported value is `claude-haiku-4-5`. Model ids take no date suffix. |
| `PORT` | no | Defaults to 5173. |

## What is real vs stubbed

**Real, and verified by a passing command:**

- The toolchain: `pnpm dev` serves the SPA and the API from one process.
- The gate: `pnpm check` — typecheck → lint → test → depcruise → knip, failing fast.
- Five architecture rules, **each verified by planting a violation and watching it fail**.
- Three Claude Code hooks (per-edit lint, stop-gate, bash guard), each tested against a
  passing and a failing input.
- `GET /api/health`, which exists to prove the composition path and demonstrate the
  chained-route pattern the rest of the API must copy.

**Not built:**

- The facilitator. No model call happens anywhere in this repo yet.
- The op log, replay, persistence, the board, the derived artifacts, the eval suite.

## Architecture

```
src/domain/         model, reducer, replay, invariants, ranking — plain TypeScript
src/capabilities/   one folder per use-case slice; each owns its http.ts, logic and data
src/plumbing/       result types, ids, errors — extracted on the Rule of Three, not before
src/app/            Vue UI
src/server.ts       the whole URL map, in one readable file
```

Two things this shape is defending, both of which are the product's central claim rather than
taste:

**`src/domain/` imports nothing from a framework, and cannot.** The model, the append-only op
log and replay have to be runnable without a server or a browser, because determinism is what
the product is selling. `dependency-cruiser` fails the build on violation, including on
*type-only* imports (`tsPreCompilationDeps: true`), and there is no exemption path.

**Routes are composed, not discovered.** A slice exports its routes as a value; `src/server.ts`
chooses the prefixes. There is no filesystem routing here — it is the only reason the whole API
surface fits in one readable file.

## The gate

| Command | What it protects |
|---|---|
| `pnpm typecheck` | `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` |
| `pnpm lint` | type-aware rules: `no-floating-promises`, `switch-exhaustiveness-check`, `no-unsafe-*` |
| `pnpm test` | Vitest; domain tests run in `node`, never a DOM |
| `pnpm depcruise` | the five architecture rules above |
| `pnpm knip` | orphaned files and dead exports left behind by a refactor |

`switch-exhaustiveness-check` is the half of "illegal states unrepresentable" that a type system
does not give you for free: the discriminated union is declared once, and the lint rule catches
every branch someone forgot when a variant was added.

CI runs exactly `pnpm check` on push and PR, and so does the pre-push hook, so the two cannot
disagree about what green means. Direct commits to `main` are refused.

## Known limitations

- **Everything interesting is unbuilt.** This is a foundation commit.
- **TypeScript is pinned to 6.0.3 and must not be upgraded.** `typescript-eslint@8` peers on
  `<6.1.0`; TS 7 silently removes every type-aware lint rule this repo relies on.
- No Docker or devcontainer — deliberate. A local-only prototype with SQLite and no services
  does not earn one.
- No OpenTelemetry yet. Model-call logging will come with the first model call.
- Evals are not a CI gate, on purpose: cost and flakiness are real and the value is low until
  the prompts are stable enough to regress against.

## Licence

MIT. See [LICENSE](LICENSE).
