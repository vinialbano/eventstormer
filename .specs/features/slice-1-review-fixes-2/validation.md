# Verifier report — slice-1-review-fixes-2

**Verdict: PASS**

Independent fresh-eyes pass (author ≠ verifier, `validate.md` Code + tests mode). Diff range
`f3c4cef..HEAD` (6 commits: `08e7da8`, `85fc133`, `50d2509`, `b73196c`, `21a1656`, `0d8279f`).

## Gate

`pnpm check` GREEN — `vue-tsc` + `eslint --max-warnings 0` clean, **379 tests / 64 files pass**,
dependency-cruiser 0 violations (183 modules), knip clean. `pnpm test:e2e` (chromium): **1 passed**.

**Count reconciliation:** true pre-feature baseline is **376** (not 377); this feature adds exactly
3 tests (1 `FacilitatorDock`, 1 `use-interpretation-poll`, 1 `anthropic-adapter`), additions only,
no deletions or weakened assertions. 376 + 3 = 379.

## Spec-anchored acceptance-criteria check

| AC | Spec-defined outcome | Evidence | Result |
| --- | --- | --- | --- |
| 1 | `failed` + next turn is `question`/`notice` → no "try rephrasing" | `FacilitatorDock.test.ts` "does not add a rephrase hint when a failed contribution was answered with a question" — `expect(wrapper.text()).not.toContain('try rephrasing')` + `toContain('Could you say that another way?')` | ✅ PASS |
| 2 | `failed`, no following `question`/`notice` → hint shown (unchanged) | `FacilitatorDock.test.ts` "shows a rephrase hint when a contribution failed interpretation" — `expect(wrapper.text()).toContain('try rephrasing')` (pre-existing, still green) | ✅ PASS |
| 3 | `derived`, no cards, `!answered` → "Noted…" unchanged | `FacilitatorDock.test.ts` "shows a 'noted' reply…" + "does not add a 'noted' reply when the facilitator answered with a question" (both pre-existing, still green) | ✅ PASS |
| 4 | `tick()` runs, a `refetch` rejects → next tick still scheduled, `polling` stays `true` | `use-interpretation-poll.test.ts` "keeps polling after a store refetch rejects — the loop is not wedged" — `expect(poll.polling.value).toBe(true)` + `expect(sessionRefetch.mock.calls.length).toBeGreaterThanOrEqual(2)` | ✅ PASS |
| 5 | all `refetch` resolve → scheduling unchanged | `use-interpretation-poll.test.ts` "polls while a contribution is interpreting and stops once fully derived" / "polls while the scope is unset" / "does not poll a settled resumed session" (pre-existing, still green) | ✅ PASS |
| 6 | comment near `DEFAULT_ATTEMPT_TIMEOUT_MS` states the compounded ladder ceiling | `anthropic-adapter.ts:78-84` — "bounds the attempt, not the turn … ≈ 3 × this + the 2s/4s backoffs (~2 min) … also delays reconcile for every workshop — acceptable at v1 single-user scale" | ✅ PASS |
| 7 | `runStep` catch notes the `usage:0` under-accounting | `anthropic-adapter.ts` catch branch — "usage 0 on a throw … fires after the request reached the provider, which may still bill it — the JSONL ledger under-accounts a timed-out attempt" | ✅ PASS |
| 8 | dock opening prompt marked UI chrome | `FacilitatorDock.vue` — `<!-- A UI affordance (brief §5), not a facilitator.askOpening turn … -->` + the `showFirstPrompt` docblock reworded | ✅ PASS |
| 9 | `interpret.ts` + AD-021 note the deriveTracks partial-write gap | `interpret.ts` `reconcilePendingDerivations` docblock "Known gap (AD-021 scale): … a crash mid-`deriveTracks` … on a session that is then closed leaves the unmarked track underived …"; `.specs/STATE.md` AD-021 row "**Known gap (PR #46 round-2 NOTE, accepted):** …" | ✅ PASS (comment on the `reconcilePendingDerivations` block, not literally beside `deriveTracks` — intent met) |
| 10 | `isRetryable === true` → `provider-down`, before the `4xx → schema-invalid` fallthrough; `NoObjectGeneratedError` still `schema-invalid` first; genuine non-retryable 4xx still `schema-invalid` | `anthropic-adapter.test.ts` "treats an SDK-retryable error as provider-down even when its status is a 4xx" — `expect(isOk(r)).toBe(true)` + `expect(models).toEqual(['claude-sonnet-5','claude-sonnet-5','claude-haiku-4-5'])` (walks the full ladder); the pre-existing 400 and `NoObjectGeneratedError` tests still assert `schema-invalid` | ✅ PASS (⚠️ low: no test pins `NoObjectGeneratedError`-before-`isRetryable` ordering — correct by inspection) |

**10 / 10 met.**

## Discrimination sensor — 3 / 3 KILLED

| # | Mutation (scratch only, reverted) | Killed by |
| --- | --- | --- |
| a | `FacilitatorDock.vue` — revert the `failed` branch to ignore the `answered` guard | `FacilitatorDock.test.ts` "does not add a rephrase hint when a failed contribution was answered with a question" — FAILS |
| b | `anthropic-adapter.ts` — delete `if ((e as {isRetryable?: unknown}).isRetryable === true) return 'provider-down'` | `anthropic-adapter.test.ts` "treats an SDK-retryable error as provider-down even when its status is a 4xx" — FAILS (`models` = `[sonnet, sonnet]`, `isErr`) |
| c | `use-interpretation-poll.ts` — remove the `try/catch` so a rejected refetch skips `schedule()` | `use-interpretation-poll.test.ts` "keeps polling after a store refetch rejects" — FAILS |

## Necessary check (reverse map)

| Assertion | Maps to | Keep? |
| --- | --- | --- |
| `FacilitatorDock.test.ts` "…failed contribution was answered with a question" | AC 1 | ✅ |
| `use-interpretation-poll.test.ts` "keeps polling after a store refetch rejects" | AC 4 | ✅ |
| `anthropic-adapter.test.ts` "treats an SDK-retryable error as provider-down even when its status is a 4xx" | AC 10 | ✅ |

No speculative tests. No existing test weakened or deleted.

## Other checks

- `const refetchNow = tick` — caller-visible behaviour acceptable: `CaptureScreen.vue` `onMutated`
  awaited a `Promise<void>` before and after; refetch errors are now swallowed rather than
  propagated, consistent with the stores already swallowing their own load errors, and it removes
  a latent unhandled-rejection path from the `void tick()` timer.
- All 6 commits atomic and Conventional Commits — **3 `fix(` + 3 `docs(`** (`spec.md` is bundled
  into the first `fix(` commit; minor, harmless).

## Deferred items (per spec Out of Scope) — confirmed not implemented, correctly

`attemptTimeoutMs` value change; extending the half-closed sweep to closed sessions;
`APICallError.isRetryable` was **in scope** (AC 10) after the user chose to add it; the
`accept.ts` AD-016/017 match (verified-match only); the `\bT[0-9]+\b` process-id gate pattern
(PR #47).

## Lessons

- **L (harness, low):** a Verifier worktree can be handed a stale checkout — confirm
  `git rev-parse HEAD` matches the feature-branch tip and `node_modules` exists before trusting
  any gate result. This worktree came up at `8679332` (slice-0) with no deps; reset to
  `slice-1-capture-loop` + `pnpm install` before running the gate.
- **Spec-precision (doc):** `spec.md` Success Criteria said "R2FIX-01 (2 cases)" — only 1 new
  dock case; the AC 2 test pre-existed. Corrected in `spec.md`.
