---
workshop: design-level
scope: derived-artifact-generation
status: draft
last_updated: 2026-08-28
digest: 9cbb65e2d2be
derived_from:
  - path: bounded-contexts/derived-artifact-generation/canvas.md
    digest: 99476d0589b3
    at: 2026-08-28
  - path: sessions/2026-08-27-design-level-derived-artifact-generation.md
    digest: ecd3d54470f6
    at: 2026-08-27
---
# Ubiquitous Language: Derived Artifact Generation

> Extended by the Design-Level pass 2026-08-27; reconciled to PRD F10 on the 2026-08-28 resume.
> Still thin — this context borrows Domain Model Capture's and Session Facilitation's vocabulary
> rather than maintaining its own. The **synthesized summary** term is retired (Flow C removed);
> the **model summary** is now a deterministic template render.

**Status:** draft • **Provenance:** `[storm]` (2026-08-27 + 2026-08-28 resume) / `[glossary]` (PRD F10 / F19)

## Terms

| Term | Meaning in this context | Source | Flags |
|---|---|---|---|
| Model export | The output of `Export Model`: the complete model, rendered. Same content regardless of representation | `[storm]` | — |
| Representation | The wire form of a model export — machine-readable JSON, or the human-readable Markdown *readable account*. **Domain-invisible**: the domain does not distinguish them; same walk, same rules | `[storm]` 2026-08-28 | — |
| Readable account | The Markdown representation of the model export — a full walk of the model, produced by a **template over the snapshot**, no interpretation. Also shown as the live in-app view | PRD F10 (`[glossary]`), confirmed `[storm]` | — |
| JSON export | The machine-readable representation of the model export. **Round-trips**: re-importing it reproduces the model exactly. Contains no quoted evidence | PRD F10 (`[glossary]`), confirmed `[storm]` | — |
| Structured outcome | PRD F10's umbrella for the deterministic model artifacts (JSON export + readable account + model summary) | PRD F10 (`[glossary]`) | — |
| Model summary | The output of `Export Model Summary`: **the model's own outline**, assembled deterministically (spine, counts, named branch points, chosen problem, open model-affecting hot spots, coverage gaps). A designed **reduction** — answers "the gist," not "the model." No causal prose, no quoted evidence, no language model | PRD F10 (`[glossary]`), confirmed `[storm]` 2026-08-28 | replaces "synthesized summary" |
| ~~Synthesized summary~~ | ~~A narrative account produced with the AI Model Provider, non-deterministic~~ | — | **retired 2026-08-28** — Flow C removed by the PRD F10 determinism pass; the AI narrative summary is a post-v1 idea (PRD §7) |
| Session transcript export | The output of `Export Session Transcript` (PRD F19): the verbatim expert↔facilitator conversation, each turn annotated with the proposal it produced and that proposal's terminal disposition, plus per-contributor accept / edit / reject counts | PRD F19 (`[glossary]`), confirmed `[storm]` | — |
| Terminal disposition | A proposal's final state as rendered in the transcript export, distinctly: *applied as building block B* / *rejected by the expert* / *proposed but never taken up* / *accepted but apply-failed (hot spot raised)* | `[storm]` 2026-08-28 | — |
| Rendered reference | A building block id resolved to its **current** label at render time. Cannot go stale | PRD F10 (`[glossary]`), confirmed `[storm]` | — |
| Quoted evidence | Frozen free text reproduced verbatim — transcript quotes and stored proposal rationales. **Does not follow a rewording**, by design. Present in the readable account only — not the JSON export, not the model summary | PRD F10 (`[glossary]`), confirmed `[storm]` | — |
| Coverage disclosure | The part of every deterministic artifact that states the format used, the narrator count, the scope and chosen problem with their qualification, and **which steps were not run** — so "skipped a step" is distinguishable from "ran it and found nothing" | PRD F10 (`[glossary]`), confirmed `[storm]` | — |
| On-demand | Every artifact is produced when requested; none exists between requests; requesting one never produces another | `[storm]` | resolves `../../open-questions.md` #9 (downloads) |
| Live in-app readable account | A render of the readable account shown beside the board, **re-rendered on every applied operation** — same coupling as the board (F02). Not eventually consistent, not stale-able; only a "catching up" indicator if rendering is debounced under load | PRD F10 (`[glossary]`), `[storm]` 2026-08-28 | supersedes the 2026-08-27 "stale-able preview" |
| Session record | Session Facilitation's `Session` stream: ordered conversation turns **plus** the `Proposal` lifecycle events. The raw material `Export Session Transcript` reads | `[storm]` | Facilitation's term, borrowed here |

## Behaviour (scenarios)

Captured as acceptance tests 22–31 in `../../acceptance-tests.md` (revised on the 2026-08-28 resume).

## Ambiguities & synonyms found (boundary / modelling signals)

- **"timeline"** — the PRD (F02) uses it for the placed-vs-backlog UI surface; Domain Model
  Capture's derived connected-component read model needs a name that isn't "timeline". Neither
  meaning is this context's, but the model export and the model summary render both concepts and
  must not conflate them. See `../../open-questions.md` #37 / #60.
- **"deterministic"** — load-bearing and now total: **every** v1 artifact is a deterministic
  template render. There is no non-deterministic path in this context after the 2026-08-28
  reconciliation.
- **"summary"** — the *model summary* (deterministic outline, this context) vs. the *facilitation
  summary* frozen at `Close Session` (Session Facilitation, feeds `Prior-session history`). Same
  word, different concepts, different contexts.

<!-- BEGIN lineage:index -->
<!-- END lineage:index -->