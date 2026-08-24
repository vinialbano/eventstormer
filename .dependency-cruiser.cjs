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
        'src/domain/ is plain TypeScript. It models the board, the op log, replay and ranking, ' +
        'and it must stay runnable without a server or a browser. If domain code appears to ' +
        'need a framework type, the dependency points the wrong way: move the framework-facing ' +
        'part into a capability or an adapter. Do not add an exemption to make a build pass.',
      from: { path: '^src/domain' },
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
        'The domain layer does no I/O. Persistence lives behind a port in a capability slice, ' +
        'which keeps the escape hatch from node:sqlite to better-sqlite3 one file wide.',
      from: { path: '^src/domain' },
      to: { dependencyTypes: ['core'] },
    },

    {
      name: 'domain-imports-only-domain',
      severity: 'error',
      comment: 'The domain layer sits at the bottom. Nothing above it may be imported downward.',
      from: { path: '^src/domain' },
      to: { path: '^src/(capabilities|app)' },
    },

    {
      name: 'plumbing-is-a-leaf',
      severity: 'error',
      comment:
        'src/plumbing/ holds result types, ids and errors, extracted on the Rule of Three. ' +
        'It may not reach back into the layers that use it.',
      from: { path: '^src/plumbing' },
      to: { path: '^src/(domain|capabilities|app)' },
    },

    {
      name: 'ui-does-not-import-server-code',
      severity: 'error',
      comment:
        'The Vue app talks to capabilities over HTTP, never by importing their route files or ' +
        'data access directly. Bundling server code into the client leaks the API key path.',
      from: { path: '^src/app' },
      to: { path: '^src/capabilities/[^/]+/(http|data)\\.ts$' },
    },

    {
      name: 'no-cross-slice-imports',
      severity: 'error',
      comment:
        'Capability slices are independent. Share through src/domain or src/plumbing, never ' +
        'sideways — sideways imports are how slices quietly become one module.',
      from: { path: '^src/capabilities/([^/]+)/' },
      to: {
        path: '^src/capabilities/([^/]+)/',
        pathNot: '^src/capabilities/$1/',
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
        ],
      },
      to: {},
    },

    {
      name: 'not-to-dev-dep',
      severity: 'error',
      comment: 'Shipped code must not depend on a devDependency.',
      from: { path: '^src', pathNot: '\\.(spec|test)\\.(ts|tsx)$' },
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
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      extensions: ['.js', '.ts', '.vue'],
      mainFields: ['module', 'main', 'types', 'typings'],
    },
    reporterOptions: {
      dot: { collapsePattern: 'node_modules/(?:@[^/]+/[^/]+|[^/]+)' },
      archi: { collapsePattern: '^src/(domain|capabilities/[^/]+|plumbing|app)' },
    },
  },
}
