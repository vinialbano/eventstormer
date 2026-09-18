---
"eventstormer": minor
---

Honest-record hardening: closes the wider converging/racing surface the slice-5b model audit
found beyond the superseded-marker card (F4, F5, F6, F7, F9).

- **F19 — transcript resolution lane.** `SessionTranscript` gains a `resolutions` field — one
  entry per `propose-resolution` track, folded from the `Resolution` streams — so the F19
  verbatim transcript accounts for every hot-spot resolution attempt (applied, lapsed, bounced,
  or superseded), not just proposals. `renderTranscript` stays a pure function of the contract.
- **F10 — honest `blocksAdded`.** `Operation Applied` gains an optional `outcome: 'appended' |
  'already-satisfied'` field, threaded from `ApplyResult.outcome`. The session summary's
  `blocksAdded` count now excludes a superseded stream and a converged no-op apply, so a race or
  a duplicate accept no longer inflates the count past what the board actually holds.
- **`review-resolution` records every domain-legitimate rejection.** A board rejection whose
  reason is `kind-permission`, `withdrawn-target`, or `unknown-target` still appends a
  `Hot Spot Resolution Rejected { reason }` event before the 200 response — no `Resolution` is
  left stuck `ACCEPTED` with an unrecorded lapse. A systemic rejection (outside that set) is
  never recorded as a terminal lapse — `Resolution` has no reopen path once there — so it stays
  `ACCEPTED` and the reconciliation sweep below keeps re-driving and warning on it.
- **No stream stuck `ACCEPTED`.** A new reconciliation sweep re-drives any `Proposal` /
  `Resolution` left `ACCEPTED` with no later apply-outcome event (the AD-016 crash window)
  through the existing idempotent accept chain, every tick, for open sessions.
- **`decide.ts`** now states in prose why the relation/pivotal/`resolve`/`insert-between`/
  `unlink-cause` family converges to `ok([])` on an already-satisfied effect while
  `withdraw`/`reinstate`/`reopen`/`unsequence`/`unannotate` stay genuine failures.
- **Dock: edit a relation/pivotal endpoint.** A participant can now correct a wrong relation
  endpoint or pivotal target directly from the proposal card, instead of rejecting and waiting
  for a re-propose.
