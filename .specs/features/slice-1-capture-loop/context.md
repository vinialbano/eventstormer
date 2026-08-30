# Slice 1 — The Capture Loop · Context

**Gathered:** 2026-08-30
**Spec:** `.specs/features/slice-1-capture-loop/spec.md`
**Status:** Design complete (revised after plan review) — ready for tasks

> Design-phase resolutions: transport = short-poll (AD-018); bus = deferred to Slice 4 (AD-019);
> Hold = `Proposal Held`/`Unheld` events (AD-020); accept handler = Slice 1 (AD-017);
> interpretation crash-consistency = commit-point + bounded reconcile + `derived_track` (AD-021);
> `applyOperation` owns concurrency, no `expectedPosition` (AD-022); no derived state in events —
> `sessionSummary` is a read-time projection (AD-023); 7 per-action capabilities (AD-024);
> scope = first facilitator dock turn (no separate screen); session enumeration = `session_index`;
> `answer-question` guard = `Session.decide`; `nextMove` → `Question Asked{free}`; failed
> interpretation = distinct event; `WorkshopId` → canonical `plumbing/ids.ts`; few-shot = library
> lending. Two review rounds (round 2 = 4 subagents). See `design.md`.

---

## Feature Boundary

The capture loop end to end, backlog only: create a Big Picture workshop → answer the
facilitator's scope question → type contributions one at a time → the server-side facilitator
returns schema-constrained proposed operations plus any question or out-of-format notice → the
person accepts / edits / rejects each → an accept runs the synchronous apply chain into the
Slice 0 `Board` and the building block appears in the backlog. No timeline, no relations
rendering. Events / actors / systems only.

---

## Implementation Decisions

### Identity (v1, no auth)

- The creator types a **display name** when creating the workshop.
- That name is: the segment `speaker`; the `Proposal` `accepter`; the human half of an applied
  operation's `author` (`{ proposer: facilitator, accepter: <display name> }`, per AD-012).
- No login, no user records. A real identity model is F14.

### Contribution → interpretation is always async

- `POST /sessions/:id/contributions` returns `202` + the contribution id. It never carries
  facilitator output.
- Interpretation always runs in a background worker — the provider-down path is no longer a
  special case, it is the same path with retries.
- **Supersedes ADR-005's "its message rides back on the `start-session` and `contributions`
  responses"** — record an AD in `.specs/STATE.md`.

### Client transport for facilitator output → DESIGN PHASE

- Weigh **polling a cold-loadable GET** vs **Hono SSE** (Hono has SSE helpers; DECISIONS-PENDING
  §3). The user explicitly asked that both be considered in design.
- Fixed now regardless of transport: **server-confirmed only, no optimistic client state.**
- Ties into `open-questions.md` #66 — the physical decomposition of `Facilitation context` /
  the facilitator-message read model.

### Cross-session facilitator memory → BUILD NOW

- `Close Session` freezes this session's facilitation summary into `Prior-session history`, in
  the **same transaction** as the unresolved-question snapshot.
- A later session's `Facilitation context` reads those frozen summaries.
- Matches canvas pass 3.

### `Close Session` this slice → full mechanic minus hot-spot raising

- Stop accepting contributions.
- `PROPOSED` / `EDITED` → `LAPSED` (quiet).
- `APPLY_FAILED` → `LAPSED` — **no hot spot** (Slice 4 adds only the `Raise Hot Spot` fan-out).
- `ACCEPTED` in-flight → allowed to finish.
- Free the one-open-session slot.
- Compute + persist the unresolved-question snapshot — **nothing consumes it this slice.**
- Freeze the facilitation summary (see above).

### `Workshop.scope` revision window → revisable until first building block

- Repeated `Set Scope` is legal while the model graph has **zero** building blocks.
- The first applied building block **locks** `scope`; any later `Set Scope` is rejected, `scope`
  unchanged.
- **Diverges from the canvas** ("set exactly once"). Follow issue #38's AC; flag the divergence
  in `docs/domain/open-questions.md` #63.

### The in-process event bus (AD-002) → DESIGN PHASE

- AD-002 deferred it Slice 0 → Slice 1, but with always-async interpretation the
  `Contribution Made → Interpret Contribution` choreography is a **worker scanning un-interpreted
  persisted contributions** (a projection) and needs no bus.
- First genuine fire-and-forget consumer (`Raise Hot Spot`) is Slice 4.
- **Candidate: defer the bus to Slice 4**, record an AD superseding AD-002. Decide in design
  against the quality bar (no speculative abstraction; `knip` flags unused exports).

### Capture-screen UX/UI → SETTLED, do not re-derive

- Consume `.impeccable/surfaces/src-app-capture-loop.md` + comps in `.impeccable/mocks/iface/`
  (`final-expanded`, `final-collapsed`, `reword-1-select`, `reword-2-editing`).
- Any visual refinement / new surface → the vendored `impeccable` skill (`.claude/skills/impeccable/`).
  Never hand-design `src/app/`.
- **Board-first layout:** full-screen EventStorming wall as the field; a facilitator dock floating
  bottom-left that collapses to a `Facilitator · n` pill; an in-dock pending drawer that slides
  right and collapses to a `Pending ● n` handle. Not a chat app with the model in a drawer; not a
  Miro-style infinite-canvas editor.
- **Hold** is a 4th proposal action (accept / edit / reject / hold). Held → non-terminal, grouped
  `Parked by you` in the drawer. `Accept all` per cluster, `Accept all remaining` in the drawer,
  no reject-all.
- **Slice-1 reality:** backlog-only. Accepted events land unplaced in the top-left backlog area.
  The timeline + sequence arrows + pivotal bars in the comps are the **slice-3** target — the
  layout must not preclude them, but drag-to-place and arrows are not built here.
- **Pending proposals are cards, never ghost/dashed stickies on the board** (explicit anti-goal).
  The dashed-ghost treatment is edit-only (reword, F06 — Slice 2).
- Brief §4 **excludes** the scope-setting screen and session close — those surfaces are a
  design-phase call (run `impeccable`, or a minimal Reka-UI form in the locked visual world).

### Agent's Discretion

- The deferred-interpretation retry **interval** and the schema-failure retry mechanics (bounded
  interval, no attempt cap for provider-down; one retry then terminal for schema-fail).
- Contribution / scope-statement length bound (default 10 000 chars).
- The few-shot example domain in the system prompt — any domain disjoint from the eval fixture
  (restaurant / kitchen orders); candidate: online-retail fulfilment or library lending.
- SPA visual design (Reka UI + Tailwind per ADR-007); the backlog list and proposal-card layout.
- The `Facilitation context` / `Facilitation agenda` internal decomposition (#66).

### Declined / Undiscussed Gray Areas → Assumptions

All carried into the spec's Assumptions & Open Questions table. Nothing declined outright.

---

## Specific References

- ADR-005 (facilitator), ADR-002 (context integration), ADR-010 (slice 1 row), AD-015 (the
  hand-shaped projection schema forced by two Anthropic limits), AD-016 (per-context transaction
  rule), AD-012 (`at` from Clock, `author` on the operation).
- `docs/domain/bounded-contexts/session-facilitation/canvas.md` — the four aggregates, the
  disposition state machines, the policies, the read models.
- `docs/ai-harness-gotchas.md` — `instructions` not `system`, `outputFormat` pin, no temperature,
  mirror Zod constraints into `.describe()`, log `result.warnings`.

---

## Deferred Ideas

- `OperationId` correlation for crash-window reconciliation → Slice 2 (AD-011 / AD-016).
- `claude-opus-5` escalation → only after a fixture bake-off shows Sonnet missing the bar.
- The snapshot-format bake-off spike (op-log vs text vs JSON) → ~1h at the head of this slice
  (ADR-010 "parallel work"); informs the prompt's board serialisation but does not block the
  slice.
