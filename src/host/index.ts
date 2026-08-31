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
// file the docs point at. No-op when there is no `.env` (ambient env wins).
try {
  process.loadEnvFile()
} catch {
  /* no .env file — rely on the ambient environment */
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
