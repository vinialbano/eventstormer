---
"eventstormer": minor
---

Derived artifacts and facilitator relation / pivotal / reword tracks (F10 rest, F19; F04/F07).

- **F10 — structured JSON export.** `GET /workshops/:id/artifacts/model` serialises the Board
  snapshot plus the `ArtifactSource` workshop record to a deterministic `ModelJson` document —
  fixed key and array order, no language-model call, no quoted evidence. It round-trips:
  `deserialise(serialise(x))` reproduces `{ snapshot, source }` (fast-check property). Every
  artifact carries the composite version stamp `{ boardPosition, sessionRecordPosition,
  renderedAt }` (AD-037), and none declares external-toolchain compatibility.
- **F10 — deterministic summary.** `GET /workshops/:id/artifacts/summary` renders a Markdown
  outline — spine (pivotal events in `follows` order), per-kind counts, disconnected tracks and
  named branch points, open problems, coverage gaps — from the model alone, every section with
  an explicit empty / "not run" line, every ordered section a total order `(rank, id)`.
- **F19 — verbatim session transcript.** `GET /workshops/:id/sessions/:sessionId/artifacts/transcript`
  reproduces every turn of one session in order, each proposal annotated with its final
  disposition and resulting building block, plus a per-contributor accepted/edited/rejected
  count table. `readSessionTranscript` is a versioned `session-facilitation` read contract; the
  renderer does zero derivation over it.
- **F04 / F07 — facilitator tracks.** The turn schema gains `propose-relation` /
  `propose-pivotal` / `propose-reword` strands; the anticorruption seam resolves endpoint labels
  to building-block ids, drops self-edges and unresolved labels, and gates pivotal marks and
  rewords on model readiness (AD-036). Accepted tracks flow through the generalised `Proposal`
  aggregate (`Model Change Proposed` birth event, AD-035) and the existing apply chain.
  Relation, pivotal, and `resolve` operations are idempotent in the board decider — an
  already-satisfied effect converges to `APPLIED` rather than failing (AD-038).
- **App.** A live artifacts panel beside the readable account: a segmented picker for the three
  artifacts, re-rendering on every applied operation, with a stamped download.

Closes the rest of #42 (artifacts + facilitator tracks). The eval suite, `pnpm seed`, and the
recorded walkthrough are re-filed as a follow-on.
