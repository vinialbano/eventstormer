# Slice 2 — The Money Shot Specification

GitHub issue: [#39](https://github.com/vinialbano/eventstormer/issues/39) ·
Blocked by #38 (Slice 1, merged) · Blocks #40 (Slice 3) ·
Parent effort map #9 · Version target **0.3.0** (`minor` changeset)

## Problem Statement

Slice 1 lets a domain expert grow a typed model through the facilitator, but the model is
still write-once from their point of view: they cannot fix wording, they cannot withdraw a
mistake, and there is no derived artifact that *moves when the model moves*. The product's
central claim — one model, no drifting second document — is therefore still an assertion.
This slice is the cut line: reword or withdraw a building block, see every rendered
reference update, and watch a deterministic readable account re-render in the same
interaction, with quoted evidence provably untouched.

## Goals

- [ ] A person rewords a committed building block through a two-step confirm that lists every
      rendered-reference site; after commit, those sites carry the new label and the building
      block retains its id.
- [ ] Quoted evidence (verbatim contributions and stored `evidenceSpan`s) is byte-identical
      before and after that rewording, and is visually distinct from rendered references.
- [ ] A person withdraws a building block (id preserved, ghosted on the wall) and reinstates it
      naked; empty-label reword is rejected inline.
- [ ] The in-app readable account is a template over the snapshot (no language model),
      byte-identical for the same model, and re-renders on every applied operation — accept
      *or* direct edit — with no manual refresh.

## Out of Scope

| Feature | Reason |
| --- | --- |
| `sequence` / `unsequence` / `insert between` / `place` / `unplace` / `link cause` / `unlink cause` / `mark pivotal` | Slice 3 (#40). F06 is split (ADR-010). |
| `follows` / `causedBy` adjacency on the write model; withdraw → `unlink-cause` cascade | Slice 3. Vacuous this slice — no such edges exist. Contract pinned on #40. |
| `annotate` / `raise-hot-spot` / `resolve` / `reopen`; withdraw → hot-spot cascade | Slice 4 (#41). Vacuous this slice. Contract pinned on #41. |
| JSON export, model summary, session-transcript export, `pnpm seed`, eval suite | Slice 5 (#42). The live account's **render function** is reused there, not rewritten. |
| Vue Flow / dagre timeline, drag-to-place, hide-withdrawn-by-default toggle | Slice 3. This slice keeps Slice 1's backlog wall and *adds* ghosted withdrawn stickies. |
| `OperationId` on the frozen v:1 union; accept-chain crash-window reconciliation | Not earned. Slice 1 already closes accept-retry via stored `buildingBlockId` + `duplicate-id`. F06 is one Board append. **AD-030** supersedes AD-017's leftover "reconciliation stays Slice 2" clause and AD-011's Slice-2 candidate. AD-011 otherwise stands. |
| Invitations, multiplayer, SSE, optimistic client updates | F14 / ADR-007. Server-confirmed refetch only. |
| A language model on any projection path | Product thesis. `derived-artifact-generation` is Supporting, template-only. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Withdraw cascades this slice | **Vacuous.** `decide(withdraw)` emits `[withdraw]` only. Write model stays `{ kind, withdrawn }`. Cascades + adjacency land in #40 / #41 as batch-atomic follow-ons from the same `decide` (AD-006). | User decision 2026-08-31. Recorded as AD-028. Comments on #40, #41, #42. | **y** |
| Rename-cascade UI | **Two-step** (ADR-007): dashed-ghost inline editor (capture-loop brief) → **✓ / Enter opens a confirmation popover** listing `GET …/board/blocks/:blockId/references` → confirm commits. Esc / ✕ / popover cancel restore the previous label. Never a silent commit. Brief's "Enter saves" is superseded for committed stickies; it still cancels-vs-confirms *inside* the ghost, and Enter on the popover confirms. | ADR-007 + F06 "shows where that building block is referenced" *before* commit. `impeccable` shape during Design extends the capture-loop brief — does not invent a new page. | **y** (ADR-007; UX detail to shape) |
| Reference-list contents this slice | Sites in the **live readable account** that resolve this building block's id (rendered references). Relation and annotation sites are empty until #40 / #41 extend the same query. The **wall sticky** is the source (not a popover row). The account's building-blocks line **is** a rendered-reference site and **is** listed — this slice the confirm popover has ≥1 row whenever the block is in the snapshot. | Ticket: "relations, annotations, the readable account". Only the account can name an id today. An empty popover would make the two-step confirm theater and fail the "same set before/after" AC. | **y** |
| Readable-account placement | **Toggleable drawer** on the capture screen (ADR-007), not a new route. Fourth Pinia store, cold-loadable from `GET /workshops/:id/readable-account`. Refetched on the same `board-dirty` signal as the board store (accept *and* direct edit). `markdown-it` + `DOMPurify`. | ADR-007 three-zone layout; earn-it: a different GET and lifetime from `board`. `no-cross-store-imports` stays. | **y** (ADR-007) |
| Readable-account template this slice | Full walk of **current** building blocks (backlog order = capture/log order; no `follows` order yet). Coverage disclosure states format, narrator count, scope, and **honest "not run"** for stakeholder check, chosen problem, and later format steps. Quoted evidence: `Contribution Made.body` plus stored `evidenceSpan` on propose-tracks (there is no Proposal `rationale` field), marked as quotes. No LLM. Empty model → empty-state copy, still deterministic. | F10 + canvas; later slices fill slots rather than forking the template (#42 comment). | **y** |
| Withdrawn visibility this slice | **Ghosted graphite, struck through, still on the wall** (brief §5). Reinstate from that sticky. Slice 3's "hidden by default + reveal" is an additive view filter (#40 comment). | Brief vs #40 AC; persistence unchanged. | **y** |
| Reword / withdraw of a withdrawn block | **Rejected** (systemic). Reinstate first. Re-withdraw of an already-withdrawn target is also rejected. | Canvas ACTIVE → WITHDRAWN; the ghost is not the dashed edit state. | **y** (assumption; user: proceed) |
| Direct-edit author | `{ accepter: { name: creatorName } }` only — no `proposer` (existing `Author` schema / F06). | Slice 0 schema. | **y** |
| `applyOperation` for target-bearing ops | Returns `{ resultingBuildingBlockId: operation.target, nextPosition }` for `reword` / `withdraw` / `reinstate`. Must **not** throw on missing `id`. Still the sole Board writer (AD-022); `edit-model` calls it, never `store.append` directly. | Today's helper throws `produced no building block id` on every F06 kind — it only knows capture `id`. | **y** |
| `POST /workshops/:id/board/operations` | Body is the frozen operation union. This slice **accepts only** `reword` / `withdraw` / `reinstate`; every other kind → 422 with the existing `not-implemented-in-slice` rejection. Unknown workshop → 404. Empty label / unknown / withdrawn target → 422, previous snapshot unchanged. | ARCHITECTURE.md §4. | **y** |
| Live coupling | After a successful direct edit **or** a Slice-1 accept, the client refetches **board + readable account**. If a confirm popover is still open when another operation lands, refetch references or cancel — do **not** commit against a stale list (single-user realistic case: accept in another tab, or accept while editing). After commit the popover is already closed. No debounce, no "catching up" indicator this slice (PRD F10 / ADR-004: folding the log is cheap enough). | F10 "within the same interaction"; ticket AC. | **y** |
| `OperationId` / accept crash window | **Out of this slice.** Stored `buildingBlockId` + `duplicate-id` already reconciles accept-retry (Slice 1 design). F06 is a single Board append. **AD-030** supersedes the leftover "stays Slice 2" clause of AD-017 and the AD-011 Slice-2 candidate. | Earn-it; AD-011 otherwise stands. | **y** (AD-030) |
| Auth / rate limits | **N/A** — single-user, local. | ADR-011. | — |
| Data lifecycle / expiry | **N/A** — append-only log; withdraw is not delete. | ADR-004. | — |
| External-dependency failure | **N/A** for the new paths — no model call, no network beyond localhost. Provider-down remains Slice 1's interpretation worker; F06 stays available during an outage (issue #38 AC15, completed by this slice). | ADR-005 / ticket. | — |

**Open questions:** none — remaining UX micro-layout (drawer edge, popover density) is
`impeccable` shape at Design, inside the ADR-007 / brief envelope.

---

## User Stories

### P1: Reword a building block and watch derived text move ⭐ MVP

**User Story**: As a domain expert, I want to reword a committed building block and see every
place that id is rendered update, so that the readable account cannot drift from the wall.

**Why P1**: This is the thesis beat and the cut line (ADR-010). Independently demoable with
Slice-1 captured blocks and no timeline.

**Acceptance Criteria**:

1. WHEN the person selects a committed, non-withdrawn sticky and activates reword (pencil,
   `Enter`, or `E` on a focused sticky) THEN the system SHALL turn that sticky into the
   dashed-ghost editor (brief §3) with the current label and ✓ / ✕ controls — never using that
   treatment for a pending proposal.
2. WHEN they confirm the ghost (✓ or `Enter`) THEN the system SHALL open a confirmation
   popover listing every rendered-reference site for that id (from
   `GET /api/workshops/:id/board/blocks/:blockId/references`) and SHALL NOT append a `reword`
   until they confirm the popover; WHEN they cancel the ghost or the popover THEN the system
   SHALL retain the previous label and append nothing.
3. WHEN the listed references are confirmed and the new label is non-empty THEN the system
   SHALL append **exactly one** `reword` operation, authored `{ accepter: { name: creatorName } }`,
   and the building block SHALL retain its id; WHEN the new label is empty or whitespace-only
   THEN the system SHALL reject inline (422 / `empty-label`), retain the previous label, and
   append nothing.
4. WHEN that `reword` is applied THEN every rendered reference in the live readable account
   SHALL carry the new label; the set of reference sites SHALL be the same set shown in the
   popover before commit.
5. WHEN quoted evidence (a contribution body or a stored `evidenceSpan`) contains the old
   label as literal text THEN after the rewording those passages SHALL be byte-identical to
   before, and the readable account SHALL mark them as quoted evidence so they are
   distinguishable from rendered references.
6. WHEN building block A's label is a substring of building block B's label and A is reworded
   THEN B's rendered references SHALL be unchanged (id resolution, never string replace).
7. WHEN the reword is applied THEN the in-app readable account SHALL reflect the new label
   within the same interaction, with no manual refresh.
8. WHEN a `reword` names an unknown or withdrawn target THEN the system SHALL reject it
   (systemic); the snapshot SHALL be unchanged.

**Independent Test**: Capture two events whose labels nest (`Order` / `Order placed`); open
the account drawer; reword `Order` through the confirm popover; see only that id's sites
update; paste-compare a quoted contribution that still contains the old spelling.

---

### P1: Withdraw and reinstate without erasing the record ⭐ MVP

**User Story**: As a domain expert, I want to withdraw a wrong building block and later
reinstate it naked, so that a mistake stops appearing without being deleted.

**Why P1**: Ticket ACs 5–7; F06; the other half of direct editing. No edges required.

**Acceptance Criteria**:

1. WHEN the person withdraws a present, non-withdrawn building block THEN the system SHALL
   append exactly one `withdraw` operation; the block SHALL keep its id; `withdrawn` SHALL be
   true; it SHALL remain in the snapshot and render as a ghosted, struck-through sticky
   (distinct from the dashed edit-ghost).
2. WHEN the person reinstates that block THEN the system SHALL append exactly one `reinstate`;
   the block SHALL re-enter shaped like a freshly captured one (`withdrawn: false`, backlog,
   no relations — none exist yet); the id SHALL be unchanged.
3. WHEN they withdraw an already-withdrawn target, reinstate a non-withdrawn target, or name
   an unknown id THEN the system SHALL reject (systemic) and append nothing.
4. WHEN an actor or system is withdrawn and no `causedBy` edges exist THEN the log SHALL
   contain only that `withdraw` (vacuous cascade). WHEN no hot spots exist THEN withdrawing an
   annotated-block-to-be SHALL likewise be a single `withdraw`.
5. WHEN a withdrawn block's id appears as a rendered reference THEN the reference SHALL still
   resolve (to the withdrawn label), not 404 or drop.

**Independent Test**: Accept one event and one actor; withdraw the event; see the ghost and
the account still resolving it; reinstate; see it active again with the same id.

---

### P1: Live deterministic readable account ⭐ MVP

**User Story**: As a domain expert, I want a readable walk of my model in the app that updates
whenever the model does, so that what I am reading is never a second artifact.

**Why P1**: F10 in-app view pulled to Slice 2 (ADR-010). The confirm popover's reference list
is this view's rendered-reference sites.

**Acceptance Criteria**:

1. WHEN the person opens the readable-account drawer THEN the system SHALL `GET /api/workshops/:id/readable-account` and render sanitised Markdown; WHEN the model is empty THEN the system SHALL show a deterministic empty state (same bytes for the same empty snapshot).
2. WHEN the same snapshot is requested twice with no intervening operation THEN the Markdown
   bodies SHALL be byte-identical.
3. WHEN any operation is applied (facilitator-accepted capture **or** F06 direct edit) THEN
   the drawer SHALL re-render to the new position in the same interaction, with no staleness
   copy and no language-model call on the path.
4. WHEN the account names a building block THEN that name SHALL be a rendered reference (id
   resolved at render time). WHEN it reproduces a contribution body or a stored `evidenceSpan`
   THEN that passage SHALL be marked quoted evidence.
5. WHEN the account states coverage THEN it SHALL name the Big Picture format, the narrator
   count, and the scope, and SHALL state that stakeholder check, chosen problem, and later
   format steps were **not run** — distinct from "ran and found nothing".
6. WHEN `derived-artifact-generation` renders THEN it SHALL read Domain Model Capture and
   Session Facilitation only through each context's `api.ts`, import no framework in
   `**/domain/**` (this Supporting context earns **no** aggregate — a pure function), and
   SHALL NOT call the AI SDK or any model provider.

**Independent Test**: Toggle the drawer on a 3-block backlog; accept a fourth proposal; see
the walk grow without refresh. Hash the GET body twice. Grep the render path for `ai` /
`@ai-sdk` — empty.

---

### P2: Direct-edit HTTP surface and sole writer

**User Story**: As the SPA, I want one POST for F06 operations that goes through `Board.decide`,
so that illegal edits are rejected the same way facilitator-originated ones are.

**Why P2**: The UI stories depend on it; it is also the seam Slice 3 will widen.

**Acceptance Criteria**:

1. WHEN `POST /api/workshops/:id/board/operations` carries a valid `reword` / `withdraw` /
   `reinstate` THEN the handler SHALL call `applyOperation` (no `expectedPosition`) and return
   the new board position; the client SHALL refetch board + readable account.
2. WHEN the body is another frozen operation kind THEN the system SHALL return 422
   `not-implemented-in-slice` and append nothing.
3. WHEN `applyOperation` is given a successful target-bearing operation THEN it SHALL return
   `resultingBuildingBlockId` equal to `operation.target` and SHALL NOT throw.
4. WHEN two F06 posts race THEN `applyOperation` SHALL retry `stale-position` internally
   (AD-022); only a merits rejection reaches the client.

**Independent Test**: `testClient` POST reword → 200 + position bump + GET board shows new
label; POST `sequence` → 422; unit-test `applyOperation(reword)` does not throw.

---

## Edge Cases

- WHEN the person rewords to the **same** label THEN the system SHALL still append one
  `reword` (decide already allows it); tests that assert the fold wrote a label MUST use a
  **distinct** new label (Slice 0 surviving-mutant lesson).
- WHEN the workshop board stream is empty (no operations yet) THEN `GET …/readable-account`
  SHALL return the empty-state document (200), not 404; `GET …/board` remains 404 until the
  first operation (Slice 1). Direct-edit POST SHALL 404.
- WHEN the confirm popover is open and another operation lands (e.g. an accept finishing)
  THEN the client SHALL refetch references before commit, or cancel the popover — it SHALL NOT
  commit against a stale list. (Single-user: the realistic case is the same person's accept
  in another tab.)
- WHEN sanitisation strips a tag from quoted evidence THEN the **stored** contribution is
  unchanged; only the HTML view is sanitised. Byte-identity ACs compare the Markdown from the
  GET, not the sanitised DOM.
- WHEN a label exceeds the schema `min(1)` but is extremely long THEN Zod at the POST
  boundary SHALL reject before `decide` (mirror capture's 10 000-char contribution bound on
  the **wire** for `label`, even if the frozen op schema is `min(1)` only — pin 10 000 at the
  handler so a huge sticky cannot blow the account).
- WHEN `E` is focused and they press `E` THEN reword starts; WHEN a text field is focused
  THEN `E` types the letter. Keyboard: Esc cancels ghost then popover, in that order.

---

## Requirement Traceability

| ID | Story | Phase | Status |
| --- | --- | --- | --- |
| S2-01 | P1 Reword (dashed-ghost, not for proposals) | Tasks | Pending |
| S2-02 | P1 Reword (two-step confirm; no silent commit) | Tasks | Pending |
| S2-03 | P1 Reword (exactly one op; id retained; empty-label rejected) | Tasks | Pending |
| S2-04 | P1 Reword (reference set stable; new label on every site) | Tasks | Pending |
| S2-05 | P1 Reword (quoted evidence byte-identical + marked) | Tasks | Pending |
| S2-06 | P1 Reword (substring label does not clobber the longer id) | Tasks | Pending |
| S2-07 | P1 Reword (account live-refetch same interaction) | Tasks | Pending |
| S2-08 | P1 Reword (unknown / withdrawn target rejected) | Tasks | Execute |
| S2-09 | P1 Withdraw (single op; ghosted sticky; id kept) | Tasks | Pending |
| S2-10 | P1 Withdraw (reinstate naked, same id) | Tasks | Pending |
| S2-11 | P1 Withdraw (illegal transitions rejected) | Tasks | Execute |
| S2-12 | P1 Withdraw (vacuous cascade: no unlink-cause / hot-spot withdraw) | Tasks | Execute |
| S2-13 | P1 Withdraw (references still resolve) | Tasks | Pending |
| S2-14 | P1 Account (drawer GET; empty state deterministic) | Tasks | Pending |
| S2-15 | P1 Account (byte-identical replay of same snapshot) | Tasks | Pending |
| S2-16 | P1 Account (re-render on every applied op; no LLM) | Tasks | Pending |
| S2-17 | P1 Account (rendered reference vs quoted evidence) | Tasks | Pending |
| S2-18 | P1 Account (coverage disclosure + honest "not run") | Tasks | Pending |
| S2-19 | P1 Account (Supporting context; api.ts only; no aggregate) | Tasks | Pending |
| S2-20 | P2 HTTP (`POST …/board/operations` reword/withdraw/reinstate only) | Tasks | Pending |
| S2-21 | P2 HTTP (`applyOperation` returns `target`; no throw) | Tasks | Pending |
| S2-22 | P2 HTTP (stale-position retry stays inside `applyOperation`) | Tasks | Pending |
| S2-23 | cross (`edit-model` capability; 4th Pinia store; `no-cross-store-imports`) | Tasks | Pending |
| S2-24 | cross (`minor` changeset; do not edit `package.json` version) | Tasks | Pending |
| S2-25 | cross (`impeccable` shape of drawer + confirm popover on capture-loop surface) | Tasks | Pending |
| S2-26 | cross (comments on #40 / #41 / #42 — already posted; keep in sync if Design diverges) | Tasks | Pending |

**Coverage:** 26 requirement IDs, 0 unmapped onto tasks. Spec **Edge Cases** fold into existing
IDs: same-label + 10 000-char bound → S2-03/T8; empty-board account 200 → S2-14/T7; stale
popover → S2-02/T12; sanitise vs GET markdown → S2-05/T14; `E` in a text field → S2-01/T11.

---

## Success Criteria

- [ ] Demo: capture a few blocks → open the account → reword one through the confirm list →
      the account's rendered references move and a quoted contribution does not.
- [ ] Withdraw → ghost → reinstate, same id, one op each.
- [ ] `pnpm check` green; `GET` readable-account twice, bodies equal; render module has no
      `ai` import (depcruise + knip).
- [ ] `applyOperation` of `reword` / `withdraw` / `reinstate` covered by a test that would
      have thrown on `main`.
- [ ] A `minor` changeset is present; `package.json` `version` untouched (ADR-009).
