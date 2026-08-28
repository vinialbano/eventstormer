---
workshop: design-level
scope: derived-artifact-generation
status: draft
last_updated: 2026-08-28
digest: effa6657a909
derived_from:
  - path: bounded-contexts/derived-artifact-generation/canvas.md
    digest: 99476d0589b3
    at: 2026-08-28
  - path: bounded-contexts/domain-model-capture/canvas.md
    digest: 705129af8f2d
    at: 2026-08-28
  - path: bounded-contexts/session-facilitation/canvas.md
    digest: 192d89ca4269
    at: 2026-08-28
  - path: context-map.md
    digest: ec6dc67a4870
    at: 2026-08-28
  - path: open-questions.md
    digest: c9a8044f0a62
    at: 2026-08-28
  - path: sessions/2026-08-27-design-level-derived-artifact-generation.md
    digest: ecd3d54470f6
    at: 2026-08-27
---
# Session record — Design-Level EventStorming: Derived Artifact Generation (2026-08-28, resume)

**Format.** Design-Level EventStorming, one bounded context — a **resume** of the 2026-08-27 pass.
**Scope.** `Derived Artifact Generation`, `draft` canvas — updated in place (ordinary resume case).
**Participants.** One: the product owner (solo). List narrowed out loud to the owner plus the
Engineer as a secondary downstream-reader source; F16 out of scope for v1.
**Strategy.** Seed-events-then-connect — the vocabulary was stable; what was in flux was which
shapes survive the 2026-08-28 PRD F10 reconciliation.

## Why resume

`open-questions.md` #70 named this exact resume as the owner of a reconciliation: the 2026-08-28
PRD F10 determinism pass (commit `ec3d094`) resolved #40 in the **opposite direction** from the
2026-08-27 canvas — every v1 artifact stays deterministic, the AI narrative summary deferred to
post-v1 (PRD §7). The canvas's Flow C (non-deterministic, AI-generated) contradicted product
truth; per `AGENTS.md`, product truth wins.

## Prepare step — disclosures made to the participant

- Stop condition stated: enough confidence to build, invariants named, integration explicit, six
  completion rules reported.
- Thin-source disclosure given (book thin on Design-Level; method detail from the 2025 templates
  and DDD literature).
- Invalidation warning given: this pass reconciles *to* the PRD and supersedes parts of the
  2026-08-27 canvas; that is a result.
- Lineage `check` run at entry: 12 stale, 0 dangling. Four are this canvas, stale against its
  upstreams (`domain-model-capture/canvas`, `session-facilitation/canvas`, `context-map`,
  `open-questions`) — exactly what this resume closes. At close, this canvas is clean against all
  four; the remaining 12 are the pre-existing cascade (the 2026-08-26 Big Picture resume + the
  QHSR collapse, per `open-questions.md` #69) plus the new `context-map.md ← this canvas` edge
  (`ddd-strategic-design`'s to fold in — its decision sections already describe this model).
  Reported, not auto-propagated.
- Codebase: scaffold only. Nothing to disclose from code. PRD F10 / F19 treated as product truth.
- Harvested: event vocabulary; motivating hot spot #70; touched external contexts (two Core
  upstreams, both now decided; AI Model Provider dropping).

## Elicitation — questions put, answers given

1. **Flow C folds into the deterministic set?** — *"Yes, that's my understanding."* No language
   model anywhere in v1; the deterministic template summary replaces the AI narrative; AI Model
   Provider dependency and `Summary Generation Failed` path drop; AI narrative parked post-v1.
2. **The in-app readable account — live (PRD F10) or stale-able (2026-08-27 canvas)?** — *"A"* —
   **live**. Re-renders on every applied operation, same coupling as the board; no staleness
   signal in the normal case, only a "catching up" indicator under debounce. Downloads stay
   point-in-time. Supersedes the 2026-08-27 "stale-able preview / GitHub-PR-style signal".
3. **Flow B: render all four terminal dispositions distinctly, or collapse the lapsed cases?** —
   *"Render all distinctly, as it's more accurate to the history."* Resolves #56.
4. **Per-contributor accept / edit / reject counts belong in Flow B?** — *"Ok."* Confirmed:
   computed from the `Session` stream, because edits and rejections never reach the operation log,
   so a model-reading artifact structurally cannot report them (PRD F19 line 610).
5. **No aggregate, no consistency boundary, rule 6 N/A still holds?** — *"Yes."*
6. **Artifact shape — four commands, or one parameterised?** Participant challenged the framing:
   *"Isn't `Export Model As JSON` and `Export Readable Account` the same thing, just changing the
   format? The format doesn't matter to the domain. Should we name them `Export Model`?"* — Adopted.
   Three Boundary Commands: `Export Model` (representation a domain-invisible parameter),
   `Export Model Summary` (a designed reduction — distinct), `Export Session Transcript` (distinct
   source, distinct rules). Confirmed: *"Yes."*
7. **Seam validation + open hot spots** (AskUserQuestion): seam **Confirmed** — two Conformist
   Core upstreams, 0 external systems, 0 boundary events out. Open hot spots #42 and #43 —
   **both stay unowned/undated**.

## Normalization

- `Export Structured Model` → split by concept, not format: `Export Model` (JSON | readable
  account) + `Export Model Summary`. `Generate Summary` → `Export Model Summary`, now deterministic.
- Flow C (`Generate Summary` / `Summary Generated` / `Summary Generation Failed`, AI Model
  Provider) — **retired**.
- "Readable-account preview" (eventually-consistent read model) → "live in-app readable account"
  (re-rendered every operation, not a read model with its own staleness).
- Flow B keeps its command (`Export Session Transcript` → `Transcript Exported`), gains distinct
  disposition rendering and per-contributor counts.

## Event quality review

### Keep

- `Model Exported`, `Model Summary Generated`, `Transcript Exported` — past-tense business facts,
  each a distinct outcome a distinct actor came for. `[storm]`.

### Retired

- `Summary Generated` / `Summary Generation Failed` — Flow C removed. `Summary Generation Failed`
  was a real terminal state *while Flow C existed*; with no external dependency there is no
  failure path to model.

### Move out of events

- The live in-app readable account — a view coupled to the operation stream, not a domain event
  or a modelled reaction.

## Aggregates — invariant-first walk (re-confirmed)

1. Invariant? "Purely read and render" (2026-08-27), re-confirmed 2026-08-28. Worst failure is a
   stale or ugly artifact, never a corrupt model.
2. No invariant → no responsibility → **no aggregate.**
3. "What happens when determinism breaks anyway?" — a non-deterministic render is a *bug* (test
   22), not a tolerated business condition → **no corrective policy.** With Flow C gone, no path
   is non-deterministic by design.

Consequence: no state machines; completion rule 6 N/A (stated, not dropped).

## Seam validation

- **Consistency lens:** no aggregate exists, nothing spans either seam. Holds trivially.
- **Integration lens:** both upstream edges are **decided** (not candidates):
  Domain Model Capture → this (Conformist, model graph) — inherited seam, unchanged;
  Session Facilitation → this (Conformist, session record) — adopted by `ddd-strategic-design`
  2026-08-28. This context is a Conformist downstream of two Core contexts.
  `Operation Applied` (keyed to proposal id, carries resulting building block id) gives Flow B its
  correlation — closed at source (#51).
- **Ownership:** one team, one person, unchanged.
- **External systems:** none — AI Model Provider row removed.

## Official narrative vs. observed reality

| Source | Said | This session |
|---|---|---|
| 2026-08-27 canvas | Three artifact *types* A/B/C; C non-deterministic, AI-generated, `[storm]` v1 goal | Flow C retired; three deterministic artifacts (`Export Model`, `Export Model Summary`, `Export Session Transcript`) |
| 2026-08-27 canvas | Readable-account preview: eventually consistent, stale-able, "model changed" signal | Live in-app readable account: re-renders every operation, no staleness signal (PRD F10) |
| 2026-08-27 canvas | AI Model Provider is an external system this context consumes | No external system — pure deterministic rendering |
| PRD F10 / F19 / §7 | Every v1 artifact deterministic; no language model; AI narrative deferred | **Canvas now matches** — reconciliation complete |
| 2026-08-27 canvas | `Export Structured Model` produces JSON + readable account together | Split: `Export Model` (representation a domain-invisible parameter) + `Export Model Summary`; requesting one never produces another |

## Candidate strategic-design changes (candidates, not performed here)

- None new. The Session Facilitation → Derived Artifact Generation edge and the two-Core-upstream
  shape were already adopted by `ddd-strategic-design` 2026-08-28. The Supporting classification
  was re-confirmed the same day and is *strengthened* by this reconciliation (no external
  dependency, no non-determinism).

## Verification pass

- Every claim in `canvas.md` traced to an elicitation answer above, to the prior session record,
  or to PRD F10 / F19 / §7 (marked `[glossary]`).
- No element presented as settled carries `[code]` or `[inferred]` — there is no `[inferred]` item
  left (the candidate seam it once held is now a decided edge).
- The three artifacts each reach an end state. There is no failure path to model (no external
  dependency).

## Six completion rules — reported

| # | Rule | Status |
|---|---|---|
| 1 | Every path completed | **Holds** — `Export Model`, `Export Model Summary`, `Export Session Transcript` each end in their artifact; no failure path exists (no external dependency) |
| 2 | Grammar respected | **Holds** — command → render → event throughout; no policies, none needed |
| 3 | Every stakeholder reasonably happy | **Holds** — Engineer (JSON model export), Domain Expert (readable account / summary / transcript), absent colleague (any of them) |
| 4 | Every hot spot addressed | **Holds** — #70, #56 resolved; #40 resolved by the PRD pass; #44 moot; #42, #43 carried unowned/undated by the participant's explicit choice |
| 5 | Boundaries visible | **Holds** — 3 Boundary Commands in, 0 Boundary Events out, 2 Conformist read edges in (both decided), 0 external systems |
| 6 | Components behave consistently | **N/A** — no aggregates, no components (stated, not dropped) |

Rules 1–5 hold. Rule 6 is not applicable.

## Stop

Reached the stop condition: enough confidence to build this context. The event-stormed model now
matches product truth end to end. Recommended next action (not performed): prototype `Export
Model` and `Export Model Summary` as pure template renders over the `Board` projection, and write
down the questions they raise — especially whether the `Board` carries every datum the summary
needs (#43) and where the format-step list lives (#42).