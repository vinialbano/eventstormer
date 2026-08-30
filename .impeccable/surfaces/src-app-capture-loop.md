---
version: 1
slug: "src-app-capture-loop"
primary_target: "src/app/capture-loop"
related_targets: []
---

# Capture loop — surface brief

Scope: the slice-1 capture screen — Workshop/Session start → contribution → facilitator
proposal → accept / edit / reject / hold → the model grows. Visitor mode: **Operate**.
Build path: **comp-led**. Reference comps, committed at `.impeccable/mocks/iface/`:
`final-expanded.webp`, `final-collapsed.webp`, `reword-1-select.webp`,
`reword-2-editing.webp`. Earlier exploration comps (the visual-world `decision/` round,
`v1`–`v4`, `syn-*`) are local-only and regenerable with the skill.

## 1. Job and audience

A domain expert — a restaurant owner, an operations lead — alone at a laptop, describing
how their business actually works, in plain language, out of order, low tolerance for
friction or for being corrected. The job: talk through the business a piece at a time and
watch a rigorous, typed model take shape in their own words, staying in charge of every
addition. A second audience is the experienced modeller who wants to work the board
directly and only consult the facilitator when needed — the collapsible dock serves both on
one screen.

## 2. Outcome and proof

- **Primary task:** submit a contribution; review each proposed building block; accept /
  edit / reject / hold; see accepted blocks appear on the wall.
- **Success:** after a stretch of describing, the right side reads back their business as an
  EventStorming wall they recognise — without having learned the notation.
- **Proof only this product can show:** the wall and the words are one object; every sticky
  carries whose words it is; nothing was transcribed by a second hand.

## 3. Selected direction

- **Visual world:** the category-standard calm app (locked `canon`), executed at full
  commitment — warm off-white ground, white cards, rounded humanist sans UI, one saturated
  accent that **is** EventStorming orange (action colour = domain-event colour).
- **Structural thesis — board-first with a floating dock:** the EventStorming wall fills
  the viewport. A **facilitator dock** floats bottom-left; it collapses to a small
  `Facilitator · n` pill so the expert can explore the timeline with nothing in the way.
- **The dock** is one rounded panel, up to two columns:
  - *Conversation column* — illustrated per-participant avatars (fixed one for the
    facilitator), plain-language turns, and **inline proposal cards** welded to the
    facilitator turn that produced them. Card = kind pill + label + **Accept / Edit /
    Reject / Hold**. `Accept all` per cluster; no reject-all.
  - *Pending drawer* — slides out to the **right**, widening the dock (never replacing the
    conversation), collapses to a slim vertical `Pending ● n` handle on the dock edge. It
    is an **index, not a second card**: rows are kind pill + label + jump chevron, grouped
    `Parked by you` / `Awaiting review`, with `Accept all remaining` at the foot. A row
    click switches to the Conversation column, scrolls to that inline card, and pulses it.
- **The board — Big-Picture grammar:** orange past-tense event stickies on a left-to-right
  timeline **joined by hand-drawn sequence arrows**; a bounded `backlog` area top-left for
  unplaced events; pivotal-event bars (tall thin yellow); a visible `time →`. No swimlanes,
  no extra sticky colours in v1.
- **Reword in place (F06):** select a committed sticky → a pencil affordance appears →
  clicking it (or `Enter` / `E` on a focused sticky) turns the sticky into a **full
  dashed ghost** (dashed border, paler fill) with editable text and **✓ / ✕** controls;
  `Enter` saves, `Esc` cancels. This dashed-ghost treatment is used **only** for editing an
  existing sticky — never for proposals.
- **Focal moment:** an accepted proposal card becomes a sticky on the wall — the
  words-into-model beat. Newest sticky briefly distinguished (settle + fading highlight),
  then it is just part of the wall; the card collapses to a one-line transcript receipt
  (`✓ Order confirmed — added by Maria`).
- **Implementation consequence:** the wall is a pannable spatial canvas; the conversation
  is a transcript growing downward inside the dock. Board renderer is framework-free and
  swappable (ADR-006); Vue Flow / dagre is a slice-3 concern. Model is server-confirmed —
  no optimistic board updates (ADR-007).

## 4. Scope and boundaries

- **Fidelity:** production-ready screen — one screen, all its states — plus a static HTML
  reference mockup as the build target.
- **Breadth:** the capture screen only. Not the separate "what are we mapping?" opening
  screen, not artifact exports, not session close.
- **Slice-1 reality vs. reference comps:** slice 1 ships the **backlog** (accepted events
  land unplaced); the timeline arrangement with arrows and pivotal bars shown in the comps
  is the **slice-3** target the design must not preclude. Drag-to-place is slice 3.
- **Untouched / must not break:** server-confirmed model, HTTP-only SPA, `**/domain/**`
  framework-free, plain `fetch` POST, 3 Pinia stores each cold-loadable from one GET.
- **Anti-goals:** a Miro/FigJam infinite-canvas editor; a chat app with the model in a
  drawer; message bubbles that let proposals scroll away unnoticed; **ghost/dashed stickies
  for pending proposals** (rejected — clutters the board and raises the teaching burden for
  EventStorming newcomers); a generic node graph instead of a sticky wall; gamified
  streak/points encouragement.

## 5. States and ranges

- **First run (slice-1 empty):** empty framed wall with `time →` and an empty `backlog`
  outline; dock open with the facilitator's first prompt (after scope is set elsewhere).
- **Proposal pending:** 1–5 building-block cards per contribution (mostly EVENT, some
  ACTOR), clustered under the facilitator message; `n` reflected on the Pending handle.
- **Hold / parked:** a held proposal stays pending, marked with a "parked" ribbon inline
  and grouped under `Parked by you` in the drawer.
- **Editing a proposal:** inline on the card, before accept; the expert's wording wins.
- **Rewording a committed sticky:** the select → pencil → dashed-ghost → confirm/cancel
  flow above; keyboard-operable.
- **Accepted-but-not-applied:** rare (an invariant rejected it) — a clear inline notice on
  the card, never a silent drop.
- **Facilitator questions:** phase-name flag and deeper-format flag render as facilitator
  messages, not error states.
- **Provider briefly unavailable:** the composer still accepts contributions; a quiet
  "catching up" state; nothing typed is lost.
- **Withdrawn block:** kept as ghosted graphite structure, struck through, never removed
  (F06) — distinct from the dashed edit-ghost.
- **Volume:** dozens of stickies per session; 10–20 unplaced in the backlog at once; long
  transcript and long wall both scroll/pan independently.
- **Dock collapsed:** only the `Facilitator · n` pill (with a parked dot if anything is
  held); clicking it reopens the dock.

## 6. Interaction and layout

- **Hierarchy:** the wall is the field; the dock is an overlay the expert controls the size
  of (collapsed pill → conversation only → conversation + pending drawer).
- **Topology:** desktop-first. Below ~1024px the dock becomes a bottom sheet over the wall;
  the wall is never dropped — seeing the model form is the point.
- **Affordances:** Accept / Edit / Reject / Hold per card; `Accept all` per cluster and
  `Accept all remaining` in the drawer; pencil-to-reword on a selected sticky; drag-to-place
  is slice 3.
- **Feedback:** accepted card → sticky with a brief settle + fading highlight and a
  transcript receipt; reject collapses to `✕ Dismissed …`; the Pending handle count updates
  live.
- **Motion:** one orchestrated grammar — the card-to-sticky flight is the signature; the
  drawer widen/collapse is a smooth width transition; everything else quiet. Honour
  `prefers-reduced-motion`.
- **Multiplayer-ready seams:** avatars + receipts carry proposer and accepter (F05); the
  Pending drawer shows held-by-whom; a soft lock or last-write-wins toast stops two people
  acting on one card. Not built in v1, not designed against.

## 7. Constraints and open decisions

- **Platform / delivery:** local-only SPA, `pnpm dev`, one process. **WCAG 2.2 AA** — the
  board and every dock control fully keyboard-operable, focus order sane, sticky edit
  reachable and announced.
- **Stack:** Vue 3 + Tailwind v4; Reka UI primitives (ADR-007, not yet installed); board
  renderer framework-free (ADR-006).
- **Type:** rounded humanist sans for UI; a hand-lettered / marker face for sticky text and
  `time →` — face choice is a DESIGN.md decision at build finish, not invented here.
- **Avatars:** a small set of pre-drawn illustrated avatars (SVG/PNG), assigned per
  participant, fixed one for the facilitator. Photo→stylised-avatar generation is a future
  feature.
- **A builder must not invent:** board-first + collapsible dock; the pending list as an
  in-dock drawer (never a separate window, never a second card); Big-Picture grammar with
  sequence arrows; accent = EventStorming orange; server-confirmed model; the reword
  dashed-ghost being edit-only.
- **Open for build time:** exact bottom-sheet behaviour on mobile; dock max width with the
  drawer open; how "pan the paper" reads before there's much on the wall; whether the
  Pending handle also surfaces on the wall side when the dock is fully collapsed; the
  marker/hand face; keyboard model for pan/zoom on the board.
