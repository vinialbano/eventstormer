# src/domain/ — path-scoped

Loaded automatically when work happens in this directory. Restates and expands the one rule that
governs everything here; see the root `AGENTS.md` for everything else.

## The one rule that is not negotiable

Imports **nothing** from Hono, Vue, Pinia, the AI SDK, or any Node builtin. Plain TypeScript only.
`dependency-cruiser` fails the build on violation, including on type-only imports; do not add an
exemption to make a build pass.

If a type here seems to need a framework, the design is wrong: the dependency points the wrong
way. Move the framework-facing part into a capability or an adapter. No I/O — persistence lives
behind a port in a capability slice.

## Domain invariants — code must preserve these

- **Node kinds are a discriminated union, not a generic sticky.** Domain event, actor, system,
  hot spot. Each kind permits different relations and markers. A pivotal hot spot, or an actor
  with a predecessor, must be *unrepresentable* — not merely rejected at runtime.
- **Two relations, told apart by their source kind:**
  `follows` (event → event, cycle-checked) and `causedBy` (actor|system → event).
  Actors and systems are roots; they never occupy a timeline position.
- **Every operation carries an author**, and facilitator-originated operations record both the
  proposer and the human who accepted.
- **The log is append-only.** Operations are never edited in place. Every operation carries a
  schema version from the first commit — a v1 operation must stay replayable forever.
- **Duplicates and contradictions are preserved.** Never merge two nodes, never dedupe by label.
  They are discovery data.
- **No language model in any projection path.** Derived artifacts are rendered from templates over
  the model. Determinism is the product's central claim; a model call here breaks it.
- **Rendered references vs quoted evidence.** A rendered reference resolves a node id and always
  shows the current label. Quoted evidence is frozen verbatim and must *not* follow a rename.
  A label typed into free text is quoted evidence and diverges by design.
- **Position is derived, never authored.** No coordinate is ever stored. If you are writing a
  pixel value into the model, stop.

## Testing

Tests run with `environment: 'node'` — no DOM, ever, in this directory. If a test here starts
needing `jsdom`, the layer has grown a dependency it must not have.
