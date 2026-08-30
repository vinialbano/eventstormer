# Slice 1 — The Capture Loop Specification

GitHub issue: [#38](https://github.com/vinialbano/eventstormer/issues/38) ·
Blocked by #37 (Slice 0, merged) · Blocks #39 (Slice 2) ·
Parent effort map #9 · Version target **0.2.0** (`minor` changeset)

## Problem Statement

Slice 0 froze the operation-schema SSOT and a minimal `Board` decider, but nothing feeds it. A
domain expert cannot yet sit down, describe their business, and watch a typed model appear. This
slice builds the whole capture loop end to end — create a Big Picture workshop, answer the
facilitator's scope question, type contributions one at a time, and accept/edit/reject the
schema-constrained operations the AI facilitator proposes — with an accepted proposal applying
synchronously into the Slice 0 `Board` and the building block appearing in the backlog. Backlog
only: no timeline, no relations rendering.

## Goals

- [ ] A person completes: create workshop → set scope → type 3–4 contributions → accept proposals
      → see building blocks in the backlog, entirely through the SPA, against a mocked model in
      tests and the real model in `pnpm dev`.
- [ ] The AI facilitator holds the asymmetric bar (lenient on the human's phrasing, strict on
      names it supplies), self-reports `lenient`/`strict` per proposal, and survives a provider
      outage and a malformed response as two distinct failure classes.
- [ ] Every facilitator-proposed operation validates against the Slice 0 operation-schema SSOT for
      its target's kind, and applies through the `Board` decider — never around it.
- [ ] Closing every session and reopening the workshop by URL rebuilds the identical model from
      the log; a later session's facilitator sees a frozen summary of the earlier ones.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Timeline / relations rendering; `sequence` / `insert between` / `place` / `link cause` | Slice 3. This slice tracks placed-vs-unplaced but everything sits in the backlog. |
| Building-block kinds beyond domain event / actor / system | ADR-010 slice 1 row ("events/actors/systems only"); hot spot is Slice 4, and the frozen union already rejects the rest with "not implemented in this slice" (AD-003). |
| `reword` / `withdraw` / `reinstate` UI + the reference list + readable account | Slice 2. The Slice 0 decider already handles these operations; no capability surface here. |
| Hot spots: `annotate` / `raise` / `resolve` / `reopen`, the `Resolution` aggregate + `review-resolution`, the close-time unresolved-question → hot-spot sweep | Slice 4. This slice computes the unresolved-question snapshot at close but nothing consumes it. |
| Stakeholder check + chosen-problem close bookends (F09) | Slice 4. Only the *opening* deterministic bookend (forced scope question) exists here. |
| JSON / summary / transcript exports; the eval suite + fixtures; `pnpm seed`; the recording | Slice 5. |
| `claude-opus-5` escalation | ADR-005: only "if a fixture bake-off shows Sonnet missing the bar" — deferred until that bake-off runs. `claude-haiku-4-5` fallback IS in scope. |
| Invitations beyond the creator; multiple people; concurrent open sessions; voice input | F14 / product view priority 3. The one-open-session rule is enforced; relaxing it is Multiplayer. |
| `OperationId` correlation for crash-window reconciliation | AD-011 / AD-016 defer it to Slice 2's apply round-trip. This slice accepts the crash window (single-user, local) with no reconciliation logic. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Speaker / author identity | The creator types a **display name** at workshop creation; it is the segment `speaker`, the proposal `accepter`, and the human half of an applied operation's `author`. The facilitator is the `proposer`. | User decision 2026-08-30. A real identity model arrives with F14. | **y** |
| Cross-session facilitator memory | **Build now.** `Session Closed` carries only raw facts (`unresolvedQuestionIds`, `closedAt`). The per-session facilitation summary (blocks added, question counts, contribution count, last 8 turns — **no model call**) is a **read-time projection** `sessionSummary(...)` over the terminal `Session` stream + that session's `Operation Applied` events; `Prior-session history` composes those on demand. A later session's `Facilitation context` reads it. | User decision 2026-08-30. Round-2 review (AD-023): freezing a computed struct into the event is the "derived state in a payload" anti-pattern; a `CLOSED` stream is already immutable, and operations carry no `sessionId` so `blocksAdded` must come from the facilitation side. | **y** |
| `POST /sessions/:id/contributions` response | **Always async** (AD-018). Returns `202` + contribution id, never facilitator output. A background worker interprets; the client short-polls. Supersedes ADR-005's "rides back on the … contributions response" and ADR-007's "no polling, no SSE" (interpretation path only). | User decision 2026-08-30. One uniform path; provider-down is the same path with retries. | **y** |
| Client transport for facilitator output | **Short-poll** `GET /workshops/:id/session` + `GET /sessions/:id/proposals` (~1 s) while any contribution is `interpreting`, idle otherwise (AD-018). SSE rejected — lifecycle/reconnect/test cost disproportionate for a single-user local tool; the F14 upgrade stays additive. Server-confirmed, no optimistic state. | User decision 2026-08-30 (weigh polling vs SSE). A poll is a refetch of the existing cold-loadable stores — zero new infra. | **y** |
| `Close Session` behaviour this slice | **Full mechanic minus hot-spot raising.** `Session Closed` carries `{unresolvedQuestionIds, closedAt}`. The close handler then, **each step unconditionally and idempotently**: flips the `session_index` row to `closed` (frees the slot); lapses every non-terminal `Proposal` of the session — `PROPOSED`/`EDITED`/held → `LAPSED` (quiet), `APPLY_FAILED` → `LAPSED` (no hot spot yet); `ACCEPTED` in-flight is left to finish. A crash mid-close self-heals (`reconcile` sweeps "`Session Closed` present, `session_index` still `open`"). | User decision 2026-08-30; round-2 review (distsys M3) — a naive close handler left sessions permanently half-closed on a crash. | **y** |
| `Workshop.scope` revision window | **Revisable until the first building block is applied.** Enforced as a **`set-scope` handler precondition** (`readBuildingBlocks(workshopId).length === 0`) — *not* a `Workshop.decide` argument (round-2 domain MAJOR 1: a true invariant never delegates its data to another context). `Workshop.decide(Set Scope)` only validates the statement and is repeatable. Issue #38 says "until the first block is **captured**"; this slice locks on **applied** (a proposed-but-unapplied block does not lock) — a deliberate, more-permissive reading. **Diverges from the canvas** ("set exactly once") — flag in `open-questions.md` #63 **this slice** (S1-51a). | User decision 2026-08-30. | **y** |
| The in-process event bus | **Deferred to Slice 4** (AD-019, supersedes AD-002). The always-async worker is projection-driven; the first fire-and-forget consumer (`Raise Hot Spot`) is Slice 4. | Quality bar: no speculative abstraction; `knip` flags unused exports. | **y** |
| Interpretation crash-consistency | `Contribution Interpreted` carries the **full facilitator turn** and is the **sole commit point** (last append). `Proposal` births and `Question Asked`/`Answered`/`Attributed` events are a **deterministic, idempotent derivation** of that turn — each carries an id assigned in the `Contribution Interpreted` event and is created with `expectedPosition: -1` (a no-op if it already exists). The worker **reconciles** every tick: for each interpreted contribution in an open session, ensure every derived stream exists. No multi-stream transaction needed. | Plan review T1 — separate appends with no cross-stream transaction lost proposals on a crash between the ledger write and the proposal births. | **y** |
| Session enumeration | A `session_index` projection table (`workshop_id, session_id, status, started_at, closed_at`) maintained by the start/close handlers, with a partial unique index `UNIQUE(workshop_id) WHERE status='open'` doing double duty as the one-open-session constraint. `Prior-session history` and `Facilitation context` project over it. | Plan review T4 — the canvas removed session tracking from `Workshop`; nothing else could enumerate a workshop's closed sessions. | **y** |
| Forced opening / scope question when the provider is down | `askOpening` (the scope question, and a re-ask after a scope rejection) is a model call the **worker** owns, with the same retry ladder as interpretation. A session started while the provider is down gets its opening question when a provider returns — the composer is usable meanwhile. | Plan review T5a. | **y** |
| Op-log-in-log-order prompt input (ADR-005 cache design) | **Deferred.** Slice 1 feeds the projected `BoardSnapshot` (via `domain-model-capture` `api.ts` `readBoard`) into the prompt. The op-log-prefix caching optimization — which needs `api.ts` to expose the raw operation stream — is a later slice. | Plan review T5b — ADR-005's cache design assumed the sync model and a cross-context raw-stream read the boundary forbids. | **y** |
| Hallucinated `questionId` in an `answer-question` track | The translation layer validates `questionId ∈ {open questions of that session}`; an unknown id drops the track (logged), no `Question Answered`. | Plan review T5c. | **y** |
| The accept handler's slice | Built in **Slice 1** (AD-017); only the `OperationId`-correlated crash-window reconciliation stays Slice 2. The accepted proposal's `BuildingBlockId` is **minted once in the accept handler and stored in `Proposal Accepted`** — a re-accept reuses it, so the board's `duplicate-id` rejection is the idempotency signal (round-2 distsys B1). | ADR-010; round-2 review. | **y** |
| `applyOperation` concurrency | `domain-model-capture`'s `applyOperation(workshopId, operation)` takes **no `expectedPosition`** — it is the sole writer of the board stream and retries `stale-position` internally (AD-022). Only a merits `Rejection` (`duplicate-id`, `unknown-target`, cycle) → `APPLY_FAILED`. | Round-2 distsys M4 — a caller token turned a transient two-accepts conflict into a permanent `APPLY_FAILED`. | **y** |
| Capability granularity | 7 per-action capabilities in `session-facilitation` (`start-workshop`, `set-scope`, `start-session`, `make-contribution`, `review-proposal`, `close-session`, `interpret-contribution`) — not one `capture-loop` slice (AD-024). | Round-2 arch M1 — ADR-010's slice-1 row already names them separately; a mega-slice makes `no-cross-slice-imports` guard nothing. | **y** |
| Facilitator seam for testing | A `Facilitator` **port** with a scripted double, injected from `host/`. The behaviour ACs are tested at the **translation layer** (`InterpretedTrack` → domain events) against the double; **real-model judgment quality (past-tense, kept phrasing, deeper-format naming) is verified by the Slice-5 eval, not this slice** — marked on S1-21/S1-22/S1-24 in the traceability. | DESIGN §6; round-2 spec M3 (over-claim risk). | **y** |
| Interpretation model-call at-most-once | "Exactly once" holds for *committed* interpretation. A crash **after** `facilitator.interpret` returns but **before** the `Contribution Interpreted` append re-runs the model on restart (a second billable call, possibly different proposals). **Accepted for v1** — single-user, ~cents, and no proposal is applied without a human accept. Anthropic request-idempotency-key keyed on `contributionId` → Slice-6 hardening. | Round-2 distsys m1 / spec M4. | **y** |
| Hard cap on proposals per turn | `FacilitationTurnSchema.interpretation` is `z.array(Track).max(12)`; `label` is `.max(200)`. The "cap of 7" (S1-40) is display grouping only; the `.max(12)` is the actual "not an unbounded queue" enforcement (issue #38 AC14). | Round-2 spec M1 — `z.array(Track)` had no ceiling. | **y** |
| "Model editable by hand" during an outage (issue #38 AC15) | **Partially met this slice:** the composer stays open, interpretation is queued + retried, nothing typed is lost. **Direct model edits (`reword`/`withdraw`/`reinstate`) are Slice 2** — no capability surface here. | Round-2 spec B1 — the clause is in issue #38 / ADR-005 but the edit path is out of scope. | **y** |
| Capture-screen UX/UI | **Settled — do not re-derive.** Consume the confirmed brief `.impeccable/surfaces/src-app-capture-loop.md` and the reference comps in `.impeccable/mocks/iface/` (`final-expanded`, `final-collapsed`, `reword-1-select`, `reword-2-editing`). Visual refinement or a new surface goes through the vendored `impeccable` skill (`.claude/skills/impeccable/`) — never hand-design `src/app/`. Folded in below: the **Hold** proposal action (4th, alongside accept/edit/reject) and the **board-first layout** — a collapsible facilitator dock (bottom-left, collapses to a `Facilitator · n` pill) with an in-dock pending drawer (slides right, collapses to a `Pending ● n` handle) over a full-screen EventStorming wall. Slice 1 stays **backlog-only**: accepted events land unplaced in the top-left backlog area; the timeline/arrows/pivotal bars in the comps are the slice-3 target the layout must not preclude. | AGENTS.md "Design truth"; user direction 2026-08-30. | **y** |
| `Proposal` Hold semantics | `Proposal Held` / `Proposal Unheld` events (AD-020; UL term is the brief's verb "Hold", not "park") — a reversible marker orthogonal to the disposition, **not** a terminal state. Held → grouped `Parked by you` in the drawer; the >7 display grouping (a read-model computation, **not** an event field) populates `Awaiting review`. `Close Session` lapses held proposals quietly, as it does `PROPOSED`/`EDITED`. | `impeccable` brief §3/§5; round-2 domain review (UL term; drop the `overflow` event field). | **y** |
| Scope-setting UI | **The scope question is the facilitator's first turn in the capture-screen dock**, reviewed with the same F05 accept/edit/reject card as any proposal — no separate screen, no new `src/app/` surface. `POST /workshops/:id/scope` is the accept/edit. Minor divergence from `impeccable` brief §5 ("scope is set elsewhere") — flag in `open-questions.md` #63. | User decision 2026-08-30; a separate scope screen would be an un-briefed hand-designed surface (working agreement violation) and contradicts S1-08. | **y** |
| Deferred-interpretation retry schedule | Provider-down: retry ladder (primary → ~2× backoff → `claude-haiku-4-5` once → leave un-interpreted); the worker re-attempts on a **fixed interval** (default 750 ms, recursive `setTimeout` not `setInterval`) with **no attempt cap**. Schema-failure: **one** adapter retry with the error fed back, then terminal `interpretation-failed`. | ADR-005: provider-down is "bounded schedule" (read as bounded interval); schema-fail is "one retry then terminal". | **y** |
| Contribution / scope-statement length bound | 10 000 chars each; over-limit rejected before a segment / `Scope Set` is written. Display name: 1–80 chars, non-blank. | Input-validation dimension; prevents an unbounded prompt. | **y** |
| Few-shot example domain in the system prompt | **Library lending** — disjoint from the restaurant/kitchen-orders eval fixture (ADR-008). | ADR-005: sharing few-shot with eval fixtures tests memorisation. | **y** |
| Auth boundaries & rate limits | **N/A** — single-user, local, no auth (F14 deferred). The only throttle is one interpretation in flight per session (S1-29); cross-session concurrency is not a concern for one user. | ARCHITECTURE.md §6, ADR-011. | — |
| Data lifecycle / expiry | **N/A** — the operation log and session streams are append-only forever (Slice 0 AD); no deletion, no TTL. `Prior-session` summaries are immutable once frozen. Archive is Slice 2. | ADR-004. | — |

**Open questions:** none — every row above is confirmed. Two review rounds: round 1 (stress-test +
4 architecture lenses) closed T1–T5; round 2 (4 subagent reviews — distributed-systems,
domain-modeling, code-architecture, spec-quality) added 2 blockers + ~18 majors, all folded in
above and into `design.md`, recorded as AD-022 (`applyOperation` concurrency), AD-023 (no derived
state in events), AD-024 (per-action capabilities). None was structural — the bulk were
simplifications (killed the `modelHasBlocks` param and the frozen-summary struct; split the
mega-slice per ADR-010's own naming).

---

## User Stories

### P1: Create a Big Picture workshop and set its scope ⭐ MVP

**User Story**: As a domain expert, I want to create a workshop and tell the facilitator what
business I'm mapping, so that every later contribution is interpreted against that intent.

**Why P1**: Nothing else can happen without a workshop and a scope. It exercises `Workshop` birth,
the birth-fixed format, the resumable URL, and the F05-shaped scope review.

**Acceptance Criteria**:

1. WHEN a person creates a workshop with a display name THEN the system SHALL start a `Workshop`
   bound to the Big Picture format (the only v1 format), record the creator's display name, and
   return a resumable URL whose id is a nanoid slug.
2. WHEN a session starts and no contribution has been made THEN the first facilitator turn in the
   dock SHALL be the scope question (the forced opening deterministic bookend), carrying a proposed
   scope statement reviewed with the F05 accept/edit/reject card — no separate screen.
3. WHEN the person accepts or edits the proposed scope statement THEN the system SHALL set
   `Workshop.scope` via `Set Scope` (`POST /workshops/:id/scope`) and write NO operation to the
   `domain-model-capture` log; WHEN they reject it THEN the facilitator SHALL re-propose.
3a. WHEN a session is started while the model provider is unavailable THEN the scope question SHALL
   be produced by the worker when a provider returns; the composer is usable meanwhile.
4. WHEN the model graph has zero building blocks THEN a further `Set Scope` SHALL be accepted and
   replace `Workshop.scope`.
5. WHEN at least one building block has been applied THEN a `Set Scope` SHALL be rejected and
   `Workshop.scope` SHALL be unchanged.
6. WHEN a scope statement or contribution body exceeds the length bound THEN the system SHALL
   reject it before writing any event.

**Independent Test**: Create a workshop via the SPA, see the scope question, accept a scope, see
it reflected; submit a second scope before any block and see it change; apply one block, attempt a
scope change, see it rejected.

---

### P1: Capture typed contributions ⭐ MVP

**User Story**: As a domain expert, I want to type what happens in my business one statement at a
time, so that the facilitator can interpret each one.

**Why P1**: The raw input path. `Contribution Made` is the expert's words and must never be lost.

**Acceptance Criteria**:

1. WHEN a non-empty contribution is submitted THEN the system SHALL persist a segment carrying the
   session id, the speaker (workshop display name), a timestamp stamped by the injected `Clock` in
   the application layer, and the source marker `typed`.
2. WHEN any contribution is captured THEN no code path SHALL produce a source marker other than
   `typed`.
3. WHEN an empty or whitespace-only submission is made THEN the system SHALL produce no segment
   and SHALL NOT call the facilitator.
4. WHEN a contribution is submitted while the session is open THEN `Contribution Made` SHALL
   succeed; WHEN the session is closed THEN it SHALL be rejected.
5. WHEN a contribution is submitted while another interpretation is in flight for that session
   THEN it SHALL be queued FIFO and processed, not dropped.
6. WHEN the process restarts with un-interpreted contributions persisted THEN the interpretation
   queue SHALL be rebuilt from the persisted contributions (it is a projection, not in-memory
   state).

**Independent Test**: Submit "   " and see nothing happen; submit two contributions in quick
succession and see both interpreted in order; kill and restart the dev server mid-interpretation
and see the pending contribution still get interpreted.

---

### P1: The AI facilitator interprets a contribution and proposes operations ⭐ MVP

**User Story**: As a domain expert, I want the facilitator to turn my plain-language statement
into properly-formed building blocks, keeping my wording where it can, so that I build the model
by talking, not by learning a notation.

**Why P1**: This is the heart of the product.

**Acceptance Criteria**:

1. WHEN a contribution is interpreted THEN the system SHALL make exactly ONE merged model call
   returning `{ interpretation, nextMove }`, using `claude-sonnet-5`, `generateText` +
   `Output.object`, `providerOptions.anthropic.structuredOutputMode: 'outputFormat'`,
   `output_config.effort: 'low'`, no `temperature`, and SHALL log `result.warnings`.
2. WHEN the facilitator proposes operations THEN it SHALL emit them against a hand-shaped
   projection schema (only proposable kinds; `v`/`author`/`id` omitted; no `z.unknown()`; ≤ 24
   optional parameters; `interpretation` is `z.array(Track).max(12)`; `label` `.max(200)`), per
   AD-015 — NOT `z.array(Operation)`. The adapter maps this to the stored `InterpretedTrack` union
   (an anticorruption seam) and mints the per-track ids.
2a. WHEN a turn would exceed 12 tracks or a label 200 chars THEN the schema SHALL reject the
   overflow (issue #38 AC14 — "not an unbounded queue") — this, not the display cap of 7, is the
   hard bound.
3. WHEN the app re-inflates a proposed operation (stamping `v` and `author`) THEN it SHALL satisfy
   the Slice 0 operation-schema SSOT for its target's kind, exhaustively.
4. WHEN a transcript describes a completed business fact THEN the facilitator SHALL propose a
   domain event in past tense.
5. WHEN a recognisable but awkwardly-phrased contribution is interpreted THEN the proposal SHALL
   retain the human's wording, SHALL record `bar: 'lenient' | 'strict'`, and WHEN `lenient` SHALL
   carry an `evidenceSpan` (the verbatim substring the label came from).
6. WHEN a transcript names an aggregated phase THEN the facilitator SHALL flag it as a phase (NOT
   propose it as an event) and SHALL emit a `Question Asked` answerable through the normal capture
   channel.
7. WHEN a transcript describes a command / policy / read model / aggregate THEN the facilitator
   SHALL emit an out-of-format notice naming the deeper format, produce no building block, and
   mark that content track `Contribution Attributed To Another Format` (terminal for that track).
8. WHEN a single contribution carries multiple independent tracks THEN the system SHALL handle all
   of them in the one turn (0+ proposals, a phase question, an out-of-format notice, a
   question-track answer, in any combination).
8a. WHEN the turn's `nextMove` is `ask` THEN `deriveTracks` SHALL append a `Question Asked
   {kind:'free', questionId}` (the `questionId` minted into `Contribution Interpreted`) so the
   follow-up question enters the open-questions map and can be answered and swept at close.
9. WHEN the same contribution id is presented for interpretation more than once THEN the system
   SHALL interpret it at most once (interpret-once ledger on `Session`, keyed on contribution id).
9a. WHEN interpretation succeeds THEN `Contribution Interpreted` (carrying the full turn and the
    ids it assigns per track) SHALL be the sole commit point; `Proposal` births and question
    events SHALL be a deterministic idempotent derivation of that event, created with
    `expectedPosition: -1`; and the worker SHALL reconcile every tick — a crash between the ledger
    write and a derived stream SHALL be repaired without a second model call and without a lost
    proposal.
9b. WHEN an `answer-question` track names a `questionId` not open in that session THEN the track
    SHALL be dropped (logged) and no `Question Answered` SHALL be written.
10. WHEN the model provider is unavailable THEN `Contribution Made` SHALL still be recorded, the
    interpretation SHALL be queued and run exactly once when a provider (primary or fallback)
    returns, and the model SHALL stay editable by hand meanwhile.
11. WHEN the interpretation retry ladder is exhausted (primary → ~2× backoff → `claude-haiku-4-5`
    once) THEN the contribution SHALL be left un-interpreted and re-attempted by the worker on a
    fixed-interval schedule.
12. WHEN the model returns a schema-invalid response THEN the adapter SHALL retry **once total**
    (not once per ladder step) with the error text fed back; WHEN that retry also fails THEN the
    system SHALL append a distinct **`Contribution Interpretation Failed { contributionId, reason }`**
    event (NOT a flag on `Contribution Interpreted`), show "didn't catch that" inline, raise NO hot
    spot, and count the contribution as interpreted (no infinite retry).
13. WHEN the facilitator runs THEN real Anthropic HTTP calls SHALL be mocked in every test
    (ARCHITECTURE.md §6).
14. WHEN `pnpm dev` starts without `ANTHROPIC_API_KEY` set THEN it SHALL fail fast with a clear
    message.
15. WHEN any model call completes THEN the JSONL model-call logger SHALL record its request,
    response, and Zod parse result, and token counts + a cost estimate from an owned price table.

**Independent Test**: Feed the mocked facilitator canned responses covering each track; assert the
proposed operations validate; simulate a 503 and see the contribution recorded but un-interpreted,
then a later success interpret it exactly once; simulate a malformed response and see one retry
then `interpretation-failed`.

---

### P1: Review and apply a proposal ⭐ MVP

**User Story**: As a domain expert, I want to accept, tweak, reject, or park each proposed
operation, so that nothing enters my model without my say-so.

**Why P1**: The human-in-the-loop gate and the synchronous cross-context apply chain — the seam
ADR-002 draws for F14.

**Acceptance Criteria**:

1. WHEN a contribution yields N proposal-worthy judgments THEN the system SHALL create one
   `Proposal` aggregate instance per judgment.
2. WHEN proposals from one contribution exceed the cap of **7** THEN 7 SHALL be surfaced and the
   overflow SHALL be held `PROPOSED`-pending (not dropped, not an unbounded queue).
3. WHEN the person edits a proposal THEN it SHALL be legal only before a terminal state, any
   number of times (`PROPOSED` ⇄ `EDITED`).
4. WHEN the person accepts a proposal THEN the system SHALL run the synchronous apply chain: call
   `domain-model-capture`'s `api.ts` to apply the kind-specific operation, branch on `Operation
   Applied` / `Operation Rejected`, then record the outcome on the `Proposal` — each context
   committing its own stream in its own `EventStore.append`, NEVER both in one SQLite transaction.
5. WHEN an operation is applied THEN the applied operation SHALL record the facilitator as
   `proposer` and the accepting person as `author`/`accepter`.
6. WHEN no explicit human accept has occurred THEN NO facilitator-originated mutation SHALL be
   applied.
7. WHEN an accepted proposal's operation bounces at apply time THEN the `Proposal` SHALL become
   `APPLY_FAILED`, carry the reason, return to the person, and be editable + re-acceptable or
   rejectable — acceptance is NOT terminal.
8. WHEN the person rejects a proposal THEN the snapshot SHALL be unchanged, no building block SHALL
   exist, and `REJECTED` SHALL be terminal.
9. WHEN a proposal is applied THEN its building block SHALL appear in the backlog a moment later
   (eventual consistency; the client re-fetches), tracked as placed-vs-unplaced but shown in the
   backlog regardless (no timeline this slice).
10. WHEN the person holds a proposal THEN it SHALL stay non-terminal and reviewable, leave the
    active review cluster, and appear under `Parked by you` in the pending drawer; WHEN it is
    unparked or acted on later THEN it SHALL resume the normal disposition flow. Hold SHALL NOT be
    a terminal state.
11. WHEN a contribution's proposals are shown THEN the cluster SHALL offer `Accept all`, the
    drawer SHALL offer `Accept all remaining`, and there SHALL be no reject-all.

**Independent Test**: Accept a valid proposal and see the block in the backlog; edit a proposal's
label then accept; force an `Operation Rejected` (e.g. target withdrawn) and see `APPLY_FAILED`
with the reason, then edit + re-accept successfully; reject a proposal and confirm nothing is left
behind.

---

### P1: Session lifecycle — open, close, resume ⭐ MVP

**User Story**: As a domain expert, I want to close a sitting and come back to the same model
later by URL, so that a workshop is a durable thing I return to.

**Why P1**: F18's persistence + resumability claim, and the one-open-session constraint.

**Acceptance Criteria**:

1. WHEN a session is started for a workshop that already has an open session THEN the second start
   SHALL be rejected (set-scoped uniqueness, enforced outside any aggregate — a partial unique
   constraint `UNIQUE(workshopId) WHERE status = open`).
2. WHEN a session is closed THEN a new session SHALL be startable on the same workshop and SHALL
   see the same model.
3. WHEN `Close Session` runs THEN `Session Closed` SHALL carry `{ unresolvedQuestionIds, closedAt }`
   only (raw facts — no summary struct); and the handler SHALL then, each step unconditionally and
   idempotently, flip the `session_index` row to `closed` and transition every non-terminal
   `Proposal` of the session — `PROPOSED` / `EDITED` / held → `LAPSED` (quiet), `APPLY_FAILED` →
   `LAPSED` (no hot spot this slice) — each its own append. A crash mid-close SHALL self-heal via
   the reconcile sweep.
4. WHEN a proposal is `ACCEPTED` and in flight at close THEN it SHALL be allowed to finish.
5. WHEN every session is closed and the workshop is reopened by URL THEN the model SHALL be
   rebuilt from the log identical to before.
6. WHEN a later session starts THEN its `Facilitation context` SHALL include, for each of the
   workshop's earlier closed sessions (enumerated via the `session_index`), a `sessionSummary`
   projected on demand from that session's terminal stream.
7. WHEN `Close Session` runs THEN the `session_index` row's status SHALL flip to `closed`, freeing
   the `UNIQUE(workshop_id) WHERE status='open'` slot.

**Independent Test**: Start a session, try to start a second, see it rejected; close, start again,
confirm the model carried over; close a session with an undisposed proposal and confirm it
lapsed; open a third session and confirm the facilitator's context references the first two.

---

### P1: The capture screen ⭐ MVP

**User Story**: As a domain expert, I want one screen where I watch the model form on a wall while
a facilitator dock I control talks me through it, so that I stay oriented in my own board.

**Why P1**: The slice is a vertical slice — the loop is only demonstrable through the screen. The
look is settled; this story is about wiring it to the capabilities, not designing it.

**Acceptance Criteria**:

1. WHEN the capture screen renders THEN it SHALL follow `.impeccable/surfaces/src-app-capture-loop.md`
   and its comps: a full-screen EventStorming wall as the field; a collapsible facilitator dock
   (bottom-left, collapsing to a `Facilitator · n` pill); an in-dock pending drawer sliding right
   (collapsing to a `Pending ● n` handle) — never a separate window, never a second card.
2. WHEN a contribution yields proposals THEN they SHALL render as inline cards welded to the
   facilitator turn that produced them, each card offering Accept / Edit / Reject / Hold.
2a. WHEN the session has no scope yet THEN the facilitator's first dock turn SHALL present the
   proposed scope statement as an accept / edit / reject card (same shape as a proposal card) —
   there is no separate scope screen; accept/edit → `POST /workshops/:id/scope`.
2b. WHEN any contribution is `interpreting` **or** `interpreted`-but-not-fully-`derived`, or the
   scope is unset with an open session, THEN the client SHALL short-poll `GET /workshops/:id/session`
   + `GET /sessions/:id/proposals` (~1 s); it SHALL stop only once every contribution is fully
   derived (not merely "interpreted" — otherwise a slow/partial `deriveTracks` leaves cards
   missing until a manual refresh). The `board` store refetches only after an accept resolves.
2c. WHEN facilitator questions or out-of-format notices arrive THEN they SHALL render as dock
   messages, never error states; WHEN a proposal is pending THEN it SHALL render as a card, never
   as a ghost/dashed sticky on the board (the dashed-ghost is reword-only, Slice 2).
3. WHEN a proposal is accepted THEN its card SHALL animate into a sticky in the top-left backlog
   area and collapse to a one-line transcript receipt naming the accepter; the wall SHALL NOT
   update optimistically — it re-renders from a server-confirmed GET.
4. WHEN the client needs board / proposal / facilitation state THEN it SHALL load each from a
   single cold GET into one of three Pinia stores; all writes are plain `fetch` POST; the SPA
   talks to capabilities over HTTP only (never importing their `http.ts`/`data.ts`).
5. WHEN the provider is briefly unavailable THEN the composer SHALL still accept contributions and
   show a quiet "catching up" state — nothing typed is lost, no error state.
6. WHEN operated by keyboard only THEN the wall and every dock control SHALL be reachable with
   sane focus order (WCAG 2.2 AA); `prefers-reduced-motion` SHALL be honoured.

**Independent Test**: Run `pnpm dev`, complete the loop end to end; collapse/expand the dock and
drawer; accept a proposal and watch the card-to-sticky flight land in the backlog; tab through the
screen with no mouse.

---

### P2: The facilitator's interview loop and agenda

**User Story**: As a domain expert, I want the facilitator to guide me — probe a vague phase name,
notice I've stalled — not just react to each sentence, so that the conversation goes somewhere.

**Why P2**: Only the deterministic *plumbing* of the loop is in scope here — `Facilitation
context` assembly, question↔answer correlation, and the derived agenda. Whether the model's
free-choice *moves* are any good is the Slice-5 eval, not a Slice-1 AC (round-2 spec M5).

**Acceptance Criteria**:

1. WHEN a facilitator turn is computed THEN `Facilitation context` SHALL be assembled that turn
   from: recent transcript + open questions + `Workshop.scope` + prior-session `sessionSummary`s +
   the current building-block list (`readBuildingBlocks`). *(Assembly is asserted; move quality is
   the eval.)*
2. WHEN a contribution's `answer-question` track names a `questionId` open in the session THEN
   `Session.decide(Answer Question)` SHALL mark it resolved; WHEN the id is unknown or already
   resolved THEN the decider SHALL reject it (logged; no `Question Answered`). "Something was said"
   alone SHALL NOT resolve a question.
3. WHEN the facilitator turn is computed THEN a `Facilitation agenda` SHALL be derived (not
   stored): open questions ∪ building blocks that look like unexpanded phase names. *(The
   stakeholder-check input is F09 / Slice 4 — not part of the agenda this slice.)*

**Independent Test**: With the scripted facilitator double, drive a 4-turn conversation and assert
the assembled context inputs, the agenda contents, and the question-resolution transitions
(including a rejected unknown `questionId`) at each step.

---

## Edge Cases

- WHEN a contribution arrives for a session that was closed between the client render and the POST
  THEN the system SHALL reject `Contribution Made` and tell the client the session is closed.
- WHEN the model provider returns a partial / truncated response THEN it SHALL be treated as a
  schema failure (one retry, then `Contribution Interpretation Failed`), not a provider-down failure.
- WHEN a proposal is accepted twice (double-click / retry) THEN the second accept SHALL reuse the
  `buildingBlockId` stored in `Proposal Accepted`, SHALL NOT call `applyOperation` again once the
  proposal is `APPLIED`, and SHALL produce exactly one building block.
- WHEN interpretation is selected from the queue THEN the order SHALL be by `Session` stream
  position (a stable total order), never by the `at` timestamp.
- WHEN a `decide` returns `ok([])` (idempotent no-op) THEN the handler SHALL NOT call
  `EventStore.append` with an empty batch.
- WHEN the process crashes between the Capture append and the Proposal-outcome append THEN v1
  SHALL accept the window: the operation is applied, the `Proposal` stays non-terminal; no
  reconciliation runs this slice (AD-016 defers it to Slice 2).
- WHEN a contribution is submitted with only punctuation or a single character THEN it SHALL still
  be captured (it is the expert's words) but MAY be interpreted to zero tracks.
- WHEN `Set Scope` is attempted with an empty statement THEN it SHALL be rejected.

---

## Requirement Traceability

| ID | Story | Phase | Status |
| --- | --- | --- | --- |
| S1-01 | P1 Workshop/scope | Execute | ✅ T6 (decider) + T30 (create screen → `POST /workshops` → route to `/workshops/:id`) |
| S1-02 | P1 Workshop/scope (display name) | Execute | ✅ T6 (creatorName recorded, 1–80 non-blank) |
| S1-03 | P1 Workshop/scope (nanoid URL) | Execute | ✅ T15 (route) + T30 (`vue-router@5` `/workshops/:id` is the resumable URL; wildcard → `/`) |
| S1-04 | P1 Session lifecycle (one-open-session) | Execute | ✅ T5 (session_index partial unique index) |
| S1-05 | P1 Session lifecycle (resume) | Execute | ✅ T17 (start-session — reserve → Session Started → 202; new session after close) |
| S1-06 | P1 Session lifecycle (close mechanic) | Execute | ✅ T7 (Session.decide Close Session — idempotent) |
| S1-07 | P1 Session lifecycle (rebuild from log) | Execute | ◐ T11 (GET /board rebuilds from log; close/reopen T23) |
| S1-08 | P1 Workshop/scope (forced scope question) | Execute | ◐ T20 (`askOpeningQuestion`) + T29 (scope question renders as the first dock F05 card; `questionKind` seam) |
| S1-09 | P1 Workshop/scope (Set Scope, no log op) | Execute | ✅ T6 (Set Scope validates statement, repeatable) |
| S1-10 | P1 Workshop/scope (revision window + lock) | Execute | ✅ T16 (set-scope handler precondition — readBuildingBlocks().length === 0 else 409) |
| S1-11 | P1 Workshop/scope (F05 review shape) | Execute | ✅ T29 (scope card = `ProposalCard` accept/edit/reject → `POST /workshops/:id/scope`; reject clears) |
| S1-12 | P1 Capture (segment fields) | Execute | ✅ T7 + T18 (POST /contributions → 202; segment carries session id / speaker / at / source:typed) |
| S1-13 | P1 Capture (empty/whitespace) | Execute | ✅ T7 + T18 (whitespace-only → 204 no-op, no segment) |
| S1-14 | P1 Capture (FIFO queue) | Execute | ◐ T7 (decider open/closed; FIFO queue is T19) |
| S1-15 | P1 Capture (open→succeed, closed→reject) | Execute | ✅ T7 + T18 (closed session → 409) |
| S1-16 | P1 Facilitator (always-async; short-poll transport) | Execute | ✅ T18 + T26 + T30 (`useInterpretationPoll` wired in `CaptureScreen`; refetch after every mutation, board only after an accept) |
| S1-17 | P1 Facilitator (one merged call/turn) | Execute | ✅ T13 (one merged generateText call; Output.object; outputFormat; effort low; no temperature) |
| S1-18 | P1 Facilitator (model + SDK config) | Execute | ✅ T13 (claude-sonnet-5 → sonnet → claude-haiku-4-5 ladder; warnings logged) |
| S1-19 | P1 Facilitator (hand-shaped projection schema, AD-015) | Execute | ✅ T12 (FacilitationTurnSchema — ≤24 optionals, no empty subschema; ACL map) |
| S1-20 | P1 Facilitator (re-inflated op validates against SSOT) | Execute | ◐ T10 (applyOperation → decide; re-inflation .parse T22) |
| S1-21 | P1 Facilitator (past-tense domain event) | Design | Pending — translation-layer test here; **judgment quality verified by the Slice-5 eval** |
| S1-22 | P1 Facilitator (kept phrasing + bar + evidenceSpan) | Design | Pending — `bar`/`evidenceSpan` plumbing tested here; **kept-phrasing judgment = Slice-5 eval** |
| S1-23 | P1 Facilitator (phase → question, not event) | Design | Pending |
| S1-24 | P1 Facilitator (deeper-format notice) | Design | Pending — notice plumbing here; **format-naming judgment = Slice-5 eval** |
| S1-25 | P1 Facilitator (multi-track turn) | Design | Pending |
| S1-26 | P1 Facilitator (interpret at most once) | Execute | ✅ T7 (interpret-once ledger; 2nd → ok([])) |
| S1-27 | P1 Facilitator (provider-down, exactly once) | Execute | ✅ T13 (provider-down walks the ladder, then returns provider-down for the tick to retry) |
| S1-28 | P1 Facilitator (schema-fail: one retry then terminal) | Execute | ✅ T13 (schema-invalid: one retry total with error fed back, then terminal) |
| S1-29 | P1 Facilitator (one in flight/session; queue is a projection) | Design | Pending |
| S1-30 | P1 Facilitator (Anthropic mocked in tests) | Execute | ✅ T13 (generate mocked at the `ai` boundary — no real HTTP in any test) |
| S1-31 | P1 Facilitator (JSONL model-call logger) | Execute | ✅ T4 (plumbing/model-call-log) |
| S1-32 | P1 Facilitator (fail fast on missing key) | Design | Pending |
| S1-33 | P1/P2 Control flow (forced opening bookend) | Design | Pending |
| S1-34 | P2 Interview loop (question↔answer correlation) | Design | Pending |
| S1-35 | P2 Interview loop (Facilitation context recompute) | Execute | ◐ T9 (facilitationContext assembly; wired T14/T19) |
| S1-36 | P2 Interview loop (Facilitation agenda derived) | Execute | ✅ T9 (facilitationAgenda derived, no stakeholder input) |
| S1-37 | P1 Session lifecycle (Prior-session history) | Execute | ◐ T9 (sessionSummary/priorSessionHistory; wired T23) |
| S1-38 | P1 Proposal (one instance per judgment) | Execute | ✅ T8 (one Proposal per judgment; Building Block Proposed) |
| S1-39 | P1 Proposal (disposition state machine) | Execute | ✅ T8 (disposition machine + fast-check property) |
| S1-40 | P1 Proposal (cap of 7, overflow held) | Design | Pending |
| S1-41 | P1 Proposal (no apply without accept) | Design | Pending |
| S1-42 | P1 Proposal (sync apply chain, per-context txn) | Execute | ✅ T10 (applyOperation, per-context append; seam T22) |
| S1-43 | P1 Proposal (proposer + accepter recorded) | Design | Pending |
| S1-44 | P1 Proposal (APPLY_FAILED re-editable) | Execute | ✅ T8 (APPLY_FAILED re-editable/re-acceptable) |
| S1-45 | P1 Proposal (reject leaves nothing) | Execute | ✅ T8 (Reject terminal) |
| S1-46 | P1 Proposal (backlog-only, eventual consistency) | Execute | ✅ T11 + T27 + T31 (backlog board read; eventual-consistency UI; E2E asserts 3 accepted blocks land in the backlog) |
| S1-47 | P1 Proposal (accept idempotent) | Execute | ✅ T8 (Accept idempotent while ACCEPTED/APPLIED, stored id) |
| S1-48 | P1 Capture screen (board-first layout per brief; Pinia stores cold-loadable) | Execute | ✅ T11 + T26 + T27 + T30 (board-first `CaptureScreen`: full-screen `BoardWall` + floating `FacilitatorDock`; 3 cold-load stores) |
| S1-49 | P1 Capture screen (server-confirmed, no optimistic board updates; HTTP-only) | Execute | ✅ T26 + T28 + T30 (`CaptureScreen` refetches the board from a GET on `board-dirty`; never optimistic; `client.ts` is the only fetch seam) |
| S1-50 | P1 Facilitator (token + cost recording) | Execute | ✅ T4 (plumbing/model-pricing estimateCost) |
| S1-51a | cross — update `docs/domain/open-questions.md` #63 (scope resolution) **this slice** | Design | ✅ T32 (open-questions #63: revisable-until-first-applied-block, handler precondition not a decide arg, dock turn not a screen, diverges from canvas + brief) |
| S1-51b | cross — Slice-6 doc reconciliation (ADR-005/007 wording, canvas scope + Held + summary + AD-021, #66) | Design | ◐ T32 (list recorded in `.specs/STATE.md` handoff; edits are Slice 6) |
| S1-52 | P1 Proposal (Hold — `Proposal Held`/`Unheld` events, non-terminal) | Execute | ✅ T8 (Proposal Held/Unheld — reversible marker) |
| S1-53 | P1 Proposal (`Accept all` cluster + `Accept all remaining` drawer; no reject-all) | Execute | ✅ T28 + T29 (`Accept all` per cluster; `Accept all remaining` in the drawer accepts every non-held pending once; no reject-all anywhere) |
| S1-54 | P1 Capture screen (inline proposal cards welded to the turn; card-to-sticky flight + receipt) | Execute | ◐ T28 (cards weld to their contribution turn via `contributionId`; transcript receipt on APPLIED; flight T30) |
| S1-55 | P1 Capture screen ("catching up" provider-unavailable state; keyboard-operable, reduced-motion) | Execute | ✅ T28 + T30 (`playwright-cli` sweep: dock controls + composer + board keyboard-reachable, 0 console errors; `useReducedMotion` + global reduced-motion CSS) |
| S1-56 | P1 Facilitator (interpretation crash-consistency — `Contribution Interpreted` sole commit point; derived streams idempotent; worker reconciles) | Design | Pending |
| S1-57 | P1 Session lifecycle (`session_index` projection + `UNIQUE … WHERE status='open'`; enumerates closed sessions) | Execute | ✅ T5 |
| S1-58 | P1 Workshop/scope (`askOpening` owned by the worker; produced when a provider returns if down at session start) | Design | Pending |
| S1-59 | P1 Facilitator (`answer-question` track with an unknown `questionId` is dropped, logged, no `Question Answered`) | Execute | ✅ T7 (Answer Question rejects unknown/resolved id) |
| S1-60 | P1 Session lifecycle (`sessionSummary` — read-time projection, no model call, no struct in the event) | Execute | ✅ T7 (Session Closed carries no summary struct) |
| S1-61 | P1 Capture screen (scope shown as an accept/edit/reject card in the dock — no separate screen) | Execute | ✅ T29 (rendered in the dock feed as the first F05 card; no separate route) |
| S1-62 | P1 Facilitator (hard `.max(12)` tracks/turn + `.max(200)` label — the real "not unbounded" bound) | Execute | ✅ T12 (schema `.max(12)` / `.max(200)`; 13-track + long-label rejection tested) |
| S1-63 | P1 Facilitator (`nextMove.ask` → `Question Asked {kind:'free'}` with a minted `questionId` — the follow-up question gets a lifecycle) | Design | Pending |
| S1-64 | P1 Facilitator (`Contribution Interpretation Failed` is a distinct event, not a flag) | Execute | ✅ T3 (own event in the Session SSOT) |
| S1-65 | P1 Facilitator (model-call at-most-once window on a pre-ledger crash — accepted + documented) | Design | Pending |
| S1-66 | P1 Session lifecycle (`applyOperation` owns board concurrency; no `expectedPosition`; internal `stale-position` retry — AD-022) | Execute | ✅ T10 (applyOperation owns concurrency, no expectedPosition) |
| S1-67 | P1 Session lifecycle (`session_index` stale-`open` row recovery on next `Start Session`) | Execute | ✅ T17 (start-session deletes a stale open row before reserve) |
| S1-68 | cross (depcruise re-verification: `no-cross-slice-imports`, `host-imports-only-context-api`, `domain-imports-nothing-above`, `ui-does-not-import-server-code`, `cross-context-only-via-api` — each by a planted violation) | Execute | ✅ T10/T16/T25 (cross-context / no-cross-slice / host) + T26 (new `no-cross-store-imports`) + T30 (`ui-does-not-import-server-code` planted `src/app/` → capability `http.ts`, reverted) |
| S1-69 | cross (`session-facilitation/domain/AGENTS.md` path-scoped file; `WorkshopId` promoted to canonical `plumbing/ids.ts`) | Execute | ✅ T1 + T2 |

**Coverage:** 70 requirement IDs (S1-01…S1-69 + S1-51a/b), 0 mapped to tasks yet, 0 unmapped.

---

## Success Criteria

- [ ] A person completes the full loop (create → scope → 3–4 contributions → accept → backlog) in
      the SPA against the real model via `pnpm dev`.
- [ ] `pnpm check` green: typecheck → lint (incl. `switch-exhaustiveness-check` over the frozen
      operation union) → test → depcruise (`**/domain/** ↛ framework`; cross-context only via
      `api.ts`) → knip (no unused exports).
- [ ] Every facilitator-track behaviour (past-tense event, kept phrasing + bar, phase question,
      deeper-format notice, multi-track) has a deterministic test against a mocked model.
- [ ] Provider-down and schema-failure are covered by distinct tests proving exactly-once and
      one-retry-then-terminal respectively.
- [ ] Close → reopen → identical model, and a third session's facilitator context carries the
      first two sessions' frozen summaries — both under test.
- [ ] A `minor` changeset is present; `package.json` targets `0.2.0`.
- [ ] `domain-model-capture` and `session-facilitation` never share a SQLite transaction — proven
      by a test at the seam (the accept handler), not a carve-out on an architecture rule.
