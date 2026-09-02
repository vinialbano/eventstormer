# board/ — path-scoped

Deep module for the EventStorming wall. External code imports only from [`index.ts`](index.ts)
(`BoardWall`, `BoardBlockInput`). `BoardWall.vue` composes interactions; gesture logic lives in
`interactions/<name>/`.

Extends [`../AGENTS.md`](../AGENTS.md) for shared substrate (stores, transport, ADR-007).
See root `AGENTS.md` for global rules.

## Owns

| Path | Responsibility |
| ---- | -------------- |
| `BoardWall.vue` | Composition shell — wires interactions and presentation |
| `kernel/` | Shared relation-edit model, POST apply, typing-surface (importable by interactions) |
| `interactions/<name>/` | One user gesture per folder |
| `composables/` | Presentation-only hooks (e.g. fresh-sticky highlight) |
| `presentation/` | Presentational subcomponents the wall composes |

## Import rules

- No Pinia projection stores — props in, `board-dirty` event out (ADR-007).
- Interaction folders may import only their own files and `kernel/` — no sibling interactions,
  composables, presentation, or layout.
- Each interaction defines local view types; do not import `layout.ts` from interactions.
- POST mutations go through `kernel/apply-board-edit.ts` and `transport/board.ts`.
