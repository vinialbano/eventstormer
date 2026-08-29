# ADR-010: Tracer-Bullet Build Order

- **Date**: 2026-08-29
- **Status**: Accepted
- **Deciders**: Vinicius Albano
- **Tags**: planning, build-order, sequencing
- **Source**: [#30 (G11)](https://github.com/vinialbano/eventstormer/issues/30)

## Context and Problem Statement

The PRD's dependency graph (§8) is structurally correct but sequencing-blind: it puts F09 (the
chosen problem — the session's closing deliverable) in wave 5, downstream of nearly everything,
and treats every wave-1 feature as equal. What actually demonstrates the product is the
**facilitator** and the **no-drift claim** (a live projection of the model, never a
hand-maintained copy). A build sequenced by the graph spends its first days on the board's
visuals and reaches that substance late.

## Considered Options

1. **Honour the wave graph literally** — safe, no rework, but the facilitator and the demo beat
   land ~60% through, and F09/F19 risk being rushed or cut.
2. **Tracer-bullet vertical slices** — one narrow path all the way through, then widen.
3. **Facilitator-first, model stubbed** — fastest to "it proposes things", but defers F01/F10
   (the novel claims) and the stub→real swap is exactly the drift the product exists to kill.

## Decision Outcome

**Option 2 — tracer-bullet vertical slices, with a hard cut line at "thesis-complete".**

| Slice | Contents | Features | ~ |
|---|---|---|---|
| **0 — skeleton + irreversibles** | context-first layout migration ([ADR-002](002-context-first-layout-and-synchronous-choreography.md)); `plumbing/` (Result, ids, EventStore port + `node:sqlite` adapter + escape hatch, bus, model-call logger); auto-migrate DB; **the op-schema Zod SSOT with `op_version` + `v: z.literal(1)`** ([ADR-004](004-operation-log-schema-and-versioning.md)); Board decider minimal (capture/reword/withdraw/reinstate); `replay(log) === snapshot` green; Changesets + release CI ([ADR-009](009-versioning-and-release.md)). **Spike:** structured-output round-trip. | F01 core | ½d |
| **1 — the capture loop** | Workshop + Session deciders; `start-workshop`/`start-session` + the one-open-session index; `make-contribution`; the merged interpret+nextMove call on Sonnet 5 + the system prompt; the deferred-interpretation queue + retry ladder; Proposal lifecycle + `review-proposal` + the synchronous apply chain; the scope interaction. Events/actors/systems only; backlog only, no timeline. **Spike:** snapshot bake-off. | F18 F03 F04 F05 | 1d |
| **2 — the money shot** | `edit-model` reword/withdraw + the reference list; the deterministic readable-account renderer + client live-refetch; the rename-cascade confirm UI. | F06 (part) · F10 readable account | ½d |
| — | **CUT LINE — thesis-complete.** Facilitator builds a model → live readable account → rename cascade → JSON export (from slice 5). Demonstrates the whole pitch on its own. | | |
| **3 — relations + board** | F01 `sequence`/`insert between`/`place`/`link cause` + cascades + `fast-check` properties; `computeTimelineLayout` + Vue Flow/dagre board (reflow spike first, grid fallback ready); facilitator proposes relations; reword-hold-back gate; F07 pivotal. | F01 rest · F02 · F06 rest · F07 | 1d |
| **4 — hot spots + close** | `annotate`/`raise hot spot`/`resolve`/`reopen` + the `kind` field; Resolution lifecycle + `review-resolution`; F09 stakeholder-check + chosen-problem; `close-session` (atomic snapshot + summary freeze) + the close sweep. | F08 F09 F18 close | 1d |
| **5 — artifacts + eval + demo** | `export-model` (JSON, round-trips) + `export-summary`; `export-transcript`; the eval suite + fixtures + `pnpm eval --report`; `pnpm seed` + the recording. | F10 rest · F19 · F11 | 1d |
| **6 — harden** | remaining ADRs, `DESIGN.md`, README, `.node-version`, the coverage glob threshold. | — | ½d |

### Deliberate deviations from the wave graph

- **F10 readable-account is pulled to slice 2, ahead of F02 (the board).** It is the thesis beat
  and needs no board visuals; F02 is lower value-per-hour for demonstrating the product.
- **F06 is split** — reword/withdraw in slice 2 (the money shot), relation edits in slice 3.
- **F09 / F19 stay late**, as the graph has them.

### Parallel work

The demo narration recording (the maintainer's) can run any time before slice 5. The three
research spikes (structured output, snapshot format, layout reflow) are ~1 hour each at the head
of their slice.

## Consequences

- **Positive:** the load-bearing capabilities and the demo beat exist early and get the most
  iteration time; the irreversible decisions (persistence port, op-schema versioning) are
  exercised on day one; the cut line means a time crunch drops depth, not the thesis.
- **Negative:** F01 is touched across several slices (relations, hot spots, cascades added later)
  — mitigated by the op-schema-versioning discipline in slice 0.
- **Negative:** per-slice hand-off to `spec-driven-development` re-establishes context each time;
  accepted, the slices are deliberately small.

## Links

- [DESIGN.md](../../DESIGN.md) — the narrative version of this plan
- all other ADRs — each slice consumes several
