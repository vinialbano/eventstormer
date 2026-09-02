# EventStormer — Architecture

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

The Vue SPA in `src/app/` is outside these three contexts — it consumes them over HTTP only.
How surfaces inside `src/app/` are partitioned (interaction slices, deep modules, shared read
models) is [§4 Frontend architecture](#4-frontend-architecture) and
[ADR-012](docs/adr/012-frontend-surface-topology.md); wire protocol and store shape remain
[ADR-007](docs/adr/007-frontend-architecture.md).

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
| Frontend data flow | Reka UI + Tailwind; plain `fetch` POST, server-confirmed; Pinia stores cold-loadable from one GET each; no optimistic updates | [007](docs/adr/007-frontend-architecture.md) |
| Frontend topology | Interaction slices inside deep modules (`shell/`, `board/`, `dock/`) on shared stores + transport substrate | [012](docs/adr/012-frontend-surface-topology.md) |
| API surface | ~16 user-facing `/api/*` routes; the facilitator and Boundary Commands have no route | [007](docs/adr/007-frontend-architecture.md) |
| Testing | Weight on domain deciders (Given/When/Then); `fast-check` properties; one E2E; `**/domain/**` ≥ 90% | [008](docs/adr/008-testing-eval-and-observability.md) |
| Eval | Plain Vitest + hand-rolled reporter; demo domain **restaurant / kitchen orders**; N=5; `k/N` reporting, no aggregate | [008](docs/adr/008-testing-eval-and-observability.md) |
| Observability | JSONL model-call logger + `@ai-sdk/otel` console exporter; cost = tokens × an owned table | [008](docs/adr/008-testing-eval-and-observability.md) |
| Versioning | SemVer over {JSON export, `/api`, CLI}; one minor per slice; Changesets + a standing release PR | [009](docs/adr/009-versioning-and-release.md) |
| Delivery | Local-only, no container; `pnpm dev`; recorded demo + `pnpm seed` | [011](docs/adr/011-local-only-delivery.md) |
| Build order | Tracer-bullet vertical slices, cut line at thesis-complete after slice 2 | [010](docs/adr/010-tracer-bullet-build-order.md) |

## 4. Frontend architecture

`src/app/` is a Vue SPA that talks to the three bounded contexts **only over HTTP**
([ADR-002](docs/adr/002-context-first-layout-and-context-integration.md)). It is not a fourth
backend context, but each product surface (today: `capture-loop/`) **is** its own frontend
bounded context — with concepts the backend does not name (dashed ghost, pending drawer,
facilitator dock) and rules enforced in UX, not only in API handlers
([ADR-012](docs/adr/012-frontend-surface-topology.md)).

[ADR-007](docs/adr/007-frontend-architecture.md) governs **what** crosses the wire: server-confirmed
state, plain `fetch`, Pinia stores as cold-load projections. ADR-012 governs **where code lives**
and **why** that shape differs from both backend context folders and layer-first SPA layouts.

### Why the frontend partition is not the backend partition

On the server, the axis of change is a bounded context and its commands. On the client, one
command surfaces in several places (a proposal card in the dock, a sticky on the board, a line in
the readable account), and one screen reads several GETs. Mirroring backend folders inside
`src/app/` would produce thin slices that all import the same stores — high coupling, low
cohesion, and no folder an agent can open to finish one gesture end to end.

The client's axis of change is the **user interaction**: reword a block, accept a proposal, place
on the timeline. Each interaction carries its own draft state, submit, error handling, and refetch
decision. Those co-change; transport adapters and projection stores usually do not.

Both sides use vertical-slice language; the **unit of the slice is different**. Backend slices
partition on **commands** (authoritative writes). Frontend slices partition on **interactions**
(user gestures). Using the same folder name on both sides — or mirroring `POST /proposals/:id/accept`
as a UI folder — collapses that distinction.

| | Backend command / capability slice | Frontend interaction slice |
|---|---|---|
| **Unit** | One domain request the system accepts | One user gesture the product exposes |
| **Changes when** | Business rules or aggregate invariants change | UX steps, copy, validation timing, error presentation change |
| **Lifecycle** | Transactional — request in, accept/reject out | Stateful — draft → confirm → POST → refetch → idle |
| **Owns truth?** | Yes — write model / event log | No — browser holds intent; GET holds validated state |
| **Lives in** | `src/<bounded-context>/capabilities/` | `src/app/<surface>/<zone>/interactions/` |
| **Neither** | — | `stores/`, `transport/`, `view-state/` are **substrate**, not commands or interactions |

**Why they are not 1:1.** One backend command often surfaces in several UI places; one frontend
gesture may call several endpoints or none until confirm:

| Pattern | EventStormer example |
|---|---|
| 1 command → N UI effects | `AcceptProposal` → dock card updates, `board-dirty` refetch, account refetch, poll stop — orchestrated in `shell/`, not one endpoint folder |
| 1 interaction → N commands | `review-proposal` → `acceptProposal` in a loop for "accept all remaining" |
| 1 interaction → 0 commands (yet) | `reword-block` draft editing — permissive state only until POST |
| N interactions → 1 read model | place, connect, withdraw → separate interaction folders, shared `stores/board.ts` |

**Decision tests.**

- **Backend command** — enforces an authoritative invariant, commits to a stream, would exist if
  the UI were a CLI. Stays in the owning bounded context; the SPA reaches it via `transport/`.
- **Frontend interaction** — exists because of how the user experiences the step; holds draft or
  phase state that never appears on a GET; would change if UX changed while the POST contract
  stayed fixed. Name the folder after the **gesture**, not the handler.
- **Substrate** — shared GET cache (`stores/`), wire mapping (`transport/`), ephemeral UI
  (`view-state/`), pure rules shared with the server (`domain/`).

Ubiquitous language aligns **types and conversation**; folder names align **axis of change**.
"Accept proposal" names the backend command and the dock gesture, but the backend slice is the
handler in `session-facilitation`; the frontend slice is
`dock/interactions/review-proposal/` — card UI, cluster accept, and typed emits to shell
orchestration. "Pending drawer" has no backend counterpart; it is frontend BC vocabulary only.

### Target shape per surface

```
src/app/<surface>/          ← one frontend BC per UX surface (sibling folders, not shared layers)

  shell/                    composition root — mounts zones, typed cross-zone refetch orchestration
  board/                    deep module — canvas + gestures fused to the wall (public: index.ts)
  dock/                     deep module — facilitator column + its gestures
  stores/                   validated server projections only (load / reset / read)
  transport/                HTTP application services + DTO mapping (only layer that calls fetch)
  view-state/               ephemeral client-only state (never on a projection store)

  <zone>/interactions/<gesture>/   one folder per multi-step gesture
      *.usecase.ts          framework-free state machine
      use*.ts               thin Vue composable adapter
      *.vue                 thin view
```

**Editor-app rule:** EventStorming is a spatial canvas ([ADR-006](docs/adr/006-graph-timeline-rendering.md)).
Gestures that render on or operate through the wall live **inside `board/`**, not in a global
`interactions/` pile. Gestures in the facilitator column live in `dock/`. Shell-level flows
(workshop creation, session start, account drawer) live under `shell/`.

### Why horizontal `stores/` and `transport/` stay

Layer-first layouts (`components/`, `hooks/`, `api/`) scatter one gesture across sibling folders
with no enforceable boundary. Endpoint-aligned slices duplicate the same read-model cache in
every gesture folder. Both fail the localization test: "add a field to the reword confirm step"
should not require opening four top-level technical directories.

`stores/` and `transport/` are **shared substrate**, not features:

- **Stores** hold **validated** snapshots from GET — shared by board, dock, and shell. They stay
  shallow (no mutation actions, no cross-store imports) because ADR-007's refresh story depends
  on every store being reconstructible from one endpoint.
- **Transport** is the **Partnership anti-corruption layer** to `/api/*` — map wire shapes, call
  POST, return typed errors. It is deliberately **not** a Repository that mirrors endpoints one
  method per route; the API is purpose-built and refetch-after-POST is the persistence seam.

Draft and intent state **never** belong on a store — refetch would race keystrokes and break
"cold-load from one GET."

### Stateful use cases and permissive drafts

Backend handlers are transactional; frontend flows are **state machines between user actions**
(draft → confirm popover → POST → refetch). Multi-step gestures therefore use a framework-free
use-case object tested without mounting Vue; reactivity stays in a thin composable adapter.
Single-step POST → refetch gestures do not need that extra layer.

Where the user edits before the server confirms (contribution text, reword draft, inline proposal
edit), model **permissive** draft types inside the interaction — explicit types that may carry
validation errors in their lifecycle. **Validated** building blocks and proposals live in stores
only after GET. The browser is not trusted as source of truth; the server promotes intent to
validated state ([ADR-007](docs/adr/007-frontend-architecture.md)).

### Cross-zone coupling must be visible

When accept proposal must refetch board and account, the causality is real but easy to hide.
Zones emit typed events; **`shell/` orchestration** decides which read models reload. That graph
is grep-able and testable — unlike store subscriptions, prop chains, or a global event bus, which
are semantically invisible dependencies agents and static analysis miss.

### Enforcement

Folder boundaries in [`src/app/capture-loop/AGENTS.md`](src/app/capture-loop/AGENTS.md) are
backed by dependency-cruiser rules (board public API only, dock ↛ board internals, transport-only
HTTP, no cross-store imports). New surfaces copy the zone table and extend the rule set; claims
without a planted violation are decoration.

### Deliberately not in the frontend shape

- Layer-first top-level folders inside a surface.
- Repository classes that proxy REST one endpoint per method.
- Optimistic projection-store patches ([ADR-007](docs/adr/007-frontend-architecture.md)).
- A shared `src/app/components/` or `src/app/hooks/` across surfaces — shared UI waits for the
  Rule of Three when a second surface proves the need.

## 5. The `/api` surface

All routes are user-facing (the SPA calls them). The facilitator is server-side and reactive: the
interpretation scheduler in `host/` (`scheduler.ts`, a recursive `setTimeout`) drives
`askOpeningQuestion` → `interpretContribution` → `reconcilePendingDerivations` each tick, and the
SPA short-polls `GET /workshops/:id/session` + `/sessions/:id/proposals` while a contribution is
still in flight (no message rides back on a mutation response).

**Writes:** `POST` `/workshops` · `/workshops/:id/scope` · `/workshops/:id/sessions` ·
`/sessions/:id/contributions` · `/proposals/:id/{accept,edit,reject,hold,unhold}` ·
`/resolutions/:id/{accept,edit,reject}` · `/workshops/:id/board/operations` *(F06/F07, op-union
body)* · `/workshops/:id/{stakeholder-check,chosen-problem}` · `/sessions/:id/close`

**Reads:** `GET` `/workshops/:id/session` · `/sessions/:id/proposals` · `/workshops/:id/board` ·
`/workshops/:id/board/blocks/:blockId/references` · `/workshops/:id/readable-account` ·
`/workshops/:id/artifacts/{model,summary,transcript}`

**Not routes** (in-process): `apply-operation`, `raise`/`resolve-hot-spot`,
`interpret-contribution` / `ask-opening-question` / `reconcile-pending-derivations` (the `host/`
scheduler's tick functions), `propose-scope`, the automatic question policies.

## 6. Build plan

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

## 7. Deliberately not done in v1

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

## 8. Running it

Requires **Node ≥ 24.16.0** and **pnpm 8+**.

```bash
pnpm install
cp .env.example .env      # then add ANTHROPIC_API_KEY
pnpm dev                  # http://localhost:5173 — Vite + Hono, one process
pnpm seed                 # optional: load the demo workshop
```

`pnpm check` runs the full local gate — typecheck → lint → test → depcruise → knip. `pnpm eval`
runs four restaurant F11 cases × N=5 against the real model, reports k/N per assertion, requires
`ANTHROPIC_API_KEY`, and is out of CI. The SQLite database is created and
migrated automatically at `./data/eventstormer.db`; `pnpm db:reset` wipes it.

## 9. Open items owned by the maintainer

- Record and transcribe the ~3–4 minute restaurant/kitchen-order narration (the golden eval
  fixture and the `pnpm seed` session).
- A PRD reconciliation pass ([open-questions #29](docs/domain/open-questions.md)) for the stale
  F01/F04 wording the domain work outran — the operation-kind list, `place`/`unplace`, the scope
  interaction, `Reopen`.
