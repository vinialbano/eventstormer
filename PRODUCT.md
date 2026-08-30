# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**The domain expert — the author.** Knows a business in operational detail: the
exceptions, the workarounds, the thing that happens on Fridays. Has no vocabulary for
domain events or read models and no reason to acquire one. Narrates out of order ("and
then — well, before that, someone has to approve it"). Low tolerance for friction and for
being corrected; disengages the moment they feel examined. Must recognise their own
business in the result, in their own words, or they will not trust it. Their situation:
sitting alone at a keyboard, describing how their company works, with no facilitator
present. Their job: finish one conversation and walk away with something engineering can
build from.

**The engineer — the consumer.** Receives the model and builds from it. In v1 they read
the exported artifacts (structured JSON, readable account, summary, transcript); they have
no working surface of their own. Needs the artifact to still be true next month. Cares
that the language in the model is the language the business actually uses, because that is
what ends up in the code.

Neither is the authority on the other's half: the expert owns what is true about the
business, the engineer owns what gets built from it. Both work from one model, never from
copies.

## Product Purpose

EventStormer lets a domain expert produce a well-formed EventStorming model without a
facilitator present and without learning the notation. An AI facilitator proposes
properly-formed building blocks from what the expert types; the expert accepts, edits, or
rejects each one. What they build is not a picture of the domain — it is the domain model
itself, a typed graph of building blocks with stable identities. Every artifact anyone
reads afterwards is a deterministic render of that model or of the recorded session; no
language model touches a projection path.

Success: an untrained domain expert completes a session without asking what a building
block kind means, and the engineer trusts the exported artifact weeks later because there
is no second editable artifact to drift from the model.

## Positioning

The board and the documentation are the same object viewed two ways. There is no
translation step and no editable second source of truth: the in-app readable account is a
live projection that re-renders on every change to the model, and every downloaded
artifact is stamped with the operation-log position it was rendered at, so a stale copy
identifies itself rather than passing as current. The facilitator's behaviour is
deliberately asymmetric — lenient on the human's phrasing, strict on names the machine
supplies — and that asymmetry is enforced in the harness and measured by an eval suite,
not hoped for in a prompt.

## Operating Context

- One Big Picture EventStorming workshop, v1: a single session end to end, expert typing
  rather than speaking.
- A workshop outlives any one session — the expert can close a session and pick up the
  same workshop in a new one.
- The interaction loop: the expert submits a contribution → the facilitator interprets it
  and proposes operations → the expert reviews each proposal (accept / edit / reject) →
  accepted operations are applied to the model → the readable account re-renders.
- The facilitator also raises questions when a contribution names a whole phase rather
  than something that happened, or belongs to a deeper format not run in v1.
- Outputs: the live in-app readable account, plus four downloadable artifacts —
  structured JSON export, template-rendered readable account, template-rendered summary,
  verbatim session transcript.
- Delivery is local-only: `pnpm dev` runs Vite + Hono as one process on the expert's
  machine; no hosted deployment, no container.
- The demo / eval domain is a restaurant and its kitchen orders.

## Capabilities and Constraints

- **Confirmed in scope (v1):** typed text capture with per-segment source + speaker
  markers; the AI facilitator (interview loop, schema-constrained proposals, phase and
  deeper-format questions, provider-outage resilience); proposal review; direct model
  editing (reword, withdraw, relations, place/unplace); backlog and left-to-right
  timeline board with milestones; hot spots (annotate / resolve / reopen); session close
  with the sweep; the live readable account with rename cascade; JSON / summary /
  transcript exports; the facilitator eval suite; `pnpm seed` demo.
- **Deliberately not in v1:** Process Modelling / Design-Level formats; real-time
  collaboration; a glossary; an engineer-facing working surface; on-device voice
  transcription; any language model in a projection path; optimistic client updates,
  SSE/WebSockets; hosted deployment. The model is shaped to receive these later — new
  formats add building-block and relation kinds beside the frozen v1 ones without
  altering them.
- **Technical constraints:** the SPA talks to capabilities over HTTP only. Every artifact
  is a pure function of the model or the session record — same input in, byte-identical
  artifact out. Every operation in the log carries an author; every facilitator-originated
  operation records both its proposer and the human who accepted it.
- **Terminology:** the sticky-note units are **building blocks** (never "node" or
  "element"). The confirmed domain language, bounded contexts, and context map live in
  `docs/domain/`; product truth is `docs/product/PRD.md` with permanent append-only
  feature ids `F01`–`F17`.

## Brand Commitments

- **Name:** EventStormer.
- **Voice:** warm but unobtrusive. Encouraging without lecturing, plain business language,
  and unmistakably clear that the human is in charge — the facilitator proposes, a person
  disposes. Never corrects the expert's wording in a way that makes them feel examined.
- The interface should keep the expert in a conversation, not in front of a diagramming
  tool.
- **Board fidelity is a binding identity constraint.** The model view renders as an
  authentic Big-Picture EventStorming wall in Brandolini's visual language — a butcher-paper
  surface, orange past-tense event stickies on a left-to-right timeline joined by hand-drawn
  sequence arrows, pivotal-event bars, a backlog area, a visible "time" arrow. It stays
  within Big-Picture grammar: no swimlanes and no additional sticky colors until the deeper
  formats earn them. EventStorming orange is the one saturated accent, and it doubles as the
  product's action color.
- **Capture-surface layout (confirmed).** The board fills the screen; a facilitator dock
  floats bottom-left and collapses to a pill for board-only exploration. The dock holds the
  AI conversation with inline proposal cards (actions: accept / edit / reject / hold) and
  illustrated per-participant avatars; a pending-proposals list is a drawer *inside* the
  dock that widens it rightward and collapses independently. Rewording a committed sticky
  happens in place on the board: select → pencil → the sticky becomes a full dashed "ghost"
  with editable text and confirm / cancel, keyboard-operable. A photo→stylised-avatar
  generator is a noted future feature, not v1.

## Evidence on Hand

- `docs/product/PRD.md` — full product truth, feature specs, user stories, success
  metrics.
- `docs/domain/` — confirmed subdomain catalog, bounded-context canvases, ubiquitous
  language, context map.
- `ARCHITECTURE.md` + `docs/adr/001`–`011` — settled v1 technical architecture and the `/api`
  surface (~16 user-facing routes).
- The codebase is an early skeleton: `src/app/` is a Vite + Vue 3 shell (`App.vue`,
  `main.ts`, `style.css`) with no product screens built yet. Slice 0 (schema SSOT,
  EventStore, Board core) has landed; the capture-loop UI is slice 1.
- **No real workshop content, testimonials, benchmarks, customers, or usage data exist.**
  The restaurant / kitchen-order narration is a planned golden fixture, not yet recorded.
  Future work must not fabricate any of these.

## Product Principles

1. **One model, no second artifact.** Everything a person reads is a projection; nothing
   editable competes with the model.
2. **The human is the authority.** The facilitator proposes; a person accepts, edits, or
   rejects; the log records who did which.
3. **Asymmetric rigor.** Lenient on the expert's phrasing, strict on machine-supplied
   names.
4. **Determinism is the product.** No language model on any projection path; downloaded
   artifacts self-date against the operation log.
5. **Stay inside the running format, but shaped to grow.** v1 is Big Picture only; the
   typed graph extends to the deeper formats by adding kinds, not by restructuring.

## Accessibility & Inclusion

Target **WCAG 2.2 AA** across all app surfaces.
