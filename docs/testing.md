# Testing conventions

## Writing tests

- Tests co-locate with what they cover and run through the public interface, never private
  helpers.
- Domain tests need no DOM — plain Vitest, `environment: 'node'`. If a domain test starts
  needing `jsdom`, the domain layer has grown a dependency it must not have.
- **Assert against an independently-stated expectation, not against another projection.** A
  replay test that only checks `replay(log)` equals an incremental `project` fold is
  self-referential — both sides move together under a regression and the test still passes. Pin
  the projected value to a literal the test spells out.
- **A cross-layer integration test lives in the context that consumes the seam**, not in
  `plumbing/`. Placing it in `plumbing/` forces a back-import that only an architecture-rule
  carve-out allows — relocate the test instead.

## Verifying UI changes

Use `playwright-cli` (installed globally, skill at `.claude/skills/playwright-cli/`) to drive the
running app and read its console — not `curl`, not a screenshot-only tool. `playwright-cli open
<url>` reports console errors/warnings inline; treat a nonzero count as a real finding, not
noise — a console warning is signal here even when the page still renders.

## E2E — capture-loop Playwright spec

`e2e/capture-loop.spec.ts` is the one happy-path spec (ADR-008): create a workshop, accept the
scope card, narrate three contributions, accept each proposed building block, and assert the
three stickies in the board backlog. Run it with `pnpm test:e2e`.

`playwright.config.ts` boots `pnpm dev` with `FACILITATOR_MODE=scripted` and an empty
`ANTHROPIC_API_KEY` so the facilitator reads `e2e/fixtures/facilitator.json` and never reaches
Anthropic. Everything else is the real server, real SQLite, and the real SPA.

CI runs this spec in a sibling `e2e` job (`pnpm test:e2e` after installing Chromium). It is not
part of `pnpm check` or the pre-push hook — those stay browser-free.
