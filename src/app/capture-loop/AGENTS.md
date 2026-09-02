# src/app/capture-loop/ — path-scoped

The capture-loop SPA surface: workshop creation, facilitation dock, board wall, and cold-load
stores. HTTP reaches capabilities only through `transport/*` adapters — never `client.ts`
outside that folder. See root `AGENTS.md` for global rules; `dependency-cruiser` enforces the
boundaries below.

## Folder boundaries

| Zone | Path | Owns |
| ---- | ---- | ---- |
| Shell | `screens/` | Composition root — wires stores, view-state, dock, and board |
| Dock | `dock/` | Facilitator UI, feed assembly, proposal/contribute interactions |
| Board | `board/` | Deep module — import only from `board/index.ts` |
| Transport | `transport/` | POST/GET adapters grouped by concern (proposals, session, board, account, workshop) |
| Stores | `stores/` | Pinia cold-load projections — no cross-store imports |
| View-state | `view-state/` | Client-only derived filters (e.g. withdrawn visibility, timeline) |
| Composables | `composables/` | Shell-level hooks (interpretation poll, reduced motion) |
| Account | `account/` | Readable-account drawer and HTML render |
| Primitive | `client.ts` | Shared `fetch` helpers — transport modules only |

## Board deep module

`board/index.ts` exports `BoardWall` and `BoardBlockInput`. Shell and dock import the board
only through that entry. Inside `board/`:

- `composables/` — selection, mutations, fresh-sticky highlight
- `interactions/<name>/` — one gesture per folder; no cross-interaction imports
- `presentation/` — presentational subcomponents the wall composes

## Dock interactions

`dock/interactions/` holds proposal review and contribution capture logic. Dock components
dispatch through `transport/*`; they do not import the board store — block labels come from the
shell as props.
