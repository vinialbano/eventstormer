---
"eventstormer": minor
---

Facilitator eval suite, offline demo seed, superseded marker, and the in-dock model-change card
(#92).

- **F11 — facilitator eval suite.** Deterministic oracles over the facilitator's returned
  `FacilitationTrack[]` (`proposesRelation` / `proposesPivotal` / `proposesReword` /
  `flagsPhase` / `attributesToFormat`), an extended `EvalFixture` schema (`phaseFlagged`,
  `attributesToFormat`, `relation`, `pivotal`, `reword`, `priorBlocks`), and one fixture per F11
  assertion drawn from the seed narration. `pnpm eval --report` splices a per-case × per-assertion
  `k/N` table into the README.
- **`pnpm seed`.** One command loads a populated demo workshop with no network call and no API
  key: a committed interpretation of the narration (`scripts/seed/interpretation.json`) is
  replayed by a scripted facilitator through the real capability handlers via `app.request()`.
  A `data/seed.json` marker makes a re-run refuse unless `--force`, which wipes only the marked
  workshop's streams.
- **A superseded contribution says so.** `ApplyResult` carries an explicit `appended` /
  `already-satisfied` outcome; a losing same-target `resolve` records `Resolution Superseded` on
  its own stream, a losing `reword` is marked `Model Change Superseded` by the reconciliation
  sweep. `replay` keeps the disposition `APPLIED`; the resolution / proposal card folds a
  `superseded` state, and the dock renders it as a distinct receipt.
- **In-dock model-change proposal.** `ProposalCard` renders a relation / pivotal / reword intent
  card with Accept / Reject / Hold (and Edit for a `reword` `newLabel`), in the live feed and the
  pending drawer; `e2e/artifacts-and-relations.spec.ts` accepts the scripted relation proposal
  by a dock click with no `SPEC_DEVIATION`.
