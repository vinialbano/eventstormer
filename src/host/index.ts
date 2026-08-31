import {
  askOpeningQuestion,
  interpretContribution,
  reconcilePendingDerivations,
} from '../session-facilitation/api.ts'
import { loadConfig } from './config.ts'
import { createRoutes } from './routes.ts'
import { startScheduler } from './scheduler.ts'

// Vite (and so `@hono/vite-dev-server`, which boots this file) does not populate
// `process.env` from `.env` — it only exposes `VITE_`-prefixed vars to the
// client bundle. Load it here so `pnpm dev` reads `ANTHROPIC_API_KEY` from the
// file the docs point at.
//
// `.env.local` first, then `.env`: `loadEnvFile` never overrides a key already
// set, so `.env.local` (and anything the caller already put in the environment —
// e.g. Playwright's `webServer.env`) wins. Each load is a no-op when its file is
// absent. Keep real secrets in `.env.local`; commit only `.env.example`.
for (const file of ['.env.local', '.env']) {
  try {
    process.loadEnvFile(file)
  } catch {
    /* file absent — fall through to the next / the ambient environment */
  }
}

/**
 * The composition root. `@hono/vite-dev-server` boots this in the same process
 * that serves the SPA; `/api/*` is handed to the Hono app. `loadConfig()` fails
 * fast here when `ANTHROPIC_API_KEY` is unset.
 */
const config = loadConfig()

const interpretDeps = {
  store: config.store,
  db: config.db,
  clock: config.clock,
  facilitator: config.facilitator,
  inFlight: config.inFlight,
  mint: config.mint,
}

startScheduler(
  {
    askOpeningQuestion: () => askOpeningQuestion(interpretDeps),
    interpretContribution: () => interpretContribution(interpretDeps),
    reconcilePendingDerivations: () => {
      reconcilePendingDerivations(interpretDeps)
    },
  },
  config.interpretationIntervalMs,
)

export default createRoutes(config)
