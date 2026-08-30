# EventStormer — Design

A living domain model built by conversation with an AI facilitator, so engineering consumes a
**derived projection** of the model instead of a hand-written copy that drifts.

This document is the map of the system's shape and the decisions behind it. Product truth is
[`docs/product/PRD.md`](docs/product/PRD.md); the confirmed domain language and boundaries are in
[`docs/domain/`](docs/domain/); every decision below has a full write-up in an ADR under
[`docs/adr/`](docs/adr/) and, behind that, a resolved ticket on the
[technical-architecture effort map](https://github.com/vinialbano/eventstormer/issues/9).

---

## 1. The problem

Between a business expert and an engineering team there are today two human translators: a
facilitator who runs the EventStorming workshop, and someone who turns the resulting wall of
stickies into technical documentation. Both are scarce, and the moment there are two artifacts —
a board and a doc — they drift, and confidence in the documentation decays exactly as the model
matures.

EventStormer removes the second translator entirely (there is no editable second artifact) and
replaces the first with an AI facilitator. What the expert builds *is* the domain model — a typed
graph of building blocks with stable identities — and every artifact anyone reads afterwards is a
deterministic render of it.

v1 runs one Big Picture workshop, typed input only.

## 2. The shape

Three bounded contexts (`docs/domain/context-map.md`), organised context-first in `src/`
([ADR-002](docs/adr/002-context-first-layout-and-context-integration.md)):

```
                 ┌─────────────────────────────┐
   contributions │   session-facilitation      │  Core
  ───────────────▶  Workshop · Session ·        │  the AI facilitator, the interview loop,
                 │  Proposal · Resolution       │  the proposal / resolution lifecycles
                 └──────┬───────────────▲───────┘
      apply operation / │               │ Operation Applied/Rejected,
      raise·resolve     │               │ model graph + open hot spots (read)
      hot spot          ▼               │
                 ┌─────────────────────────────┐
                 │   domain-model-capture      │  Core
                 │   Board — one event-sourced │  the append-only operation log and the
                 │   aggregate per Workshop     │  typed graph projected from it
                 └──────┬──────────────────────┘
    every event out /   │  (Conformist, published language)
    the model graph     ▼
                 ┌─────────────────────────────┐
                 │ derived-artifact-generation │  Supporting
                 │  deterministic template     │  JSON export · readable account · summary ·
                 │  renders — no language model │  session transcript
                 └─────────────────────────────┘
```

- **`domain-model-capture`** owns the model. It is **one event-sourced aggregate, `Board`, per
  workshop** — the operation log is single-writer and totally ordered, so the graph is a
  projection over it and every invariant (`follows` acyclicity, kind-permitted relations,
  no operation on a missing/withdrawn block) is checked at append time.
  ([ADR-003](docs/adr/003-hand-rolled-event-sourcing-and-result-types.md),
  [ADR-004](docs/adr/004-operation-log-schema-and-versioning.md))
- **`session-facilitation`** owns the conversation across a workshop's whole life. Four more
  event-sourced aggregates — `Workshop`, `Session`, `Proposal`, `Resolution` — plus the
  facilitator, which runs an interview loop and proposes operations constrained to the schema.
  ([ADR-005](docs/adr/005-ai-facilitator.md))
- **`derived-artifact-generation`** is pure template rendering. **No language model touches any
  projection path** — determinism is the product's central claim.

Every arrow between contexts crosses only through an `api.ts` surface. Inside `src/`, `**/domain/`
imports nothing from a framework — one dependency-cruiser glob, build-breaking. The event bus
carries only fire-and-forget cross-context effects whose loss is tolerable; every other "policy"
from the domain model is a direct synchronous call between contexts inside one HTTP handler in v1,
each context committing its own stream in its own transaction, with the seam drawn so real-time
collaboration (F14) can make it async later ([ADR-002](docs/adr/002-context-first-layout-and-context-integration.md)).

### Aggregate code shape

Every aggregate is a module of pure functions —
`decide(state, command) → Result<Event[], Rejection>` and `evolve(state, event) → state`, with
`replay = events.reduce(evolve, initialState)`. No classes. Errors are a hand-rolled `Result`,
not exceptions and not Effect
([ADR-003](docs/adr/003-hand-rolled-event-sourcing-and-result-types.md)).

## 3. Key decisions

| Area | Decision | ADR |
|---|---|---|
| Stack | Vite + Vue 3 SPA + Hono + `node:sqlite`, one process | [001](docs/adr/001-adopt-vite-vue-hono-node-sqlite-over-nuxt.md) |
| Layout | Context-first; `**/domain/** ↛ framework`; in-process context integration in v1 (direct sync calls + fire-and-forget bus, each context its own transaction) | [002](docs/adr/002-context-first-layout-and-context-integration.md) |
| Event sourcing | Hand-rolled `decide`/`evolve` — no library (Emmett, castore rejected) | [003](docs/adr/003-hand-rolled-event-sourcing-and-result-types.md) |
| Error handling | Hand-rolled `Result<T,E>` — **Effect rejected** (its own runtime vs the framework-free rule) | [003](docs/adr/003-hand-rolled-event-sourcing-and-result-types.md) |
| Operation log | Catalog = the domain canvas; `op_version` + `v: z.literal(1)` from commit one; replay every load | [004](docs/adr/004-operation-log-schema-and-versioning.md) |
| Schema | One framework-free Zod-4 SSOT; Anthropic contract *derived* via `z.toJSONSchema()`; branded ids | [004](docs/adr/004-operation-log-schema-and-versioning.md) |
| Facilitator model | `claude-sonnet-5` primary / `claude-opus-5` escalation / `claude-haiku-4-5` fallback | [005](docs/adr/005-ai-facilitator.md) |
| Structured output | `generateText` + `Output.object`, `structuredOutputMode: 'outputFormat'` pinned | [005](docs/adr/005-ai-facilitator.md) |
| Prompt | Op-log serialised in log order (cache-stable); one merged interpret+next-move call per turn; few-shot disjoint from eval fixtures | [005](docs/adr/005-ai-facilitator.md) |
| Facilitator bar | `lenient`/`strict` self-reported, **eval-verified independently** by content-word match; LLM move-selection between deterministic bookends | [005](docs/adr/005-ai-facilitator.md) |
| Resilience | Two failure classes — provider-down (retry ladder, at-most-once) vs schema-fail (one retry, then terminal) | [005](docs/adr/005-ai-facilitator.md) |
| Graph layout | Vue Flow + `@dagrejs/dagre`; CSS-grid-by-rank fallback; layout logic framework-free and swappable | [006](docs/adr/006-graph-timeline-rendering.md) |
| Frontend | Reka UI + Tailwind; plain `fetch` POST, server-confirmed; 3 Pinia stores, each cold-loadable from one GET | [007](docs/adr/007-frontend-architecture.md) |
| API surface | ~16 user-facing `/api/*` routes; the facilitator and Boundary Commands have no route | [007](docs/adr/007-frontend-architecture.md) |
| Testing | Weight on domain deciders (Given/When/Then); `fast-check` properties; one E2E; `**/domain/**` ≥ 90% | [008](docs/adr/008-testing-eval-and-observability.md) |
| Eval | Plain Vitest + hand-rolled reporter; demo domain **restaurant / kitchen orders**; N=5; `k/N` reporting, no aggregate | [008](docs/adr/008-testing-eval-and-observability.md) |
| Observability | JSONL model-call logger + `@ai-sdk/otel` console exporter; cost = tokens × an owned table | [008](docs/adr/008-testing-eval-and-observability.md) |
| Versioning | SemVer over {JSON export, `/api`, CLI}; one minor per slice; Changesets + a standing release PR | [009](docs/adr/009-versioning-and-release.md) |
| Delivery | Local-only, no container; `pnpm dev`; recorded demo + `pnpm seed` | [011](docs/adr/011-local-only-delivery.md) |
| Build order | Tracer-bullet vertical slices, cut line at thesis-complete after slice 2 | [010](docs/adr/010-tracer-bullet-build-order.md) |

## 4. The `/api` surface

All routes are user-facing (the SPA calls them). The facilitator is server-side and reactive —
its messages ride back on `start-session` and `contributions` responses.

**Writes:** `POST` `/workshops` · `/workshops/:id/scope` · `/workshops/:id/sessions` ·
`/sessions/:id/contributions` · `/proposals/:id/{accept,edit,reject}` ·
`/resolutions/:id/{accept,edit,reject}` · `/workshops/:id/board/operations` *(F06/F07, op-union
body)* · `/workshops/:id/{stakeholder-check,chosen-problem}` · `/sessions/:id/close`

**Reads:** `GET` `/workshops/:id/session` · `/sessions/:id/proposals` · `/workshops/:id/board` ·
`/workshops/:id/board/blocks/:blockId/references` · `/workshops/:id/readable-account` ·
`/workshops/:id/artifacts/{model,summary,transcript}`

**Not routes** (in-process): `apply-operation`, `raise`/`resolve-hot-spot`,
`interpret-contribution`, `propose-scope`, the automatic question policies.

## 5. Build plan

Vertical slices, thesis beats earliest, cut line after slice 2
([ADR-010](docs/adr/010-tracer-bullet-build-order.md)):

| # | Slice | Features | Version |
|---|---|---|---|
| 0 | skeleton + irreversibles — layout migration, `plumbing/`, the Zod SSOT + `op_version`, minimal Board decider, `replay(log)===snapshot`, Changesets/CI | F01 core | 0.1.0 |
| 1 | the capture loop — Workshop/Session, `make-contribution`, the merged facilitator call, Proposal lifecycle + the sync apply chain. Backlog only, no timeline. | F18 F03 F04 F05 | 0.2.0 |
| 2 | **the money shot** — reword/withdraw + the reference list, the live readable account, the rename-cascade confirm | F06 (part) F10 | 0.3.0 |
| — | **CUT LINE — thesis-complete** | | |
| 3 | relations + the board — `sequence`/`insert between`/`place`/`link cause`, `computeTimelineLayout` + Vue Flow, pivotal | F01 rest F02 F07 | 0.4.0 |
| 4 | hot spots + close — `annotate`/`resolve`/`reopen`, Resolution lifecycle, F09, `close-session` + the sweep | F08 F09 F18 close | 0.5.0 |
| 5 | artifacts + eval + demo — JSON/summary/transcript exports, the eval suite, `pnpm seed`, the recording | F10 rest F19 F11 | 0.6.0 |
| 6 | harden — remaining ADRs, README, coverage threshold | — | 0.7.0 |

Each slice is handed to `anoria-engineering:spec-driven-development` and carries a `minor`
changeset.

## 6. Deliberately not done in v1

- Process Modelling / Design-Level support, real-time collaboration, the glossary, an
  engineer-facing surface, on-device voice — all in the product view, none built. The model is
  shaped to receive them (the operation-kind and building-block-kind unions extend by adding
  variants beside the frozen v1 ones).
- Any language model in a projection path. An AI-written narrative summary was considered and
  deferred — it cannot carry the determinism guarantee.
- Optimistic client updates, SSE/WebSockets, a hosted deployment, Docker.
- Snapshot caching of the operation log (replay is sub-millisecond at the elicited scale).
- **Untested by design:** facilitator judgment quality (eval only, non-deterministic — reported
  `k/N`), real Anthropic HTTP calls (mocked), graph-layout visuals (manual), concurrency beyond
  one open session, voice, performance.

## 7. Running it

Requires **Node ≥ 24.16.0** and **pnpm 8+**.

```bash
pnpm install
cp .env.example .env      # then add ANTHROPIC_API_KEY
pnpm dev                  # http://localhost:5173 — Vite + Hono, one process
pnpm seed                 # optional: load the demo workshop
```

`pnpm check` runs the full gate — typecheck → lint → test → depcruise → knip. `pnpm eval` runs
the facilitator eval against the real model (costs ~$1.20). The SQLite database is created and
migrated automatically at `./data/eventstormer.db`; `pnpm db:reset` wipes it.

## 8. Open items owned by the maintainer

- Record and transcribe the ~3–4 minute restaurant/kitchen-order narration (the golden eval
  fixture and the `pnpm seed` session).
- A PRD reconciliation pass ([open-questions #29](docs/domain/open-questions.md)) for the stale
  F01/F04 wording the domain work outran — the operation-kind list, `place`/`unplace`, the scope
  interaction, `Reopen`.
