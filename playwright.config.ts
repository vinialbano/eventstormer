import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end suite (ADR-008 smoke + ADR-007 no-optimism). Each project boots its
 * own `pnpm dev` so the in-process scripted facilitator turn index never leaks
 * between specs. Real server, real SQLite, fake model.
 */
const fixtureFile = join(import.meta.dirname, 'e2e', 'fixtures', 'facilitator.json')

const serverEnvironment = (dataDirectory: string) => ({
  FACILITATOR_MODE: 'scripted',
  ANTHROPIC_API_KEY: '',
  SCRIPTED_FACILITATOR_FILE: fixtureFile,
  INTERPRETATION_INTERVAL_MS: '250',
  DATA_DIR: dataDirectory,
  EVENTSTORMER_DB: join(dataDirectory, 'e2e.db'),
})

const smokePort = 5178
const adr007Port = 5179
const smokeDataDirectory = mkdtempSync(join(tmpdir(), 'eventstormer-e2e-smoke-'))
const adr007DataDirectory = mkdtempSync(join(tmpdir(), 'eventstormer-e2e-adr007-'))

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: process.env.CI !== undefined,
  timeout: 45_000,
  reporter: 'list',
  use: {
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'smoke',
      testMatch: 'capture-loop.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: `http://localhost:${String(smokePort)}`,
      },
    },
    {
      name: 'adr007',
      testMatch: 'capture-loop-no-optimism.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: `http://localhost:${String(adr007Port)}`,
      },
    },
  ],
  webServer: [
    {
      command: `pnpm dev --port ${String(smokePort)} --strictPort`,
      url: `http://localhost:${String(smokePort)}`,
      reuseExistingServer: false,
      timeout: 60_000,
      env: serverEnvironment(smokeDataDirectory),
    },
    {
      command: `pnpm dev --port ${String(adr007Port)} --strictPort`,
      url: `http://localhost:${String(adr007Port)}`,
      reuseExistingServer: false,
      timeout: 60_000,
      env: serverEnvironment(adr007DataDirectory),
    },
  ],
})
