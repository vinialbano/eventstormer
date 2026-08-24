# Testing conventions

## Writing tests

- Tests co-locate with what they cover and run through the public interface, never private
  helpers.
- Domain tests need no DOM — plain Vitest, `environment: 'node'`. If a domain test starts
  needing `jsdom`, the domain layer has grown a dependency it must not have.

## Verifying UI changes

Use `playwright-cli` (installed globally, skill at `.claude/skills/playwright-cli/`) to drive the
running app and read its console — not `curl`, not a screenshot-only tool. `playwright-cli open
<url>` reports console errors/warnings inline; treat a nonzero count as a real finding, not noise
(it caught a missing favicon on the first run of this app).

## E2E — decided, not yet built

`@playwright/test` when there is a real UI feature to test end to end. Not added as a dependency
yet: the only UI today is the health-check stub, and an e2e suite with nothing meaningful to
assert would be dead weight knip can't even flag (test files are exempt from unused-export
checks). Add it in the same sitting as the first real user-facing flow, not before.
