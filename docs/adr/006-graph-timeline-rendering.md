# ADR-006: Graph / Timeline Rendering

- **Date**: 2026-08-29
- **Status**: Accepted
- **Deciders**: Vinicius Albano
- **Tags**: frontend, rendering, layout
- **Source**: [#15 (R6)](https://github.com/vinialbano/eventstormer/issues/15)

## Context and Problem Statement

The board (F02) renders a DAG of domain events left-to-right along `follows` edges, with actors
and systems attached beneath the event they caused, branches visible, and each connected track as
its own run. Nodes are editable, variable-height stickies. Position is derived, never authored —
no pixel value is ever stored.

## Considered Options

`@vue-flow/core` + `@dagrejs/dagre`; the xyflow ecosystem (`@xyflow/*`); a CSS-grid-by-rank
fallback; `d3-dag`; `elkjs`.

## Decision Outcome

**Primary: `@vue-flow/core` (1.48.2) + `@dagrejs/dagre` (3.1.1), both MIT, `rankdir: 'LR'`.**
Vue Flow does no layout itself — we write the ~40-line dagre composable it publishes as an
example. Nodes are ordinary Vue SFCs (required for editable variable-height attached-actor
stickies). ~67 KB gzip combined. `@dagrejs/dagre`, never the dead unscoped `dagre`; it ships its
own types, so no `@types/dagre`.

- The 7-month `@vue-flow/core` publish gap is real but is a rewrite, not abandonment — the
  maintainer joined xyflow and work moved to a first-party `@xyflow/vue` 2.0. That package is
  prerelease only (`2.0.0-next.*`); **revisit at its stable release.**
- **`elkjs`** rejected: 433 KB gzip + a ~1.6 MB worker, and `EPL-2.0 OR GPL-3.0` breaks the
  otherwise-MIT stack.
- **`d3-dag`** rejected: ≥ 3× dagre's weight, single maintainer, crossing-minimisation gain not
  worth it for the PRD's shallow branching.

**Fallback: a CSS grid, one column per topological rank, no edge routing.** Zero dependencies,
~1–2 hours, structurally immune to the re-layout reflow that editable variable-height nodes
cause (a taller node moves one grid row, not the whole board). Each connected track renders as
its own grid — trivially the PRD's "separate tracks each render as their own run".

**Fallback trigger:** after one full build sitting, if the re-layout-on-every-edit reflow can't
be tamed by fixing sticky width, or multi-track layout needs hand-written per-component
offsetting, switch to the grid. A 1-hour reflow spike precedes committing the sitting.

### The domain interface that keeps the renderer swappable

A framework-free `computeTimelineLayout(snapshot): TimelineLayout` in
`src/domain-model-capture/domain/timeline/`, part of that context's published read interface
(`api.ts`). It emits per-event `rank` + `order` + `attachments` + `pivotal` and per-track
`follows` edges — **both** the rank and the raw edges from day one (dagre needs the edges, the
grid fallback needs the rank). No pixel coordinate crosses the boundary. A renderer swap is a
swap of the adapter component the board mounts.

## Consequences

- **Positive:** pan/zoom, edge routing, handles, and drag for free from Vue Flow; a cheap,
  reflow-proof escape hatch; the layout logic is testable and framework-free.
- **Negative:** a dependency with a slow recent publish cadence (MIT, 6.8k stars, not archived).
- **Negative:** editable variable-height nodes force a re-layout on every content change and will
  visibly reflow — mitigated by fixing sticky width so text wraps instead of the box growing.

## Links

- [ADR-007](007-frontend-architecture.md) — the app this renders inside
