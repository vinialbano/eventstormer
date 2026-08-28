---
workshop: design-level
scope: derived-artifact-generation
status: draft
last_updated: 2026-08-27
digest: ecd3d54470f6
derived_from:
  - path: boards/eventstormer-big-picture.md
    digest: a1fe4f12aaba
    at: 2026-08-27
  - path: bounded-contexts/derived-artifact-generation/canvas.md
    digest: d6648843193b
    at: 2026-08-27
  - path: bounded-contexts/domain-model-capture/canvas.md
    digest: 705129af8f2d
    at: 2026-08-28
  - path: bounded-contexts/session-facilitation/canvas.md
    digest: 192d89ca4269
    at: 2026-08-28
  - path: context-map.md
    digest: d4fd9c957b26
    at: 2026-08-28
  - path: open-questions.md
    digest: 82b19cc9dbf4
    at: 2026-08-28
---
# Session record — Design-Level EventStorming: Derived Artifact Generation (2026-08-27)

**Format.** Design-Level EventStorming, one bounded context.
**Scope.** `Derived Artifact Generation` — the last v1 context without an event-stormed model.
**Participants.** One: the product owner (solo). Room narrowed out loud at the prepare step to the
owner plus the Engineer as a secondary downstream-reader source (F16 out of scope for v1).
**Strategy.** Reverse narrative — started from the outcome (a person has an artifact in hand) and
worked backward, because the contested question was the *trigger* (on-demand vs. live), not the end.

## Prepare step — disclosures made to the participant

- Stop condition stated: enough confidence to build, invariants named, integration explicit, six
  completion rules reported.
- Thin-source disclosure given: the book's Design-Level chapters are its least-finished part; some
  method detail comes from the author's 2025 templates and DDD literature.
- Invalidation warning given: this pass may contradict the Big Picture; that is a result.
- Lineage `check` run at entry: this context's canvas was flagged stale against `context-map.md`
  (the Question & Hot Spot Resolution collapse moved the digest). No content in that collapse
  touched this context; re-linked at close.
- Codebase: no implementation of this context exists (scaffold only). Nothing to disclose from
  code. PRD F10 treated as a hypothesis, not truth.
- Motivating hot spot harvested: `open-questions.md` #9 (on-demand vs. materialized export).

## Raw capture, before normalization

Participant's own words, in order elicited:

1. "The session will be transformed somehow into an exportable artifact. It can probably be a JSON
   file for the developer and probably a markdown file for the humans... transforming the session
   into an artifact through a template or something... deterministic."
2. On trigger: "I think it's a waste of time to update in real time. This will only be consumed
   on-demand."
3. On the live side-panel (options A = drop it, B = keep it as a cheap stale-able view): "B is
   good enough. We can have a read model that can become stale and it won't be a problem... like
   the GitHub PR review UI that informs us when the PR content changed and we reload the page...
   It can be eventually consistent."
4. On inputs / determinism: "It reads the model. Maybe we need all the interaction between the
   domain expert and the facilitator for context. This would make the output non-deterministic
   though... I don't know if this is a problem."
5. Expansion: "A synthesized narrative would be useful, but probably the full transcript is also
   useful... Probably we have 3 models of artifacts. The deterministic outcome of the structured
   model, the transcripts of the sessions, and a high-level summary... We can then produce boards,
   canvases, or other types of artifacts that EventStorming and Strategic DDD needs."
6. On scope + determinism trade-off: "I think both A, B and C. And I understand that C breaks
   determinism and requires interpretation. That's okay."
7. On per-type requests: "They can ask for one type only."
8. On invariant: "this is purely read and render."
9. On the transcript: "The transcript belongs to the Session Facilitation" / "it's the Session
   Facilitation's responsibility to record... when the proposals were made and accepted. If we are
   already logging those things, it's easy to correlate and export."
10. On Flow B content: "I like the idea of the transcript plus the contributions."
11. On Flow C with no AI: "We can't generate the summary without AI. We need to retry later."

## Normalization

- Three flows named: A `Export Structured Model` → `Structured Export Generated`;
  B `Export Session Transcript` → `Transcript Exported`; C `Generate Summary` →
  `Summary Generated` / `Summary Generation Failed`.
- "3 models of artifacts" → three artifact *types*, each independently requestable.
- "template or something" → template over the model snapshot, no interpretation (Flows A/B).
- Preview kept as a read model, separate from the on-demand readable-account artifact.
- "boards, canvases..." → explicitly deferred out of v1 (open-questions #41).

## Event quality review

### Keep

- `Structured Export Generated`, `Transcript Exported`, `Summary Generated` — past-tense business
  facts, each a distinct outcome a distinct actor came for. `[storm]`.
- `Summary Generation Failed` — a real terminal state on C's failure path (external dependency
  down), not technical chatter: the business response is "tell the user, retry later." `[storm]`.

### Renamed / considered

- "Export Model (structured) / Export Model (readable account)" (phase 05–06 canvas draft) → split
  by the participant's "they can ask for one type only" into per-type commands. The readable
  account rides Flow A (same template pass over the model), so A produces both the JSON and the
  Markdown; B and C are separate commands.

### Move out of events

- "The session will be transformed" — an aspiration, not an event. Became the purpose statement.
- The live side-panel — a read model (`Readable-account preview`), not an event.

### Hot spots (all carried to `open-questions.md`)

- PRD F10 divergence (count + determinism) — #40.
- New context-map edge to Session Facilitation — #39.
- DDD-artifact generator — #41.
- Coverage-disclosure source of truth — #42.
- Upstream-completeness constraint on Capture — #43.
- Flow C persistence — #44.

## Aggregates — invariant-first walk

1. Invariant? The participant, asked directly whether anything here must be kept true: "this is
   purely read and render." The worst failure is a stale or ugly artifact, never a corrupt model.
2. No invariant → no responsibility to protect it → **no aggregate.** An aggregate with no
   invariant is a table.
3. "And what happens when the rule breaks anyway?" — a non-deterministic Flow A render is a *bug*
   (caught by acceptance test 22), not a tolerated business condition, so **no corrective policy**.
   Flow C has no rule to break — it is defined as non-deterministic.

Consequence: no state machines; completion rule 6 is N/A.

## Seam validation

- **Consistency lens:** no aggregate exists, so nothing spans the seam. Holds trivially.
- **Integration lens:** inherited seam (Capture → Artifact, Conformist) holds — the model contract
  is unchanged. Found a **second, unrecorded upstream**: Session Facilitation, for the session log
  (transcript + proposal lifecycle) that Flows B and C read. Recorded as a candidate revision with
  evidence in `context-map.md` and `open-questions.md` #39. This is an *added* upstream, not a
  moved boundary.
- **Ownership:** one team, one person, all v1 contexts. Nothing new named.

## Official narrative vs. observed reality

| Source | Said | This session |
|---|---|---|
| PRD F10 | Exactly two artifacts | Three artifact types for v1 |
| PRD F10 | Readable account "regenerate[s] on every applied operation"; live side-panel | On-demand generation; the live panel is a stale-able eventually-consistent read model |
| PRD F10 | Readable account "never generated by a language model... determinism is the product's central claim" | True for A and B; **Flow C deliberately breaks it** — AI-generated, non-deterministic, accepted `[storm]` |
| phase 05–06 canvas | "terminal, read-only context... No external systems" | Flow C consumes the AI Model Provider |
| phase 05–06 canvas | Events in: "UNCONFIRMED... depends on whether F10's export is computed on request or kept live" | Resolved: on-demand → **no events in required for correctness** |

## Candidate strategic-design changes (candidates, not performed here)

- Adopt or revise the Session Facilitation → Derived Artifact Generation edge (`context-map.md`,
  #39).
- PRD F10 rewrite: three artifact types; the determinism claim scoped to A and B; the live panel
  reframed as an eventually-consistent read model. Owner: participant (#40).
- `domain-model-capture` next resume: consider embedding every Flow-A datum in Capture's
  aggregates so the deterministic report is complete from the model alone (#43).

## Verification pass

- Every claim in `canvas.md` traced to a raw-capture line above or to PRD F10 (marked
  `[glossary]`).
- No element presented as settled still carries `[code]` or `[inferred]` — the only `[inferred]`
  item is the candidate seam itself, correctly marked and mirrored to `open-questions.md`.
- The three flows each reach an end state, including C's failure path.

## Six completion rules — reported

| # | Rule | Status |
|---|---|---|
| 1 | Every path completed | **Holds** — A, B, C each end; C's provider-down path (`Summary Generation Failed` → retry) is modelled |
| 2 | Grammar respected | **Holds** — command → render → event throughout; no policies, none needed |
| 3 | Every stakeholder reasonably happy | **Holds** — Engineer (JSON), Domain Expert (readable account / transcript / summary), absent colleague (any) |
| 4 | Every hot spot addressed | **Holds** — #39/#44 handed to `ddd-strategic-design`; #40/#42/#43 owned or attributed; #41 deferred with attribution |
| 5 | Boundaries visible | **Holds** — 3 Boundary Commands in, 0 Boundary Events out, 2 Conformist read edges in, 1 external system (C only) |
| 6 | Components behave consistently | **N/A** — no aggregates, no components |

Rules 1–4 hold. Rule 5 holds. Rule 6 is not applicable (stated, not dropped).

## Stop

Reached the stop condition: enough confidence to build this context. All three v1 contexts with an
owner now have a `[storm]`-confirmed event-stormed model. Recommended next action (not performed):
start a prototype of Flow A and write down the questions it raises (book, p. 331).