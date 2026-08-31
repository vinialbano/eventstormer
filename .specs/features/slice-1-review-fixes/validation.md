# Verifier report — slice-1-review-fixes

**Verdict: PASS**

Standalone fresh-eyes pass (no sub-agent) after the last commit. Diff range
`e6eb126..db42ac3` (13 commits). `pnpm check` green on a clean run — 64 files / **368 tests**,
`vue-tsc` + `eslint --max-warnings 0` clean, dependency-cruiser 0 violations (182 modules),
knip clean. `pnpm test:e2e` — **1 passed** (and it now boots from `.env` via the B1 fix, proven
when an earlier run surfaced the local `.env`'s stale `FACILITATOR_MODEL`).

## Spec-anchored outcome check

| AC | Verdict | Evidence |
| --- | --- | --- |
| B1 (1–3) — `.env.local` then `.env`, e2e isolated | **met** | `src/host/index.ts` loops `['.env.local', '.env']` through `process.loadEnvFile` in try/catch before `loadConfig()`; `loadEnvFile` non-override semantics verified empirically. `playwright.config.ts` `webServer.env` pins `ANTHROPIC_API_KEY: ''`. Unit tests never boot `host/index.ts`. e2e green. |
| B2 (3) — no process ids | **met** | `git grep -nE '\b(T[0-9]{1,3}\|S[01]-[0-9]+\|MAJOR\|MINOR\|BLOCKER)\b'` over `src/**` + `e2e/**` returns nothing; five named docstrings keep their reasoning. |
| B3 (4,5) — transient 4xx retry | **met** | `anthropic-adapter.ts:112` `RETRYABLE_STATUS = {408,409,425,429}` → `provider-down`; other 4xx → `schema-invalid`. Tests: "treats a 429 … walks the whole ladder … `[sonnet, sonnet, haiku]` → provider-down" and "still treats a 400 … schema-invalid — one retry". |
| W1 (6,7) — closed session rejects late interpret | **met** | `session/decide.ts` — `if (wm.closed) return ok([])` first line of both `Interpret Contribution` and `Fail Interpretation`. Tests: "Interpret Contribution on a CLOSED session is ok([])", "Fail Interpretation on a CLOSED session is ok([])". Open-session ledger tests unchanged and green. AD-025 recorded. |
| W2 (8,9,10) — `FACILITATOR_MODEL` honoured | **met** | `buildLadder(primary)` → `[primary, primary, haiku]`; `config.ts` validates via `isModelName`, `console.warn`s + falls back to sonnet on an unsupported value (softened from a throw after B1 made a stale `.env` fatal). Tests: adapter "uses the given model for the first two rungs" / "defaults … to claude-sonnet-5"; config "warns and falls back" / "accepts a supported … without warning". |
| W3 (11) — per-attempt deadline | **met (wiring by inspection)** | `makeDefaultGenerate(timeoutMs)` passes `abortSignal: AbortSignal.timeout(deps.attemptTimeoutMs ?? 30_000)` to `generateText`; the thrown abort classifies `provider-down` (no `statusCode`, not `NoObjectGeneratedError`). Test: "a thrown error with no statusCode … as provider-down". The real network abort is not unit-tested (injected `generate` seam). |
| DOCK (16,17) — first prompt after scope set, chat-persistent | **met** | `FacilitatorDock.vue` `showFirstPrompt = scope==='set'` (no feed condition) → the opening facilitator `ConversationTurn` leads the feed and stays as contributions append below. Tests: "shows the facilitator first prompt once the scope is set …", "keeps the first prompt at the head of the feed after contributions are narrated" (asserts `turns[0]`), "does not show the first prompt while the scope is still unset". |
| DOCK (18,19) — no contribution turn looks dropped | **met** | `feed` computed: a `derived` contribution with no cards and no following `question`/`notice` turn → a "Noted — nothing to capture from that one." facilitator turn; a `failed` contribution → "I couldn't make sense of that one — try rephrasing it." Tests: "shows a 'noted' reply when a contribution produced no proposals", "shows a rephrase hint when a contribution failed interpretation", "does not add a 'noted' reply when the facilitator answered with a question". |
| DOCK (20) — proposal pill by kind, label + colour | **met** | shared `dock/kind-label.ts` `kindLabel()` (label) + new `--color-actor` / `--color-system` (+ `-ink`) tokens (colour) drive the pill on `FacilitatorDock` (`:pill-kind="card.blockKind"`), `PendingDrawer` (`drawer__pill--<kind>`), and the board `.sticky[data-kind]`. Tests: "colours the kind pill by pillKind, and leaves it on the event pair when absent" (ProposalCard), "labels a proposal card by its building-block kind" + class assertions (FacilitatorDock), "labels and colours each row pill by its building-block kind" (PendingDrawer). Verified in-browser (playwright-cli) at 1440×900 and 390×844: ACTOR yellow, SYSTEM pink, EVENT orange, marker-black labels AA on each fill, orange still visually leads. DESIGN.md §1/§2/§7 + surface brief updated. |
| NOTE 12 — `questionText.describe()` 400 char | **met** | `turn-schema.ts` describe now reads "…at most 400 characters." |
| NOTE 13 — `trackingTable` union | **met** | `migrations.ts` param typed `'_migrations' \| '_sf_migrations'`. |
| NOTE 14 — projection DB busy timeout | **met** | `config.ts` `new DatabaseSync(dbPath, { timeout: 5_000 })`. |
| NOTE 15 — `deriveTracks` comment | **met** | comment now attributes idempotency to `derived_track` + decider no-op and explains the discarded `stale-position` Result. |

Deferred (unchanged, per the review): NOTE 1 (reconcile re-walk), NOTE 6 (cross-session
starvation — out of v1 scope), QW1 (process-id gate → PR #47), QW2 (context-assembly memo).

## Discrimination sensor

5 behaviour-level mutants injected in scratch state, each reverted after:

| # | Mutation | Killed by |
| --- | --- | --- |
| 1 | remove the `RETRYABLE_STATUS` short-circuit in `classifyThrown` | *(initially survived — the 2-step 429 test could not tell the schema-retry path from the ladder walk; test rewritten to assert the exhausted ladder `[sonnet, sonnet, haiku] → provider-down`, mutant then killed)* |
| 2 | drop `if (wm.closed) return ok([])` from `Interpret Contribution` | `decide.test.ts` "Interpret Contribution on a CLOSED session is ok([])" |
| 3 | force `showFirstPrompt` to `false` | `FacilitatorDock.test.ts` "shows the facilitator first prompt …" / "keeps the first prompt at the head …" |
| 4 | `buildLadder` ignores `primary` (always sonnet) | `anthropic-adapter.test.ts` "uses the given model for the first two rungs" |
| 5 | `console.warn` → `console.info` in the `FACILITATOR_MODEL` fallback | `config.test.ts` "warns and falls back …" |

Final: **0 surviving mutants.**

## Lessons

One grounded failure worth keeping: **mutant 1** — a test whose script is short enough that two
distinct code paths produce the same observable outcome is a vacuous test. When asserting a
*classification*, drive the input to a state where only the correct branch reaches the asserted
result (here: an always-failing 429 so the ladder must exhaust). Recorded via `scripts/lessons.py`.
