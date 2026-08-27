---
workshop: design-level
scope: derived-artifact-generation
status: draft
last_updated: 2026-08-27
digest: 8a7a4864257d
derived_from:
  - path: bounded-contexts/derived-artifact-generation/canvas.md
    digest: d6648843193b
    at: 2026-08-27
  - path: sessions/2026-08-27-design-level-derived-artifact-generation.md
    digest: ecd3d54470f6
    at: 2026-08-27
---
# Ubiquitous Language: Derived Artifact Generation

> Extended by the Design-Level pass, 2026-08-27. Still thin — this context borrows Domain Model
> Capture's and Session Facilitation's vocabulary rather than maintaining its own — but the three
> artifact types and the determinism distinction now have confirmed terms.

**Status:** draft • **Provenance:** `[storm]` (this session) / `[glossary]` (PRD F10)

## Terms

| Term | Meaning in this context | Source | Flags |
|---|---|---|---|
| Structured export | The JSON serialisation of the model — building blocks, both relation kinds, annotations, provenance, operation log. Round-trips: re-importing it reproduces the model exactly | PRD F10 (`[glossary]`), confirmed `[storm]` | — |
| Readable account | The Markdown rendering of the model, produced by a **template over the snapshot**, no interpretation | PRD F10 (`[glossary]`), confirmed `[storm]` | — |
| Structured outcome | Umbrella for Flow A's pair of outputs (structured export + readable account) — the deterministic artifacts | `[storm]` | — |
| Session transcript export | Flow B's output: the verbatim expert↔facilitator conversation, each turn annotated with the proposal it produced and that proposal's disposition | `[storm]` | — |
| Synthesized summary | Flow C's output: a narrative account produced with the AI Model Provider. **Non-deterministic** and stamped as such | `[storm]` | — |
| Rendered reference | A building block id resolved to its **current** label at render time. Cannot go stale | PRD F10 (`[glossary]`), confirmed `[storm]` | — |
| Quoted evidence | Frozen free text reproduced verbatim — transcript quotes and stored proposal rationales. **Does not follow a rewording**, by design | PRD F10 (`[glossary]`), confirmed `[storm]` | — |
| Coverage disclosure | The part of every deterministic artifact that states the format used, the narrator count, and **which steps were not run** — so "skipped a step" is distinguishable from "ran it and found nothing" | PRD F10 (`[glossary]`), confirmed `[storm]` | — |
| On-demand | Every artifact is produced when requested; none exists between requests. Contrast with the preview (below), which persists but is allowed to be stale | `[storm]` | resolves `../../open-questions.md` #9 |
| Readable-account preview | An eventually-consistent projection of the readable account, shown beside the board, carrying a "model changed since rendered" signal. Distinct from the on-demand readable account artifact | `[storm]` | — |
| Session log | Session Facilitation's ordered record of conversation turns **plus** proposal-made / accepted / rejected events. The raw material Flows B and C read | `[storm]` | Facilitation's term, borrowed here |

## Behaviour (scenarios)

Captured as acceptance tests 22–31 in `../../acceptance-tests.md`.

## Ambiguities & synonyms found (boundary / modelling signals)

- **"timeline"** — the PRD (F02) uses it for the placed-vs-backlog UI surface; Domain Model
  Capture's Design-Level pass uses `Timeline` for an aggregate (one per connected component of
  sequenced events). Neither meaning is this context's, but Flow A renders both concepts and must
  not conflate them in output. See `../../open-questions.md` #37.
- **"deterministic"** — load-bearing here and used precisely: Flows A and B are deterministic
  (template / reproduction); Flow C is explicitly not. An artifact's determinism status is part of
  what it declares about itself.

<!-- BEGIN lineage:index -->
<!-- END lineage:index -->