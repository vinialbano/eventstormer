---
version: 1
slug: "src-app-capture-loop-close"
primary_target: "src/app/capture-loop/dock/interactions/close-ceremony"
related_targets: ["src/app/capture-loop/dock/FacilitatorDock.vue"]
---

# Close ceremony — surface brief

Scope: the in-dock close flow for a Big-Picture session — the domain expert ends a sitting
deliberately. Runs as facilitator turns in the existing capture-loop dock (no new screen,
no new visual world). Visitor mode: **Operate**. Build path: **comp-led**, on the
committed capture-loop visual world (`DESIGN.md` "the calm workshop room"); this brief
extends `.impeccable/surfaces/src-app-capture-loop.md`, it does not replace it.

## 1. Job and audience

The same domain expert, alone at a laptop, at the end of a sitting. They have described
what they can for now and want to stop in a way that is on the record — not abandon the
tab. Two things must happen before the session freezes: they say whether anyone else would
tell this story differently, and they name the one problem most worth attacking next (or
say why they are not naming one). State of mind: winding down, wanting a clean finish, low
patience for a multi-step form. The engineer never sees this flow — they read its result
in the artifact later (`stakeholderCheck`, `chosenProblem`, `qualification`).

## 2. Outcome and proof

- **Primary task:** start closing → answer the stakeholder question → choose or skip a
  problem → confirm → the session is `CLOSED`.
- **Success:** the expert ends with a qualified conclusion recorded on the workshop, and
  the board's sweep (unanswered questions + named absentees → hot spots) has run. Re-opening
  the workshop later starts a *new* session; this one is frozen and re-readable.
- **Proof only this product can show:** closing is a short conversation, not a dialog — the
  stakeholder question and the problem picker arrive as facilitator turns in the same dock
  feed the expert has used all session, and the session stays live (contributions still
  accepted) right up to the final confirm.

## 3. Selected direction

- **Visual authority:** the committed capture-loop world unchanged — white
  `--radius-panel` dock, `Nunito` UI, one orange action colour, `role="status"` facilitator
  messages, quiet motion. The ceremony reuses the proposal-card chrome and the dock feed;
  it introduces no new material.
- **Structural thesis — a guided strip at the foot of the feed.** Closing does not take
  over the dock. A **Close session** control sits in the conversation column (below the
  composer, quiet outline — it is not an action-coloured primary). Activating it appends a
  facilitator turn and reveals a single **ceremony card** pinned under the newest turn,
  advancing through three steps in place: *stakeholder question → problem picker → confirm*.
  The composer, feed, board, and pending drawer stay fully interactive throughout.
- **Sequence:**
  1. **Stakeholder question.** Facilitator turn: "Before we close — would anyone else tell
     this differently?" The card offers **Nobody else** (primary) and **Someone would**
     (equal-weight outline). "Someone would" expands an inline name list (add a name → chip;
     remove with ✕; at least one name required to proceed). Submitting posts the stakeholder
     check; the card collapses to a one-line receipt (`✓ Complete perspective` or
     `✓ 2 people would add to this`).
  2. **Problem picker.** Facilitator turn: "Which problem is most worth attacking next?"
     The card lists **exactly the hot spots open right now** (model-affecting and
     informational both eligible; resolved and withdrawn never shown), each a full-width
     selectable row (marker label + a small `open` dot). Below the list, a **Skip** control
     that is the **same size and visual weight** as a problem row — not a de-emphasised
     link (F09 / DESIGN §8: choosing and skipping are equally available and equally sized).
     Skip expands two reasons: **No problem chosen** / **No real impediments yet**.
     - When there are **no open hot spots**, the list is replaced by one `role="status"`
       line: *"No hot spots on the model — that's a signal to interpret, not a pass or a
       failure."* Skip stays, still full-size; there is nothing to choose.
  3. **Confirm.** A short summary (stakeholder answer · chosen problem or skip reason ·
     hot-spot count) and a single **Close session** primary. Only this button posts
     `/sessions/:id/close`. A **Back** ghost control returns to the picker.
- **Focal moment:** the confirm press. The dock feed appends a final facilitator turn
  ("Session closed — 4 hot spots on the model"), the composer is replaced by a calm
  `This session is closed` line, and the **Start session** gate becomes available again on
  the board. No celebratory motion — a quiet settle.
- **Implementation consequence:** the ceremony is a client-orchestrated state machine
  (`useCloseCeremony`) over three existing HTTP capabilities
  (`POST /workshops/:id/stakeholder-check`, `POST /workshops/:id/chosen-problem`,
  `POST /sessions/:id/close`) plus the board snapshot read for the open-hot-spot list. No
  new `Session` state exists (AD-034): the session is `OPEN` until the final POST. Nothing
  is written optimistically; each step's card advances only after its POST resolves.

## 4. Scope and boundaries

- **Fidelity:** production-ready — every step, plus the no-open-hot-spots branch, the
  name-list branch, and the post-close resting state.
- **Breadth:** the close ceremony only — the trigger control, the three-step card, and the
  closed resting state. Not the sweep's board rendering (that is the existing hot-spot
  callout treatment), not the artifact/export surface, not session *re-open* (there is no
  such thing — a new session is `Start session` again).
- **Untouched / must not break:** the dock layout and collapse behaviour, the proposal and
  resolution review flows, the composer staying usable, server-confirmed model, HTTP-only
  SPA, the four Pinia stores each cold-loadable from one GET.
- **Anti-goals:** a modal dialog that blocks the board; a wizard that hides the feed; a
  destructive-looking red "Close" button (closing is deliberate and calm, not dangerous);
  a skip affordance that reads as secondary to choosing; auto-closing after the picker
  without an explicit confirm; any motion that celebrates the end of work.

## 5. States and ranges

- **Not closing (default):** just the quiet **Close session** control under the composer.
- **Step 1 — stakeholder, nobody:** one tap on **Nobody else** → receipt, advance.
- **Step 1 — stakeholder, names:** 1–5 names typical; each a removable chip; **Someone
  would** cannot be submitted with zero names.
- **Step 2 — picker, 1–12 open hot spots:** a scrolling list inside the card past ~6 rows;
  one selected at a time; Skip always visible at the foot.
- **Step 2 — picker, zero open hot spots:** the signal line replaces the list; Skip only.
- **Step 2 — skip:** two equal reason rows; one required.
- **Step 3 — confirm:** summary + **Close session** primary + **Back** ghost.
- **Closed (resting):** composer replaced by `This session is closed`; the feed shows the
  final facilitator turn; the board gate offers **Start session**. Re-reads are stable.
- **In flight:** between a step's POST and its resolution the card shows a quiet
  `Recording…` and its controls are disabled — never a spinner overlay.
- **POST failure:** the step stays on screen with a `role="status"` retry line
  (`Couldn't record that — try again`); nothing advances; the session is untouched and
  still `OPEN`.
- **Contribution still interpreting when Close is pressed:** allowed — the ceremony starts;
  the composer's own `Catching up…` line is unaffected.

## 6. Interaction and layout

- **Hierarchy:** the ceremony card is the foot of the conversation column, pinned below the
  newest facilitator turn; it never floats over the board and never widens the dock.
- **Topology:** desktop-first; below ~1024px the dock is already a bottom sheet — the card
  sits at the top of that sheet's scroll so its controls clear the composer.
- **Affordances:** **Close session** (quiet outline, under the composer); **Nobody else**
  (primary) / **Someone would** (outline, equal weight); name add-field + removable chips;
  one-of-N selectable problem rows; **Skip** (full-size row) → **No problem chosen** /
  **No real impediments yet**; **Close session** (primary, confirm step only) + **Back**
  (ghost).
- **Feedback:** each completed step collapses to a one-line receipt in the card; the final
  confirm appends a facilitator turn and switches the composer to the closed line. The
  board refetches after close so swept hot spots and the count appear with no reload.
- **Motion:** step-to-step is an in-place content swap with a ≤120ms opacity fade — no
  slide, no height animation beyond the natural card grow. `prefers-reduced-motion: reduce`
  removes even the fade; steps swap instantly. There is no card-to-sticky flight here and
  no highlight wash. (DESIGN §6.)

## 7. Constraints and open decisions

- **Platform / delivery:** local-only SPA, one process. **WCAG 2.2 AA** — the whole
  ceremony is keyboard-operable: the trigger is in the natural tab order after the composer;
  each step's controls are reachable and focus moves to the card's heading when a step
  advances; the problem list is a radio group (`role="radiogroup"`, arrow-key navigation);
  Skip and its reasons are in the same group's tab path, not stranded. Every `role="status"`
  line is polite, never `alert`. Target size ≥ 24px; buttons 32px tall (matches the
  proposal-card action row).
- **Equal-weight rule (binding, F09 / DESIGN §8):** the Skip control and a problem row are
  the same width, height, and type weight. Choosing is the primary-coloured selection state
  once a row is picked; Skip is never smaller, greyer, or lower on the visual ladder than
  choosing.
- **Copy:** plain and warm, the facilitator's voice — "would anyone else tell this
  differently?", not "Stakeholder completeness check". The signal line names the absence as
  information, never as a gap or a warning.
- **Stack:** Vue 3 + the committed dock components; `useCloseCeremony` composable +
  `transport/close.ts`; reuses `ProposalCard.vue` chrome and the dock feed. No new tokens,
  no new fonts.
- **A builder must not invent:** a new `Session` "closing" state (there is none — AD-034);
  a modal; posting `/sessions/:id/close` before the confirm step; showing a resolved or
  withdrawn hot spot in the picker; a de-emphasised skip; celebratory motion.
- **Open for build time:** whether the stakeholder receipt should name the people back to
  the expert or just count them; whether **Back** should also step back from step 2 to
  step 1 (currently only step 3 → step 2); exact wording of the final facilitator turn.
