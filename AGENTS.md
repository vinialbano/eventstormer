# EventStormer — agent instructions

A living domain model built by conversation. A domain expert describes their business; an AI
facilitator proposes typed elements; the human accepts, edits, or rejects each one. Engineering
consumes artifacts derived from that model, never a hand-written copy.

**Product truth lives in `docs/product/PRD.md`.** Feature ids (`F01`…`F17`) are permanent and
append-only. If an instruction here and the PRD disagree, the PRD wins and this file is wrong —
say so rather than picking one.

**Open decisions live in `DECISIONS-PENDING.md`** (local, gitignored — working notes, not a
deliverable). Check it before choosing anything not settled here. Do not silently decide
something that file lists as open.

## Running the gate

`pnpm check` = typecheck → lint → test → depcruise → knip, in that order, failing fast. CI and
the pre-push hook run exactly this; they must never be able to disagree about what green means.
`pnpm dev` is one process — Vite serves the SPA and hands `/api/*` to the Hono app.

## The one rule that is not negotiable

`src/domain/` imports **nothing** from Hono, Vue, the AI SDK, or any framework. It is plain
TypeScript. dependency-cruiser enforces this; do not add an exemption to make a build pass.

If domain code seems to need a framework type, the design is wrong: the dependency points the
wrong way. Move the framework-facing part into a capability or an adapter.

## Layout

```
src/domain/            model, reducer, replay, invariants, graph ranking. Framework-free.
src/capabilities/      one folder per use-case slice; each owns its http.ts, logic, and data
src/plumbing/          result types, ids, errors — extracted on the Rule of Three, not before
src/app/               Vue UI
```

Every arrow here is enforced by dependency-cruiser, and each rule was verified by planting a
violation and watching it fail — not by reading the config:

- `domain` may not import a framework, a Node builtin, or anything above it.
- `plumbing` is a leaf; it may not reach back into `domain`, `capabilities`, or `app`.
- Capability slices may not import each other. Share through `domain` or `plumbing`.
- `app` talks to capabilities over HTTP, never by importing their `http.ts` or `data.ts`.

Routes are composed, not discovered. A slice exports its routes from `http.ts`; one composition
file mounts them all. There is no filesystem routing anywhere in this project.

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

## Facts agents reliably get wrong here

- **TypeScript is pinned to `6.0.3`, and `typescript@latest` (7.0.2) will break the build.**
  `typescript-eslint@8`'s peer range is `>=4.8.4 <6.1.0`, so TS 7 kills every type-aware lint
  rule — the exact sensors this repo depends on. Under pnpm's strict peers it hard-fails.
  Do not "upgrade" TypeScript.
- **`baseUrl` is deprecated in TS 6** and errors out. Paths use `./src/*` directly.
- **`module` is `"preserve"`, and there is no `moduleResolution` line** — `preserve` implies
  `bundler` resolution and `esModuleInterop`. Do not "fix" this by adding them back.
- **`moduleDetection: "force"` is load-bearing.** Without it, two files that import nothing share
  a global scope and identical top-level `const` names collide with TS2451, pointing at a file
  nobody touched.
- **dependency-cruiser rules must match `(?:^|/)node_modules/<pkg>/`, never `^node_modules/`.**
  pnpm resolves to `node_modules/.pnpm/hono@4.13.4/node_modules/hono/…`, so a `^` anchor matches
  nothing and the rule silently passes forever. This bug was live in this repo and found only by
  planting a violation. **After editing an architecture rule, plant a violation and confirm it
  fails.**
- **These packages are deliberately not installed yet** — install them in the sitting that uses
  them, at these verified pins, so knip stays a true signal rather than a wall of false positives:
  `ai@7.0.77`, `@ai-sdk/anthropic@4.0.41`, `zod@4.4.3`, `nanoid@6.0.1`, `vue-router@5.2.0`,
  `@hono/node-server@2.1.1`, `@vue-flow/core@1.48.2`, `@dagrejs/dagre@3.1.1`.
- **`src/app/shims-vue.d.ts` looks deletable and is not.** `vue-tsc` resolves `.vue` imports for
  real and ignores it, but `typescript-eslint` does not run the Vue language plugin — without the
  shim, `import App from './App.vue'` becomes an error type and `no-unsafe-argument` fires.
  Verified both directions. It does not mask real prop types.
- **The `/api` dev-server regex needs `(?:\/|$)`.** `@hono/vite-dev-server` documents only an
  additive denylist; the inverted lookahead is our extension. Without the `$` alternative, bare
  `/api` escapes it and Vite answers with the SPA instead of Hono answering 404.
- **The published `@hono/vite-dev-server` README is stale for 0.26.1.** Read
  `node_modules/@hono/vite-dev-server/dist/dev-server.mjs` for the real defaults — the documented
  `exclude` list, `ignoreWatching`, and `base` all differ.
- **Do not enable `coverage.thresholds.autoUpdate` yet.** It rewrites `vite.config.ts` in place
  on any full coverage run, and with no real tests `branches` measures 0/0 → reported as 100% →
  written as a permanent 100% floor. Enable it once real tests exist.
- **Tailwind v4 in an SFC `<style>` block needs `@reference "../style.css";`** at the top before
  `@apply` or `@variant` will work — each `<style>` block is compiled in isolation. Utility
  classes in the template need nothing.
- **`jiti` is an explicit devDependency on purpose.** ESLint declares it only as an *optional
  peer*, but `eslint.config.ts` cannot load without it. Do not remove it as "unused".
- **Use `defineConfig` from `eslint/config`, never `tseslint.config()`** — the latter is
  deprecated. Inside `extends`, preset arrays go in **un-spread**; the top level of
  `defineConfig([...])` still takes a plain array.
- **Do not exclude `*.config.ts` from type-aware linting.** It is in tsconfig's `include`, so
  excluding it silently disables `no-floating-promises` and `no-deprecated` on `vite.config.ts`
  and `eslint.config.ts`. Only `.js`/`.cjs`/`.mjs` sit outside the graph.
- **`engine-strict=true` is in `.npmrc` and `engines.node` is in `package.json`.** A
  contributor below Node 22.5 gets a clear install-time refusal instead of a confusing
  `node:sqlite` runtime failure. Don't remove either half.
- **CI has no `version:` on `pnpm/action-setup`, deliberately.** It reads `packageManager`
  from `package.json` via Corepack, so the pnpm pin has exactly one home. Do not add one back.
- **`.vue` needs `extraFileExtensions: ['.vue']` and `parserOptions.parser`,** but *not* an
  explicit `parser` line — `eslint-plugin-vue`'s `flat/base` already assigns
  `vue-eslint-parser`. The plugin's own docs omit `extraFileExtensions`; without it every SFC
  fails to parse.
- **`@stylistic/eslint-plugin` is an optional peer of eslint-plugin-vue and is not installed.**
  Its 25 lazily-resolved rules are all disabled under `flat/recommended`. Do not add it.
- **Do not narrow `enhancedResolveOptions.extensions` in dependency-cruiser.** The default list
  covers `.d.ts`/`.tsx`/`.mts`/`.json`; narrowing it makes those imports unresolvable and
  therefore invisible to the architecture rules.
- **Hono routes must be chained** — `new Hono().get(...).post(...)`. Breaking the chain silently
  breaks RPC and `testClient` type inference.
- **`vue-router` is v5**, not v4.
- **`pinia@4` requires `@vue/devtools-api` installed explicitly** — a non-optional peer.
- **`@dagrejs/dagre`, never `dagre`.** The unscoped package died in 2022. It ships its own types,
  so do **not** install `@types/dagre`.
- **`node:sqlite` has no `db.transaction(fn)`.** Use `db.exec('BEGIN IMMEDIATE')` / `'COMMIT'` /
  `'ROLLBACK'`; read `db.isTransaction`. WAL is a PRAGMA, and `db.exec` discards rows — assert it
  took with `db.prepare('PRAGMA journal_mode=WAL').get()`. Rows are **null-prototype objects**:
  `row.hasOwnProperty(...)` will throw.
- **`generateObject` is deprecated.** Use `generateText` + `Output.array({ element: schema })`.
- **Pin `providerOptions: { anthropic: { structuredOutputMode: 'outputFormat' } }`.** On the
  default `'auto'` a discriminated union can route through `jsonTool` and fail with
  `Schema type 'oneOf' is not supported`.
- **Do not set `temperature` on Opus 5 or Sonnet 5** — it is silently stripped. Use
  `output_config.effort` instead, and never claim the model runs at temperature 0.
- **Zod constraints do not reach the model.** `min`, `max`, `pattern`, `.refine()` are stripped
  from the schema the provider sees. Mirror every rule into `.describe()` text. Zod still enforces
  locally, so violations surface as `NoObjectGeneratedError` — a real error path, handle it.
- **Read `result.warnings` on every model call** and log them. Settings are dropped silently.
- **Model ids take no date suffix**: `claude-opus-5`, never `claude-opus-5-2026xxxx`.

## Memory Hygiene

- Never store issue/PR status in memory — derive from `git log` and `gh issue list` (or the repo
  status, once it has a remote).
- Never store file paths, code patterns, or architecture derivable from the codebase.
- Store only: decisions with rationale, feedback with "why", references to external systems.
- Before acting on a memory that names a file, function, or flag: verify it still exists.

## Working agreements

- **Hooks enforce what this file only explains.** A `PostToolUse` hook lints every file you edit
  and returns the errors immediately; a `Stop` hook runs the full gate and refuses to let you
  finish on a red tree; a `PreToolUse` hook blocks `--no-verify`, force pushes, and writes to
  `.env`. Do not work around them — fix what they report.
- Branch before committing; never commit to `main`. Conventional commit prefixes (`feat:`,
  `fix:`, `docs:`, `chore:`).
- Tests co-locate with what they cover and run through the public interface, never private
  helpers. Domain tests need no DOM — plain Vitest, `environment: 'node'`.
- When you finish a task, run the full check before claiming it works. "It should work" is not a
  result; a passing command is.
- If you cannot make something work, say so and say what you tried. Do not weaken a test, widen a
  type to `any`, or add a lint exemption to get to green — every one of those is a silent
  regression in the thing this repo exists to enforce.

<!-- Commands land here once the project is scaffolded. Until then there is no build, no test
     runner, and no dev server — do not invent script names. -->
