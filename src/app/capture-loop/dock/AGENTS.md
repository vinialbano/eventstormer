# dock/ — path-scoped

Facilitator dock: feed assembly, proposal review, and contribution capture. Block labels and
board state arrive from the shell as props — the dock does not import the board store or board
internals.

Extends [`../AGENTS.md`](../AGENTS.md) for shared substrate (stores, transport, ADR-007).
See root `AGENTS.md` for global rules.

## Owns

| Path | Responsibility |
| ---- | -------------- |
| `FacilitatorDock.vue`, `DockFeed.vue`, `DockComposer.vue` | Dock chrome and layout |
| `composables/` | Feed assembly (e.g. `use-dock-feed`) |
| `interactions/<name>/` | Proposal review and contribution capture |

## Import rules

- May import `transport/*`, session/proposals stores, and board public API (`board/index.ts`)
  types only — not `board/` internals beyond `index.ts`.
- Must not import board or account projection stores (ADR-012).
- Must not import `shell/orchestration/` — emit `mutated` and `board-dirty` upward for shell
  refetch.
