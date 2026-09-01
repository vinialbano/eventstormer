import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import devServer from '@hono/vite-dev-server'

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    // One process, one terminal: Vite serves the SPA and hands /api/* to the
    // Hono app in the same dev server.
    //
    // The plugin documents only an additive denylist ("paths NOT served by the
    // dev server"), so this inverted lookahead is an undocumented extension.
    // It works because the matcher anchors on ^ with no `m` flag and tests both
    // the raw URL and the parsed pathname, so a query string cannot escape it.
    // The `(?:\/|$)` is load-bearing: without it, bare `/api` fails the
    // lookahead, gets excluded, and Vite answers it with the SPA instead of
    // Hono answering 404. Verified with curl.
    devServer({
      entry: 'src/host/index.ts',
      exclude: [/^(?!\/api(?:\/|$)).*/],
      injectClientScript: false,
    }),
  ],
  resolve: {
    // Vite 8 resolves tsconfig `paths` natively, so `~/*` is defined once, in
    // tsconfig.json, instead of being mirrored into an alias block here.
    tsconfigPaths: true,
  },
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts', 'src/**/*.vue'],
      // Entry points are never imported by a test and would sit at 0%, dragging
      // any future ratchet down for no signal.
      exclude: [
        'src/**/*.test.ts',
        'src/host/index.ts',
        'src/host/routes.ts',
        'src/app/main.ts',
      ],
      // The ratchet is ON: real domain tests now exist. `thresholds.autoUpdate`
      // rewrites the numbers below into THIS FILE on every `pnpm test:coverage`
      // run, only ever upward. A diff to these numbers is a deliberate,
      // committed change — never regenerate-and-discard, and never lower them by
      // hand. The `**/domain/** ≥ 90%` floor (ADR-008) is enforced in CI
      // (`autoUpdate` disabled there) and ratchets up locally like the rest.
      thresholds: {
        autoUpdate: true,
        'src/**/domain/**': { statements: 90, branches: 90, functions: 90, lines: 90 },
      },
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'domain',
          // The domain layer does no I/O and touches no DOM. If a test here
          // starts needing jsdom, the layer has grown a dependency it must not
          // have. This glob is deliberately broad so that a test file added
          // outside the expected folders still runs somewhere.
          environment: 'node',
          include: ['src/**/*.test.ts'],
          exclude: ['src/app/**'],
        },
      },
      {
        extends: true,
        test: {
          name: 'app',
          environment: 'jsdom',
          include: ['src/app/**/*.test.ts'],
          setupFiles: ['src/app/test-setup.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'eval',
          environment: 'node',
          include: ['eval/**/*.test.ts'],
          fileParallelism: false,
          testTimeout: 120_000,
        },
      },
    ],
  },
})
