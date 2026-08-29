# ADR-008: Testing, Eval, and Observability

- **Date**: 2026-08-29
- **Status**: Accepted
- **Deciders**: Vinicius Albano
- **Tags**: testing, eval, observability
- **Source**: [#27 (G8)](https://github.com/vinialbano/eventstormer/issues/27), [#28 (G9)](https://github.com/vinialbano/eventstormer/issues/28), [#16 (R7)](https://github.com/vinialbano/eventstormer/issues/16), [#17 (R8)](https://github.com/vinialbano/eventstormer/issues/17)

## Context and Problem Statement

Two testing problems, different in kind: deterministic correctness (the deciders, replay, the
renderers) and non-deterministic behaviour (the facilitator). They need different tools. And the
model calls need to be observable enough to debug and to feed the eval.

## Decision Outcome

### Testing — weight in proportion to module depth

| Layer | Approach |
|---|---|
| Domain deciders (all 5 aggregates) | `Given(events) / When(command) / Then(events \| rejection)` — through the message, not the aggregate internals. **Heaviest weight** — especially the Board: cycle rejection, kind-permission, withdrawn-target, cascades, `insert between` atomicity, resolve-needs-reference |
| Replay | `replay(log) === snapshot` + targeted sequences |
| Pure read models / renderers | `computeTimelineLayout`, connected-components, the session-record projection, the artifact templates (same model in → byte-identical out) |
| Capability handlers | through `http.ts` via Hono `testClient` (chained routes) — wiring + status codes + the apply round trip only |
| Choreography | the close sweep raises N hot spots; apply-failed-at-close raises one |
| Facilitator (unit) | schema conformance on recorded/mocked responses; the retry ladder + interpret-at-most-once against a fake provider port. **Behaviour is the eval's job, not the unit suite's** |
| App (Vue) | jsdom; component tests only where there is real logic |
| E2E | `@playwright/test`, **one happy-path spec**, added with the first full flow — not before. `playwright-cli` is the manual/agent UI-verification tool |

- **Property tests: add `fast-check`** — four properties: no operation sequence yields a
  decider-accepted cycle; no operation targeting a kind that doesn't permit it is accepted;
  incremental-replay consistency (`replay(log ++ [op]) === evolve(replay(log), op)`); JSON export
  round-trips.
- **Traceability is inline** — each acceptance test / PRD criterion is a named test case with a
  comment tag (`// AT-14`, `// PRD F01 insert-between atomic`). No separate matrix file.
- **Coverage:** v8, `thresholds.autoUpdate: true` ratchet, no global number. Once the domain
  deciders exist, a glob threshold pins `**/domain/**` to ≥ 90%.

### Eval — plain Vitest + a hand-rolled reporter

A third `test.projects` entry (`name: 'eval'`, node env), run as `pnpm eval`, **out of CI**.
promptfoo / evalite / the AI SDK's own helpers all have the wrong shape for per-assertion,
N-runs-passed reporting — you write the bespoke reducer regardless.

- **Demo domain: restaurant / kitchen orders** — also the golden fixture and the `pnpm seed`
  session. Chosen for: fast to narrate cold, natural branches (86'd item, sent back), hot spots
  (ticket times, expo bottleneck), a real phase ("service"), a near-miss ("server fired the order
  to the kitchen").
- ~8 fixture cases: one per F11 assertion (correct kind · past tense on facilitator-supplied
  names · phase flagged · near-miss *not* flagged · deeper-format named · awkward phrasing kept)
  plus two integration cases. **Disjoint from the ADR-005 few-shot examples.**
- **N = 5** runs per case (~40 calls per full run). Per-assertion result is `k/5`.
- **No headline aggregate** — a Markdown table, one row per case × assertion, `Passed` always
  `k/N`, flaky assertions get their run-level spread named. Spliced into the README between
  `<!-- eval:results -->` markers by `pnpm eval --report`.
- Cost: no hard cap. ~$1.20 per full run; `--replay` mode makes reducer iteration free; expect
  < $20 total across the project.

### Observability — a wrapper first, OTel second

- A thin wrapper logs every model call's request + response + `result.warnings` + Zod parse
  result to JSONL (gitignored `eval-runs/`). This is the higher-value artifact — it feeds eval
  fixtures and debugs the retry queue.
- `@ai-sdk/otel` + a console exporter as a complementary layer for token/cost accounting and call
  nesting (telemetry is on by default once `registerTelemetry` runs). Needs
  `@opentelemetry/api` + `@opentelemetry/sdk-trace-node` wired too — "one package" is optimistic.
- Cost is `tokens × an owned price table` — the SDK computes none. No `gen_ai.*` attribute names
  hard-coded anywhere durable (the GenAI semantic conventions are still in flux).

### Deliberately untested (stated in the README)

Facilitator judgment quality (eval only, and non-deterministic — reported `k/N`); real Anthropic
HTTP calls (mocked in unit tests); graph-layout visuals (`playwright-cli` manual);
concurrency beyond the one-open-session constraint (F14); voice (F17); performance / load.

## Links

- [ADR-005](005-ai-facilitator.md) — the facilitator the eval measures
- [ADR-003](003-hand-rolled-event-sourcing-and-result-types.md) — the deciders the unit suite covers
