---
workshop: big-picture
scope: eventstormer-session
status: draft
last_updated: 2026-08-25
digest: cbd6e95ca6c5
derived_from:
  - path: boards/eventstormer-big-picture.md
    digest: ac38c26c6691
    at: 2026-08-25
---
# Context map — EventStormer (discovered form)

**Candidates only.** No relationship, direction, pattern, or subdomain classification appears
below — that is the decided form, and it belongs to `ddd-strategic-design`. Every
seam here is `[inferred]`: derived in close-out, after the exit gate, from the board alone —
nobody in the room said "these are two contexts." Every piece of evidence under a seam is
`[storm]`: something the participant actually said or a fact the board actually shows.

## How these were derived, and their limits

Four of the book's six heuristics are available to this skill; two are not, and both concern
*unspoken* disagreement, which biases every candidate below toward seams somebody said out loud:

- **Available and run:** business phases/pivotal events, swimlanes, people on the paper roll, the
  actual language.
- **Not available:** where people physically stand in the room; body language. Both require a
  room and a body this session never had.

**These four were run sequentially by one agent, not independently by separate ones** — this
surface had no subagent fan-out available. That is a weaker tournament than four blind proposals
compared afterward, and it's stated here rather than left to be assumed: a single agent that wrote
all four has seen all four before writing any of them.

## Candidate seams

### Candidate 1 — Session Lifecycle vs. Modeling Capture

**Heuristic:** business phases / pivotal events.

**Evidence** `[storm]`: the four pivotal events (Session Started, Domain Problem Stated, Session
Closed, Chosen Problem Named/Skipped) all cluster at the open and close of a session, while the
entire fine-grained event catalog — Contribution Made through Element Reinstated, roughly two
dozen events — sits inside the loop between them. The tools needed to open, scope, and close a
session (asking what business is in scope, checking whether the perspective is complete, choosing
what matters most) read differently from the tools needed to classify and structure an ongoing
contribution (proposal disposition, positioning, rewording, withdrawal). Follows the book's own
test: do the tools and mental model change across the line? Here, plausibly yes.

**Open disagreement:** none surfaced — this seam was never put to the participant (per this
workshop's own rule, seams are derived in close-out, not asked about in session).

### Candidate 2 — Facilitation vs. Artifact Consumption

**Heuristic:** people on the paper roll.

**Evidence** `[storm]`: the Engineer never appears in the live session flow at all in v1 — F16 (the
engineer-facing working surface) is explicitly out of scope, and the participant confirmed no
additional actor was missing from the live-flow list. The Engineer converges with everyone else
only through the derived artifacts, read asynchronously, on no fixed schedule relative to the
session itself. This matches the book's "independent upstream, convergent downstream" shape
almost exactly, except the convergence point here (a downloaded artifact) is looser than the
book's shared schedule.

**Open disagreement:** none surfaced.

### Candidate 3 — Question & Hot Spot Resolution

**Heuristic:** swimlanes (independence, not appearance).

**Evidence** `[storm]`: Question Asked → resolution is a thread that does not block or
synchronize with the proposal-accept loop's own pace. A question can stay open across many
Contribution Made / Proposal Made / Proposal Accepted cycles before finally resolving (or never
resolving, surfacing at Session Closed instead). That's the book's discriminator exactly — *runs
on its own clock* — rather than merely being drawn in a separate lane for tidiness. The three
policy relationships this session found (Absent Stakeholder Named, Knowledge Gap Revealed, Session
Closed-with-unresolved-question, each → Hot Spot Raised) all live inside this candidate thread.

**Open disagreement:** none surfaced.

### Language heuristic — no candidate produced

Several language divergences were found this session (Element/Node vs. kind-specific naming,
Rename vs. Reworded, Recorded vs. Raised), but none of them line up with a pivotal event the way
the book's strongest signal requires (*"a conflicting wording at a pivotal event is the strongest
single signal available"*). These read as one team's implementation vocabulary diverging from the
workshop's discovered vocabulary — a real finding, recorded under Language in the board — but not
boundary evidence on their own. Stating this explicitly rather than forcing a fourth seam to match
a fourth heuristic.

## What crosses each candidate boundary — observed, not classified

| Between | What crosses it | Observed by |
|---|---|---|
| Session Lifecycle and Modeling Capture | Domain Problem Stated sets the scope the capture loop operates within; Chosen Problem Named/Skipped consumes the accumulated Hot Spot Raised events | `[inferred]` — no relationship named, only what the events reference |
| Facilitation and Artifact Consumption | The derived artifact set (structured export, readable account) — the only thing that crosses | `[glossary]`, PRD F10 |
| Question & Hot Spot Resolution and the rest | Hot Spot Raised feeds into Chosen Problem Named/Skipped's input (hot spots are what get chosen from) | `[inferred]` |