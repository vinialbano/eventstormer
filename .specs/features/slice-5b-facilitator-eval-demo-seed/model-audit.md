# Slice 5b — model audit: the record of concurrent / converging / idempotent operations

## Summary

Convergence in the board decider (`ok([])` for an already-satisfied relation / pivotal /
`resolve` / `insert-between` / `unlink-cause`) is now internally consistent and well-documented
after the PR #91 fix — that layer is doctrine-compliant. The divergence is one layer up: an
empty (converged) decision is returned to callers in the **same `ApplyResult` shape** as a real
append, so every consumer — `recordApplyOutcome`, `blocksAdded`, the F19 transcript — records the
converged no-op as a genuine `Operation Applied` / `APPLIED`. `APPLIED` is overloaded to mean
both "this contribution's content landed on the board" and "the effect holds because a *different*
contribution's content landed", and no disposition, event, or read model can tell the two apart.
The `Resolution Superseded` / `Model Change Superseded` marker planned for 5b fixes the symptom;
this audit maps the full surface it has to cover and flags that it needs a discriminant on
`ApplyResult` to be built on honestly.

## Findings

| # | Area (file:line) | What the model does | Doctrine violated | Sev | Recommendation | Scope |
|---|---|---|---|---|---|---|
| F1 | `domain-model-capture/infrastructure/apply-operation.ts:14-17,75-77` | `ApplyResult` (`{resultingBuildingBlockId, nextPosition}`) is identical for a real append and for an empty (already-satisfied) decision. The empty-decision branch returns `ok({... nextPosition: position})` — the *current* position, indistinguishable from a fresh append. | software-design/error-handling — "no-op hidden in a success shape" (the 200-with-a-body smell). distributed-systems — effectively-once requires the caller to learn the *effective* outcome, not just "ok". | high | Make `ApplyResult` a discriminated union (`outcome: 'appended' \| 'already-satisfied'`) or add `appended: boolean`. Pure substrate change; every current caller can ignore the new field until F2/F3 consume it. | in 5b (the Superseded marker cannot be recorded honestly without it) |
| F2 | `session-facilitation/capabilities/review-proposal/accept.ts:291-335` (`recordApplyOutcome`); `review-resolution/accept.ts:99-105` | On a converged apply (`applied.ok`, empty decision) both handlers append `Record Operation Applied` / `Record Hot Spot Resolved` exactly as for a real apply. The losing racer's `Proposal`/`Resolution` reaches `APPLIED` with its own (non-applied) `resultingBuildingBlockId` / text and a clean receipt. | software-design — failure/no-op hidden in success. domain-modeling/modeling-uncertainty — "which facts count" is a business decision that belongs in the model, not silently collapsed. | high | Branch on F1's discriminant: a converged apply where this proposal did not author the landed content emits the `Model Change Superseded` / `Resolution Superseded` marker instead of `Operation Applied`. | in 5b (this is the slice) |
| F3 | `session-facilitation/domain/resolution/model.ts:14-20`; `domain/proposal/model.ts:18-25` | Disposition machines have no state/marker for "converged — another contribution won". `APPLIED` (Proposal) and `APPLIED` (Resolution) each carry both meanings. `Resolution` has no `APPLY_FAILED` and treats every non-landing as `LAPSED`, so a superseded resolution is indistinguishable from a genuinely bounced one. | domain-modeling/modeling-uncertainty — dedup/resequencing is a modeled business fact, not a read-time reconstruction. software-design — the type does not state the assumption. | high | Add the superseded marker event + a derived disposition (or a `supersededBy` field on the card). Keep it a recorded fact, not a read-time diff against board state. | in 5b |
| F4 | `session-facilitation/domain/read-models/session-transcript.ts:98-137`; `session-transcript-contract.ts` (no resolution surface) | The F19 transcript folds only `Proposal` streams. `Resolution` streams (`APPLIED` / `LAPSED` / bounced / — after 5b — superseded) never appear in the "verbatim account". A resolution race is invisible in the record. | domain-modeling — "the event stream is the activity record" only holds if the read model folds it. | med | Add a resolution lane to the `SessionTranscript` contract and fold `Resolution` streams alongside proposals; `renderTranscript` stays pure formatting. | in 5b (transcript honesty is the slice theme) or immediate follow-up |
| F5 | `session-facilitation/domain/read-models/session-summary.ts:48-92` (`blocksAdded`) | `blocksAdded` counts every `Operation Applied` across the session's `Proposal` streams. A converged no-op emits `Operation Applied` (via F2), so two proposals racing the same edge inflate `blocksAdded` (and the F10 summary line) past what the board holds. | software-design — the hidden no-op propagates into counts. AD-023 spirit — derived counts must be honest. | med | Once F1/F2 land, count only non-superseded `Operation Applied`. | follow-up (depends on F1/F2) |
| F6 | `session-facilitation/capabilities/review-resolution/accept.ts:106-119` | A board rejection **not** in `LAPSE_REASONS` returns HTTP 422 and writes **nothing** to the `Resolution` stream. The resolution stays `ACCEPTED` (in-flight); `decideLapse` (`resolution/decide.ts:121`) and `finishClose` both skip `ACCEPTED`, so it is stuck with no recorded outcome. Same crash window between the `applyOperation` commit and the outcome append (AD-016) has no reconciliation backstop for `Resolution`. | distributed-systems — a reconciliation backstop is what "makes the stack honest"; an unclassified error path leaves no record. | med (low reachability: the `resolve` decider can only emit `unknown-target` / `withdrawn-target` / `kind-permission` — all already in `LAPSE_REASONS` — plus `schema`) | Record `Record Resolution Rejected` for *any* board rejection (not a curated set), or add a stuck-`ACCEPTED` sweep to `reconcilePendingDerivations`. | follow-up |
| F7 | `session-facilitation/capabilities/review-proposal/accept.ts` (accept → apply → `recordApplyOutcome`, three separate commits) | If a crash lands between the board append and the `recordApplyOutcome` append, the `Proposal` is stuck `ACCEPTED`. `finishClose` deliberately skips `ACCEPTED` ("left to finish"), but nothing finishes it — no sweep re-drives an `ACCEPTED` proposal through the apply chain. Self-heals only if the human re-accepts. | distributed-systems — reconciliation backstop. AD-016 tolerates the `PENDING` crash window with a designed reconciler; the `ACCEPTED`-stuck variant has none. | low-med (single-user local; AD-016 explicitly accepts the window) | Note the gap; a periodic "re-drive `ACCEPTED` proposals/resolutions through the apply chain" sweep is the honest backstop (the apply chain is already idempotent). | follow-up |
| F8 | `domain-model-capture/domain/board/model.ts:110,112` | `already-related` and `already-resolved` `Rejection` variants are dead — no producer since AD-038, no consumer (`grep` confirms). `not-implemented-in-slice` (`:107`) is still used by `edit-model/http.ts:54`. | software-design — dead error variants blur the contract. | low | Already on the Slice 6 cleanup list (`STATE.md:65`). | follow-up (Slice 6, tracked) |
| F9 | `domain-model-capture/domain/board/decide.ts:160-202` (`decideWithdraw` / `decideReinstate`), `:501` (`decideReopen`), `:244` (`decideUnsequence`), `:463` (`decideUnannotate`) | Convergence is inconsistent with the AD-038 family: an already-holding effect returns `err(already-withdrawn / not-withdrawn / not-resolved / missing-edge)`, not `ok([])`. A race on these kinds converges the loser to an error / `APPLY_FAILED` though the intended state holds. | distributed-systems / domain-modeling — idempotency should be uniform across the decider family (AD-038 rationale, lesson L-016). | low for v1 (these kinds are not in the AD-035 facilitator `intent` union and v1 is single-user; AD-038 deliberately left `unsequence`/`unannotate` as genuine failures) | Add a one-line note in `decide.ts` recording that convergence is scoped to facilitator-reachable kinds; revisit if `withdraw`/`reinstate`/`reopen` become proposable. | follow-up |

## Deep dives — the three that matter

### F1 — `ApplyResult` cannot say "nothing was appended"

`applyOperation` (`apply-operation.ts:64-95`) reads the board, `decide`s, and then:

```ts
if (decided.value.length === 0) {
  return ok({ resultingBuildingBlockId: resultingBuildingBlockId(operation), nextPosition: position })
}
// ... else append, return ok({ resultingBuildingBlockId, nextPosition: appended.value.nextPosition })
```

Both arms return `ok(ApplyResult)` with the same fields. `resultingBuildingBlockId(operation)` in the
empty arm is a *syntactic* fallback derived from the operation (`operation.successor`, `operation.effect`,
…) — it is not evidence that this operation put that block/edge on the board; the edge was already there,
put there by someone else. A caller that wants to record an honest outcome has nothing to branch on. The
fix is a one-field discriminant — `outcome: 'appended' | 'already-satisfied'` (or `appended: boolean`) on
`ApplyResult` — set `false`/`'already-satisfied'` in the empty-decision arm. `duplicate-id` from the
append path is the id-minting equivalent and should map to the same "already-satisfied" outcome so callers
have one uniform signal. No decider change, no port change; every existing caller keeps compiling and
ignores the field until F2/F3 read it.

### F2 / F3 — `APPLIED` is overloaded, and the disposition machine can't fix it

`recordApplyOutcome` (`review-proposal/accept.ts:296-310`) on `applied.ok`:

```ts
appendProposal(deps, id, decideOrEmpty(wmAfter, {
  type: 'Record Operation Applied',
  proposalId: id,
  resultingBuildingBlockId: applied.value.resultingBuildingBlockId,
  at: deps.clock(),
}))
```

There is no branch for "converged". `review-resolution/accept.ts:99-105` is the same with
`Record Hot Spot Resolved`. So the losing racer of a `resolve` / relation / pivotal race reaches
`APPLIED` (`proposal/decide.ts:142-157`, `resolution/decide.ts:88-97`, `evolve.ts:25-26`) with a clean
receipt whose `resultingBuildingBlockId` and (for reword, via `proposalCard`) text are *its own*, not what
the board holds. `Disposition` / `ResolutionDisposition` have no value that means "the effect holds because
another contribution won", and `Resolution` collapses every non-landing into `LAPSED`, so a superseded
resolution is indistinguishable from a genuinely bounced one. The fix is the already-planned
`Model Change Superseded` / `Resolution Superseded` marker event: when F1 reports `already-satisfied` **and**
this proposal is not the one whose content is on the board, emit the marker instead of
`Operation Applied` / `Hot Spot Resolved`. Keep it a recorded fact fed from F1's discriminant — do **not**
reconstruct "was I superseded?" at read time by diffing the card text against the board label (that is the
`modeling-uncertainty` anti-pattern the doctrine names explicitly).

### F4 — resolutions are absent from the F19 record

`sessionTranscript` (`session-transcript.ts:98-137`) builds turns from `sessionView(...).transcript` and
welds proposal cards on via `proposalsByContribution`. `Resolution` streams are never read;
`session-transcript-contract.ts` has no resolution field (`grep` for `esolution` / `hot-spot` / `resolve`
in it returns nothing). A hot-spot resolution — applied, lapsed, bounced, or (after 5b) superseded —
leaves no trace in the "verbatim account" that F19 promises. Since 5b's whole theme is the honesty of the
record under a resolution race, the transcript contract should gain a resolution lane (one entry per
`propose-resolution` track, disposition + reference + `supersededBy`), folded from the `Resolution` streams
the caller already has access to in `resolutionsView`. `renderTranscript` stays pure formatting.

## Known issues — already tracked, not re-reported

- **Resolution race / same-target reword lost-update** (the audit's stated live issue): `decideReword`
  (`board/decide.ts:126-134`) always returns `ok([operation])` because the slim `BoardWriteModel`
  (`board/model.ts:29-36`) carries no labels, so a same-target reword race is silent last-write-wins
  on the board with both `Proposal`s recording `APPLIED` + their own text; a concurrent `withdraw`
  between accept and apply also flips an applied reword to `APPLY_FAILED`. Tracked: `STATE.md:65`
  (Slice 6 — widen `BoardWriteModel` with labels/placement so `decideReword`/`decidePlace`/
  `decideUnplace` can short-circuit to `ok([])`) and `STATE.md:68` (W2 resolution-race losing-racer
  signal + W5 same-target reword lost-update → deferred to #92). F1–F3 above are the honest-record
  half of that same fix and should be built together.

## No problem found here (checked, doctrine-compliant)

- **`decideSequence` / `decideLinkCause` / `decideMarkPivotal` / `decideUnmarkPivotal` / `decideResolve` /
  `decideInsertBetween` / `decideUnlinkCause`** (`board/decide.ts`) — convergence to `ok([])` on an
  already-satisfied effect is consistent, guarded on the slim write model only, and documented per
  AD-038; the PR #91 B1 fix closed the `decideInsertBetween` / `decideUnlinkCause` gap. No genuine
  conflict is silently last-write-wins here — the effect genuinely holds.
- **`applyOperation` stale-position retry** (`apply-operation.ts:57-98`) — bounded internal retry
  (`MAX_RETRIES = 8`) on `stale-position`, single writer, no caller `expectedPosition`. Textbook
  optimistic-concurrency-with-retry per AD-022; a transient race never reaches the human as
  `APPLY_FAILED`.
- **`hot-spot-sweep.ts`** — deterministic block id from `sha256(workshopId::key)`, `hot_spot_sweep`
  marker table, `duplicate-id` counted as success, unmarked keys retried next tick. This is the
  canonical "reconcile the record from persisted facts" pattern (AD-032); it is *not* ad hoc.
- **`finishClose`** (`infrastructure/session-close.ts`) — every step idempotent, `session_index` row
  flipped last so `reconcilePendingDerivations` re-drives a partial close. Correct self-healing
  reconciliation.
- **`deriveTracks` / `reconcilePendingDerivations`** (`interpret-contribution/interpret.ts:406-448,
  584-591`) — `derived_track` marker per `(contributionId, trackIndex)`, each derive `decide` is a
  no-op once its effect exists, one commit point (`Contribution Interpreted`) with idempotent
  downstream appends. Matches AD-021. The open-sessions-only sweep bound is a documented, accepted
  gap (`STATE.md:36`).
- **`artifact-source.ts:87-98` / `renderSummary` `openModelAffectingHotSpots`** — computes open hot
  spots from the board snapshot. This is *not* the "diff current-state snapshots" anti-pattern:
  `derived-artifact-generation` is by design a deterministic render of the board, and the board is
  its legitimate upstream, not a peer aggregate whose current state it should not read. Compliant
  with ARCHITECTURE §the shape.
- **`sessionView`** (`read-models/session-view.ts`) — pure fold over the `Session` stream;
  `derivedTracks` / `inFlight` / `scopeIsSet` are passed in by the caller, never reconstructed. No
  board-state diffing.
- **`Proposal.decide` / `Resolution.decide` idempotent no-ops** (`proposal/decide.ts:22-27,100-104,
  170-176`; `resolution/decide.ts:25-42,60-75,116-125`) — repeated birth, accept-while-ACCEPTED/
  APPLIED, reject-while-REJECTED, record-after-landed, lapse-on-terminal-or-in-flight all return
  `ok([])`. Consistent and documented. (The gap is the *missing* superseded case — F3 — not these.)
- **`resolutionsView` / `proposalsView` / `sessionTranscript`** — all fold recorded `Proposal` /
  `Resolution` events; none computes a disposition by comparing against board current state. (F4 is
  a *coverage* gap in `sessionTranscript`, not a diffing anti-pattern.)
- **`recordApplyOutcome` per-context transactions** — the board append and the `Proposal` /
  `Resolution` append are always separate `EventStore.append` calls; no cross-context transaction.
  AD-016 constraint (1) holds.
