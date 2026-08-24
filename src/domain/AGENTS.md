# src/domain/ — path-scoped

Loaded automatically when work happens in this directory. Restates the one rule
that governs everything here; see the root `AGENTS.md` for everything else.

- **Imports nothing from Hono, Vue, Pinia, the AI SDK, or any Node builtin.**
  Plain TypeScript only. `dependency-cruiser` fails the build on violation,
  including on type-only imports. If a type here seems to need a framework,
  the design is wrong — move the framework-facing part into a capability.
- No I/O. Persistence lives behind a port in a capability slice.
- Node kinds are a discriminated union; illegal states must be unrepresentable,
  not merely rejected at runtime.
- `follows` (event→event, cycle-checked) and `causedBy` (actor|system→event)
  are the only two relation kinds. Actors and systems never occupy a timeline
  position.
- Position is derived, never authored. No coordinate is ever stored here.
- Tests run with `environment: 'node'` — no DOM, ever, in this directory.
