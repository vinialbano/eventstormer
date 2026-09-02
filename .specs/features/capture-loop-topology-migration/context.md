# Capture-loop topology migration — Context

Effort-map #76 closed with all gray areas resolved. This file records locked inputs for Design
and Execute — no Discuss phase required.

## Source decisions

- [`.specs/effort-maps/decisions-capture-loop-topology.md`](../../effort-maps/decisions-capture-loop-topology.md)
- [`.specs/effort-maps/prototype-shell-orchestration.md`](../../effort-maps/prototype-shell-orchestration.md)
- [ADR-012](../../../docs/adr/012-frontend-surface-topology.md)
- [ADR-007](../../../docs/adr/007-frontend-architecture.md) — wire semantics frozen

## Locked constraints

1. **No ADR-007 changes** — stores stay validated-only; no optimistic patches; same GET/POST paths.
2. **Migration is mechanical** — user-visible behaviour and E2E happy path must not change.
3. **Dep-cruiser rules need planted violations** — repo convention; each rule proven before merge.
4. **One commit per task** — 15 tasks in `tasks.md`; offer sub-agents at Execute (~2 batches).
5. **Changeset** — patch on final delivery (refactor, no new product surface).

## Agent discretion (already decided in effort map)

- Orchestration file names and types: follow prototype doc verbatim.
- Task ordering: follow migration sequence in decisions doc.
- Test tiering: orchestration pure tests replace inline CaptureScreen refetch asserts.
