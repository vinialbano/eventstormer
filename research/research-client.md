# Client stack research — Vite + Vue 3 SPA (off Nuxt)

Date of research: 2026-08-23. All version numbers below were read from the live npm registry
(`npm view <pkg> version`) on that date, not from memory.

**Legend:** `[V]` = verified against a primary source (registry metadata, package tarball, official
docs, GitHub release notes). `[I]` = inferred/my judgement, not stated by a source.

---

## 0. Version snapshot (all `[V]`, `npm view` 2026-08-23)

| Package | latest | latest publish / modified |
|---|---|---|
| `vite` | **8.2.2** | 2026-08-20 |
| `@vitejs/plugin-vue` | **6.0.8** | 2026-07-21 |
| `vue` | **3.5.41** | 2026-08-21 |
| `vue-router` | **5.2.0** | 2026-07-15 |
| `pinia` | **4.0.3** | 2026-08-12 |
| `vue-tsc` | **3.3.11** | 2026-08-21 |
| `vitest` | **4.1.11** | 2026-08-18 |
| `@vue/test-utils` | **2.4.11** | 2026-06-04 |
| `happy-dom` | **20.11.6** | 2026-08-19 |
| `jsdom` | **30.0.1** | 2026-07-29 |
| `@vue-flow/core` | **1.48.2** | 2026-01-28 |
| `@dagrejs/dagre` | **3.1.1** | 2026-08-08 |
| `dagre` (old, unscoped) | **0.8.5** | 2022-06-14 — dead, do not use |
| `elkjs` | **0.12.0** | 2026-07-17 |
| `d3-dag` | **1.2.2** | 2026-07-05 |
| `v-network-graph` | **0.9.23** | 2026-06-21 |
| `create-vue` | **3.23.0** | 2026-07-21 |
| `@vue/devtools-api` | **8.2.1** | — |
| `@vueuse/core` | **14.4.0** | — |

> ### ⚠️ Correct the brief: `vue-router` is on **v5**, not v4.
> The task said "vue-router v4". Latest is **5.2.0** (v5.0.0 shipped 2026-01-29). This matters less
> than it sounds — see §2 — but the version number in any scaffolding instruction should be `5`.

---

## 1. Folder freedom and modularization

### There are no filesystem conventions. `[V]`

Plain Vite + Vue 3 has exactly one convention: `index.html` at project root is the entry point, and
the app is bootstrapped from whatever `<script type="module" src="...">` you point it at. Nothing
scans directories. Components, stores and route definitions can live in per-capability folders and
be imported by explicit path.

The one thing that *could* have imposed a layout is file-based routing — and in Vue Router 5 it is
**opt-in**. From the official migration guide: file-based routing "is an optional feature added in
v5 through the integration of unplugin-vue-router into the core package. It is not enabled by
default." (https://router.vuejs.org/guide/migration/v4-to-v5.html) You enable it by adding the
`vue-router/vite` plugin to `vite.config.ts`. I confirmed the subpath exists in the published
tarball's `exports` map (`"./vite"`, `"./unplugin"`, `"./auto-routes"`, `"./auto-resolver"`). `[V]`

**So: do not add `vue-router/vite`.** With two routes, hand-written route objects in a
`routes.ts` per capability is strictly less machinery. `[I]`

### Aliases

`vite.config.ts` — `resolve.alias` (https://vite.dev/config/shared-options#resolve-alias):

```ts
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@domain': fileURLToPath(new URL('./src/domain', import.meta.url)),
      '@app':    fileURLToPath(new URL('./src/app', import.meta.url)),
    },
  },
})
```

`tsconfig.json` — `paths` must be declared separately; Vite does **not** read tsconfig paths for you
and TypeScript does not read Vite's aliases. Both sides need the mapping:

```jsonc
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@domain/*": ["./src/domain/*"],
      "@app/*":    ["./src/app/*"]
    }
  }
}
```

`[I]` The duplication is the classic footgun: an alias added to one file and not the other gives you
a dev server that works and a `vue-tsc` run that fails (or vice versa). With AI-written code this
drifts fast. Two options: keep both in sync by hand (fine for 2–4 aliases), or skip aliases entirely
and use relative imports — for a prototype with a shallow tree, relative imports cost nothing and
remove a whole class of confusion. I lean toward **at most one or two aliases**, not a per-capability
alias per folder.

Note `vitest` resolves through the same Vite config, so aliases defined in `vite.config.ts` apply to
tests automatically if you use a single config file. `[I from Vitest sharing Vite's resolver]`

### Does Vue SFC tooling or `vue-tsc` assume a layout? `[V] no`

`vue-tsc@3.3.11` depends only on `@volar/typescript` and `@vue/language-core`, with a peer of
`typescript >=5.0.0` (registry metadata). It is a TypeScript compiler wrapper — it type-checks
whatever `include`/`files` your tsconfig names. No directory assumptions.

`@vitejs/plugin-vue@6.0.8` peers: `vue ^3.2.25`, `vite ^5 || ^6 || ^7 || ^8` `[V]`. It transforms
`*.vue` files wherever they are.

Two soft conventions worth knowing, neither enforced: `[V]`
- `vite-env.d.ts` is conventionally in `src/` (Vite docs place it there for `ImportMetaEnv`
  augmentation), but it is just a `.d.ts` — put it anywhere in the tsconfig `include`.
- `public/` at project root is copied verbatim to the build output. If you don't need it, delete it.

### Practical layout `[I]`

Nothing stops per-capability folders like:

```
src/
  main.ts
  domain/            # framework-free TS. no vue import anywhere.
  timeline/          { components/, store.ts, routes.ts }
  backlog/           { components/, store.ts }
  review-queue/      { components/, store.ts }
  app/               { App.vue, router.ts }
```

`src/app/router.ts` imports each capability's `routes.ts` and concatenates. Nothing magic.

---

## 2. Router and state without a meta-framework

### `vue-router@5` — upgrade is a no-op for manual routes `[V]`

From the v5.0.0 release notes (https://github.com/vuejs/router/releases, tag `v5.0.0`, 2026-01-29),
quoted verbatim:

> "Vue Router 5 is a _boring_ release, it merges [unplugin-vue-router](https://uvr.esm.is) into the
> core package with no breaking changes. The only exception is that the _iife_ build no longer
> includes `@vue/devtools-api` because it has been upgraded to v8 and does not expose an IIFE build
> itself."

The migration guide restates it: "If you're using Vue Router 4 without unplugin-vue-router, there
are no breaking changes." The IIFE caveat is irrelevant here (Vite bundles ESM).

`unplugin-vue-router` on npm is now **deprecated** with the message: `"Merged into vuejs/router.
Migrate: https://router.vuejs.org/guide/migration/v4-to-v5.html"` `[V]` — so any AI-generated code
or blog post that reaches for `unplugin-vue-router` is out of date.

`createRouter` / `createWebHistory` are still in the type declarations of the published 5.2.0
tarball `[V]`. The standard setup is unchanged:

```ts
// src/app/router.ts
import { createRouter, createWebHistory } from 'vue-router'

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/',      name: 'home',    component: () => import('@app/HomeView.vue') },
    { path: '/s/:id', name: 'session', component: () => import('@app/SessionView.vue'), props: true },
  ],
})
```

`props: true` passes `:id` as a prop rather than making the component reach for `useRoute()`. `[I]`
Preferable here since it keeps the view testable without a router instance.

**`vue-router@5` peer dependencies** — read from the tarball, with `peerDependenciesMeta`: `[V]`

```
vue                  ^3.5.34 || ^4.0.0      (required)
@vue/compiler-sfc    ^3.5.34 || ^4.0.0      (OPTIONAL)
pinia                ^3.0.4 || ^4.0.2       (OPTIONAL)
@pinia/colada        >=0.21.2               (OPTIONAL)
vite                 ^7.3.0 || ^8.0.0       (OPTIONAL)
```

All four extras are `optional: true`. They exist for the merged unplugin (needs `vite` +
`@vue/compiler-sfc`) and for the experimental data-loaders (needs `pinia` / `@pinia/colada`). If you
don't use those features, npm/pnpm will not demand them. `[V]` A 5.2.0 changelog entry is literally
`"fix: Allow pinia 4"` — so pinia 4 + vue-router 5.2.0 is a tested combination.

`[I]` **Do not touch** `vue-router/experimental` or the data-loaders. They are labelled experimental
in the exports map and moved between 5.0 and 5.1 ("make experimental esm only"). Wrong place for a
time-boxed prototype.

### `pinia@4` — standalone setup, plus one gotcha `[V]`

From the v4.0.0 release notes (https://github.com/vuejs/pinia/releases, 2026-07-14), verbatim:

> "Pinia 4 contains only technically breaking changes: ESM only and upgrading `@vue/devtools-api`
> which now must be installed alongside pinia."

Registry metadata confirms both: `pinia@4.0.3` has `"type": "module"`, and its
`peerDependenciesMeta` marks `typescript` optional but **`@vue/devtools-api` `optional: false`**.
Peers are `vue ^3.5.11`, `typescript >=5.6.0`, `@vue/devtools-api ^8.1.5`. `[V]`

**Gotcha #1 — you must install `@vue/devtools-api` yourself.** `[V]`

```bash
npm i pinia @vue/devtools-api
```

With npm's auto-install-peers this may resolve on its own, but with pnpm's default settings it will
warn or fail. Latest `@vue/devtools-api` is `8.2.1`, satisfying `^8.1.5`. `[V]` If a build fails with
an unresolved `@vue/devtools-api`, this is why — it is a *required*, not optional, peer.

**Gotcha #2 — pinia 4 is ESM-only.** `[V]` Fine in a Vite SPA. It matters if you later want to
import a store into a plain-CJS Node script. `[I]`

Standalone setup — unchanged from pinia 2/3 and identical outside Nuxt:

```ts
// src/main.ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { router } from '@app/router'
import App from '@app/App.vue'

createApp(App).use(createPinia()).use(router).mount('#app')
```

**Gotchas using Pinia outside Nuxt** `[I]`, all consequences of losing Nuxt's auto-wiring:
- No auto-imports. `defineStore`, `storeToRefs`, `useRouter` etc. must be imported explicitly in
  every file. AI-generated code trained on Nuxt examples will omit these imports; expect to fix that
  repeatedly. Consider adding a lint rule or just accepting the typecheck catches it.
- No auto-registration of `stores/*.ts`. Each store is a module you import where you use it.
- Calling `useSomeStore()` at module top-level (outside a component `setup` or after
  `app.use(pinia)`) throws "no active Pinia" — in Nuxt this was papered over. Keep store access
  inside `setup()` / composables / event handlers.
- No SSR hydration concerns at all here, which removes `skipHydrate` and state-serialization
  entirely. This is a simplification, not a gotcha.

`[I]` **Doc-lag warning stands.** `pinia@4` shipped 2026-07-14 and `vue-router@5` on 2026-01-29 —
both recent. The releases are explicitly non-breaking for the APIs you'll use, so lagging docs are
mostly harmless here, but any AI-generated `package.json` is likely to pin `vue-router@^4` and
`pinia@^2`/`^3`. Pin the majors explicitly in your first install command.

---

## 3. DAG / timeline rendering — the high-risk item

### What you actually need

A left-to-right layered DAG: events ranked by causal order, branching where one event has several
successors, merging where several predecessors converge, and each event node carrying attached
actor/system chips *below* it — meaning the node is a **Vue component of variable height**, not a
box of fixed size. Plus inline editing inside nodes.

That last requirement is the discriminator. It rules out anything that renders nodes to canvas or to
fixed SVG rects. `[I]`

### Option A — hand-rolled CSS grid over a computed topological rank

**What it is:** you compute rank (longest-path from sources) per node yourself, group nodes by rank
into columns, and let CSS grid place them. Edges drawn as an absolutely-positioned SVG overlay, or
omitted.

- Fixed left-to-right layered layout: **yes, trivially** — rank = grid column. `[I]`
- Arbitrary Vue components as nodes: **yes, perfectly.** Nodes are just DOM; inline editing, variable
  height, attached chips all come free. `[I]`
- Bundle/config burden: **zero.** No dependency. `[I]`
- Maintenance health: yours.

**The cost, and be honest about it** `[I]`: ranking is ~15 lines (Kahn's algorithm + longest-path
rank). Placing nodes in columns is easy. **Drawing the edges is where the time goes.** Once a node
can be at an arbitrary y within its column and heights vary, you need per-node measured geometry
(`ResizeObserver` or `getBoundingClientRect` after render), then an SVG overlay recomputed on every
resize/edit, then bezier or orthogonal path routing, then crossing-reduction if you don't want the
splits to look like spaghetti. Vertical ordering *within* a rank to minimise crossings is the actual
Sugiyama hard part and it is not 15 lines.

There is a cheap escape hatch: **skip the edges**. Columns left-to-right already communicate
sequence; you can convey branching with indentation, a left border, or a "branch" label, and never
draw a line. `[I]` If that reads acceptably for the prototype, Option A is a 1–2 hour job. If you
insist on drawn curved edges, it is not.

### Option B — layout library that computes coordinates only

You call a function with node IDs + measured sizes + edges, get back `{x, y}` per node, and you draw
everything.

**`@dagrejs/dagre@3.1.1`** — the maintained scoped fork. The unscoped `dagre@0.8.5` was last
published **2022-06-14** and is dead; `@dagrejs/dagre` has releases through 2026-08-08 with commits
that week. `[V]` It **ships its own TypeScript types** (`"types": "./dist/types/index.d.ts"` in the
manifest) `[V]` — so **do not install `@types/dagre`**, that's for the dead unscoped package.
`"type": "module"` with a CJS `main` (dual). Sole runtime dep: `@dagrejs/graphlib@4.0.5`. `[V]`
Minified ESM build: **~49 KB** (`dist/dagre.esm.js`, measured from the tarball). `[V]`

Options from the official wiki (https://github.com/dagrejs/dagre/wiki) `[V]`:
`rankdir` — `"TB"` (default) | `"BT"` | `"LR"` | `"RL"`; `nodesep` (default 50); `ranksep` (default
50); `edgesep` (default 10); `ranker` — `"network-simplex"` (default) | `"tight-tree"` |
`"longest-path"`; `align` — `"UL"|"UR"|"DL"|"DR"`; `marginx`/`marginy`.
API: `new dagre.graphlib.Graph()`, `g.setGraph({...})`, `g.setDefaultEdgeLabel(() => ({}))`,
`g.setNode(id, { width, height })`, `g.setEdge(src, tgt)`, `dagre.layout(g)`, then `g.node(id).x/.y`.
**Nodes come back as centre coordinates.** `[V]`

`rankdir: 'LR'` is exactly your fixed left-to-right layered layout, and dagre does crossing reduction
for you — the part Option A makes you write. `[V/I]`

**`d3-dag@1.2.2`** — actively maintained (commits 2026-08-01, only 3 open issues) `[V]`. Its README
states, verbatim: "Lightweight, TypeScript-first DAG layout for the web", "**Small bundle** - a
fraction of elkjs's ~500KB transpiled Java", and it now ships a **dagre-compatible shim**:
"Replace `import dagre from \"dagre\"` with `import { dagre } from \"d3-dag\"`. Most graph
construction and layout methods work the same." with `rankdir`/`nodesep`/`ranksep` supported. `[V]`
Minified ESM: **~142 KB** — nearly 3× dagre. `[V]` Runtime deps include `javascript-lp-solver` and
`quadprog` (it does optimal crossing minimisation via LP). `[V]` Its README also flags: "Every node
needs a positive `width` and `height`. Unlike dagre (which tolerates zero-sized nodes), a node
created without dimensions" — text truncated at that point in my read, but the constraint is clear.
`[V]`

`[I]` d3-dag buys better crossing minimisation and deeper types. Neither is worth 3× the bundle and
a less-travelled path for a prototype whose graph is *not* the differentiator.

**`elkjs@0.12.0`** — Eclipse Layout Kernel transpiled from Java. Actively maintained (commits
2026-08-13) `[V]`. **Unpacked package: 8.05 MB**; `lib/elk-worker.min.js` alone is **1.6 MB**
minified, `lib/elk.bundled.js` **1.6 MB** `[V, measured from tarball]`. Async API (Promise-based,
designed to run in a Web Worker). License is `NOASSERTION` per GitHub's detector (EPL) `[V]` —
distinct from the MIT of everything else in this stack, worth a moment's thought even for a
prototype `[I]`.

`[I]` **ELK is the wrong tool here.** It is the best layered-layout engine on this list by output
quality, and it is also 30× dagre's size with an async worker setup to configure. That is a
deliberate trade you make when graph aesthetics *are* the product. Yours aren't.

### Option C — full graph component

**`@vue-flow/core@1.48.2`** — Vue 3 port of React Flow. 6.8k stars, MIT, 19 open issues, not
archived. `[V]` **Health caveat: last npm publish 2026-01-28, ~7 months ago.** Repo `pushed_at` is
2026-07-14 but the recent commits are docs-only (`docs: add fathom`, `fix(docs): ...`); the last
substantive commit I saw was the January release changelog. `[V]` Peer: `vue ^3.3.0` — fine on
3.5.41. `[V]`

Critically, from the official docs (https://vueflow.dev/examples/layout/simple.html), verbatim:

> "Vue Flow does not include a built-in system for automatically positioning nodes. Developers can
> achieve automatic layouting by integrating third-party libraries, such as dagre, to calculate and
> assign node positions programmatically."

**So Option C is not an alternative to Option B — it is Option B plus a canvas.** `[V/I]` Vue Flow
gives you pan/zoom, edge rendering with handles, selection, dragging, minimap/background addons. It
does not give you layout. You still write the dagre call.

Custom nodes are first-class and are real Vue components — two registration styles, both documented
(https://vueflow.dev/guide/node.html, https://vueflow.dev/guide/vue-flow/config.html) `[V]`:

```vue
<!-- via node-types prop -->
<script setup>
import { VueFlow } from '@vue-flow/core'
import CustomNode from './CustomNode.vue'
const nodeTypes = { custom: CustomNode }
</script>
<template><VueFlow :nodes="nodes" :edges="edges" :node-types="nodeTypes" /></template>
```

```vue
<!-- or via slot, name is always `node-<type>` -->
<template>
  <VueFlow :nodes="nodes">
    <template #node-custom="props"><CustomNode v-bind="props" /></template>
  </VueFlow>
</template>
```

Connection points use `<Handle type="source" :position="Position.Right" />` /
`type="target" :position="Position.Left"` inside the node component. `[V]`

The official `useLayout` composable from the docs repo
(https://raw.githubusercontent.com/bcakmakoglu/vue-flow/master/docs/examples/layout/useLayout.js) —
this is the whole integration, quoted verbatim `[V]`:

```js
import dagre from '@dagrejs/dagre'
import { Position, useVueFlow } from '@vue-flow/core'
import { ref } from 'vue'

export function useLayout() {
  const { findNode } = useVueFlow()
  const graph = ref(new dagre.graphlib.Graph())

  function layout(nodes, edges, direction) {
    const dagreGraph = new dagre.graphlib.Graph()
    graph.value = dagreGraph
    dagreGraph.setDefaultEdgeLabel(() => ({}))

    const isHorizontal = direction === 'LR'
    dagreGraph.setGraph({ rankdir: direction })

    for (const node of nodes) {
      const graphNode = findNode(node.id)
      if (!graphNode) { console.error(`Node with id ${node.id} not found in the graph`); continue }
      dagreGraph.setNode(node.id, { width: graphNode.dimensions.width || 150, height: graphNode.dimensions.height || 50 })
    }
    for (const edge of edges) dagreGraph.setEdge(edge.source, edge.target)

    dagre.layout(dagreGraph)

    return nodes.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id)
      return {
        ...node,
        targetPosition: isHorizontal ? Position.Left : Position.Right && Position.Top,
        sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
        position: { x: nodeWithPosition.x, y: nodeWithPosition.y },
      }
    })
  }
  return { graph, layout }
}
```

*(the `targetPosition` line above is my transcription artifact — the source reads
`targetPosition: isHorizontal ? Position.Left : Position.Top`. Use that.)*

Two things to notice in that official example `[I]`:
1. `graphNode.dimensions` is read from the **already-rendered** node — which is why the example
   triggers layout on `@nodes-initialized`, after Vue Flow has measured the DOM. This is exactly the
   mechanism that makes variable-height nodes (your actor/system chips) work, and it is why layout
   must run *after* first paint, then again whenever a node's height changes.
2. dagre returns **centre** coordinates but Vue Flow's `node.position` is **top-left**. The official
   example assigns centre directly, so nodes are offset by half their size. d3-dag's README does it
   correctly: `{ x: pos.x - pos.width / 2, y: pos.y - pos.height / 2 }`. `[V for both snippets; I for
   the conclusion that the Vue Flow example is off by half]` Expect to hit this and know the fix.

Bundle: `dist/vue-flow-core.mjs` is **345 KB unminified** `[V, measured]`; I did not measure minified
or gzipped, and Vite will minify it — so the shipped cost is materially smaller than that number,
but I will not invent a figure. Runtime deps: `@vueuse/core ^10.5.0`, `d3-drag`, `d3-interpolate`,
`d3-selection`, `d3-zoom`. `[V]` Note `@vueuse/core` latest is **14.4.0**, so if you use VueUse
elsewhere you will carry **two copies** of it. `[V/I]` Not fatal; worth knowing.

**`v-network-graph@0.9.23`** — 647 stars, MIT, last publish 2026-06-21, actively touched. `[V]` It is
SVG-based and force-layout oriented. `[I]` It is a much smaller community than Vue Flow, still
pre-1.0, and its node model is SVG-shape-centric rather than "arbitrary Vue component" — a poor fit
for editable stickies. I did not verify its layered-layout support in depth; **see §7 for what I did
not check.**

### What I'd pick for a four-hour prototype

**`@vue-flow/core` + `@dagrejs/dagre` with `rankdir: 'LR'`.** `[I]`

Why: the integration is a ~40-line composable that Vue Flow *publishes as an official example*, so
you are copying working code rather than deriving it. Custom nodes are ordinary Vue SFCs, so the
editable sticky and the actor/system chips below it are just markup. Pan/zoom, handles, edge
rendering, selection and drag all arrive done — those are precisely the fiddly parts of Option A.
dagre handles the vertical ordering and crossing reduction that make a branching DAG legible.

**What it costs, honestly:**
- Two dependencies, one of which (`@vue-flow/core`) hasn't had a substantive release in ~7 months.
  For a prototype this is fine; for a product you'd be adopting a slow-moving dep. `[V/I]`
- ~345 KB unminified of graph library plus ~49 KB minified of dagre, and a duplicate `@vueuse/core`
  v10. Irrelevant for a prototype with no SEO and no SSR. `[V/I]`
- A real learning curve of maybe **60–90 minutes**: nodes/edges array shapes, the
  `@nodes-initialized` → measure → layout → `fitView` cycle, `Handle` placement, and the two CSS
  imports (`@vue-flow/core/dist/style.css` and `theme-default.css` `[V]`, without which nothing
  renders). `[I]`
- The centre-vs-top-left offset bug above. Budget 10 minutes. `[I]`
- **Variable-height nodes force a re-layout loop.** Editing a sticky changes its height, which
  changes the layout. You will need to re-run `layout()` on content change, and it will visibly
  reflow. This is the one thing most likely to eat the time budget, and it is *not* avoided by
  Option A — it's inherent to "editable nodes in a computed layout". Mitigation: fix the sticky's
  width and let text wrap, so height changes are rare and small. `[I]`

**When I'd pick Option A instead:** if you can live without drawn edges. A CSS-grid column-per-rank
timeline with no connector lines is genuinely ~1–2 hours, zero deps, and no reflow problem, and it
communicates sequence adequately. If the split/merge structure is something a reviewer must *see*,
you need the edges, and then Vue Flow + dagre is cheaper than writing an SVG edge router. `[I]`

**Whichever you pick, isolate it.** Keep the topological/rank computation and the event graph itself
in the framework-free `src/domain/` module, tested in `environment: 'node'`. Then the renderer is a
swappable adapter and switching from Option A to Option C (or back) is a contained change rather
than a rewrite. `[I]` This is the single highest-leverage thing you can do to de-risk the item.

---

## 4. Testing

### Versions and requirements `[V]`

`vitest@4.1.11`. From the migration guide (https://vitest.dev/guide/migration): **"Vitest 4.0
requires Vite >= 6.0.0 and Node.js >= 20.0.0."** Vite 8 satisfies that. Vite 8's own engines field is
`node: ^20.19.0 || >=22.12.0` `[V]`, which is the binding constraint.

`@vue/test-utils@2.4.11`, peers `vue 3.x`, `@vue/compiler-dom 3.x`, `@vue/server-renderer 3.x` `[V]`.
Still v2 (v2 is the Vue-3 line), still maintained (June 2026).

### Default environment is `node` `[V]`

From https://vitest.dev/guide/environment: the default `environment` value is **`node`**. Built-ins
are `node`, `jsdom`, `happy-dom`, `edge-runtime`. Per-file override via docblock:

```ts
// @vitest-environment jsdom
import { expect, test } from 'vitest'
test('test', () => { expect(typeof window).not.toBe('undefined') })
```

### **A framework-free domain module needs no Vue-specific test setup — confirmed** `[V/I]`

`[V]` because the default environment is `node` and Vitest requires no plugins to run plain TS.
`[I]` for the conclusion: if `src/domain/*.ts` never imports from `vue`, its tests need no
`@vitejs/plugin-vue`, no `@vue/test-utils`, no DOM. They are plain Vitest tests. This is exactly the
property you want for the event-graph/topological-rank logic.

### `test.projects` — the workspace file is gone `[V]`

From https://vitest.dev/guide/projects: "This feature is also known as a `workspace`. The `workspace`
is deprecated since 3.2 and replaced with the `projects` configuration." The migration guide confirms
v4 completes the transition — projects are defined in `vitest.config.ts`, not a separate
`vitest.workspace.*` file. Documented shape, verbatim from the docs:

```ts
export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        test: {
          include: ['tests/**/*.{browser}.test.{ts,js}'],
          name: 'happy-dom',
          environment: 'happy-dom',
        }
      },
      {
        test: {
          include: ['tests/**/*.{node}.test.{ts,js}'],
          name: { label: 'node', color: 'green' },
          environment: 'node',
        }
      }
    ]
  }
})
```

`[I]` Adapted to your layout — note `extends: true` on the component project so it inherits the Vue
plugin and aliases from the root config, while the domain project deliberately does not:

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    projects: [
      { test: { name: 'domain', include: ['src/domain/**/*.test.ts'], environment: 'node' } },
      { extends: true,
        test: { name: 'ui', include: ['src/{timeline,backlog,review-queue,app}/**/*.test.ts'],
                environment: 'happy-dom' } },
    ],
  },
})
```

`[I]` **Simpler alternative, and probably the right one for a prototype:** skip `projects` entirely.
Set `environment: 'node'` globally and put `// @vitest-environment happy-dom` at the top of the few
component test files. One config key instead of a projects array, and the domain-tests-are-pure
property still holds. Reach for `projects` only if the component-test count grows.

### `happy-dom` vs `jsdom` `[V for the characterisation, I for the pick]`

Vitest's own docs describe `happy-dom` as "browser emulation, faster than jsdom but with fewer APIs".
That is the entire trade. `happy-dom@20.11.6` (2026-08-19) is more actively released than
`jsdom@30.0.1` (2026-07-29); both are alive. `[V]`

`[I]` **Pick `happy-dom`** for this app. Faster startup matters when you're iterating, and the APIs
you'd miss are the exotic ones. One caveat worth stating: if you end up testing the Vue Flow canvas
itself, both will struggle — Vue Flow measures DOM geometry (`dimensions`, `getBoundingClientRect`)
and headless DOM implementations return zeros. **Do not try to unit-test the graph rendering.** Test
the domain rank/topology logic in `node`, test the stickies and forms in `happy-dom`, and verify the
canvas by looking at it. `[I]` This also happens to be the fastest path, which is convenient.

---

## 5. Vite specifics

- **`vite@8.2.2`**, engines `node: ^20.19.0 || >=22.12.0` `[V]`. v8.0.0 released 2026-03-12 `[V]`.
- **Vite 8 is a bundler swap.** From https://vite.dev/guide/migration: Vite 8 "uses Rolldown and
  Oxc-based tools instead of esbuild and Rollup." Oxc handles JS transforms; the `esbuild` config
  option still works via automatic conversion to `oxc` settings but that shim is deprecated. CSS
  minification now defaults to Lightning CSS; JS minification uses the Oxc minifier. `[V]`
  `[I]` For an app (not a plugin author), this is mostly invisible. It matters if a dependency ships
  a Rollup-era Vite plugin — the migration guide lists plugin-API changes (`moduleType: 'js'` now
  required when transforming non-JS content, parallel hooks run sequentially, `build()` throws
  structured `BundleError`). You are unlikely to hit any of these with just `@vitejs/plugin-vue`.
- **Default browser targets raised** to Chrome 111, Edge 111, Firefox 114, Safari 16.4, aligned to
  Baseline Widely Available as of January 2026. `[V]` Irrelevant for an internal prototype.
- **`resolve.mainFields` behaviour changed**: format-sniffing on `browser`/`module` fields was
  removed; Vite now respects the configured field order. `[V]` `[I]` Only bites on odd legacy deps.
- **`@vitejs/plugin-vue@6.0.8`**, peers `vue ^3.2.25`, `vite ^5||^6||^7||^8` `[V]` — explicitly
  supports Vite 8.
- **`vue-tsc@3.3.11`** for typechecking. Conventional wiring `[I]`:
  ```json
  { "scripts": { "typecheck": "vue-tsc --noEmit", "build": "vue-tsc --noEmit && vite build" } }
  ```
  `[I]` `vite build` does **not** typecheck — it strips types. If typechecking isn't in the build
  script or in CI, type errors ship silently. With AI-written code that is a real risk; wire it on
  day one.
- **`@vue/tsconfig@0.9.1`** exists as an official base config to extend `[V]`; `create-vue@3.23.0`
  is the official scaffolder `[V]`. `[I]` Scaffolding with `npm create vue@latest` and then deleting
  what you don't want is faster and less error-prone than assembling configs by hand — and it will
  pick correct current versions for you, sidestepping the vue-router-4-vs-5 trap.

### Env vars `[V]`

From https://vite.dev/guide/env-and-mode:
- `import.meta.env` is populated at dev time and **statically replaced at build time** (enabling
  tree-shaking).
- Only variables prefixed **`VITE_`** are exposed to client code. `VITE_SOME_KEY=123` is readable;
  `DB_PASSWORD=foobar` is `undefined` in client code. The prefix is configurable via `envPrefix`.
- Built-ins: `MODE`, `BASE_URL`, `PROD`, `DEV`, `SSR`.
- Types: create `src/vite-env.d.ts` and augment the `ImportMetaEnv` interface for autocomplete.

**The secrets rule, quoted verbatim from the docs:**

> "VITE_* variables should _not_ contain sensitive information such as API keys. The values of these
> variables are bundled into your source code at build time. For production deployments, consider a
> backend server or serverless/edge functions to properly secure secrets."

`[I]` Concretely for this project: **no LLM provider API key ever goes in `VITE_*`.** The Hono server
holds the key and proxies. Anything in `VITE_` is public — treat it as if you printed it on the page,
because effectively you did. The only things that belong there are the API base URL and feature
flags.

### Building to a folder Node serves statically `[V/I]`

`[V]` `build.outDir` defaults to `dist`, `build.emptyOutDir` defaults to true when outDir is inside
root, and `base` (default `/`) sets the public base path — the same value surfaced as
`import.meta.env.BASE_URL`. (https://vite.dev/config/build-options,
https://vite.dev/config/shared-options#base)

`[I]` For a Hono server serving the SPA: build with the default `base: '/'` into `dist/`, point
Hono's static-file middleware at that directory, and add a catch-all that returns `index.html` for
any non-`/api` path — without that fallback, a hard refresh on `/s/:id` 404s, because
`createWebHistory` produces real URLs the server must resolve. This is the single most common
"it works in dev, breaks in prod" bug for a `createWebHistory` SPA. **The exact Hono middleware is
the server researcher's territory, not mine — I did not verify Hono's static-serving API.**

`[I]` During development you don't need any of this: run `vite dev` and put a `server.proxy` entry in
`vite.config.ts` pointing `/api` at the Hono port. Two processes, no CORS, no build step in the loop.

---

## 6. Verdict

**Confirmed, low-risk (§1, §2, §4, §5):** plain Vite + Vue 3 imposes no folder structure whatsoever;
per-capability folders with explicit imports are the natural fit and file-based routing is opt-in and
should stay off. Router and store setup are ~15 lines total. Vitest defaults to `node`, so the
framework-free domain module is tested with zero Vue-specific setup — which is the property that
makes the risky part of §3 containable.

**Three concrete corrections to the brief's assumptions:**
1. `vue-router` is **5.2.0**, not v4 — but v5 is explicitly a no-breaking-changes release for manual
   routing, so only the version pin changes.
2. `pinia@4` **requires you to install `@vue/devtools-api` yourself** (non-optional peer). This will
   bite on first install under pnpm.
3. Use **`@dagrejs/dagre`**, not `dagre`. The unscoped package died in 2022 and `@types/dagre` is not
   needed with the scoped one.

**On question 3, directly: `@vue-flow/core` + `@dagrejs/dagre` with `rankdir: 'LR'`.** Vue Flow does
not do layout (its own docs say so), so this is one choice, not two. You get pan/zoom, edge routing,
handles and drag for free, and your nodes are ordinary Vue SFCs — which is non-negotiable given
editable stickies with variable-height attached actors. The layout call is ~40 lines that Vue Flow
publishes as an official example, so you're copying rather than deriving.

The cost is a 60–90 minute learning curve, two dependencies (one with no substantive release in ~7
months), and one real hazard: **editable variable-height nodes force a re-layout on every content
change**, which will visibly reflow. Fix sticky width so text wraps instead of the box growing.

The fallback if the four hours start burning: **drop the edges and use a CSS grid, column per
topological rank.** That's ~1–2 hours with zero dependencies and no reflow problem, and columns alone
convey sequence. You lose only the visual depiction of split/merge.

Either way, keep ranking and graph topology in `src/domain/` behind a plain interface. That makes the
renderer swappable and converts "the graph overran" from a rewrite into a contained substitution.

---

## 7. What I could not verify, and what I searched

**Searched:** the npm registry directly (`npm view` for versions, dist-tags, publish times, peer
deps, engines, `type`, unpacked sizes); downloaded and unpacked the `vue-router@5.2.0`,
`@dagrejs/dagre`, `elkjs`, `d3-dag` and `@vue-flow/core` tarballs to read `exports` maps, type
declarations and measure real file sizes; the GitHub REST API for releases, repo stats and recent
commits on `vuejs/router`, `vuejs/pinia`, `bcakmakoglu/vue-flow`, `dagrejs/dagre`, `kieler/elkjs`,
`erikbrinkman/d3-dag`, `dash14/v-network-graph`; context7 for `/websites/vueflow_dev`; and the
official docs at vite.dev, vitest.dev, router.vuejs.org and the dagre wiki.

**Not verified — treat as open:**
- **`v-network-graph`'s layered/LR layout support and whether nodes can be arbitrary Vue components.**
  I read its registry metadata and repo stats only. I ruled it out on ecosystem size and SVG-centric
  node model, which is `[I]` judgement, not a documented limitation. If you want it seriously
  considered, that needs a separate look.
- **Minified/gzipped bundle sizes.** All sizes I quote are raw file sizes from the published
  tarballs, labelled as such. Real shipped cost after Vite's Oxc minifier and gzip will be
  meaningfully lower. I refused to estimate.
- **Vue Flow's behaviour under `happy-dom`/`jsdom`.** My claim that headless DOM returns zero
  geometry and breaks its measurement is `[I]` from how the `useLayout` example reads
  `graphNode.dimensions` after `@nodes-initialized`. I did not run it.
- **Hono's static-file middleware and SPA-fallback API.** Explicitly out of scope for me; the
  `dist/` + catch-all shape is standard `[I]` but the exact Hono calls belong to the server research.
- **`@vue/test-utils@2.4.11` against `vitest@4`.** Its peers only constrain `vue 3.x`, and I found no
  Vue-specific breaking change in the Vitest 4 migration guide — but I found no positive confirmation
  either. `[I]` I expect it to be fine; if `mount()` misbehaves, that's the first thing to check.
- **`vue-tsc` behaviour with the `vue-router/vite` plugin's generated route types.** Irrelevant if you
  follow the recommendation not to use file-based routing.
- **Whether `@vue-flow/core`'s `@vueuse/core@^10` really duplicates** rather than dedupes — that
  depends on whether you use VueUse at all and on your package manager's hoisting. `[I]`
- I did **not** find a v3.0.0 changelog for `@dagrejs/dagre`; GitHub's releases list stops at v2.0.0
  (2025-11-23) despite npm having 3.0.0 and 3.1.x. Breaking changes in the 2→3 jump are therefore
  **unknown to me**. Since d3-dag's README notes "dagre v3 added TypeScript support", the major bump
  is plausibly about the type/ESM story, but that is inference from a third party's README.
