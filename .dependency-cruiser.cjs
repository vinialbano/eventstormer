// The strategic boundaries, made mechanical. ADR-002 organises src/ by bounded
// context first; these rules are the enforcement. Every path-anchored rule was
// re-verified by planting a real violation and watching `pnpm depcruise` fail —
// a decorative rule is the exact silent-pass failure this repo already hit once
// (the pnpm node_modules anchor). After editing any rule here, plant a violation
// and confirm it fails before trusting it.

/** The v1 bounded contexts. `host/` and `app/` are not contexts. */
const CONTEXTS = 'domain-model-capture|session-facilitation|derived-artifact-generation'

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'Circular imports make replay order and module init order unpredictable.',
      from: {},
      to: { circular: true },
    },

    {
      name: 'domain-imports-no-framework',
      severity: 'error',
      comment:
        "Every context's domain/ is plain TypeScript. It models the board, the op log, replay " +
        'and ranking, and it must stay runnable without a server or a browser. If domain code ' +
        'appears to need a framework type, the dependency points the wrong way: move the ' +
        'framework-facing part into a capability or an adapter. Do not add an exemption to make ' +
        'a build pass.',
      from: { path: '^src/[^/]+/domain/' },
      to: {
        // Anchored on '/node_modules/<pkg>/' rather than '^node_modules/': pnpm
        // resolves to node_modules/.pnpm/hono@4.13.4/node_modules/hono/..., so a
        // '^' anchor matches nothing and the rule becomes decorative. Verified by
        // planting a violation and watching it fail.
        path:
          '(?:^|/)node_modules/(?:hono|@hono/[^/]+|vue|vue-router|pinia|@vue/[^/]+|@vue-flow/[^/]+|ai|@ai-sdk/[^/]+|vite|@dagrejs/[^/]+)/',
      },
    },

    {
      name: 'domain-imports-no-node-builtins',
      severity: 'error',
      comment:
        'The domain layer does no I/O. Persistence lives behind a port in plumbing/, which keeps ' +
        'the escape hatch from node:sqlite to better-sqlite3 one file wide.',
      from: { path: '^src/[^/]+/domain/' },
      to: { dependencyTypes: ['core'] },
    },

    {
      name: 'domain-imports-nothing-above',
      severity: 'error',
      comment:
        "A context's domain/ sits at the bottom. It may import only its own context's domain/ " +
        'and src/plumbing/. Not host/, not app/, not another context (not even that context’s ' +
        'domain/) — cross-context access goes through api.ts, and the domain layer never reaches ' +
        'up to a capability or an adapter.',
      from: { path: '^src/([^/]+)/domain/' },
      to: { path: '^src/', pathNot: '^src/(?:$1/domain/|plumbing/)' },
    },

    {
      name: 'plumbing-is-a-leaf',
      severity: 'error',
      comment:
        'src/plumbing/ holds Result, branded id symbols, the Clock and the EventStore port + ' +
        'adapters. It may not reach back into the layers that use it — including a type-only ' +
        "import of a context's schema (tsPreCompilationDeps catches those too).",
      from: { path: '^src/plumbing/' },
      to: { path: `^src/(${CONTEXTS}|host|app)/` },
    },

    {
      name: 'cross-context-only-via-api',
      severity: 'error',
      comment:
        "One context reaches another only through that context's api.ts — never its domain/, " +
        'capabilities/, or infrastructure/. Sideways imports are how bounded contexts quietly ' +
        'become one module (ADR-002).',
      from: { path: `^src/(${CONTEXTS})/`, pathNot: '^src/[^/]+/api\\.ts$' },
      to: {
        path: `^src/(${CONTEXTS})/`,
        pathNot: ['^src/$1/', '^src/[^/]+/api\\.ts$'],
      },
    },

    {
      name: 'host-imports-only-context-api',
      severity: 'error',
      comment:
        'The composition root wires contexts together, but only through their api.ts. Importing ' +
        "a context's domain/, capabilities/, or infrastructure/ directly bypasses the one seam " +
        'that keeps a context replaceable.',
      from: { path: '^src/host/' },
      to: { path: `^src/(${CONTEXTS})/`, pathNot: '^src/[^/]+/api\\.ts$' },
    },

    {
      name: 'ui-does-not-import-server-code',
      severity: 'error',
      comment:
        'The Vue app talks to capabilities over HTTP, never by importing their route files or ' +
        'data access directly. Bundling server code into the client leaks the API key path.',
      from: { path: '^src/app/' },
      to: { path: '^src/[^/]+/.*/(http|data)\\.ts$' },
    },

    {
      name: 'app-imports-capture-only-via-timeline',
      severity: 'error',
      comment:
        'The SPA may import domain-model-capture only from domain/timeline/ — the published ' +
        'rank/edge read interface. Importing decide, api.ts, or infrastructure would pull the ' +
        'write model or Hono/sqlite into the client bundle. Hide-withdrawn is a local view ' +
        'filter, so ranks are recomputed from GET topology, never from a precomputed layout.',
      from: { path: '^src/app/' },
      to: {
        path: '^src/domain-model-capture/',
        pathNot: '^src/domain-model-capture/domain/timeline/',
      },
    },

    {
      name: 'no-cross-store-imports',
      severity: 'error',
      comment:
        'Each Pinia store cold-loads its slice of client state from one GET (ADR-007). A store ' +
        'importing a sibling store rebuilds the coupling the single-GET rule exists to remove.',
      from: { path: '^src/app/[^/]+/stores/([^/]+)\\.ts$', pathNot: '\\.test\\.ts$' },
      to: {
        path: '^src/app/[^/]+/stores/([^/]+)\\.ts$',
        pathNot: ['^src/app/[^/]+/stores/$1\\.ts$', '\\.test\\.ts$'],
      },
    },

    {
      name: 'no-cross-slice-imports',
      severity: 'error',
      comment:
        'Capability slices are independent. Share through the context’s domain/ or through ' +
        'src/plumbing/, never sideways — sideways imports are how slices quietly become one ' +
        'module.',
      from: { path: '^src/([^/]+)/capabilities/([^/]+)/' },
      to: {
        path: '^src/([^/]+)/capabilities/([^/]+)/',
        pathNot: '^src/$1/capabilities/$2/',
      },
    },

    {
      name: 'no-orphans',
      severity: 'warn',
      comment: 'A file nothing imports is usually a leftover from a refactor.',
      from: {
        orphan: true,
        pathNot: [
          '(^|/)\\.[^/]+\\.(js|cjs|mjs|ts|json)$',
          '\\.d\\.ts$',
          '(^|/)tsconfig\\.json$',
          '(^|/)(?:package|package-lock)\\.json$',
          // A context's api.ts is its public surface — an entry point by design
          // (knip treats it the same). It is legitimately unimported until
          // another context or host/ wires it.
          '^src/[^/]+/api\\.ts$',
        ],
      },
      to: {},
    },

    {
      name: 'not-to-dev-dep',
      severity: 'error',
      comment:
        'Shipped code must not depend on a devDependency. `*.test.ts` and shared test-support ' +
        'modules (`*-test.ts`, e.g. the EventStore contract suite) are exempt — they never ship.',
      from: { path: '^src', pathNot: '(\\.(spec|test)|-test)\\.(ts|tsx)$' },
      to: { dependencyTypes: ['npm-dev'], dependencyTypesNot: ['type-only'] },
    },
  ],

  options: {
    doNotFollow: { path: 'node_modules' },
    // Without this, a `import type { Hono } from 'hono'` in the domain layer
    // is invisible to the crawler and the rule above becomes best-effort.
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
    enhancedResolveOptions: {
      // All three are load-bearing: dropping exportsFields leaves vue, hono,
      // hono/testing and vitest unresolvable, and dropping the block entirely
      // leaves two. Deliberately NOT narrowing `extensions` — the default list
      // covers .d.ts/.tsx/.mts/.json, and an unresolvable import is invisible to
      // the architecture rules, which is the same silent-pass class of bug the
      // pnpm path anchor already caused once.
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      mainFields: ['module', 'main', 'types', 'typings'],
    },
    reporterOptions: {
      dot: { collapsePattern: 'node_modules/(?:@[^/]+/[^/]+|[^/]+)' },
      archi: {
        collapsePattern: `^src/(?:(?:${CONTEXTS})/(?:domain|capabilities/[^/]+|infrastructure)|plumbing|host|app)`,
      },
    },
  },
}
