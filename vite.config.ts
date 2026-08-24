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
      entry: 'src/server.ts',
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
      exclude: ['src/**/*.test.ts', 'src/server.ts', 'src/app/main.ts'],
      // No thresholds yet, deliberately. `thresholds.autoUpdate` rewrites THIS
      // FILE in place on every full coverage run, and with no real tests it
      // writes meaningless floors — branches measures 0/0, which reports as
      // 100%, so the first partially-covered branch you ever write would fail
      // the build. Enable autoUpdate once real tests exist, per the plan.
      // (An absent threshold key is skipped by the checker, not enforced.)
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
        },
      },
    ],
  },
})
