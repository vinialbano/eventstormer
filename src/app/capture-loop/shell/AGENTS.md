# shell/ — path-scoped

Composition root for the capture-loop surface. Mounts board and dock zones, owns cross-zone
refetch orchestration, workshop/session screens, and the readable account drawer.

Extends [`../AGENTS.md`](../AGENTS.md) for shared substrate (stores, transport, ADR-007).
See root `AGENTS.md` for global rules.

## Owns

| Path | Responsibility |
| ---- | -------------- |
| `CaptureScreen.vue`, `CreateWorkshop.vue` | Workshop entry and capture session shell |
| `account/` | Readable account drawer rendering |
| `composables/` | Vue adapters — orchestration wiring, interpretation poll |
| `orchestration/` | Framework-free refetch graph and bootstrap (no vue/pinia imports) |

## Import rules

- May import projection stores, `transport/*`, board public API (`board/index.ts`), and dock
  components.
- Orchestration modules under `orchestration/` import only other orchestration files and
  plumbing types — never Vue, Pinia, or zone internals.
- Shell maps zone events to store loaders; board and dock emit upward — shell does not reach
  into interaction folders.
