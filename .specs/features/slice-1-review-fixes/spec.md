# Slice 1 — capture-loop review fixes

Corrective batch against the automated review of PR #46
([summary comment](https://github.com/vinialbano/eventstormer/pull/46#issuecomment-5474041852)).
Parent feature: [`slice-1-capture-loop`](../slice-1-capture-loop/spec.md) (issue #38). No new
product surface — every item is a defect or precision fix in code already merged onto the
`slice-1-capture-loop` branch. Scope size: **Medium** (10 atomic tasks, Design/Tasks skipped).

## Problem statement

The review returned **NOT READY — 3 BLOCK, 3 WARN, 6 NOTE**. `pnpm check` is green and the
architecture holds, but: `pnpm dev` cannot reach the real model with a correct `.env`; the
process-id standards violation the PR was already BLOCKed on is not fully closed; and a transient
Anthropic 429 permanently fails a contribution's interpretation. This batch closes every BLOCK and
WARN, and the cheap/safe NOTEs.

## Out of scope (deferred, per the review)

| Item | Reason |
| --- | --- |
| NOTE 1 — `reconcilePendingDerivations` re-walk per tick | "Acceptable to defer for v1 single-user scale"; touching the crash-safety net for a micro-opt is not worth the risk. |
| NOTE 6 — cross-session one-unit-per-tick starvation | `slice-1-capture-loop/spec.md` assumptions table rules cross-session concurrency out of v1 ("single-user, local"). Multiplayer slice. |
| QW1 — `\bT[0-9]+\b` / `MAJOR` patterns in the process-id gate | Belongs in PR #47 (`chore/harness-process-id-gate`), which automates the check. |
| QW2 — memoise `assembleFacilitationContext` prior-session reads | Perf only, v1 scale. |

## Acceptance criteria

### AC-B1 — `pnpm dev` loads `.env`, tests stay isolated
1. WHEN `ANTHROPIC_API_KEY` is present only in `.env.local` / `.env` (not the ambient shell) THEN
   `pnpm dev` SHALL boot the Hono host without throwing the fail-fast — `src/host/index.ts` loads
   `.env.local` then `.env` via `process.loadEnvFile` before `loadConfig()`.
2. WHEN a file is absent THEN its load SHALL be a silent no-op. `loadEnvFile` never overrides a
   key already in `process.env`, so `.env.local` beats `.env`, and a value the parent process set
   (a shell export, or Playwright's `webServer.env`) beats both.
3. The e2e webserver SHALL set `ANTHROPIC_API_KEY: ''` in `playwright.config.ts` `webServer.env`
   so the e2e process can never reach the real Anthropic API even if `FACILITATOR_MODE` were
   dropped. `pnpm test` (vitest) never boots `host/index.ts` — `loadConfig` is always called with
   an explicit `env` object — so it is already isolated.

### AC-B2 — no process ids in code
3. `git grep -nE '\b(T[0-9]+|S[01]-[0-9]+|AD-[0-9]+|MAJOR|MINOR|BLOCKER)\b'` over `src/**` and
   `e2e/**` (excluding `docs/adr/NNN` links and PRD `F01` refs) SHALL return nothing in a
   docstring, inline comment, or test name. The five known sites
   (`facilitator/port.ts`, `review-proposal/deps.ts`, `interpret-contribution/deps.ts`,
   `dock/ProposalCard.vue`, `set-scope/http.ts`) SHALL keep their surrounding reasoning.

### AC-B3 — transient Anthropic errors retry
4. WHEN `facilitator.interpret` / `askOpening` throws an error carrying `statusCode` 408, 409,
   425, or 429 THEN the adapter SHALL classify it `provider-down` (walk the ladder, then leave
   the contribution un-interpreted for the next tick) — NOT `schema-invalid`.
5. WHEN the error carries any other 4xx `statusCode` THEN it SHALL still classify `schema-invalid`
   (unchanged).

### AC-W1 — a closed session rejects late interpretation
6. WHEN `Session.decide` receives `Interpret Contribution` or `Fail Interpretation` for a session
   whose write model is `closed` THEN it SHALL return `ok([])` (no event) — so a model call that
   returns after the session closed writes nothing and derives no proposal.
7. The existing interpret-once-ledger behaviour on an OPEN session SHALL be unchanged.

### AC-W2 — `FACILITATOR_MODEL` is honoured
8. WHEN `FACILITATOR_MODEL` is set to a supported model id (`claude-sonnet-5` or
   `claude-haiku-4-5`) THEN the Anthropic adapter's ladder SHALL use it as the primary model
   (first two rungs), keeping `claude-haiku-4-5` as the final fallback rung.
9. WHEN `FACILITATOR_MODEL` is set to an unsupported value THEN `loadConfig` SHALL `console.warn`
   naming the accepted values and fall back to `claude-sonnet-5` — NOT throw. (A bad model name,
   unlike a missing key, has a safe default; failing the whole boot over it — and over the stale
   `claude-opus-5` the old `.env.example` shipped — is too aggressive now that B1 loads `.env`.)
10. WHEN `FACILITATOR_MODEL` is unset THEN behaviour SHALL be unchanged (`claude-sonnet-5`
    primary).

### AC-W3 — a hung model call cannot stall the scheduler
11. WHEN a single `generateText` call exceeds a per-attempt deadline (default 30 s) THEN it SHALL
    abort and the failure SHALL classify `provider-down` (ladder continues; the scheduler cycle
    is not blocked past the deadline × ladder rungs + backoffs).

### AC-DOCK — the dock shows a first prompt after scope is set

Reported in manual testing: accepting the scope card emptied the dock feed ("nothing happened");
a follow-up report — the feed should read like a chat where messages persist, not vanish.

16. WHEN `scope.status` is `set` THEN the dock feed SHALL lead with the facilitator's opening
    prompt (asking the expert to describe the first thing that happens) — matching the
    `impeccable` brief §5 "dock open with the facilitator's first prompt".
17. The opening prompt SHALL persist at the head of the feed as contributions are narrated below
    it (chat-log behaviour), and SHALL NOT render while the scope is still unset (the F05 scope
    card stands in its place then).

### AC-NOTE — precision fixes
12. `NextMove.questionText.describe()` SHALL state the 400-character ceiling (Anthropic strips
    `.max()` before the model sees it — `docs/ai-harness-gotchas.md`).
13. `applyMigrations`'s `trackingTable` parameter SHALL be typed as the closed union of the
    tables it is actually called with, not bare `string`.
14. The projection `DatabaseSync` connection in `host/config.ts` SHALL be opened with the same
    5 000 ms busy timeout as the `EventStore` connection.
15. The `deriveTracks` comments SHALL describe idempotency as resting on the `derived_track`
    marker + per-decider no-op — not on `expectedPosition: -1` (which returns `stale-position`,
    not a silent no-op).

## Verification

`pnpm check` green after every task. New unit tests for AC-B3 (429 → provider-down),
AC-W1 (closed session → `ok([])` for both commands), AC-W2 (supported id accepted, unsupported
rejected). AC-B1 / AC-W3 are covered by the e2e boot + the injected-deadline adapter path; AC-B2
and the NOTE fixes are grep-/read-verifiable. Fresh Verifier pass writes `validation.md`.
