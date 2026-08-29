# ADR-005: The AI Facilitator — Model, Structured Output, Prompt, Behaviour, Resilience

- **Date**: 2026-08-29
- **Status**: Accepted
- **Deciders**: Vinicius Albano
- **Tags**: ai, harness, facilitator, prompt, resilience
- **Source**: [#12 (R3)](https://github.com/vinialbano/eventstormer/issues/12), [#13 (R4)](https://github.com/vinialbano/eventstormer/issues/13), [#14 (R5)](https://github.com/vinialbano/eventstormer/issues/14), [#22 (G3)](https://github.com/vinialbano/eventstormer/issues/22), [#23 (G4)](https://github.com/vinialbano/eventstormer/issues/23), [#24 (G5)](https://github.com/vinialbano/eventstormer/issues/24)

## Context and Problem Statement

The facilitator is the heart of the product. It turns a domain expert's plain-language
contribution into properly-formed operations, constrained to the schema, while holding an
asymmetric quality bar —
lenient on the human's phrasing, strict on names it supplies itself. It must survive a provider
outage and a malformed response, and its cost must be controlled.

## Decision Outcome

### Model

**Primary `claude-sonnet-5`; `claude-opus-5` as escalation if a fixture bake-off shows Sonnet
missing the bar; `claude-haiku-4-5` as the degraded fallback** (pure extraction — no `effort`
knob). Model ids take no date suffix. `temperature` is silently stripped on Opus 5 / Sonnet 5 —
use `output_config.effort`. The `FACILITATOR_MODEL` default changes from `claude-opus-5` (ADR-001
era) to `claude-sonnet-5`; the README env table is updated to match. Rough cost ~$0.55/session.
(R4 also found the Sonnet 5 $2/$10 rate is now permanent — no pricing cliff.)

### Structured output

`generateText` + `Output.object({ interpretation: <discriminated-union array>, nextMove })`,
with `providerOptions.anthropic.structuredOutputMode: 'outputFormat'` pinned. The `outputFormat`
path is the only one that runs the `oneOf` → `anyOf` sanitiser; the `jsonTool` fallback 400s on a
discriminated union. Pinning protects against a model downgrade (`'auto'` already resolves right
on Opus/Sonnet 5). `generateObject` is deprecated — not used. Zod constraints are stripped from
what the model sees and mirrored into `.describe()` (partly automatic). `result.warnings` is
logged on every call. **There is no built-in repair for `Output`** — see resilience.

### Prompt

- `system` message (cache breakpoint 1): role · the asymmetric bar · the Big Picture legend as
  the only board vocabulary + one-liners on Process Modelling / Design-Level · the phase-name
  rule · the interview-loop move menu · output-contract prose · **~5–6 hand-written few-shot
  examples, disjoint from the eval fixtures** (sharing them would test memorisation).
- Then: an immutable session block (`Workshop.scope`, format, frozen prior-session summaries);
  the **operation log serialised in log order** (cache breakpoint 2 — the paying one; a
  re-rendered snapshot mutates every turn and never caches); then the volatile `Facilitation
  context` + `Facilitation agenda` + the new segment, uncached, after the last breakpoint.
- Cache hits are verified via `result.usage.inputTokenDetails.cacheReadTokens`. The op-log render
  is deterministically checkpointed as it grows.

### One call per expert turn

The turn merges interpretation and the facilitator's next move: input is the new segment, output
is `{ interpretation, nextMove }`. A standalone `Ask Question` call happens only at session start
(no contribution yet) and for an idle expert re-prompting. **The facilitator has no HTTP
endpoint** — it is server-side and reactive; its message rides back on the `start-session` and
`contributions` responses.

### The behaviour bar

- Per building-block proposal the model emits `bar: 'lenient' | 'strict'` and, when `lenient`, an
  `evidenceSpan` (the verbatim substring the label came from). The UI shows "your words" vs
  "facilitator's wording".
- **The eval verifies kept-phrasing independently, not from the self-report:** normalise (lower,
  strip punctuation, ~30-word stoplist, Porter-stem); the label passes iff every content word
  stem-matches a segment token, allowing at most one miss. A self-report that disagrees with the
  independent check is itself a failure.
- Deeper-format detection is an LLM judgment naming the format; no building block is proposed for
  that content.
- An aggregated phase name emits a `Question Asked`, not a proposal.
- Facilitator reword-of-existing-block proposals are suppressed until the projection has ≥ 1
  `follows` edge (organizing has begun). Human direct rewords are always allowed.
- Proposal cap: **7** surfaced at once per contribution; overflow held `PROPOSED`-pending, not
  dropped.

### Control flow

`Ask Question` picks its move by **LLM judgment between deterministic bookends**: the session's
first facilitator output is forced to be the scope question; the stakeholder check + chosen-problem
prompt are forced at close. Everything between is the model's call, reading `Facilitation
context` + `Facilitation agenda` (the agenda guarantees nothing is lost). Scope is `Workshop`
state via `Set Scope`, not a Domain Model Capture operation (resolves the PRD F04 / open-question
#63 divergence in favour of the domain model). Question↔answer correlation is the model's
question-track judgment naming resolved question ids — "something was said" ≠ "the question is
answered". Unresolved questions are swept into hot spots by a fire-and-forget policy on
`Session Closed`.

### Resilience — two distinct failure classes

- **Provider unavailable:** `Contribution Made` always succeeds. Interpretation tries primary →
  ~2× backoff → fallback once → then leaves the contribution un-interpreted and retries the whole
  ladder on a bounded schedule. Idempotency keyed on contribution id — interpreted **at most
  once**. The expert keeps editing by hand meanwhile.
- **Schema failure:** one bounded retry with the error text fed back; then the contribution is
  marked `interpretation-failed`, "didn't catch that" is shown inline, **no hot spot**, and it
  counts as interpreted (no infinite retry). The expert resubmits as a new contribution.
- **Concurrency:** one interpretation in flight per session, FIFO queue for the rest.

## Consequences

- **Positive:** the asymmetric bar is measurable, not hoped-for; caching is on the stable prefix,
  not the mutating one; one round trip per turn; the two failure classes are handled distinctly.
- **Negative:** the merged `Output.object` call must be re-verified against the `oneOf`→`anyOf`
  sanitiser (the R3 spike now tests the object wrapper, not a bare array).
- **Open, handed to prototyping:** the physical shape of `Facilitation context` (#66), and the
  snapshot-format bake-off (op-log vs text vs JSON, R5).

## Links

- [ADR-004](004-operation-log-schema-and-versioning.md) — the schema the output is constrained to
- [ADR-008](008-testing-eval-and-observability.md) — the eval that measures this
