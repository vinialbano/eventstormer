<!-- impeccable:design-schema 1 -->

# Design

The visual system for EventStormer's app surfaces. Written at the first `src/app/` build
(the slice-1 capture loop). Product truth is `PRODUCT.md`; per-surface strategy is
`.impeccable/surfaces/<slug>.md`. Where this file and the PRD disagree, the PRD wins.

## 1. Direction

**The calm workshop room.** The screen is a real EventStorming wall — kraft butcher paper
taped to a surface, a hand-drawn frame, marker-lettered orange stickies, a blue `time →`
arrow. Everything the software adds (the facilitator dock, proposal cards, the pending
drawer) is a quiet, warm, rounded app panel resting *on* that wall — white cards, humanist
sans, soft shadows, one saturated accent. The accent is EventStorming orange and it is
also the product's only action colour: accepting a proposal and a domain-event sticky are
the same hue on purpose.

Two materials, never blended: **paper + marker** for the model, **paper-white app panel +
sans** for the controls. A control never looks hand-drawn; a sticky never looks like a UI
chip.

Locked by the brief and not up for reinvention: board-first with a floating collapsible
dock; the pending list as an in-dock drawer; Big-Picture grammar (orange event stickies,
sequence arrows, pivotal bars, backlog, `time →`); accent = EventStorming orange;
server-confirmed model; the reword dashed-ghost is edit-only.

## 2. Colour

Light only. The use scene is a person at a laptop in daylight describing their business; a
dark workshop wall reads as a different, colder product. No dark theme in v1.

Tokens (defined in `src/app/style.css` via Tailwind v4 `@theme`):

| Token | Value | Role |
| --- | --- | --- |
| `--color-paper` | `#efe7d6` | the wall — warm kraft ground behind everything |
| `--color-paper-edge` | `#e4d8c0` | paper vignette / backlog fill |
| `--color-ink` | `#2b2723` | marker black — sticky text, frame, sequence arrows |
| `--color-surface` | `#ffffff` | app panels (dock, cards, drawer) |
| `--color-surface-sunk` | `#f7f4ee` | inset rows, composer field |
| `--color-text` | `#26221e` | primary UI text on white |
| `--color-text-soft` | `#6b6459` | secondary UI text (tinted warm, never gray) |
| `--color-line` | `#e7e0d2` | 1px hairlines between panels/rows |
| `--color-event` | `#f28c28` | EventStorming orange — event stickies **and** the action colour |
| `--color-event-strong` | `#d9741a` | orange pressed / focus ring |
| `--color-event-ink` | `#7a3d05` | text on an orange surface (≥ 4.5:1) |
| `--color-pivotal` | `#f6c945` | pivotal-event bar (slice 3; token reserved now) |
| `--color-time` | `#2f6fb3` | the `time →` arrow, ink-blue marker |
| `--color-danger` | `#b23b3b` | reject / destructive text |
| `--color-parked` | `#8a8172` | "parked" chip + parked dot |

Secondary text on the orange surface uses `--color-event-ink`, not white and not gray.
Selection is `--color-event` at 22% alpha; the caret is `--color-event-strong`; focus
rings are a 2px `--color-event-strong` outline with a 2px offset on white, and a
paper-coloured offset on the wall.

## 3. Type

Two families, loaded from Google Fonts in `index.html` with real fallbacks:

- **Marker — `Kalam`** (400/700), fallback `"Bradley Hand", "Comic Sans MS", cursive`.
  Used only for model material: sticky labels, the `backlog` label, `time`. Never for UI.
- **UI — `Nunito`** (400/600/700/800), fallback
  `ui-rounded, "SF Pro Rounded", "Segoe UI", system-ui, sans-serif`. All dock, card,
  drawer, and form text.

Scale (UI, `rem` on a 16px root): `0.75` caption · `0.8125` label · `0.875` body-sm ·
`1` body · `1.125` turn-lead · `1.375` panel-title. Weight steps: 400 body, 600 emphasis,
700 titles, 800 the collapsed-pill count. Tracking: `-0.01em` on titles, `0` on body.
Marker scale: `1.0625` sticky label (clamped down to `0.9375` when the label is long),
`1.25` `backlog` / `time`. Body measure in the conversation column caps at ~62ch.

## 4. Space, radius, depth

- **Spacing** on a 4px grid: `4 · 8 · 12 · 16 · 20 · 24 · 32`. Card padding `16`; row
  padding `10 / 12`; dock padding `16`; group gap `20`, item gap `8`. More space above a
  heading than below (`20` / `8`).
- **Radius:** `--radius-panel: 18px` (dock, drawer), `--radius-card: 12px` (proposal card),
  `--radius-control: 9px` (buttons, composer), `--radius-chip: 6px` (kind pill). Stickies
  are near-square with a `2px` radius and a `-1.4deg`…`1.1deg` deterministic tilt by id.
- **Depth:** panels `0 6px 24px -6px rgb(43 39 35 / 0.18), 0 1px 3px rgb(43 39 35 / 0.12)`.
  Stickies `0 2px 3px rgb(43 39 35 / 0.16), 0 8px 14px -6px rgb(43 39 35 / 0.22)` — offset
  + blur, a lifted-paper shadow, never a flat halo. Cards inside the dock `0 1px 2px`.

## 5. The board renderer (framework-free — ADR-006)

`board/layout.ts` is a **pure function** `layoutBoard(input, viewport) → BoardLayout` — no
Vue, no DOM. Slice 1 lays out the **backlog only**: a titled frame rectangle top-left, and
its blocks flowed left→right, top→bottom in fixed-size sticky cells (`132 × 132`, gap `16`,
inner padding `16`). It returns absolute `{x,y,w,h}` rects for the frame, the `time →`
guide, and every sticky, plus the total canvas size. Placed stickies, sequence arrows and
pivotal bars are slice 3 — the return type already carries an empty `placed: []` and
`arrows: []` so the renderer and its consumers do not change shape when slice 3 fills them.

`BoardWall.vue` is a thin `<svg>`/absolutely-positioned wrapper that calls `layoutBoard`
and paints the result. The paper texture, frame, and tape corners are CSS/SVG on the
wrapper, outside the pure function. **A pending proposal is never drawn on the wall** — no
ghost sticky, no dashed outline (that treatment is reword-only, slice 3).

## 6. Motion

One authored moment: **the card-to-sticky flight** — an accepted proposal card's ghost
travels from its dock position to the sticky's backlog slot on an exponential ease-out
(`cubic-bezier(0.16, 1, 0.3, 1)`, ~420ms), the new sticky settling with a brief
`--color-event` → transparent highlight wash (~900ms). The drawer widen/collapse is a
single smooth `width`/`transform` transition (~240ms). Everything else is instant or a
≤120ms opacity fade. `prefers-reduced-motion: reduce` removes the flight and the wash —
the sticky simply appears — and makes the drawer snap.

## 7. Components

- **Sticky** — orange fill, marker text, id-seeded tilt, lifted-paper shadow. Kinds:
  `domain-event` (orange), `actor` (`#f6c945` pale — reserved), `system` (`#e8dcc4` —
  reserved). Slice 1 ships `domain-event`; others use the same cell with their fill.
- **Kind pill** — `--radius-chip`, `0.6875rem`/700/`0.04em` uppercase, orange fill +
  `--color-event-ink` text for EVENT.
- **Proposal card** — white, `--radius-card`, kind pill + marker label + a 4-button action
  row (`Accept` filled orange, `Edit` / `Reject` / `Hold` quiet outline; `Reject` text
  `--color-danger`). A held card shows a `parked` chip and a left-edge parked ribbon.
  Collapsed states: `✓ <label> — added by <name>` receipt, `✕ Dismissed` line.
- **Dock** — one white `--radius-panel` panel, bottom-left `20px` inset, max-height
  `min(70vh, 620px)`, conversation column `360px`. Collapses to a `Facilitator · n` pill
  (parked dot when anything is held).
- **Pending drawer** — slides right of the conversation column (`300px`), groups
  `Parked by you` / `Awaiting review`, rows = kind pill + label + jump chevron,
  `Accept all remaining` foot. Collapses to a vertical `Pending ● n` handle on the dock
  edge.
- **Composer** — sunk field, `--radius-control`, attach affordance left, send right;
  always enabled (stays usable during a provider outage; shows a quiet `Catching up…`
  line above it, never an error state).
- **Buttons** — `--radius-control`, `0.875rem`/700; primary = orange fill / white-ish
  `--color-event-ink`-safe text; secondary = `--color-line` outline on white; ghost = text
  only. 2px focus outline in every case.

## 8. Accessibility

WCAG 2.2 AA. Every dock control and every sticky is keyboard-reachable with a visible
focus ring and a sane order (composer → newest turn's cards → drawer → wall). The wall is a
labelled region; each sticky is a `listitem` with an accessible name of its kind + label.
Facilitator questions and out-of-format notices are `role="status"` dock messages, never
`alert`. Colour is never the only signal — held = chip + ribbon + text, reject = word
`Dismissed`. Target size ≥ 24px; action-row buttons are 32px tall.

## 9. Open decisions (carried from the brief)

- Self-hosting the marker/UI faces (`@fontsource`) vs. the current Google Fonts `<link>`.
- Board pan/zoom keyboard model and the mobile bottom-sheet detail — slice 3, when the
  timeline and drag-to-place arrive.
- Whether the collapsed dock also surfaces a wall-side pending affordance.
