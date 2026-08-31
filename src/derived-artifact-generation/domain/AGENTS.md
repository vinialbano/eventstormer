# src/derived-artifact-generation/domain/ — path-scoped

Loaded automatically when work happens in this directory. Restates and expands the one rule that
governs everything here; see the root `AGENTS.md` for everything else.

## The one rule that is not negotiable

Imports **nothing** from Hono, Vue, Pinia, the AI SDK (`ai`, `@ai-sdk/*`), or any Node builtin.
Plain TypeScript only. `dependency-cruiser` fails the build on violation, including on type-only
imports; do not add an exemption to make a build pass.

If a type here seems to need a framework, the design is wrong: the dependency points the wrong
way. Move the framework-facing part into a capability. No I/O — this Supporting context reads
Domain Model Capture and Session Facilitation only through each context's `api.ts`.

Branded ids use Zod's `z.$brand` (`z.string().brand<'X'>()` in an upstream `schema/`, mirrored as
`string & z.$brand<'X'>` in `src/plumbing/ids.ts`). Never hand-roll a `{ __brand }` marker.

## Domain invariants — code must preserve these

This Supporting context earns **no aggregate**. It is a pure function of already-committed
snapshots: template renderers, not a write model. It enforces no invariant and holds no stream.

- **No language model in any projection path.** Derived artifacts are rendered from templates over
  the model. Determinism is the product's central claim; a model call here breaks it.
- **Rendered references vs quoted evidence.** A rendered reference resolves a Building Block's id
  and always shows the current label. Quoted evidence is frozen verbatim and must *not* follow a
  **Reworded** (the confirmed term — not "rename"; the id never changes, only the articulation
  does).
- Cross-context reads go through `domain-model-capture/api.ts` and `session-facilitation/api.ts`
  only — never those contexts' `domain/`, `capabilities/`, or `infrastructure/`. This `domain/`
  imports `plumbing/` only.

## Testing

Tests run with `environment: 'node'` — no DOM, ever, in this directory. If a test here starts
needing `jsdom`, the layer has grown a dependency it must not have. Projected values are pinned to
literals the test spells out; Markdown is byte-identical for the same input.
