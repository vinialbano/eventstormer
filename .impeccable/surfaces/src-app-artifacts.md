---
version: 1
slug: "src-app-artifacts"
primary_target: "src/app/capture-loop"
related_targets: ["src/app/capture-loop/shell/CaptureScreen.vue", "src/app/capture-loop/shell/account/ReadableAccountDrawer.vue"]
---

# Artifacts panel — surface brief

Scope: the in-app **live artifacts panel** on the capture screen — the domain expert views
and downloads the three derived artifacts (structured JSON export, deterministic Markdown
summary, verbatim session transcript) that Slice 5 adds beside the readable account. Runs
as another right-edge drawer in the existing capture-loop shell (no new screen, no new
visual world). Visitor mode: **Operate**. Build path: **comp-led**, on the committed
capture-loop visual world (`DESIGN.md` "the calm workshop room"); this brief extends
`.impeccable/surfaces/src-app-capture-loop.md`, it does not replace it.

Batch-worker note: written without a live interview (spec-driven Execute, Phase 7 / T23).
The behavioural shape is fixed by `.specs/features/slice-5-artifacts-facilitator-tracks/`
spec + design (the "viewable = live panel" assumption row, maintainer decision 2026-09-05)
and by the readable-account precedent. Assumptions are marked **[assumed]**.

## 1. Job and audience

The same domain expert, alone at a laptop, mid- or post-session. They have built a model
and now want to take it away — hand the engineer the structured JSON, send someone the
gist, or feed the raw annotated conversation into another tool. They are not studying the
artifact on screen so much as confirming it looks right and is current before they
download it. State of mind: task-focused, done describing for the moment, wants the file
and wants to trust it. The engineer never opens this panel — they receive the downloaded
file.

## 2. Outcome and proof

- **Primary task:** open the panel → pick one of the three artifacts → read the current
  render → download the stamped file.
- **Success:** the expert leaves with a file they trust is current, because the panel it
  came from was itself re-rendering on every applied operation — there is no moment where
  the on-screen artifact lags the model.
- **Proof only this product can show:** the artifact on screen is a live projection, not a
  generated-once snapshot; it carries the same composite version stamp
  (`boardPosition`, `sessionRecordPosition`, `renderedAt`) that the downloaded file
  carries, so a stale download identifies itself rather than passing as current. No
  language model touches the path.

## 3. Selected direction

- **Visual authority:** the committed capture-loop world unchanged — white
  `--radius-panel` app panel resting on the paper wall, Nunito UI type, `--color-line`
  hairlines, one orange accent. The artifacts panel is a **sibling of the readable-account
  drawer**, not a new surface: same right-edge placement, same fixed-inset drawer frame,
  same "toggle button on the wall → drawer opens" affordance.
- **Structural thesis — one drawer, a segmented artifact picker, a live body:** the drawer
  has a title, a three-way segmented control (`JSON` / `Summary` / `Transcript`), a
  one-line **version stamp** row, a **Download** action, and a scrolling body that renders
  the selected artifact. Selecting a segment fetches that artifact; an applied operation
  re-fetches whatever segment is currently selected (same signal the readable account
  uses — `board-dirty` / applied-operation). The transcript segment needs a session id;
  when there is no session it shows a short "start a session to see the transcript" line
  in that segment only.
- **Body rendering:** JSON renders as a monospace, `--color-surface-sunk` code block
  (pre, horizontal scroll inside its own container, never widening the drawer). Summary
  and transcript are Markdown → sanitised HTML, rendered the same way the readable account
  renders its Markdown (reuse `render-account-html` treatment / styles). No syntax
  highlighting library.
- **Focal moment:** the version-stamp row quietly updating after an accepted proposal —
  the number ticks up, the body re-renders in place with a ≤120ms opacity fade, and the
  Download button's filename (which embeds the position) is now current. Nothing flies;
  this drawer is a reference surface, not the board.
- **Implementation consequence:** a new `artifacts` Pinia store cold-loadable from the
  three GETs, a `transport/artifacts.ts` adapter, and a new `RefetchTarget` /
  drawer component wired into `CaptureScreen.vue` beside `ReadableAccountDrawer`. The
  download is a client-side `Blob` + `URL.createObjectURL` + `<a download>` of the exact
  bytes the last fetch returned (JSON: the JSON body re-serialised byte-for-byte from the
  server text; Markdown: the `markdown` string), filename
  `<workshop-slug>-<artifact>-<boardPosition>.<ext>`. **[assumed]** the download uses the
  bytes already in the store, not a fresh fetch, so screen and file always agree.

## 4. Scope and boundaries

- **Fidelity:** production-ready — one drawer, all its states, wired into the capture
  screen with a static HTML reference mockup as the build target.
- **Breadth:** the artifacts drawer and its wall toggle only. Not the readable-account
  drawer (unchanged), not session close, not the board.
- **Untouched / must not break:** the readable-account drawer and its toggle; the four
  existing Pinia stores; server-confirmed model (no optimistic anything); HTTP-only SPA;
  `**/domain/**` framework-free; the one-orange-accent rule; the card-to-sticky flight as
  the *only* authored motion.
- **Anti-goals:** a second authored motion moment competing with the board flight; a
  modal/dialog for the artifact (it is a drawer, like the readable account); a "generate"
  or "refresh" button (the panel is live — it re-fetches itself); client-side
  re-derivation or re-formatting of any artifact (the server render is the only render);
  showing all three artifacts stacked at once (segmented — one at a time); a syntax
  highlighter or JSON tree widget; persisting the selected segment across reloads is
  fine but not required.

## 5. States and ranges

- **Loading (first open / segment switch):** a quiet skeleton or `Loading…` line in the
  body; the segmented control and title stay put. No spinner overlay.
- **Catching up (re-fetch after an applied operation):** the previous render stays
  visible; a quiet `Catching up…` line above the body (mirrors the composer's
  outage line — never an error state). Body swaps when the new bytes arrive.
- **Empty model:** every artifact still returns a valid document — JSON with empty
  collections and `boardPosition: 0`, summary with explicit "not run" / empty-section
  lines, transcript with a header and no turns. The panel renders them as-is; no special
  "nothing here yet" empty state beyond what the artifact itself says.
- **No session (transcript segment):** the JSON and Summary segments work; the Transcript
  segment shows one line — "The transcript covers one session. Start a session to see it."
- **Error (404 / 500 / network):** the body is replaced by a short message —
  "Couldn't load this artifact." plus a `Try again` text button that re-fetches. The
  segmented control stays usable so the expert can switch to one that works. A 404 on the
  workshop (unknown id) and a 500 (render threw) render the same way; the message does not
  leak status codes.
- **Download:** always available whenever a body is currently rendered (not during the
  first load, not in an error state). Produces the point-in-time file from the bytes on
  screen; no toast — the browser's own download UI is the feedback.
- **Volume:** JSON for a full session is tens of KB; the transcript can be long — both
  scroll inside the body, the drawer height is fixed to the viewport like the readable
  account.

## 6. Interaction and layout

- **Hierarchy:** the wall is the field; this is an expert-controlled overlay drawer, peer
  to the readable-account drawer. Only one of the two right-edge drawers is open at a time
  **[assumed]** — opening Artifacts closes the Readable account and vice versa, so they
  never stack.
- **Topology:** desktop-first, same `min(380px, calc(100vw - 32px))` width and fixed
  inset as the readable-account drawer. Below ~1024px it is a bottom sheet over the wall,
  consistent with the dock.
- **Affordances:** a `Download` toggle-style button on the wall opens/closes the drawer
  (sibling to the `Readable account` button, stacked below it); inside — the three-way
  segmented control, the `Download` action, a `Try again` button in the error state, a
  close affordance on the drawer.
- **Feedback:** segment change → immediate active-state move + body fetch; applied
  operation → stamp row updates + `Catching up…` + body fade-swap; download → native
  browser feedback only.
- **Motion:** body swap is a ≤120ms opacity fade (the DESIGN.md "everything else" tier);
  drawer open/close matches the readable-account drawer. No flight, no wash. Honour
  `prefers-reduced-motion` — the fade becomes an instant swap.

## 7. Keyboard and focus (DESIGN.md §8 — WCAG 2.2 AA)

- The wall `Download` button is in the wall's focus order next to `Readable account`.
- On open, focus moves to the drawer (its heading or the segmented control); on close,
  focus returns to the wall toggle button.
- Focus order **inside** the drawer: segmented control (`JSON` → `Summary` → `Transcript`,
  arrow-key roving per the segmented-control pattern, `Tab` leaves the group) → version
  stamp (static, skipped) → `Download` → body (scrollable region, focusable for keyboard
  scroll) → `Try again` when present → close.
- The segmented control is a real `role="radiogroup"` / `radio` set (or `tablist` with a
  single live panel) with visible 2px `--color-event-strong` focus rings and a
  non-colour active indicator (underline or filled pill, not hue alone).
- The `Catching up…` and error lines are `role="status"`, never `alert`.
- The body region has an accessible name tied to the active segment
  (`aria-label="Summary export"` etc.); the JSON `pre` is announced as a code block.
- Target size ≥ 24px; the action buttons are 32px tall, matching the proposal-card row.

## 8. Constraints and open decisions

- **Platform / delivery:** local-only SPA, `pnpm dev`, one process. Reka UI primitives for
  the segmented control if one fits; otherwise a hand-rolled radiogroup to the same a11y
  contract.
- **Determinism:** the panel never transforms artifact bytes — it displays the server
  response and downloads the same bytes. The only value the client computes is the
  download filename (from `boardPosition` + a fixed artifact slug).
- **Routes (fixed by design / Batch 5):** `GET /api/workshops/:id/artifacts/model`,
  `/artifacts/summary`, `/api/workshops/:id/sessions/:sessionId/artifacts/transcript`.
  Summary returns `{ boardPosition, sessionRecordPosition, markdown }`; transcript returns
  `{ position, markdown }`; model returns the full `ModelJson` with the stamp embedded.
- **A builder must not invent:** the drawer being a sibling of the readable-account drawer
  (not a modal, not a dock tab); segmented one-artifact-at-a-time (not stacked); live
  re-fetch on applied operation with no manual refresh control; download = the bytes on
  screen; no client-side re-derivation; one authored motion moment in the whole app and it
  is the board flight, not anything here.
- **Open for build time:** whether the two right-edge drawers truly mutually exclude or
  can coexist on a wide viewport; exact skeleton vs. `Loading…` treatment; whether the
  version stamp also shows a relative "rendered just now" or only the raw positions;
  bottom-sheet height on mobile; whether `Download` offers all three at once from any
  segment or only the active one (brief assumes: active only).
