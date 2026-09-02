# src/app/capture-loop/ — path-scoped

The capture-loop SPA surface: workshop creation, facilitation dock, board wall, and cold-load
stores. HTTP reaches capabilities only through `transport/*` adapters — never `client.ts`
outside that folder. Folder topology rationale: [ADR-012](../../../docs/adr/012-frontend-surface-topology.md).
Effort-map decisions: [`.specs/effort-maps/decisions-capture-loop-topology.md`](../../../.specs/effort-maps/decisions-capture-loop-topology.md).
See root `AGENTS.md` for global rules; `dependency-cruiser` enforces the boundaries below.

## Folder boundaries

| Zone | Path | Owns |
| ---- | ---- | ---- |
| Shell | `shell/` | Composition root — mounts zones, typed cross-zone refetch orchestration, workshop/session flows, account drawer |
| Dock | `dock/` | Facilitator UI, feed assembly, proposal/contribute interactions |
| Board | `board/` | Deep module — import only from `board/index.ts` |
| Transport | `transport/` | POST/GET adapters grouped by concern (proposals, session, board, account, workshop) |
| Stores | `stores/` | Pinia cold-load projections — no cross-store imports |
| View-state | `view-state/` | Client-only derived filters (e.g. withdrawn visibility, timeline) |
| Router | `router.ts` | Surface entry routes — declared by hand, not filesystem routing |
| Primitive | `client.ts` | Shared `fetch` helpers — transport modules only |

## Shell orchestration

Cross-zone refetch lives in `shell/orchestration/` (framework-free) and
`shell/composables/use-capture-orchestration.ts`. Zones emit typed events upward:

| Event | Refetch targets |
| ----- | --------------- |
| `mutated` | `session`, `proposals` |
| `board-dirty` | `board`, `account` |

Only shell maps events to store loaders. Board and dock do not import projection stores for refetch.

## Board deep module

`board/index.ts` exports `BoardWall` and `BoardBlockInput`. Shell and dock import the board
only through that entry. Inside `board/`:

- `kernel/` — shared relation-edit model, POST apply, typing-surface (importable by interactions)
- `composables/` — presentation-only hooks (e.g. fresh-sticky highlight)
- `interactions/<name>/` — one gesture per folder; no cross-interaction imports
- `presentation/` — presentational subcomponents the wall composes

## Dock interactions

`dock/interactions/` holds proposal review and contribution capture logic. Dock components
dispatch through `transport/*`; they do not import the board store — block labels come from the
shell as props. Feed assembly stays in `dock/composables/`.

## Zone docs

`shell/AGENTS.md`, `board/AGENTS.md`, and `dock/AGENTS.md` extend this file with zone-local
import rules. Read the zone doc for the subtree you are editing.
