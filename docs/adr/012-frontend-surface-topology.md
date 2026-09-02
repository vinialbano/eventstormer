# ADR-012: Frontend Surface Topology — Interaction Slices Inside Deep Modules

- **Date**: 2026-09-02
- **Status**: Accepted
- **Deciders**: Vinicius Albano
- **Tags**: frontend, architecture, vertical-slice, vue
- **Source**: capture-loop refactor analysis; frontend architecture review (2026-09)

## Context and Problem Statement

[ADR-007](007-frontend-architecture.md) fixes the SPA's **data-flow model** — server-confirmed
state, Pinia cold-load stores, plain `fetch` transport, no optimistic updates. It does not say
how code inside `src/app/` is **partitioned**. Recent splits removed monolithic Vue files but left
horizontal technical folders (`stores/`, `transport/`, `composables/`) alongside feature zones
(`board/`, `dock/`). A multi-step gesture (reword, accept proposal) still touches files in four
or more folders, and cross-zone refetch logic lives implicitly in the composition root.

That shape is costly for two reasons that matter more as agent-assisted development becomes
normal: **blast radius** (a change should land in one subtree) and **navigability** (load-bearing
dependencies that are not visible as imports fail first — refetch orchestration, draft state on
the wrong layer). Backend code is already organised by bounded context ([ADR-002](002-context-first-layout-and-context-integration.md)); the SPA needs an equivalent **frontend-specific**
partition that respects canvas UX ([ADR-006](006-graph-timeline-rendering.md)), determinism
(ADR-007), and the fact that the browser is not a source of truth.

## Decision Drivers

- **Axis of change** — code that changes for one user-facing reason should live together; backend
  endpoint names are not that axis on the client.
- **Deep modules** — a small public seam hides a large implementation (`board/index.ts` already
  works); shallow webs of composables do not.
- **Determinism** — validated server projections stay separate from permissive draft/intent state;
  the client never owns authoritative board mutations locally.
- **Harness enforceability** — folder claims must be checkable by dependency-cruiser, not prose
  alone.
- **Agent navigability** — an agent should start from the smallest subtree that contains one
  gesture, with a local instruction file, without loading the whole `src/app/` tree.
- **Second surface soon** — capture-loop must be a repeatable pattern for sibling surfaces under
  `src/app/`, not a one-off layout.

## Considered Options

- **Layer-first inside the SPA** — top-level `components/`, `hooks/`, `stores/`, `api/` (common
  React/Vue convention).
- **Endpoint-aligned vertical slices** — one folder per `/api` route or backend capability.
- **Interaction slices inside deep modules, on shared read-model substrate** — partition by user
  gesture within `shell/`, `board/`, and `dock/`; keep horizontal cold-load stores, transport, and
  view-state as shared infrastructure.
- **Full frontend DDD ceremony** — Repository per aggregate, DI container, horizontal `domain/`
  + `infra/` layers mirroring backend tactical patterns.

## Decision Outcome

Chosen option: **interaction slices inside deep modules, on shared read-model substrate**.

Each product surface under `src/app/<surface>/` (today: `capture-loop/`) is treated as a
**frontend bounded context** with its own ubiquitous language (see surface brief in
`.impeccable/surfaces/`). Inside a surface:

| Zone | Role | Why it exists |
|---|---|---|
| **`shell/`** | Composition root — mounts zones, owns cross-zone refetch orchestration | Cross-cutting wiring is real; hiding it inside child components creates invisible dependencies. Orchestration stays explicit and typed here. |
| **`board/`** | Deep module — canvas, layout adapter, gestures fused to the wall | EventStorming wall is an editor surface ([ADR-006](006-graph-timeline-rendering.md)); gestures that render on or mutate through the canvas co-change with layout, not with dock gestures. Public API: `board/index.ts` only. |
| **`dock/`** | Deep module — facilitator column, contribution and proposal gestures | Conversation UX is a separate co-change axis from the canvas; isolating it keeps dock from importing board internals. |
| **`stores/`** | Pinia **validated** projections — one GET each, shallow interface (`load`, `reset`, read) | Server snapshots are shared read models consumed by shell, board, and dock. Colocating them per gesture would duplicate cache logic. ADR-007 invariant preserved. |
| **`transport/`** | HTTP application services — POST/GET adapters + DTO mapping | First-party `/api/*` is a **Partnership** boundary: thin adapters + refetch, not a Repository that infers endpoints from aggregate diffs. Single place that calls `client.ts`. |
| **`view-state/`** | Ephemeral client-only derivation (filters, toggles) | Must not live on projection stores — refetch would race or wipe UI-only state. |
| **`<zone>/interactions/<gesture>/`** | One folder per multi-step user gesture | Frontend use cases are **stateful** (draft → confirm → persist → refetch), not transactional like backend handlers. Localization: change reword → one folder. |

### Interaction implementation shape

Multi-step gestures use a **framework-free use-case object**
(`{ initialState, interface(state, setState, deps) }`) plus a thin Vue composable adapter (~5
lines). Single-step gestures (one POST → refetch) stay a composable calling `transport/*` — no
ceremony layer.

**Permissive vs validated state:** draft and intent types (contribution text, reword draft,
proposal edit) live **inside the interaction folder** as explicit types with error states in their
lifecycle. Pinia stores hold **validated** projections only — populated by GET after POST, never
optimistically patched (ADR-007). The server promotes intent to validated truth; the client does
not mirror board mutations locally.

**Cross-zone effects:** zones emit typed events (`mutated`, `board-dirty`); `shell/` orchestration
maps them to which read models refetch. No global event bus; no store-to-store imports.

**Shared domain on the client:** pure layout/timeline logic stays in
`domain-model-capture/domain/timeline/` ([ADR-006](006-graph-timeline-rendering.md)); the app
imports only that published seam. Presentation concepts (dashed ghost, pending drawer) belong to
the frontend BC, not the backend contexts.

### Rejected alternatives (summary)

- **Layer-first** — scatters one gesture across `hooks/`, `components/`, and `stores/`; no linter
  can enforce "this hook belongs to that gesture."
- **Endpoint-aligned slices** — one POST surfaces in multiple UI zones; thin folders all share the
  same stores and fight ADR-007's shared GET model.
- **Full Repository layer** — adds indirection without hiding complexity on a purpose-built REST
  surface; refetch-after-POST already acts as the anti-corruption boundary.

### Positive Consequences

- A gesture change is scoped to one interaction folder plus, at most, shell orchestration and
  transport mapping.
- Deep modules stay deep; agents and humans import `board/index.ts`, not board internals.
- ADR-007 determinism is preserved — stores remain validated-only caches.
- dependency-cruiser rules extend naturally (interaction isolation, transport-only HTTP).
- A second surface copies the zone table without inventing a new layer-first layout.

### Negative Consequences

- More folders than a layer-first tree; navigation relies on AGENTS.md per zone and consistent
  interaction naming.
- Cross-zone workflows (accept proposal → board + account refetch) remain split across dock
  interaction + shell orchestration — explicit, but never fully colocated in one slice.
- Migrating existing composables (e.g. bundled board mutations) is mechanical churn before the
  shape pays off.

## Links

- [ADR-002](002-context-first-layout-and-context-integration.md) — `src/app/` talks HTTP only;
  context-first on the server
- [ADR-006](006-graph-timeline-rendering.md) — board as swappable renderer over domain timeline
  layout
- [ADR-007](007-frontend-architecture.md) — libraries, transport semantics, store shape, no
  optimistic updates (unchanged by this ADR)
- [`src/app/capture-loop/AGENTS.md`](../../src/app/capture-loop/AGENTS.md) — path-scoped zone
  boundaries and dependency-cruiser rules for the first surface
