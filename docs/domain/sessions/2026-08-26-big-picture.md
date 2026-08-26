---
workshop: big-picture
scope: eventstormer-session
status: draft
last_updated: 2026-08-26
digest: 308013b9fcc5
derived_from:
  - path: boards/eventstormer-big-picture.md
    digest: a1fe4f12aaba
    at: 2026-08-26
---
# Session record — Big Picture, resumed (2026-08-26)

**Type.** Resume of the 2026-08-25 Big Picture (`boards/eventstormer-big-picture.md`, status
`draft` — update-in-place applies, per `SKILL.md` § Resuming a workshop). One participant, same as
the original session (the product owner, solo).

**Entry.** `python3 domain_lineage.py check` run before editing: 10 pre-existing stale artifacts
reported, none naming `boards/eventstormer-big-picture.md` as the stale one and none caused by
this session — see `open-questions.md` item 30 (2026-08-26, Session Facilitation Design-Level) for
their origin. Not this session's to fix.

**Trigger.** User-initiated resume, scoped from the start to "fix what's needed in the Big
Picture workshop." Asked to choose between fixing only `open-questions.md` #23 (the known,
already-diagnosed pivotal-event scoping defect) or a broader resume re-walk (events no longer
recognized, new pain, resolved hot spots, language shift); the participant chose the broader
re-walk, then on being asked the three resume questions, surfaced exactly one finding — the same
one #23 had already flagged, but with a materially different fix than #23's own text proposed.

## Raw capture

Participant's own words (near-verbatim): *"I only think that we need to incorporate Workshop
Started and then Session Started only happens after Domain Problem Stated. Because first we're
determining what is the EventStorming workshop about. We can't have the Domain Problem Stated
multiple times, one for each new session."*

This is `[storm]` — a live business fact, not inferred from the code or the prior board.

**What #23 (written 2026-08-26, by the Design-Level session on Session Facilitation) had proposed:**
a straight rename, `Session Started` → `Workshop Started`, with `Domain Problem Stated` and
`Chosen Problem Named/Skipped` noted as workshop-scoped, no reordering.

**What the participant actually wanted, once asked directly:** not a rename — a **split**. Two
distinct events at two distinct scopes: `Workshop Started` (once per workshop) and `Session
Started` (once per session, repeatable), with `Session Started` ordered strictly *after* `Domain
Problem Stated`. The #23 write-up had under-specified its own finding — it named the scoping
problem correctly but not the event-count fix, which only surfaced by asking the participant
directly rather than applying the prior session's proposed text verbatim.

**Follow-up, this session:** confirmed `Session Started` keeps its pivotal marker despite becoming
repeatable — it still marks the capture loop's entry point, once per occurrence, the same way
`Session Closed` marks its exit every time. Also confirmed `Workshop Format Selected` (the original
board's forward-looking, not-yet-implemented candidate) is not a separate event at all — it's
folded into `Workshop Started` itself: selecting the format *is* what starting the workshop does,
not a preceding step.

## Quality gate

Both new/changed events reviewed against `references/event-smells-and-antipatterns.md`:

- **Workshop Started** `[storm]` *(pivotal)* — past tense, names a real state transition (a
  Workshop now exists, with a fixed format), not a query or a CRUD wrapper. Passes.
- **Session Started** `[glossary]` *(pivotal, unchanged wording, changed scope/position)* — same
  test; already passed the original 2026-08-25 gate at its old position, and repositioning doesn't
  change its shape. Passes.

No new `[code]`-derived or `[inferred]` candidates this session — everything came from the
participant directly, live.

## Board changes

`boards/eventstormer-big-picture.md`, Framing and Capture-loop sections:

- Old item 1 (`Workshop Format Selected`) → **Workshop Started** `[storm]` *(pivotal, new marker)*,
  folding the format-selection candidate into it.
- Old item 2 (`Session Started`) removed from its old position (before `Question Asked`).
- Old items 3–4 (`Question Asked`, `Domain Problem Stated`) renumbered to 2–3; `Domain Problem
  Stated`'s note updated from "the whole session's scope" to "the workshop's scope … once per
  workshop — not once per session."
- **Session Started** reinserted as item 4, now heading the Capture-loop section, with a note that
  it only fires after `Domain Problem Stated` and is repeatable across sessions in a workshop.
  Items 5–14 (old 5–14) unchanged in content and numbering — the net event count stays 14, since one
  distinct name (`Workshop Format Selected`) was folded in and the moved event (`Session Started`)
  isn't a new one.
- Pivotal-events summary at the close of the Timeline section rewritten: four → **five**
  (`Workshop Started`, `Domain Problem Stated`, `Session Started`, `Session Closed`, `Chosen
  Problem Named/Skipped`), with the resume documented inline rather than silently overwriting the
  prior count.

No other section touched — Positioning, Editing, Questions-and-resolutions, Close, Dropped-during-
quality-gate, Actors and systems, Declined capabilities, and Language all stand as they were.

## Hot spots accounted for

- `open-questions.md` #23 — **resolved this session**, text updated to record the split (not the
  rename originally proposed) and the confirmation that `Session Closed` and `Chosen Problem
  Named/Skipped` are unaffected.

No new hot spots raised. Asked directly whether anything else on the board needed fixing; the
participant confirmed this was the whole scope of the resume.

## Verification pass

- Every claim above traced to either the participant's own words (this turn) or `open-questions.md`
  #23 as it stood before this session (read in full before editing).
- No element in this session's board edits carries `[code]` or `[inferred]` — everything is
  `[storm]` (new) or unchanged `[glossary]` (repositioned, not reworded in substance) or unchanged
  `[storm]` (`Domain Problem Stated`, note updated).
- Confirmed `boards/eventstormer-big-picture.md`'s status was `draft` (not `confirmed`) before
  editing — update-in-place was the correct resume mode, not a parallel draft.

## Provenance accounting

| Element | Provenance | Note |
|---|---|---|
| Workshop Started | `[storm]` | New, participant's own words, this session |
| Session Started (repositioned) | `[glossary]` | Unchanged wording; original board's `[glossary]` marker carried forward — repositioning is a scope/order fact confirmed `[storm]` this session, recorded in the event's own note |
| Domain Problem Stated (note updated) | `[storm]` | Unchanged from original session; "once per workshop" phrasing added to match #23's original finding, itself `[storm]` from the Design-Level session |

## Exit gate

Put to the participant: stop here with the corrected board as the deliverable, or name the next
workshop. See the conversation turn following this record for the answer.