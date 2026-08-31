# src/session-facilitation/domain/ — path-scoped

Loaded automatically when work happens in this directory. Restates the one rule that governs
everything here; see the root `AGENTS.md` for everything else.

## The one rule that is not negotiable

Imports **nothing** from Hono, Vue, Pinia, the AI SDK (`ai`, `@ai-sdk/*`), or any Node builtin.
Plain TypeScript only. `dependency-cruiser` fails the build on violation, including on type-only
imports; do not add an exemption to make a build pass.

If a type here seems to need a framework, the design is wrong: the dependency points the wrong
way. Move the framework-facing part into a capability (`capabilities/`) or an adapter
(`infrastructure/`). No I/O — persistence lives behind the synchronous `EventStore` port in
`src/plumbing/event-store/`. The `Facilitator` is a **port** defined here only as a type; its
Anthropic adapter lives in `infrastructure/`.

Branded ids use Zod's `z.$brand` (`z.string().brand<'X'>()` in `schema/`, mirrored as
`string & z.$brand<'X'>` in `src/plumbing/ids.ts`). Never hand-roll a `{ __brand }` marker.
`WorkshopId` is re-exported from `plumbing/ids.ts` (it is shared with `domain-model-capture`);
`SessionId`, `ContributionId`, `ProposalId`, `QuestionId` are this context's own.

## Domain invariants — code must preserve these

Three event-sourced aggregates, each with pure `decide` / `evolve`:

- **`Workshop`** — write model is `{ format: 'big-picture', creatorName }` and nothing else. The
  format is fixed at birth (the only v1 format). `Set Scope` validates the statement only
  (non-blank, ≤ 10 000) and is **repeatable** — it takes no cross-context argument. "Has the
  scope been set / is it locked" is a read-model / handler concern, never an aggregate field: a
  true invariant never delegates its data to another context. The first applied building block
  locks the scope, enforced as a `set-scope` handler precondition (`readBuildingBlocks(...).length
  === 0`), not here.
- **`Session`** — `OPEN → CLOSED` (terminal). Holds a `Map<QuestionId, 'open' | 'resolved'>` and
  the interpret-once ledger `Set<ContributionId>`.
  - `Make Contribution` — rejected on a `CLOSED` session; body trimmed, non-empty, ≤ 10 000.
  - `Answer Question` — **rejects an unknown or already-resolved `questionId`** (a domain rule,
    not a capability `if`). "Something was said" alone never resolves a question.
  - `Interpret Contribution` — a second call for a `contributionId` already in the ledger returns
    `ok([])`, and so does any call on a **closed** session (a model call that returns after the
    session closed must write nothing — a proposal born then would escape the close-time lapse
    sweep). `Contribution Interpreted` carries the full facilitator turn and the ids it assigns
    per track; it is the **sole commit point** for an interpretation.
  - `Fail Interpretation` — emits `Contribution Interpretation Failed` (its **own** event, not a
    flag on `Contribution Interpreted`); also ledgered so interpretation is not retried forever.
    `ok([])` on a closed session, as `Interpret Contribution`.
  - `Close Session` — idempotent (a second call returns `ok([])`). `Session Closed` carries only
    `{ unresolvedQuestionIds, closedAt }` — **raw facts, no summary struct**. Any
    summary a reader wants is a read-time projection over the terminal stream.
- **`Proposal`** — disposition `PROPOSED ⇄ EDITED → ACCEPTED → APPLIED | APPLY_FAILED`;
  `REJECTED` is terminal; `APPLY_FAILED` is re-editable and re-acceptable (acceptance is **not**
  terminal). A reversible **held** marker (`Proposal Held` / `Proposal Unheld`) is
  orthogonal to the disposition, never a state and never a boolean field.
  - `Accept Proposal` mints the `buildingBlockId` once, carries it in `Proposal Accepted`, and is
    idempotent while `ACCEPTED` / `APPLIED` (the stored id is reused).
  - `Building Block Proposed` carries no `overflow` field — "index > 7 among this contribution's
    proposals" is a read-model computation.
  - `Lapse Proposal` is idempotent on a terminal proposal (`ok([])`).

Shared schema (`schema/`): every event has `v: z.literal(1)`. The stored `InterpretedTrack`
discriminated union has **no `z.unknown()`**. The Anthropic-shaped `FacilitationTurnSchema` is
**not** here — it lives in `infrastructure/` and is mapped to `InterpretedTrack` across an
anticorruption seam.

Multi-stream steps reconcile, they do not transact: one append is the commit point,
every other append is a deterministic idempotent derivation done with `expectedPosition: -1`.

## Testing

Tests run with `environment: 'node'` — no DOM, ever, in this directory. Decider tests are
Given(events) / When(command) / Then(events | rejection) **through the operation**, 1:1 to the
spec's ACs; the `Proposal` disposition machine also gets `fast-check` property tests.
