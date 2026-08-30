# ADR-007: Frontend Architecture

- **Date**: 2026-08-29
- **Status**: Accepted
- **Deciders**: Vinicius Albano
- **Tags**: frontend, vue, pinia, transport
- **Source**: [#19 (R10)](https://github.com/vinialbano/eventstormer/issues/19), [#25 (G6)](https://github.com/vinialbano/eventstormer/issues/25), [#26 (G7)](https://github.com/vinialbano/eventstormer/issues/26)

## Context and Problem Statement

The SPA (Vue 3 + Pinia + Tailwind v4, per ADR-001) needs a component library, a transport,
a state-management shape, and a data-flow model. Determinism is the product's pitch — the client
must not invent state.

## Decision Outcome

### Libraries

- **Component library: Reka UI** (headless, MIT) for the ~6 accessibility-hard primitives
  (dialog, dropdown, popover, tooltip, toast, tabs); plain Tailwind + hand-rolled for the rest.
  `@headlessui/vue` is stalled; Ark UI is a heavier cross-framework abstraction; Nuxt UI is large
  and built on Reka UI anyway.
- **Forms: none.** Zod at the submit boundary — three trivial forms, and Zod is already in the
  stack. `@vee-validate/zod` held in reserve.
- **Markdown: `markdown-it` + `DOMPurify`**, sanitising the rendered HTML (the readable account
  embeds verbatim quoted evidence).
- Deliberately skipped for v1: list virtualisation, WebSockets, a styled component kit,
  TanStack/Vue Query, an icon framework.

### Transport — plain `fetch` POST, server-confirmed, synchronous within the request

- Every mutation is `POST /api/<capability>` → `{ opLogPosition, ... }` or a typed error →
  affected store(s) refetch → re-render. **No optimistic updates.**
- The **accept-proposal handler runs the whole apply chain synchronously** — a direct in-process
  call into `domain-model-capture`, each context committing its own stream (per
  [ADR-002](002-context-first-layout-and-context-integration.md)). No polling, no SSE. The
  PRD's "shows up a moment later" gap collapses to normal request latency.
- Mutation responses return the new operation-log position, so a later SSE broadcast for F14 is
  purely additive. **The stream is not built in v1.**

### State — three Pinia stores, each fully cold-loadable from one GET

| Store | GET (page load / refresh) |
|---|---|
| `session` — conversation (expert + facilitator turns, interleaved), open questions, scope, status, per-contribution interpretation status | `GET /api/workshops/:id/session` |
| `proposals` — pending proposals + resolutions, disposition state, apply-failed reasons, "+N more" | `GET /api/sessions/:id/proposals` |
| `board` — model graph projection, relations, timeline layout, backlog/timeline split, withdrawn-visibility toggle | `GET /api/workshops/:id/board` |

POST responses are a latency fast-path only. A refresh reconstructs full state from the three
GETs — the facilitator's last message is just the most recent facilitator turn in `session`. No
store imports another.

### Layout

Single page, three zones: (1) the board — backlog rail + timeline canvas, both always visible;
(2) a conversation + review column — facilitator messages & open questions (no accept control),
pending proposal cards, capture field at the bottom; (3) a toggleable readable-account drawer
(`GET /api/workshops/:id/readable-account`, live). The rename-cascade is a **deliberate two-step**
— an inline editor, then a confirmation popover listing the references
(`GET .../board/blocks/:blockId/references`), never a silent commit.

### The `/api` surface

~16 routes, all user-facing and verified line-by-line against the PRD. The facilitator, the
apply-operation Boundary Command, and `raise`/`resolve-hot-spot` have **no route** — they are
in-process. `ask-question` was removed (the facilitator is reactive). The full route table is in
[DESIGN.md](../../DESIGN.md).

## Consequences

- **Positive:** determinism is enforced by the architecture — the client can only render server
  state; every store survives a refresh; the F14 seam is drawn without paying for it.
- **Negative:** a synchronous accept handler is a cross-context command, not choreography —
  accepted as a v1 simplification, contained behind the handler, with ADR-002's
  per-context-transaction rule as the guardrail.

## Links

- [ADR-002](002-context-first-layout-and-context-integration.md) — in-process context
  integration: direct calls vs the fire-and-forget bus, and the transaction boundary
- [ADR-006](006-graph-timeline-rendering.md) — the board renderer
