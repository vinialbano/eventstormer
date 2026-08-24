import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import devServer from '@hono/vite-dev-server'

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    // One process, one terminal: Vite serves the SPA and hands /api/* to the
    // Hono app in the same dev server. The alternative — two terminals plus
    // server.proxy — is more moving parts for no benefit at this size.
    devServer({
      entry: 'src/server.ts',
      exclude: [
        /^(?!\/api\/).*/, // anything not under /api is Vite's
      ],
      injectClientScript: false,
    }),
  ],
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts', 'src/**/*.vue'],
      exclude: ['src/**/*.test.ts', 'src/app/**/*.d.ts'],
      // No number yet — thresholds ratchet upward from whatever real tests
      // reach, rather than sitting at an arbitrary bar that gets gamed with
      // assertion-free tests.
      thresholds: { autoUpdate: true, lines: 0, functions: 0, branches: 0, statements: 0 },
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'domain',
          // The domain layer does no I/O and touches no DOM. If a test here
          // starts needing jsdom, the layer has grown a dependency it must not have.
          environment: 'node',
          include: ['src/{domain,capabilities,plumbing}/**/*.test.ts'],
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
