# Framework and library gotchas — Hono, Vue, Pinia, dagre, node:sqlite

Read this before touching a `capabilities/*/http.ts` file, a Vue SFC, `dagre` layout code, or the
persistence layer. Version facts differ from what an agent's training data or a package's
top-level docs would assume.

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
- **Tailwind v4 in an SFC `<style>` block needs `@reference "../style.css";`** at the top before
  `@apply` or `@variant` will work — each `<style>` block is compiled in isolation. Utility
  classes in the template need nothing.

## Not installed yet

Install each at the verified pin below, in the sitting that first uses it, so `knip` stays a true
signal rather than a wall of false positives:

- `vue-router@5.2.0`
- `@hono/node-server@2.1.1`
