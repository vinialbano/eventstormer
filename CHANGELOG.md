# eventstormer

## 0.4.0

### Minor Changes

- [#60](https://github.com/vinialbano/eventstormer/pull/60) [`fe39406`](https://github.com/vinialbano/eventstormer/commit/fe3940691c90ae34ebe1c45dc397ae89cd1dff8c) Thanks [@vinialbano](https://github.com/vinialbano)! - Place and sequence events on the EventStorming timeline, attach who or what
  caused them, hide withdrawn stickies by default, and read the account in
  follows order.

### Patch Changes

- [#74](https://github.com/vinialbano/eventstormer/pull/74) [`975792a`](https://github.com/vinialbano/eventstormer/commit/975792a2b3a01487a74efe144d8ae1ca45a77ff3) Thanks [@vinialbano](https://github.com/vinialbano)! - Establish the board deep-module public API and enforce frontend architecture rules via dependency-cruiser.

- [#70](https://github.com/vinialbano/eventstormer/pull/70) [`c9d36dc`](https://github.com/vinialbano/eventstormer/commit/c9d36dc77e69c936e96bd7440d6df84d04f533f1) Thanks [@vinialbano](https://github.com/vinialbano)! - Extract board interaction composables from BoardWall (#63) — selection, mutations, reword draft, and fresh-sticky animation.

- [#72](https://github.com/vinialbano/eventstormer/pull/72) [`d44f718`](https://github.com/vinialbano/eventstormer/commit/d44f718e392d5314458bcd1d5be6abc2d6e2f513) Thanks [@vinialbano](https://github.com/vinialbano)! - Split BoardWall and TimelinePane presentation into focused components with shared sticky chrome.

- [#75](https://github.com/vinialbano/eventstormer/pull/75) [`2eb65aa`](https://github.com/vinialbano/eventstormer/commit/2eb65aa7160fa7981a48fa33d95d7de5286577f7) Thanks [@vinialbano](https://github.com/vinialbano)! - Remove the capture-loop transport shim and document folder boundaries for agents.

- [#87](https://github.com/vinialbano/eventstormer/pull/87) [`6cbb8bf`](https://github.com/vinialbano/eventstormer/commit/6cbb8bfe3ef5616b9d2e5f3eb0b67d0342f44937) Thanks [@vinialbano](https://github.com/vinialbano)! - Migrate capture-loop to ADR-012 zone topology: shell orchestration, board interaction split, zone AGENTS.md, and composable colocation.

- [#69](https://github.com/vinialbano/eventstormer/pull/69) [`c22723e`](https://github.com/vinialbano/eventstormer/commit/c22723ef976cdf7a818348ac65b74d9d76732696) Thanks [@vinialbano](https://github.com/vinialbano)! - Capture-loop transport seam: group POST adapters under `transport/`, decouple dock from board store, consolidate reword portal ownership, move withdrawn toggle to view-state.

- [#71](https://github.com/vinialbano/eventstormer/pull/71) [`5584a5e`](https://github.com/vinialbano/eventstormer/commit/5584a5e3f35c3aad1654e98961128ccdfefa45eb) Thanks [@vinialbano](https://github.com/vinialbano)! - Extract facilitator dock feed assembly, proposal review, and contribution capture into dedicated composables and interaction modules. Behaviour unchanged.

- [#73](https://github.com/vinialbano/eventstormer/pull/73) [`1171596`](https://github.com/vinialbano/eventstormer/commit/1171596d802571004de9e8c4d49af687e34c90da) Thanks [@vinialbano](https://github.com/vinialbano)! - Extract the board reword two-step flow into a dedicated interaction module with a framework-free reference adapter and confirm state machine.

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
