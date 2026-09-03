# Testing conventions

## Writing tests

- Tests co-locate with what they cover and run through the public interface, never private
  helpers.
- Sociable tests that cross framework-free `shell/orchestration/` and Pinia use the
  `.integration.test.ts` suffix under `shell/composables/`, next to the Vue adapter they
  exercise.
- Domain tests need no DOM — plain Vitest, `environment: 'node'`. If a domain test starts
  needing `jsdom`, the domain layer has grown a dependency it must not have.
- **Assert against an independently-stated expectation, not against another projection.** A
  replay test that only checks `replay(log)` equals an incremental `project` fold is
  self-referential — both sides move together under a regression and the test still passes. Pin
  the projected value to a literal the test spells out.
- **A cross-layer integration test lives in the context that consumes the seam**, not in
  `plumbing/`. Placing it in `plumbing/` forces a back-import that only an architecture-rule
  carve-out allows — relocate the test instead.

## Mutation / discrimination-sensor verification

Sensor checks mutate real source files, run the suite to confirm a test catches the mutation,
then revert. Run them in a **separate git worktree**, never the shared checkout — dispatch the
verifier sub-agent with `isolation: "worktree"`. The `Stop` gate runs `pnpm check` against the
live tree; a mutation in flight there reads as a red gate on a codebase that is actually green,
and the main agent has no reliable way to tell the two apart.

### Capture-loop sensors (M1–M7)

| Mutant | Fault | Sensor suite |
| ------ | ----- | ------------ |
| M1 | Swap `mutated` targets to `['board','account']` in `refetch-graph.ts` | `refetch-graph.test.ts` |
| M2 | No-op `board` branch in `apply-capture-effect.ts` | `apply-capture-effect.test.ts` |
| M3 | `shouldLoadBoardOnBootstrap` always true | `capture-bootstrap.test.ts` |
| M4 | Call `onBoardDirty()` on cycle 422 in `use-relate-blocks.ts` | `use-relate-blocks.test.ts`, `BoardWall.drop.test.ts` |
| M4′ | Skip `onBoardDirty()` on successful relation POST | `BoardWall.test.ts`, `BoardWall.drop.test.ts` (success paths) |
| M5 | Poll `board` instead of `proposals` in interpretation poll | `use-interpretation-poll.test.ts` |
| M6 | Wire `onMutated` → `onBoardDirty` in orchestration adapter | `use-capture-orchestration.integration.test.ts` |
| M7 | Skip `boardDirty()` after a successful direct flag POST in `use-flag-hot-spot.ts` | `use-flag-hot-spot.test.ts`, `use-flag-hot-spot.integration.test.ts` |
| M8 | Move the `closeSession` call from `confirm` into `submitProblem` in `use-close-ceremony.ts` (freeze the session before the final press) | `use-close-ceremony.test.ts`, `use-close-ceremony.integration.test.ts` |

## Coverage

`vite.config.ts` sets `coverage.thresholds`. Locally, `autoUpdate` ratchets the numbers upward on
every `pnpm test:coverage` — a downward diff is never accidental. The one hard floor is
`src/**/domain/** ≥ 90%` (ADR-008), enforced by the CI `coverage` step (inside `check`) with `autoUpdate` off so CI
measures against the committed numbers. Coverage is not in `pnpm check` — it stays out of the
per-edit and per-stop path for speed, same as `build`.

## Verifying UI changes

Use `playwright-cli` (installed globally, skill at `.claude/skills/playwright-cli/`) to drive the
running app and read its console — not `curl`, not a screenshot-only tool. `playwright-cli open
<url>` reports console errors/warnings inline; treat a nonzero count as a real finding, not
noise — a console warning is signal here even when the page still renders.

## E2E — capture-loop Playwright specs

Two specs under `e2e/`, both run by `pnpm test:e2e`. Playwright gives each spec its own
`pnpm dev` process (separate ports and SQLite files) so the in-process scripted facilitator
turn index cannot leak between them.

| Spec | What it guards |
| --- | --- |
| `capture-loop.spec.ts` | Core smoke (ADR-008), **four serial macro stages**: (1) workshop setup — create workshop, start session, accept scope; (2) board mutations — narrate three contributions and accept each onto the backlog; (3) timeline — place and sequence two events; (4) hot spots and close — flag two hot spots, accept a facilitator-proposed resolution for one, then run the in-dock close ceremony (stakeholder answer + problem pick) to a CLOSED session whose callouts and count survive a reload. Reword, withdraw, and the readable-account walk stay in unit tests. |
| `capture-loop-no-optimism.spec.ts` | ADR-007 macro: `page.route()` holds the board GET after accept; the proposal receipt may appear while the backlog must stay empty until the refetch completes. |

`playwright.config.ts` boots each project on its own port with `FACILITATOR_MODE=scripted` and an
empty `ANTHROPIC_API_KEY` so the facilitator reads `e2e/fixtures/facilitator.json` and never
reaches Anthropic. Everything else is the real server, real SQLite, and the real SPA. Serial
stages in `capture-loop.spec.ts` name the failing phase; the no-optimism spec is standalone.

CI runs both in a sibling `e2e` job (`pnpm test:e2e` after installing Chromium). E2E is not
part of `pnpm check` or the pre-push hook — those stay browser-free.
