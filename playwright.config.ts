import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { defineConfig, devices } from '@playwright/test'

/**
 * The ONE end-to-end suite (ADR-008 "one E2E"; docs/testing.md "add with the
 * first real flow"). It boots the real `pnpm dev` process — Vite serving the SPA
 * and handing `/api/*` to the Hono app, the interpretation scheduler running —
 * with `FACILITATOR_MODE=scripted` so the facilitator's turns come from a fixture
 * instead of Anthropic. Real server, real SQLite, fake model.
 *
 * Each run gets a throwaway data directory so it never touches `./data/`.
 */
const dataDir = mkdtempSync(join(tmpdir(), 'eventstormer-e2e-'))
const port = 5178

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: process.env.CI !== undefined,
  timeout: 45_000,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${String(port)}`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: devices['Desktop Chrome'] }],
  webServer: {
    command: `pnpm dev --port ${String(port)} --strictPort`,
    url: `http://localhost:${String(port)}`,
    reuseExistingServer: false,
    timeout: 60_000,
    // These take precedence over `.env` / `.env.local` — `host/index.ts` loads
    // those with `loadEnvFile`, which never overrides an already-set key. The
    // empty `ANTHROPIC_API_KEY` guarantees the e2e server can never reach the
    // real Anthropic API even if `FACILITATOR_MODE` were ever dropped.
    env: {
      FACILITATOR_MODE: 'scripted',
      ANTHROPIC_API_KEY: '',
      SCRIPTED_FACILITATOR_FILE: join(import.meta.dirname, 'e2e', 'fixtures', 'facilitator.json'),
      INTERPRETATION_INTERVAL_MS: '250',
      DATA_DIR: dataDir,
      EVENTSTORMER_DB: join(dataDir, 'e2e.db'),
    },
  },
})
