# Slice 2 — The Money Shot · Tasks

## Execution Protocol (MANDATORY — do not skip)

Implement these tasks with the `spec-driven-development` skill (plugin-qualified:
`anoria-engineering:spec-driven-development`): **activate it by name and follow its Execute flow
and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of
truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier,
discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Spec**: `.specs/features/slice-2-money-shot/spec.md` (S2-01…S2-26)
**Design**: `.specs/features/slice-2-money-shot/design.md`
**Context**: `.specs/features/slice-2-money-shot/context.md`
**Decisions**: `.specs/STATE.md` AD-005, AD-008, AD-009, AD-011, AD-012, AD-016, AD-017, AD-022,
AD-024, AD-026, **AD-028**, **AD-029**, **AD-030**
**Status**: Execute — B1 (T1–T5) in progress

Every task obeys the Execution Contract: tests derive from the spec's ACs (never mirror the
implementation); the gate passes before a task is done; one atomic commit per task; never weaken
or delete a test. A fresh Verifier runs after the final task.

Create branch `slice-2-money-shot` off `main` before T1. Leave the untracked
`.changeset/cognitive-complexity-gate.md` alone — it is not this feature. Do not edit
`package.json` `version` (ADR-009); T17 adds a `minor` changeset only.

Do not cite `.specs/` process ids (`S2-…`, `AD-…`) in `src/**` or `e2e/**` comments, docstrings,
or test names. Keep the durable reasoning; drop the tag.

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec — confirm before Execute. Guidelines
> found: `AGENTS.md`, `docs/testing.md`, `docs/adr/008-testing-eval-and-observability.md`,
> `vite.config.ts` (`coverage.thresholds` `src/**/domain/**` ≥ 90%, `autoUpdate` local-only),
> `src/domain-model-capture/domain/AGENTS.md`, `src/session-facilitation/domain/AGENTS.md`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Domain deciders (`domain-model-capture/domain/board/decide`) | unit (node) | Given(events)/When(command)/Then(events\|rejection) **through the operation**; 1:1 to S2-08, S2-11, S2-12; distinct new label on any fold that asserts a written label (`docs/testing.md`) | `src/domain-model-capture/domain/**/*.test.ts` | `pnpm test` |
| Domain read-models / pure renderers (`session-facilitation/domain/read-models/artifact-source`, `derived-artifact-generation/domain/`) | unit (node) | all branches; **projected values pinned to literals the test spells out**, never compared to another projection; Markdown byte-identical for the same input; substring-id AC; quoted evidence unchanged after a label change in the input blocks | `src/**/domain/**/*.test.ts` | `pnpm test` |
| `domain-model-capture/infrastructure/apply-operation` | unit + integration (node) | target-bearing success returns `operation.target` and does **not** throw; capture kinds still return `operation.id`; internal `stale-position` retry on two concurrent F06 applies | `src/domain-model-capture/infrastructure/**/*.test.ts` | `pnpm test` |
| `domain-model-capture/capabilities/{board-access,edit-model}` | integration (node) via Hono `testClient` | every new/changed route: happy + listed edges + error paths; `GET /board` **still 404s** on an empty stream; `readBoardSnapshot` empty log → `{ position: -1, blocks: [] }` including withdrawn when present | `src/domain-model-capture/capabilities/**/*.test.ts` | `pnpm test` |
| `derived-artifact-generation/capabilities/readable-account` | integration (node) via Hono `testClient` | both GETs: happy + empty-workshop 200 + unknown workshop 404 + unknown block → empty reference list; two identical GETs → byte-identical Markdown; no `ai` / `@ai-sdk` on the render path | `src/derived-artifact-generation/**/*.test.ts` | `pnpm test` |
| `session-facilitation` I/O wrapper for `readArtifactSource` | unit + integration (node) | unknown workshop vs known-empty; quotes = contribution `body` then stored `evidenceSpan`s, pinned literals | `src/session-facilitation/{domain,infrastructure}/**/*.test.ts` | `pnpm test` |
| `host/` route mounting | unit (node) | `createRoutes` serves the new POST and both GETs through each context `api.ts` | `src/host/**/*.test.ts` | `pnpm test` |
| Vue SPA (`src/app/capture-loop/`) | unit (jsdom) + visual (`playwright-cli`) | 4th store cold-loads from one GET (empty account is 200, not 404); `no-cross-store-imports`; dashed-ghost only on committed stickies; confirm popover does not POST until confirm; withdraw ghost ≠ dashed-ghost; drawer re-renders on `board-dirty`; keyboard E/Enter/Esc; `playwright-cli open` reports **zero** console errors/warnings on the money-shot beats | `src/app/**/*.test.ts` | `pnpm test` (unit); `playwright-cli` (visual — manual gate on UI tasks) |
| E2E (`@playwright/test`) | e2e | **ONE** spec (ADR-008): extend `e2e/capture-loop.spec.ts` after the three accepts — open drawer, reword one sticky through confirm, assert account rendered-refs move and a quoted contribution is unchanged; withdraw → ghost → reinstate | `e2e/*.spec.ts` | `pnpm test:e2e` |
| depcruise architecture rules | static gate | **every new or affected rule proven by a planted violation** (repo convention): `**/domain/** ↛ framework` on the new DAG `domain/`; `cross-context-only-via-api` (DAG ↛ DMC `domain/`); `no-cross-slice-imports` (`edit-model` ↛ `board-access`); `host-imports-only-context-api`; `no-cross-store-imports` (`account` ↛ `board`) | `.dependency-cruiser.cjs` | `pnpm depcruise` |
| SQL migrations / Zod frozen op schema / config entities | none (build gate only) | handler-only 10 000-char label bound — **do not** change the frozen `v:1` `label: z.string().min(1)` | — | `pnpm check` |

## Gate Check Commands

> Generated from `package.json` + `AGENTS.md` + lefthook — confirm before Execute.

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | after a task whose only tests are unit | `pnpm test` |
| Full | after a task with integration **or** e2e tests | `pnpm test && pnpm test:e2e` |
| Build | phase completion; schema/config-only tasks; any task touching `.dependency-cruiser.cjs`, `package.json`, `knip.json`, `host/routes.ts`, or a new context skeleton | `pnpm check && pnpm build` |

`pnpm check` = `process-ids → typecheck → lint → test → depcruise → knip`, fail-fast. A red tree
at task end is a failed task — the `Stop` hook enforces it. Record the `pnpm test` count in each
commit message (or the task checkbox) so silent deletions are visible.

---

## Execution Plan

Phases are ordered and run sequentially. Tasks within a phase run in order. At Execute the
orchestrator packs consecutive whole phases into ~7-task batches and offers batch sub-agents.

### Phase 1 — Foundation: decide, sole writer, reads, DAG skeleton
```
T1 → T2 → T3 → T4 → T5
```
### Phase 2 — Projection + F06 write + host mount
```
T6 → T7 → T8 → T9
```
P2 diagram (execution is still T6 then T7 then T8 then T9):
```
T6 → T7 ─┐
T8 ──────┴→ T9
```
### Phase 3 — Capture-loop UI
```
T10 → T11 → T12 → T13 → T14
```
### Phase 4 — Brief, E2E, release
```
T15 → T16 → T17
```

### Phase Execution Map
```
P1 → P2 → P3 → P4

P1: T1 → T2 → T3 → T4 → T5
P2: T6 → T7 → T8 → T9
P3: T10 → T11 → T12 → T13 → T14
P4: T15 → T16 → T17
```

**Batch plan (proposed at Execute):** **B1** P1 (5) · **B2** P2 (4) · **B3** P3+P4 (8).
Three sequential workers. 17 tasks > ~8 → sub-agent offer is mandatory before any T1.

---

## Task Breakdown

### T1: Board `decide` — already-withdrawn and withdrawn-target

**What**: Reject `withdraw` of a withdrawn target (`already-withdrawn`) and `reword` of a
withdrawn target (`withdrawn-target`); keep `withdraw` emitting exactly `[withdraw]` (vacuous
cascade). Add both kinds to the `Rejection` union.
**Where**: `src/domain-model-capture/domain/board/{decide.ts,model.ts,decide.test.ts}`
**Depends on**: None
**Reuses**: existing G/W/T harness in `decide.test.ts`; `not-withdrawn` / `empty-label` /
`unknown-target` already present
**Requirement**: S2-08, S2-11, S2-12
**Tools**: MCP: NONE · Skill: `testing-boss` (G/W/T through the operation)
**Done when**:
- [x] `reword` of a withdrawn target → `{ kind: 'withdrawn-target', classification: 'systemic' }`
- [x] `withdraw` of a withdrawn target → `{ kind: 'already-withdrawn', classification: 'systemic' }`
- [x] `withdraw` of a present actor/event with no edges → `ok` array length 1, that op is `withdraw`
- [x] existing reinstate / unknown-target / empty-label cases still pass
- [x] Gate check passes: `pnpm test` · 408 passed, 0 failed
**Tests**: unit · **Gate**: quick
**Commit**: `feat(board): reject reword and re-withdraw of a withdrawn building block`

---

### T2: Lift `applyOperation` and return `operation.target`

**What**: Move `applyOperation` (and `boardStream` + the deps type it needs) to
`domain-model-capture/infrastructure/`. On success, `resultingBuildingBlockId` is `operation.id` if that field exists on the variant,
else `operation.target`. Never throw on a successful F06 decide. Re-export from
`api.ts`. Move applyOperation tests with the function to
`infrastructure/apply-operation.test.ts`. `board-access.test.ts` / `http.test.ts` import apply
from `api.ts` (or the infra module) — **`http.ts` itself does not import apply**. 
**`infrastructure/` must not import `capabilities/`.** Do **not** leave `edit-model` importing
`board-access`.
**Where**: `src/domain-model-capture/infrastructure/{apply-operation,board-stream}.ts`,
`src/domain-model-capture/api.ts`, `src/domain-model-capture/capabilities/board-access/`
**Depends on**: T1
**Reuses**: the existing retry loop; `BoardAccessDeps` shape (`store` + `clock`)
**Requirement**: S2-21, S2-22
**Tools**: MCP: NONE · Skill: `testing-boss`
**Done when**:
- [x] `applyOperation(reword)` / `withdraw` / `reinstate` return `resultingBuildingBlockId === target` and do not throw (a test that would have thrown on `main`)
- [x] capture kinds still return `operation.id`; two concurrent F06 applies both succeed via internal retry
- [x] `session-facilitation` accept path still compiles against `api.ts` (no import-path change for other contexts)
- [x] `infrastructure/apply-operation.ts` does not import `capabilities/`
- [x] Gate check passes: `pnpm check && pnpm build` · 413 passed, 0 failed
**Tests**: unit + integration · **Gate**: build
**Commit**: `refactor(capture): lift applyOperation and return target ids`

---

### T3: `readBoardSnapshot` (includes withdrawn; empty log is empty, not 404)

**What**: Extract `readBoardSnapshot(deps, workshopId)` that replays the board stream, **including
withdrawn blocks**, and returns `{ position: -1, blocks: [] }` on an empty log. Signature
`deps: { store: EventStore }` — **do not** reuse `BoardAccessDeps` (that type requires `clock`,
which this read does not use). Re-export from `api.ts`. `GET /workshops/:id/board` keeps 404
on an empty stream.
**Where**: `src/domain-model-capture/capabilities/board-access/read-board-snapshot.ts`,
`src/domain-model-capture/api.ts`, `src/domain-model-capture/capabilities/board-access/http.ts`
**Depends on**: T2
**Reuses**: `replay` / `boardStream`; do **not** overload `readBuildingBlocks` for artifacts
(it currently **includes** withdrawn blocks and omits the flag — leave it)
**Requirement**: S2-09, S2-13 (snapshot still carries withdrawn ids)
**Tools**: MCP: NONE · Skill: `testing-boss`
**Done when**:
- [x] empty log → `{ position: -1, blocks: [] }`
- [x] a withdrawn block is present in the snapshot with `withdrawn: true` and its id/label
- [x] existing `GET /board` 404-on-empty test still passes
- [x] Gate check passes: `pnpm test` · 415 passed, 0 failed
**Tests**: unit + integration · **Gate**: quick
**Commit**: `feat(capture): publish a board snapshot that includes withdrawn blocks`

---

### T4: Session-facilitation `artifact-source` + `readArtifactSource`

**What**: Pure `artifactSource(...)` over already-loaded workshop/session/proposal events →
`{ format: 'big-picture', scope, narratorCount, quotes[] }`. Quotes are contribution `body`s
then stored `evidenceSpan`s (no Proposal `rationale`). Thin I/O wrapper
`readArtifactSource(deps, workshopId)` in `session-facilitation/infrastructure/` (not a new
slice, not `start-workshop`). **Walk**: workshop stream (exists? format/scope/creatorName) →
`sessionIdsFor` (open + closed) → each session stream for `Contribution Made` →
`sessionProposalIds` → each proposal stream for `evidenceSpan` on `Building Block Proposed`.
Unknown workshop → not-found; known workshop with no contributions → `narratorCount: 0`,
`scope: null` or the **latest** `Scope Set` statement (Set Scope is repeatable — fold the last
event, not the first), `quotes: []`. Re-export `readArtifactSource` **and**
`type { SessionIndexDb }` from `session-facilitation/api.ts` so DAG types `db` without importing
SF `infrastructure/`.
**Where**: `src/session-facilitation/domain/read-models/artifact-source.ts`,
`src/session-facilitation/infrastructure/read-artifact-source.ts`,
`src/session-facilitation/api.ts`
**Depends on**: T3
**Reuses**: workshop / session event SSOTs; `sessionIdsFor` / stream keys; do **not** import
`sessionView`
**Requirement**: S2-05, S2-17, S2-18 (coverage inputs)
**Tools**: MCP: NONE · Skill: `testing-boss`
**Done when**:
- [x] fold tests pin `quotes[].text` to literal contribution bodies and `evidenceSpan`s
- [x] `narratorCount` is the number of distinct speakers on `Contribution Made` (0 if none)
- [x] two successive `Scope Set` events → `scope` is the **later** statement
- [x] unknown workshop is distinguishable from known-empty
- [x] `api.ts` re-exports `SessionIndexDb` (type-only)
- [x] Gate check passes: `pnpm test` · 421 passed, 0 failed
**Tests**: unit + integration · **Gate**: quick
**Commit**: `feat(session): publish quoted evidence and coverage inputs for artifacts`

---

### T5: `derived-artifact-generation` skeleton + framework-free rule

**What**: Create `src/derived-artifact-generation/{domain,capabilities}/`, path-scoped
`domain/AGENTS.md` (mirror DMC/SF: no framework, no Node builtin, no AI SDK; this context earns
**no** aggregate), placeholder `api.ts`. Do **not** add `CONTEXT.md`. Prove
`domain-imports-no-framework` with a planted `import { Hono }` in `domain/`; revert. `CONTEXTS`,
knip `src/*/api.ts`, and vitest `src/**/*.test.ts` already cover this folder — change them only
if a gate is red.
**Where**: `src/derived-artifact-generation/**`
**Depends on**: T4
**Reuses**: `src/domain-model-capture/domain/AGENTS.md`
**Requirement**: S2-19
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [x] `domain/AGENTS.md` present, path-scoped; no `src/**/CONTEXT.md`
- [x] planted Hono import in `derived-artifact-generation/domain/` fails `pnpm depcruise`; reverted
- [x] Gate check passes: `pnpm check && pnpm build` · 421 passed, 0 failed
**Tests**: none (build gate / static) · **Gate**: build
**Commit**: `chore(artifacts): add the derived-artifact-generation context skeleton`

---

### T6: `renderReadableAccount` + `listReferences`

**What**: Pure `renderReadableAccount(input) → { markdown, references }` and
`listReferences(document, blockId)` in DAG `domain/`. Markdown built with string templates (no
`markdown-it` here). **DAG `domain/` imports `plumbing/` only** — never DMC or SF `domain/`.
Building-block lines are id-keyed rendered references with kind prefixes `Event` / `Actor` /
`System` (exact capitalisation); withdrawn → `Event (withdrawn):` (same for Actor/System).
Quotes are verbatim and never rewritten when a block label in the same input changes. Exact
heading contract from `design.md`. Empty input → same headings, `Narrators: 0`, `Scope: (not set)`,
empty lists. `listReferences` **includes** the building-blocks site for that id (the wall sticky
is not a site; the account line is). Unknown id → `[]`.
**Where**: `src/derived-artifact-generation/domain/{model,render-readable-account,list-references}.ts`
**Depends on**: T5
**Reuses**: `AccountInput` / `AccountDocument` / `ReferenceSite` from design.md
**Requirement**: S2-04, S2-05, S2-06, S2-13, S2-14, S2-15, S2-17, S2-18
**Tools**: MCP: NONE · Skill: `testing-boss`
**Done when**:
- [x] same input twice → byte-identical `markdown`
- [x] empty input markdown is a pinned literal (headings present, lists empty)
- [x] Coverage section contains the exact lines `Stakeholder check: not run`, `Chosen problem: not run`, `Timeline and relations: not run` — not "none" / "0"
- [x] blocks `Order` and `Order placed`: rewording only the `Order` id in the input changes only that id's building-block line; the longer label's line is unchanged
- [x] a quote whose text contains the old label is byte-identical after that reword
- [x] withdrawn block still appears (`Event (withdrawn): …` or Actor/System equivalent) and `listReferences` still returns its **building-blocks** site (non-empty)
- [x] an actor line is `Actor: <label>` and a system line is `System: <label>` — never `Event:`
- [x] `listReferences` for a captured id returns ≥1 site with `path: 'building-blocks'`; unknown id → `[]`
- [x] Gate check passes: `pnpm test` · 429 passed, 0 failed
**Tests**: unit · **Gate**: quick
**Commit**: `feat(artifacts): render a deterministic readable account from the snapshot`

---

### T7: DAG HTTP — `GET …/readable-account` and `GET …/references`

**What**: `capabilities/readable-account` chained Hono router: `GET /workshops/:id/readable-account`
and `GET /workshops/:id/board/blocks/:blockId/references`. Reads only through DMC `api.ts`
(`readBoardSnapshot`) and SF `api.ts` (`readArtifactSource`, `SessionIndexDb`). Deps:
`{ store, db }` — `db` is typed from SF `api.ts`, **not** SF `infrastructure/`. Unknown
workshop → 404. Known workshop + empty board → **200** empty-state document. Unknown / absent
`blockId` → 200 `[]`. Withdrawn id still listed. References body is a JSON array of
`{ kind, path }[]` (same `ReferenceSite` as `listReferences`). Export the router from DAG
`api.ts`. **Plant** `readable-account/http.ts` → `domain-model-capture/domain/` (skip `api.ts`);
confirm `cross-context-only-via-api` fails; revert.
**Where**: `src/derived-artifact-generation/capabilities/readable-account/`,
`src/derived-artifact-generation/api.ts`
**Depends on**: T3, T4, T6
**Reuses**: Hono `testClient` pattern in `board-access/http.test.ts`
**Requirement**: S2-14, S2-15, S2-19
**Tools**: MCP: NONE · Skill: `testing-boss`
**Done when**:
- [x] two GETs of the same workshop with no intervening op → identical Markdown bodies
- [x] known workshop, empty board → 200, not 404; unknown workshop → 404
- [x] references GET returns a JSON array `{ kind, path }[]` — the same site set `listReferences` would for that id, including a **withdrawn** target
- [x] DAG `http.ts` / `deps.ts` import `SessionIndexDb` from `session-facilitation/api.ts`, not `infrastructure/`
- [x] planted cross-context import fails `pnpm depcruise`; reverted
- [x] Gate check passes: `pnpm test` · 434 passed, 0 failed
**Tests**: integration · **Gate**: quick
**Commit**: `feat(artifacts): serve the readable account and its reference list`

---

### T8: `edit-model` — `POST /workshops/:id/board/operations`

**What**: New `domain-model-capture/capabilities/edit-model` slice. Accept only `reword` /
`withdraw` / `reinstate`; every other frozen kind → 422 `{ error: 'not-implemented-in-slice', classification: 'systemic' }`. Call `applyOperation` from **infrastructure**, never
`board-access`. **Trim `label` before** `Operation` parse: `""` and `"   "` → 422
`empty-label` (never 400 from schema `min(1)`); length > 10 000 → 400 (handler bound; do not
change frozen Zod). Unknown workshop (empty board stream) → 404. Reword to the **same** label
still 200 + exactly one op. Author is the body `author` (`{ accepter }` only). **Plant**
`edit-model` → `board-access` import; confirm `no-cross-slice-imports` fails; revert.
**Where**: `src/domain-model-capture/capabilities/edit-model/`,
`src/domain-model-capture/api.ts`
**Depends on**: T2
**Reuses**: chained router + `testClient` from `board-access/http.ts`
**Requirement**: S2-03, S2-08, S2-09, S2-10, S2-11, S2-20, S2-22, S2-23
**Tools**: MCP: NONE · Skill: `testing-boss`
**Done when**:
- [ ] POST `reword` with a **distinct** new label → 200 `{ position }`; subsequent GET board shows that label; id unchanged; exactly one op appended
- [ ] POST `reword` with the **same** label as current → 200 + exactly one op (not a no-op)
- [ ] POST `sequence` (or any non-F06 kind) → 422 `not-implemented-in-slice`, log unchanged
- [ ] POST `""` and POST `"   "` → 422 `empty-label` (not 400); POST > 10 000 chars → 400; empty stream → 404
- [ ] POST `reword` of a withdrawn target → 422 `withdrawn-target`; POST `withdraw` of a withdrawn target → 422 `already-withdrawn`; POST `reinstate` of an active target → 422 `not-withdrawn`; unknown target → 422 `unknown-target`
- [ ] POST `withdraw` then `reinstate` → one op each; id unchanged
- [ ] planted sibling-slice import fails `pnpm depcruise`; reverted
- [ ] Gate check passes: `pnpm test` · test count recorded
**Tests**: integration · **Gate**: quick
**Commit**: `feat(capture): accept reword, withdraw, and reinstate on the board`

---

### T9: Host-mount both routers + `host-imports-only-context-api` plant

**What**: Mount `editModelRoutes(io)` and `readableAccountRoutes({ store, db })` in
`src/host/routes.ts` **only** via each context's `api.ts`. DAG **must** receive `db` (session-index);
F06 does not. Extend `routes.test.ts`. **Plant** `host/routes.ts` →
`derived-artifact-generation/domain/`; confirm `host-imports-only-context-api` fails; revert.
**Where**: `src/host/routes.ts`, `src/host/routes.test.ts`, `src/domain-model-capture/api.ts`,
`src/derived-artifact-generation/api.ts`
**Depends on**: T7, T8
**Reuses**: existing `createRoutes` composition
**Requirement**: S2-19, S2-20, S2-23
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] `createRoutes` serves `POST /api/workshops/:id/board/operations` and both artifact GETs
- [ ] planted host → DAG `domain/` import fails `pnpm depcruise`; reverted
- [ ] Gate check passes: `pnpm check && pnpm build`
**Tests**: unit (host) · **Gate**: build
**Commit**: `feat(host): mount edit-model and readable-account routes`

---

### T10: `account` Pinia store + `markdown-it` / DOMPurify (app only)

**What**: Fourth store `useAccountStore`, cold-load from `GET /api/workshops/:id/readable-account`.
Empty account is 200 — do **not** treat it as 404. No store imports another. Pin `markdown-it` and
a DOMPurify package via `pnpm view` (do not invent versions); they live in `src/app/` only.
**Plant** `account.ts` → `board.ts`; confirm `no-cross-store-imports` fails; reverted.
**Where**: `src/app/capture-loop/stores/account.ts`, `src/app/capture-loop/stores/stores.test.ts`,
`package.json`
**Depends on**: T9
**Reuses**: `stores/board.ts` load/`HttpError` pattern (except 404 handling — account is 200)
**Requirement**: S2-14, S2-23
**Tools**: MCP: `context7` (`markdown-it`, DOMPurify / `isomorphic-dompurify`) · Skill: `testing-boss`
**Done when**:
- [ ] jsdom: store hydrates from exactly one mocked GET; 200 empty markdown is stored, not an error
- [ ] planted store→store import fails `pnpm depcruise`; reverted
- [ ] `knip` clean (the parser is imported from app code in this task or T14 — if knip flags until T14, import a tiny `renderAccountHtml` helper here)
- [ ] Gate check passes: `pnpm check && pnpm build`
**Tests**: unit (jsdom) · **Gate**: build
**Commit**: `feat(app): add the readable-account store`

---

### T11: Wall — withdrawn ghosts, selection, dashed-ghost editor

**What**: First, patch capture-loop brief §3 so Enter on a committed sticky opens the dashed-ghost
(then confirm in T12) — it must **not** still say Enter saves. Then stop filtering withdrawn in
`CaptureScreen.vue`. The computed must pass `{ id, kind, label, withdrawn }` — deleting the
filter while keeping the `{ id, kind, label }` strip still hides ghosts. Extend `BoardBlockInput` / `StickyRect` / `layoutBoard` with `withdrawn`
(`StickyRect` **must copy** the flag — layout consumers never see `BoardBlockInput`). Ghosts still
occupy backlog cells. `BoardWall`: select a committed sticky → pencil (`aria-label="Reword"`);
`E` / `Enter` on a focused sticky opens the dashed-ghost editor (brief §3) with current label and
✓ / ✕; `Esc` / ✕ restore the previous label and append nothing. Never use dashed-ghost for pending
proposals. `E`/`Enter` **must not** start reword when `event.target` is an input, textarea, or
`contenteditable`. Fix the comment that calls dashed-ghost "slice 3". No POST in this task.
`BoardWall` `defineEmits<{ 'board-dirty': [] }>()` now (emit in T12/T13).
**Where**: `src/app/capture-loop/{screens/CaptureScreen.vue,board/layout.ts,board/BoardWall.vue}`,
`.impeccable/surfaces/src-app-capture-loop.md` (§3 only)
**Depends on**: T10
**Reuses**: existing `layoutBoard` + `BoardWall` tests; capture-loop brief §3 / §5
**Requirement**: S2-01, S2-09, S2-25
**Tools**: MCP: NONE · Skill: `impeccable` (run `context.mjs` once per UI session before editing), `testing-boss`
**Done when**:
- [ ] brief §3 no longer says Enter saves a committed sticky (T15 still owns drawer / 4th store / withdraw copy)
- [ ] jsdom **CaptureScreen**: a snapshot block with `withdrawn: true` is passed to BoardWall **with** `withdrawn: true` (stop-filtering alone is not enough; the `{ id, kind, label }` strip is gone)
- [ ] jsdom: withdrawn sticky renders struck-through / ghosted graphite, still in the backlog; distinct from dashed-ghost
- [ ] `layoutBoard` output `StickyRect`s carry `withdrawn` when the input did
- [ ] select + `E` / pencil → dashed-ghost with the current label; Esc restores; a proposal card never receives this treatment
- [ ] `E` in a focused text field types the letter
- [ ] Gate check passes: `pnpm test` · test count recorded
**Tests**: unit (jsdom) · **Gate**: quick
**Commit**: `feat(app): show withdrawn ghosts and the dashed-ghost reword editor`

---

### T12: Reword confirm popover + POST

**What**: ✓ / `Enter` on the dashed-ghost opens a portalled Reka **Popover** (`aria-label="Reword impact"`
— **not** `Confirm reword`; that name is the button only, so T16's `getByRole('button', { name: 'Confirm reword' })`
is unique; not Dialog; wall has `overflow: hidden`) listing
`GET …/board/blocks/:blockId/references`. Confirm control accessible name **Confirm reword**.
`RewordConfirm` takes `revision` (board `position`); while the popover is open, a `revision`
change refetches references or cancels — never POST against a stale list. No append until
popover confirm. Cancel / Esc (ghost first, then popover) / ✕ appends nothing. Confirm →
`postBoardOperation` in `dock/mutations.ts` → `POST /api/workshops/:id/board/operations`
`reword` with `author: { accepter: { name: creatorName } }` and `v: 1`, then `BoardWall`
emits `board-dirty`. `BoardWall` takes `workshopId`, `accepter` (workshop `creatorName`), and
`revision` (`board.snapshot.position`) as props, same parent-binding pattern as
`FacilitatorDock`. Isolated jsdom may stub those props; `CaptureScreen` must still bind them
in this task — a mount that supplies them only in `BoardWall.test.ts` does not count. Empty
label: inline reject, no POST. If the confirm GET fails, keep the
popover and show retry/cancel copy — no silent commit.
**Where**: `src/app/capture-loop/board/` (e.g. `RewordConfirm.vue`),
`src/app/capture-loop/dock/mutations.ts`, `src/app/capture-loop/screens/CaptureScreen.vue`
**Depends on**: T7, T8, T11
**Reuses**: `reka-ui@2.10.4` (already a dependency); `postJson`
**Requirement**: S2-02, S2-03, S2-04, S2-07, S2-25
**Tools**: MCP: `context7` (`reka-ui` Popover) · Skill: `impeccable`, `testing-boss`
**Done when**:
- [ ] jsdom: opening the popover GETs references and does **not** POST; confirm POSTs once; cancel POSTs zero times; GET-fail shows retry/cancel and POSTs zero times
- [ ] popover root `aria-label` is `Reword impact`; confirm **button** name is `Confirm reword`
- [ ] `RewordConfirm` watches `revision`; a change while open refetches (or cancels) before a subsequent confirm
- [ ] successful confirm `$emit('board-dirty')` from **BoardWall**
- [ ] `CaptureScreen` renders `<BoardWall :blocks="…" :workshop-id="id" :accepter="session.creatorName" :revision="board.snapshot.position" />` (live store/position, not literals)
- [ ] empty / whitespace label never POSTs; inline "Name can't be empty."
- [ ] popover content is portalled (not clipped by the wall)
- [ ] Gate check passes: `pnpm test` · test count recorded
**Tests**: unit (jsdom) · **Gate**: quick
**Commit**: `feat(app): confirm a reword against the live reference list`

---

### T13: Withdraw and reinstate on the selected sticky

**What**: Selected active sticky: visible **Withdraw** control (`aria-label="Withdraw"`) → POST
`withdraw` → `board-dirty`. Selected ghost: **Reinstate** (`aria-label="Reinstate"`) → POST
`reinstate`. Do not offer reword/withdraw on an already-withdrawn sticky (reinstate first).
Keyboard remains reachable (WCAG 2.2 AA).
**Where**: `src/app/capture-loop/board/BoardWall.vue`, `src/app/capture-loop/dock/mutations.ts`
**Depends on**: T8, T11, T12
**Reuses**: T12's `postBoardOperation` helper
**Requirement**: S2-09, S2-10, S2-11, S2-25
**Tools**: MCP: NONE · Skill: `impeccable`, `testing-boss`
**Done when**:
- [ ] jsdom: Withdraw POSTs `{ kind: 'withdraw', target }` once and emits `board-dirty`; Reinstate POSTs `{ kind: 'reinstate', target }`
- [ ] a ghosted sticky shows Reinstate, not pencil/Withdraw; `E` / `Enter` on a focused ghosted sticky does not open dashed-ghost
- [ ] Gate check passes: `pnpm test` · test count recorded
**Tests**: unit (jsdom) · **Gate**: quick
**Commit**: `feat(app): withdraw and reinstate a committed sticky`

---

### T14: Readable-account drawer + live `board-dirty` refetch

**What**: Toggleable drawer on the **right** edge of the capture screen (over the wall, not under
the dock), toggle `aria-label="Readable account"`. Nunito UI. `markdown-it` → `DOMPurify.sanitize`
→ HTML. Quoted evidence visually distinct (`<blockquote>`). Vue component events **do not bubble**:
`CaptureScreen` binds `@board-dirty` on **both** `FacilitatorDock` (accept) and `BoardWall` (F06).
Keep the T12 BoardWall bindings (`workshopId`, `accepter`, `revision`). Refetching the board
store on `board-dirty` does not move RewordConfirm's `revision` unless it is
`:revision="board.snapshot.position"`. Same-tab accept while the popover is open must refetch
references or cancel — do not treat a store-only reload as sufficient.
`onBoardDirty` **always** refetches **board + account**, even if the drawer is closed. Extending
only the dock handler would leave T14 green while S2-07 fails for direct reword/withdraw. No
staleness copy, no LLM. Empty model: deterministic empty-state from the GET.
**Where**: `src/app/capture-loop/screens/CaptureScreen.vue`,
`src/app/capture-loop/` (e.g. `account/ReadableAccountDrawer.vue`)
**Depends on**: T10, T12, T13
**Reuses**: account store; Markdown contract from T6
**Requirement**: S2-07, S2-14, S2-16, S2-17, S2-25
**Tools**: MCP: NONE · Skill: `impeccable`, `playwright-cli` (console-zero pass against `pnpm dev`), `testing-boss`
**Done when**:
- [ ] jsdom: `BoardWall` `$emit('board-dirty')` calls `account.load` **and** `board.load` (keep the dock emit for accept)
- [ ] drawer toggle GETs once on open if not loaded
- [ ] sanitised output wraps quote markdown in a blockquote; rendered-ref lines are not blockquotes
- [ ] `playwright-cli open` on the capture screen (scripted facilitator): toggle drawer, reword through confirm — **0** console errors, **0** warnings
- [ ] Gate check passes: `pnpm test` · test count recorded
**Tests**: unit (jsdom) + visual (`playwright-cli`) · **Gate**: quick
**Commit**: `feat(app): live readable-account drawer on the capture screen`

---

### T15: Patch the capture-loop surface brief

**What**: Update `.impeccable/surfaces/src-app-capture-loop.md` in place: do **not** re-author
§3's first Enter (focused committed sticky → dashed-ghost; that is T11 / spec AC1). Replace
§3's remaining `Enter` saves (or equivalent silent-save) with: Enter **inside the dashed-ghost**
opens the confirm popover (spec AC2; does not silent-save). §4 breadth includes the account
drawer and **4** Pinia stores; §6 withdraw/reinstate + account toggle. Do **not** rewrite
`DESIGN.md`.
**Where**: `.impeccable/surfaces/src-app-capture-loop.md`
**Depends on**: T14
**Reuses**: design.md "Impeccable — capture-loop extension"
**Requirement**: S2-25
**Tools**: MCP: NONE · Skill: `impeccable`
**Done when**:
- [ ] brief §3: Enter / E on a focused committed sticky still opens the dashed-ghost; Enter inside the ghost opens the confirm popover (does not silent-save); 4th store and drawer are in scope; withdraw/reinstate is specified
- [ ] `DESIGN.md` untouched
- [ ] Gate check passes: `pnpm check && pnpm build`
**Tests**: none (doc) · **Gate**: build
**Commit**: `docs(brief): confirm reword, withdraw, and the account drawer on capture-loop`

---

### T16: Extend the one Playwright spec

**What**: After the existing three accepts in `e2e/capture-loop.spec.ts`, open the account drawer
(`getByRole` / `aria-label="Readable account"`), reword one sticky through the confirm popover
(distinct new label; pencil `Reword`; confirm via `getByRole('button', { name: 'Confirm reword' })`
— do **not** target the popover's `Reword impact` label). **The quoted contribution must
contain the pre-reword label as literal text** — change the first narration (or add `evidenceSpan`
on that scripted turn) so it does; after reword, assert that quote still contains the old spelling
and the account's rendered-ref line carries the new label. Then withdraw → ghost → reinstate
(same id; controls `Withdraw` / `Reinstate`). Keep **one** test file / one flow (ADR-008). Do not
add a second spec.
**Where**: `e2e/capture-loop.spec.ts`
**Depends on**: T14, T15
**Reuses**: `FACILITATOR_MODE=scripted` + `e2e/fixtures/facilitator.json`
**Requirement**: spec Success Criteria; S2-04, S2-05, S2-07, S2-09, S2-10, S2-16
**Tools**: MCP: `context7` (`@playwright/test` locators if needed) · Skill: `playwright-cli`, `testing-boss`
**Done when**:
- [ ] `pnpm test:e2e` passes headless including the new beats; the quote still contains the pre-reword label after the account line moved
- [ ] still a single spec file
- [ ] Gate check passes: `pnpm test && pnpm test:e2e`
**Tests**: e2e · **Gate**: full
**Commit**: `test(e2e): reword, quotes, and withdraw on the capture-loop flow`

---

### T17: `minor` changeset — do not bump `package.json` version

**What**: Add `.changeset/slice-2-money-shot.md` (`minor`). Leave `package.json` `version` at
`0.2.0`. S2-26 comments on #40/#41/#42 are already posted — add a comment only if Execute
diverged from those contracts. Do **not** do the Slice-6 ADR-007 / ARCHITECTURE.md wording pass
(`design.md` "Docs to reconcile").
**Where**: `.changeset/slice-2-money-shot.md`
**Depends on**: T16
**Reuses**: `.changeset/unicorn-agent-sensors.md` (changeset format); ADR-009
**Requirement**: S2-24, S2-26
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] `minor` changeset present; `package.json` `version` is still `0.2.0`
- [ ] Gate check passes: `pnpm check && pnpm build`
**Tests**: none (release artifact) · **Gate**: build
**Commit**: `chore: add the Slice 2 minor changeset`

---

## Phase Execution Map (detail)

```
Phase 1 → Phase 2 → Phase 3 → Phase 4

P1:  T1 ──→ T2 ──→ T3 ──→ T4 ──→ T5
P2:  T6 ──→ T7 ──→ T8 ──→ T9
       ╰───────────── T8 also depends on T2 (P1)
       ╰── T7 also depends on T3, T4 (P1)
P3:  T10 ──→ T11 ──→ T12 ──→ T13 ──→ T14
       ╰── T12 also depends on T7, T8 (P2)
       ╰── T13 also depends on T8 (P2)
P4:  T15 ──→ T16 ──→ T17
```

Execution is strictly sequential — no intra-phase parallelism. One agent (or batch worker) works
one task at a time, in order.

**Orchestrator at Execute:**
1. Count 17 tasks → pack B1 P1 (5) · B2 P2 (4) · B3 P3+P4 (8) — offer sub-agents (mandatory)
2. Create `slice-2-money-shot` off `main` before T1
3. Dispatch the next batch; receive the compact summary; update this file
4. After T17 is committed, dispatch a fresh Verifier (author ≠ verifier) automatically

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1 | 1 decider change + Rejection union | ✅ |
| T2 | 1 function move + target-id fix | ✅ cohesive |
| T3 | 1 read function | ✅ |
| T4 | 1 read-model + its I/O wrapper | ✅ cohesive |
| T5 | 1 context skeleton + 1 depcruise plant | ✅ cohesive |
| T6 | 2 pure functions, one document | ✅ cohesive |
| T7 | 1 capability, 2 GETs, 1 plant | ✅ cohesive (one query slice owns both) |
| T8 | 1 capability, 1 POST, 1 plant | ✅ |
| T9 | host mount + 1 plant | ✅ cohesive |
| T10 | 1 store + 2 app-only deps + 1 plant | ✅ cohesive |
| T11 | wall filter + layout + dashed-ghost (one UI region) | ⚠️ 3 files — cohesive "committed stickies on the wall" |
| T12 | 1 overlay + POST reword | ✅ |
| T13 | withdraw/reinstate controls on the same wall | ✅ |
| T14 | 1 drawer + `board-dirty` wiring | ✅ |
| T15 | 1 brief patch | ✅ |
| T16 | extend the one e2e spec | ✅ |
| T17 | 1 changeset | ✅ |

No ❌. T11 is the only ⚠️ — splitting filter/layout from the dashed-ghost leaves an untestable
half-wall; they are one BoardWall interaction.

---

## Diagram-Definition Cross-Check

| Task | Depends on (body) | Diagram arrows | Status |
| --- | --- | --- | --- |
| T1 | None | P1 head | ✅ |
| T2 | T1 | T1→T2 | ✅ |
| T3 | T2 | T2→T3 | ✅ |
| T4 | T3 | T3→T4 (same-phase order; T4 does not need DMC at runtime) | ✅ |
| T5 | T4 | T4→T5 (same-phase order) | ✅ |
| T6 | T5 | P2 head → P1 T5 | ✅ |
| T7 | T3, T4, T6 | T6→T7; back to P1 T3/T4 | ✅ |
| T8 | T2 | P2 T8 ← P1 T2 (no T6→T8 / T7→T8 arrow) | ✅ |
| T9 | T7, T8 | T7→T9, T8→T9 | ✅ |
| T10 | T9 | P3 head → P2 T9 | ✅ |
| T11 | T10 | T10→T11 | ✅ |
| T12 | T7, T8, T11 | T11→T12; back to P2 T7/T8 | ✅ |
| T13 | T8, T11, T12 | T12→T13; back to P2 T8 | ✅ |
| T14 | T10, T12, T13 | T13→T14 (T10 already upstream) | ✅ |
| T15 | T14 | P4 head → T14 | ✅ |
| T16 | T14, T15 | T15→T16 | ✅ |
| T17 | T16 | T16→T17 | ✅ |

No task depends on a later phase. All ✅.

---

## Test Co-location Validation

| Task | Layer created/modified | Matrix requires | Task says | Status |
| --- | --- | --- | --- | --- |
| T1 | domain decider | unit | unit | ✅ |
| T2 | infrastructure apply | unit + integration | unit + integration | ✅ |
| T3 | board-access read | unit + integration | unit + integration | ✅ |
| T4 | SF read-model + infra I/O | unit + integration | unit + integration | ✅ |
| T5 | context skeleton + depcruise | none / static | none | ✅ |
| T6 | DAG domain renderer | unit | unit | ✅ |
| T7 | DAG HTTP | integration | integration | ✅ |
| T8 | edit-model HTTP | integration | integration | ✅ |
| T9 | host routes | unit | unit | ✅ |
| T10 | Vue store + app deps | unit (jsdom) | unit (jsdom) | ✅ |
| T11–T13 | Vue SPA | unit (jsdom) | unit (jsdom) | ✅ |
| T14 | Vue SPA + visual | unit (jsdom) + visual | unit + visual | ✅ |
| T15 | brief (doc) | none | none | ✅ |
| T16 | e2e | e2e | e2e | ✅ |
| T17 | changeset | none | none | ✅ |

No ❌ VIOLATION. Every task that creates a tested layer carries its tests.

---

## Tools per task — proposed (confirm at approval)

**Available MCPs:** `context7` — use when a library API is genuinely in play (`markdown-it`,
DOMPurify, `reka-ui` Popover, Playwright locators). Prefer codebase + `docs/agents/*-gotchas.md`
first.
**Available Skills:**
- `anoria-engineering:spec-driven-development` — always (Execute protocol)
- `testing-boss` — T1–T4, T6–T8, T10–T14, T16 (tests that fail for the right reason)
- `impeccable` — **mandatory T11–T15** (working agreement: visual/UX work goes through the skill;
  run `node .claude/skills/impeccable/scripts/context.mjs --target src/app/capture-loop` once per
  UI session before editing). Visitor mode stays **Operate**. Do not rewrite `DESIGN.md`.
- `playwright-cli` — T14 (console-zero) + T16 (e2e)
- `code-architecture` / `software-design` / `domain-modeling` — already applied at Design; do not
  reopen AD-028 / AD-029 at Execute
