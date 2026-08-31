# eventstormer

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
