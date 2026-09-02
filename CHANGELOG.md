# eventstormer

## 0.3.0

### Minor Changes

- [#59](https://github.com/vinialbano/eventstormer/pull/59) [`c2a35cb`](https://github.com/vinialbano/eventstormer/commit/c2a35cb37d8f7e343f97c4ceaceb3f4cd2f213f6) Thanks [@vinialbano](https://github.com/vinialbano)! - Reword a committed sticky against the live reference list, withdraw and
  reinstate it, and watch the readable account update on the capture screen.

### Patch Changes

- [#57](https://github.com/vinialbano/eventstormer/pull/57) [`4894a09`](https://github.com/vinialbano/eventstormer/commit/4894a09ea95800f45a378588ad708265d7c601fc) Thanks [@vinialbano](https://github.com/vinialbano)! - Gate `sonarjs/cognitive-complexity` at 15 (not the recommended preset) and split
  the Session/Proposal deciders and `deriveTracks` into per-command helpers so
  exhaustive union folds stay legal without a domain carve-out.

- [#47](https://github.com/vinialbano/eventstormer/pull/47) [`a2d60fd`](https://github.com/vinialbano/eventstormer/commit/a2d60fd65ed80eeb4e8f4ca51aceeacc19f05abc) Thanks [@vinialbano](https://github.com/vinialbano)! - Drop a `.specs/` process-id tag from a source comment so the new process-id gate
  is green, and retarget facilitator comments at `docs/agents/ai-harness-gotchas.md`.

- [#56](https://github.com/vinialbano/eventstormer/pull/56) [`40a0ed4`](https://github.com/vinialbano/eventstormer/commit/40a0ed48108ffac3fc1e544348ad828b9341c43f) Thanks [@vinialbano](https://github.com/vinialbano)! - Enable eight unopinionated unicorn ESLint sensors (bare `eslint-disable`, missing
  `node:` protocol, `throw` without `new`, empty `Error`, `forEach`, `reverse().find`,
  mutating `sort`, `await` inside `Promise.all`) without adopting `unicorn/recommended`.

## 0.2.0

### Minor Changes

- [#46](https://github.com/vinialbano/eventstormer/pull/46) [`d7076b9`](https://github.com/vinialbano/eventstormer/commit/d7076b9017ba554662a07e919f475eecd7e22943) Thanks [@vinialbano](https://github.com/vinialbano)! - Slice 1 — the capture loop. Adds the `session-facilitation` bounded context
  (Workshop / Session / Proposal aggregates, seven per-action capabilities), the
  reactive AI facilitator (scripted double behind `FACILITATOR_MODE`, model-call
  JSONL log + owned price table), the interpretation scheduler in `host/`, and the
  Vue capture screen — a board wall with a floating facilitator dock. A person can
  now create a workshop, set its scope through the F05 accept/edit/reject card,
  narrate contributions, and accept the proposed building blocks onto a
  backlog-only board via the synchronous accept→apply chain. No timeline yet.
  (F18, F03, F04, F05)

### Patch Changes

- [#51](https://github.com/vinialbano/eventstormer/pull/51) [`168e858`](https://github.com/vinialbano/eventstormer/commit/168e8583c5c029ab5945ca8fac0dc9fa642bf31e) Thanks [@vinialbano](https://github.com/vinialbano)! - Harden the deterministic suite and ship a minimal F11 eval. Capture-loop Playwright is a CI
  merge gate; replay/persistence oracles pin independent literals; shipped Session/Proposal
  `decide` branches get Given/When/Then tests. `pnpm eval` runs four restaurant cases out of CI
  (N=5, k/N). Pre-push matches `pnpm check`.
