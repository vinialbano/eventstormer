# Server stack research: Vite + Vue 3 SPA + Hono + node:sqlite

Researched 2026-08-23. Every substantive claim is tagged **[verified]** (read in a primary
source, or executed locally on this machine) or **[inferred]** (my reasoning, not from a source).

Version facts below came from `npm view <pkg> version` run locally on 2026-08-23:

| package | version |
|---|---|
| `hono` | 4.13.3 |
| `@hono/node-server` | 2.1.1 |
| `@hono/zod-validator` | 0.9.0 |
| `@hono/vite-dev-server` | 0.26.1 |
| `@hono/vite-build` | 1.11.1 |
| `dependency-cruiser` | 18.2.0 |
| `vite-plugin-node` | 8.0.0 |
| `better-sqlite3` | 13.0.3 |
| `@libsql/client` | 0.17.4 |
| `zod` | 4.4.3 |

---

## 1. `node:sqlite` — the decisive fact

**Verdict: usable today, no flag, but not yet "Stable". It is a Release Candidate.**

### Stability timeline [verified — https://nodejs.org/api/sqlite.html]

The current Node docs page for the `node:sqlite` module states:

- **Stability: 1.2 — Release candidate**
- **Added in: v22.5.0**
- Version history on the page:
  - **v22.5.0** — module introduced, behind `--experimental-sqlite`
  - **v23.4.0 and v22.13.0** — *no longer requires the `--experimental-sqlite` flag* (still marked experimental at that point)
  - **v25.7.0** — *marked as release candidate*

The v25.7.0 change is confirmed in the release notes changelog entry
[verified — https://nodejs.org/en/blog/release/v25.7.0]:

```
* [ee59127664] - sqlite: mark as release candidate (Matteo Collina) #61262
```

### Minimum Node version without flags

**Node 22.13.0** (on the 22.x LTS line) or **23.4.0+**. Anything newer — 24.x, 25.x, 26.x —
also works flagless. [verified — version history table on the docs page above]

### Does it print an ExperimentalWarning?

**No, not on Node 24.16.0.** [verified — executed locally]

I ran a script on this machine (`node -v` → **v24.16.0**) with `2>&1` capturing stderr:

```
$ node -e "const {DatabaseSync}=require('node:sqlite'); ..." 2>&1
journal_mode -> [Object: null prototype] { journal_mode: 'wal' }
foreign_keys -> [Object: null prototype] { foreign_keys: 1 }
[ { seq: 1, payload: '{"a":1}' }, { seq: 2, payload: '{"a":2}' } ]
iterate? function
```

No `ExperimentalWarning` line appeared. Note that web search results claim the warning is still
emitted — that claim is **wrong for Node 24.16.0**, and I trust the executed run over the blog
posts. I did **not** test Node 22.13.x, so I cannot say whether the warning fires there; if you
pin to 22.x, verify it yourself with one line.

Caveat: "Release candidate" means the API surface is *not frozen*. A minor Node upgrade could
change a signature. For a prototype this is an acceptable risk; the surface you need is tiny.

### Does it support what an append-only log needs? Yes — all three, verified by execution.

- **Prepared statements** — `db.prepare(sql)` returns a `StatementSync` with
  `.run()`, `.get()`, `.all()`, `.iterate()`. `.run()` returns `{ changes, lastInsertRowid }`.
  [verified — docs page + executed: `{ changes: 1, lastInsertRowid: 1 }`, and
  `typeof stmt.iterate === 'function'`]
- **Transactions** — there is no `db.transaction(fn)` wrapper like better-sqlite3's. You drive
  it with `db.exec('BEGIN IMMEDIATE')` / `'COMMIT'` / `'ROLLBACK'`, and `db.isTransaction` is a
  read-only boolean telling you whether you are inside one.
  [verified — docs page lists `isTransaction`; executed: printed `isTransaction true`
  between BEGIN and COMMIT, and both inserted rows were visible after COMMIT]
- **WAL mode** — not a constructor option; set it with a PRAGMA. Reading it back confirms it
  took: `db.prepare('PRAGMA journal_mode=WAL').get()` → `{ journal_mode: 'wal' }` against a
  file-backed database. [verified — executed]
  Note `db.exec('PRAGMA journal_mode=WAL')` returns `undefined` (exec discards rows), so use
  `prepare().get()` if you want to assert the mode actually changed. [verified — executed]
- Bonus: **foreign keys are ON by default** (`PRAGMA foreign_keys` → `1`), unlike raw SQLite.
  [verified — executed]

Rows come back as **null-prototype objects** (`[Object: null prototype]`). Harmless for
`JSON.stringify` and property access; it will bite you if any code does `row.hasOwnProperty(...)`
or passes rows to something that walks the prototype chain. [verified — executed]

Also available per the docs page: `db.serialize()` / `sqlite.deserialize()` and an async
`sqlite.backup(sourceDb, path)`. [verified — docs page]

### Alternatives, if you decide RC is too loose

- **`better-sqlite3` (13.0.3)** — the mature, synchronous, battle-tested option, and the API
  `node:sqlite` was modelled on. Has the ergonomic `db.transaction(fn)` wrapper `node:sqlite`
  lacks. **Native module**: needs prebuilt binaries or a compile step; breaks on Node major
  upgrades until prebuilds land; adds friction to Docker/CI and to any AI agent that just runs
  `npm ci` on a different platform.
- **`@libsql/client` (0.17.4)** — libSQL (SQLite fork) client; async API; can point at a local
  file or a remote Turso instance, which is the reason to pick it. Async everywhere means your
  reducer/replay call sites become async. **[inferred]**: for a server-authoritative log where
  you replay synchronously on load, the sync API of `node:sqlite` is a genuine simplicity win.

**Recommendation [inferred]:** use `node:sqlite` on Node 24 LTS. Zero dependencies, zero native
build step, no warning noise, and it does everything an append-only log needs. Wrap it behind a
tiny port interface in the domain-adjacent layer so swapping to `better-sqlite3` is a one-file
change if the RC status ever bites.

---

## 2. Hono structure and modularity

**The answer to the specific question is yes: route definitions live wherever you put them and
are composed at a root. Hono has no filesystem-routing convention in its core.**
[verified — see mechanisms below; I found no filesystem-router in the Hono core docs]

### `app.route()` — the composition mechanism
[verified — https://hono.dev/docs/api/routing]

A `Hono` instance is just a value. You build one per slice, export it, and mount it:

```typescript
const book = new Hono()
book.get('/', (c) => c.text('List Books'))       // GET /book
book.get('/:id', (c) => { const id = c.req.param('id'); return c.text('Get Book: ' + id) })
book.post('/', (c) => c.text('Create Book'))     // POST /book

const app = new Hono()
app.route('/book', book)
```

The mount prefix is decided **at the root**, by the composing file — not by where the file sits
on disk. That is exactly the property you want: `src/capabilities/session/routes.ts` can be
mounted at `/api/sessions` with no directory named `api` or `sessions` anywhere.

### `basePath()` — prefix owned by the sub-app instead
[verified — same page]

```typescript
const user = new Hono().basePath('/user')
user.get('/', (c) => c.text('List Users'))       // GET /user
user.post('/', (c) => c.text('Create Users'))    // POST /user

const app = new Hono()
app.route('/', user)                              // mounted at root; /user comes from basePath
```

So you have both directions: the parent names the prefix (`app.route('/book', book)`), or the
child owns its own prefix and the parent mounts it flat (`app.route('/', user)`). **[inferred]**
For a slice layout, prefer the parent naming the prefix — it keeps the URL map readable in one
root file and keeps slices ignorant of their mount point.

### Chaining, and why it matters for types
[verified — https://hono.dev/docs/guides/rpc and https://hono.dev/docs/guides/best-practices]

If you want end-to-end type inference (the RPC client `hc`, or the typed test client), routes
must be **chained** off the instance, because the type accumulates through the chain:

```typescript
// authors.ts
import { Hono } from 'hono'
const app = new Hono()
  .get('/', (c) => c.json('list authors'))
  .post('/', (c) => c.json('create an author', 201))
  .get('/:id', (c) => c.json(`get ${c.req.param('id')}`))
export default app

// index.ts
import { Hono } from 'hono'
import authors from './authors'
import books from './books'
const app = new Hono()
const routes = app.route('/authors', authors).route('/books', books)
export default app
export type AppType = typeof routes
```

Note the docs' own note: for RPC types to infer correctly, `"strict": true` must be set in
`compilerOptions` on both sides. [verified — RPC guide]

**[inferred]** This is the one real structural constraint Hono imposes: `app.get(...)` on
separate statements loses the type accumulation. It costs you nothing organisationally (a slice
file still owns its own routes), but the AI agents writing your code need to know to chain.

### `hono/factory` — handlers defined away from the app
[verified — https://hono.dev/docs/helpers/factory and .../guides/best-practices]

Yes, `createFactory` and `createMiddleware` exist and are the documented answer to
"I want controller-like separation without losing types":

```typescript
import { createFactory, createMiddleware } from 'hono/factory'
import { logger } from 'hono/logger'

const factory = createFactory()

const middleware = factory.createMiddleware(async (c, next) => {
  c.set('foo', 'bar')
  await next()
})

const handlers = factory.createHandlers(logger(), middleware, (c) => {
  return c.json(c.var.foo)
})

app.get('/api', ...handlers)
```

`createFactory<Env>()` takes your `Env` generic once so you don't retype it per component:

```typescript
type Env = { Variables: { foo: string } }
const factory = createFactory<Env>()
```

The docs describe this explicitly as being for "managing TypeScript types, ensuring consistency
across your application". [verified — factory helper page]

### Middleware scoping

Middleware is registered with `app.use(path, mw)` and applies to matching paths on that
instance. Because each slice is its own `Hono` instance, `sliceApp.use('*', mw)` scopes the
middleware to that slice only, wherever the slice ends up mounted. **[inferred from the
composition model — I did not find a docs page that states this scoping property in those
words]**, though the `serveStatic` example below is a real `app.use('/static/*', ...)` usage.

### Filesystem routing — anything that fights a slice layout?

**Nothing in Hono core.** [verified — the routing API is `app.get/post/route/basePath`; nothing
in the routing docs implies a directory convention]. Some Hono-adjacent packages in the
`honojs/vite-plugins` and HonoX ecosystem do file-based routing, but you simply do not install
them. **[inferred]** This is the sharpest contrast with Nuxt: in Nuxt, `server/api/**` *is* the
router and the folder tree *is* the URL tree; in Hono the router is a value you assemble.

---

## 3. Hono practicalities for this app

### Type-safe JSON handlers
`c.json(value)` — the returned type is what the RPC/test client infers. [verified — RPC guide
examples above]

### Request validation — `@hono/zod-validator` is current
[verified — https://github.com/honojs/middleware/tree/main/packages/zod-validator, plus
`npm view` for versions]

`@hono/zod-validator@0.9.0`, peer deps `{ hono: '>=4.11.2', zod: '^3.25.0 || ^4.0.0' }` —
so it **supports Zod v4** (current zod is 4.4.3). Usage:

```javascript
import * as z from 'zod'
import { zValidator } from '@hono/zod-validator'

const schema = z.object({ name: z.string(), age: z.number() })

app.post('/author', zValidator('json', schema), (c) => {
  const data = c.req.valid('json')
  return c.json({ success: true, message: `${data.name} is ${data.age}` })
})
```

`c.req.valid('json')` is typed from the schema. Targets other than `'json'` (query, param, form)
exist; I only verified `'json'` from the README example.

**[inferred]** This is the same `zod` you are already using to validate the Vercel AI SDK output,
so one schema library covers both edges.

### Error handling
[verified — https://hono.dev/docs/api/exception]

```typescript
import { HTTPException } from 'hono/http-exception'

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return err.getResponse()
  }
  console.error(err)
  return c.text('Internal Server Error', 500)
})
```

`app.onError` is a single root-level hook — good fit for mapping domain errors (invariant
violations from your reducer) to HTTP status codes in one adapter file, keeping HTTP concerns
out of the domain. **[inferred]**

### Running on Node — `@hono/node-server`
`@hono/node-server@2.1.1`, `engines: { node: '>=20' }`, `peerDependencies: { hono: '^4' }`.
[verified — `npm view`]

### Serving the built Vite SPA from the same process
[verified — https://hono.dev/docs/getting-started/nodejs]

```ts
import { fileURLToPath } from 'node:url'
import { serveStatic } from '@hono/node-server/serve-static'

app.use(
  '/static/*',
  serveStatic({ root: fileURLToPath(new URL('./', import.meta.url)) })
)
```

The docs explicitly recommend resolving `root` absolutely via `import.meta.url` so it does not
depend on the process CWD. There is also a `rewriteRequestPath` option to map a URL prefix onto
a different filesystem directory (their example maps `/static/*` → `./statics`).
[verified — same page]

**[inferred]** For a resumable-by-URL SPA you additionally need an SPA fallback: any unmatched
non-`/api` GET should return `index.html` so `/session/abc123` deep-links work. I did **not**
find a documented one-option SPA-fallback flag in `@hono/node-server/serve-static`; you will
likely write a final `app.get('*', ...)` that serves `index.html`. Flagging this as unverified —
check the serve-static options before assuming.

### SSE / streaming — for the later multi-client broadcast
[verified — https://hono.dev/docs/helpers/streaming]

```ts
import { stream, streamText, streamSSE } from 'hono/streaming'

const app = new Hono()
let id = 0

app.get('/sse', async (c) => {
  return streamSSE(c, async (stream) => {
    while (!stream.aborted) {
      const message = `It is ${new Date().toISOString()}`
      await stream.writeSSE({ data: message, event: 'time-update', id: String(id++) })
      await stream.sleep(1000)
    }
  })
})
```

`stream.aborted`, `stream.writeSSE({ data, event, id })` and `stream.sleep(ms)` are all shown in
the official example. The `id` field is exactly what you want for an operation-log broadcast —
SSE `id` + `Last-Event-ID` gives resume-from-sequence for free. **[inferred]** The docs' only
caveat is Cloudflare/Wrangler-specific (add an `Identity` `Content-Encoding` header); no
Node-specific caveat is documented.

### Testing without starting a server
[verified — https://hono.dev/docs/guides/testing and https://hono.dev/docs/helpers/testing]

```ts
const res = await app.request('/posts')
expect(res.status).toBe(200)

const res2 = await app.request('/posts', { method: 'POST' }, MOCK_ENV)
```

And the typed client:

```ts
import { testClient } from 'hono/testing'

const app = new Hono().get('/search', (c) => { /* ... */ })
const client = testClient(app)
const res = await client.search.$get({ query: { q: 'hono' } })
```

`testClient` requires the **chained** route definition style for inference (same constraint as
RPC). [verified — testing helper page]

**[inferred]** This is a significant practical win for an AI-agent-written codebase: an HTTP-level
integration test is a plain function call with no port, no lifecycle, no teardown, no flake.

---

## 4. One-process dev setup

Three candidates. My reading:

### Option A — Vite `server.proxy` (recommended for a Vue SPA)
Two processes, one terminal via a `concurrently`/`npm-run-all` script, or via `node --watch` on
the server plus `vite` on the client. Vite's dev server proxies `/api` to the Hono port.

**[inferred, and this is my recommendation]**: your app is a *Vue SPA plus a JSON API*, not a
server-rendered Hono app. The SPA wants Vite's own dev server (HMR, Vue plugin, the whole
pipeline). Hono wants to be a plain Node process. `server.proxy` is the boring, well-trodden
seam between them and it is a stock Vite feature, not a plugin you can outgrow. I did not fetch
the Vite proxy docs page for this report — the option exists and is standard, but treat the
exact config keys as unverified until you look at
https://vite.dev/config/server-options#server-proxy.

### Option B — `@hono/vite-dev-server` (0.26.1)
[verified — https://github.com/honojs/vite-plugins/tree/main/packages/dev-server]

"A Vite Plugin that provides a custom dev-server for fetch-based web applications like those
using Hono." Options include `entry` (default `'./src/index.ts'`), `exclude` (paths not served
by the dev server), `injectClientScript` (hot-reload injection into HTML responses, default
`true`), and `adapter`.

```typescript
import { defineConfig } from 'vite'
import devServer from '@hono/vite-dev-server'

export default defineConfig({
  plugins: [devServer({ entry: 'src/index.ts' })],
})
```

Node specifically:

```typescript
import devServer from '@hono/vite-dev-server'
import nodeAdapter from '@hono/vite-dev-server/node'
import { defineConfig } from 'vite'

export default defineConfig(async () => {
  return { plugins: [devServer({ adapter: nodeAdapter })] }
})
```

This genuinely gives you **one process, one terminal**, with the Hono app running inside Vite.
Two reservations, both **[inferred]**:
1. It is designed for apps where Hono *serves the HTML*. In a Vue-SPA setup you'd be relying on
   `exclude` to keep the SPA's own requests away from the Hono entry — workable, but the
   plugin's happy path is not your shape.
2. `@hono/vite-dev-server@0.26.1` declares `dependencies: { '@hono/node-server': '^1.19.11' }`
   while current `@hono/node-server` is **2.1.1** [verified — `npm view`]. That's a major-version
   lag inside the plugin. Not necessarily breaking, but it is a maintenance smell for a plugin
   you'd be putting on the critical path of your dev loop.

### Option C — `vite-plugin-node` (8.0.0)
A third-party plugin for running a Node server inside Vite. I did **not** fetch its docs and
cannot describe its API. **[inferred]**: for a Hono app, the first-party `@hono/vite-dev-server`
is the better-supported of the two, so Option C only matters if B disappoints.

### Production: single Node process
**[inferred]**, but each piece is verified:
1. `vite build` → `dist/client` (the SPA).
2. Compile the server with `tsc` (or `esbuild`/`tsdown`) → `dist/server`.
3. One Node process runs `@hono/node-server`, mounts the API routes, and serves `dist/client`
   via `serveStatic({ root: ... })` with an SPA fallback.

`@hono/vite-build@1.11.1` ("Vite plugin to build your Hono app") exists if you'd rather Vite
build the server too. [verified — `npm view`] I did not read its docs and cannot tell you
whether it handles the two-bundle SPA+server case cleanly. **[inferred]**: plain `tsc` for the
server is fewer moving parts for a prototype, and it keeps the server build independent of
Vite's plugin graph.

---

## 5. dependency-cruiser against this layout

**This is strictly easier than the Nuxt case.** [inferred, but the reason is concrete]: Nuxt has
auto-imports, virtual modules (`#imports`, `#app`), and a generated `.nuxt` tsconfig, so a large
fraction of the dependency graph is invisible to a static import crawler. A plain Vite/TS project
has **only real `import` statements** and a **normal `tsconfig.json`** — which is exactly the
input dependency-cruiser is built for.

### The rule shape
[verified — https://github.com/sverweij/dependency-cruiser/blob/main/doc/rules-reference.md]

A `forbidden` rule has `name`, `severity` (`error` | `warn` | `info` | `ignore`, default `warn`),
`comment`, `from`, `to`. Paths are **regular expressions, not globs**; `^` anchors the start, `$`
the end, and `/` is the separator on every platform. A verbatim example from the reference
(forbidding cross-imports between sibling folders — note the `$1` back-reference, which is
directly reusable for "no slice may import another slice"):

```json
{
  "name": "no-inter-ubc",
  "comment": "Don't allow relations between business components",
  "severity": "error",
  "from": { "path": "^src/business-components/([^/]+)/.+" },
  "to": {
    "path": "^src/business-components/([^/]+)/.+",
    "pathNot": "^src/business-components/$1/.+"
  }
}
```

### The rule you asked to confirm

Framework isolation is a `to.dependencyTypes`/`to.path` question on npm packages rather than
file paths. Shape **[inferred from the verified rule grammar above]** — the `from`/`to`/`path`/
`pathNot`/`severity` keys are all verified; the composition into this specific rule is mine:

```javascript
// .dependency-cruiser.cjs
module.exports = {
  forbidden: [
    {
      name: 'domain-is-framework-free',
      comment: 'The domain layer must not know about the web framework or the UI.',
      severity: 'error',
      from: { path: '^src/domain' },
      to: { path: 'node_modules/(hono|vue|@vue/|@hono/)' },
    },
    {
      name: 'domain-imports-nothing-outward',
      comment: 'The domain layer may only import from itself.',
      severity: 'error',
      from: { path: '^src/domain' },
      to: { path: '^src/', pathNot: '^src/domain' },
    },
  ],
  options: {
    tsConfig: { fileName: 'tsconfig.json' },
    tsPreCompilationDeps: true,
    doNotFollow: { path: 'node_modules' },
  },
}
```

Two options matter and are **[verified — https://github.com/sverweij/dependency-cruiser/blob/main/doc/options-reference.md]**:

- **`tsConfig: { fileName: 'tsconfig.json' }`** — the docs state that with this set,
  dependency-cruiser resolves your `paths` and `baseUrl` aliases during module resolution. So
  `@/domain/...` alias imports are understood, not skipped. This is the single most important
  option for your setup.
- **`tsPreCompilationDeps: true`** — by default dependency-cruiser **ignores dependencies that
  vanish after compilation to JavaScript**, i.e. **type-only imports**. Without this flag, a
  domain file doing `import type { Context } from 'hono'` would **pass** your rule. Set it to
  `true` or your framework-free guarantee has a hole. [verified — options reference]
- `doNotFollow: { path: 'node_modules' }` — see the package in reports without crawling into it.
  [verified — options reference, verbatim example]
- `exclude` / `includeOnly` also exist for trimming the graph. [verified]

**[inferred]** The `to.path` matching against `node_modules/(hono|vue|...)` is the pattern I'd
expect to work given paths are plain regexes over module paths, but I did **not** find a verbatim
docs example forbidding a *specific npm package by name*. Verify with one deliberate violating
import before you trust the rule — a rule that silently never fires is worse than no rule.
`dependency-cruiser` also ships an `--init` that generates a starting config; running it in the
project and then editing is the low-risk path.

### Published Vite/TS example?
**Could not verify.** I did not find a published dependency-cruiser example specifically for a
plain Vite/TypeScript project. The rules-reference and options-reference are framework-agnostic
and the `tsConfig` option covers the only Vite-specific concern (path aliases), so I do not think
one is needed. **[inferred]**

---

## What I could not verify

- Whether `node:sqlite` emits an `ExperimentalWarning` on **Node 22.13.x** (I only tested
  v24.16.0, where it does not).
- Whether `@hono/node-server/serve-static` has a built-in **SPA fallback** option; I assumed a
  manual catch-all route.
- **Vite `server.proxy`** config keys — I relied on general knowledge, did not fetch the page.
- **`vite-plugin-node`** API — not researched beyond confirming it exists at 8.0.0.
- **`@hono/vite-build`** capabilities for a combined SPA+server build.
- A **verbatim docs example** of a dependency-cruiser rule forbidding a named npm package.
- Middleware scoping to a sub-app instance — inferred from the composition model, not read.

Sources used: nodejs.org/api/sqlite.html, nodejs.org/en/blog/release/v25.7.0, hono.dev docs
(api/routing, api/exception, guides/rpc, guides/best-practices, guides/testing,
helpers/factory, helpers/streaming, helpers/testing, getting-started/nodejs),
github.com/honojs/middleware zod-validator, github.com/honojs/vite-plugins dev-server,
dependency-cruiser rules-reference.md and options-reference.md, plus `npm view` and local
`node` execution on this machine. Context7 library id used: `/websites/hono_dev`.

---

## Verdict: is "Hono gives free folder organisation and better modularization" overstated?

**No. It is accurate, and for a slice layout it is the strongest argument in Hono's favour.**

The concrete reason: **in Nuxt, the router is the filesystem; in Hono, the router is a value.**
`server/api/foo/bar.post.ts` *is* the route `POST /api/foo/bar` — the URL tree and the directory
tree are the same tree, and you cannot separate them. In Hono, a route is `book.post('/', h)` on
an object you exported from any file, and the URL prefix is chosen by whoever calls
`app.route('/book', book)`. Your `src/capabilities/<slice>/http.ts` can define routes that mount
anywhere, and the whole URL map lives in one composition file you can read in ten seconds.
[verified mechanism — hono.dev/docs/api/routing]

The framework-free domain requirement gets a second, independent win: **there is nothing to
exempt.** Hono has no auto-imports, no virtual modules, no generated tsconfig — so
dependency-cruiser sees the true graph from plain `import` statements, and the rule
`^src/domain` ↛ `hono|vue` is genuinely mechanical rather than best-effort. Set
`tsPreCompilationDeps: true` so type-only imports can't sneak through.

Three honest costs, so the decision is made with open eyes:

1. **You assemble what Nuxt hands you.** Dev-server wiring, production static serving with SPA
   fallback, the build pipeline for two bundles — all yours to write once. That is maybe a day,
   and for an AI-agent-written codebase that explicitness is arguably a feature.
2. **The chaining constraint.** `new Hono().get(...).post(...)` must be chained for RPC and
   `testClient` type inference to work. A small, learnable rule, but a real one — put it in
   your agent instructions.
3. **`node:sqlite` is a release candidate, not stable.** Flagless and warning-free on Node 24,
   fully capable (prepared statements, transactions via BEGIN/COMMIT, WAL via PRAGMA — all
   verified by execution), but the API is not frozen. Put it behind a port; the escape hatch to
   `better-sqlite3` should stay one file wide.

Net: the developer's stated condition — "if it allows me to customize the folder architecture
and have better modularization" — is **met, on the merits, not on marketing.**
