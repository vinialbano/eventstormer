import {
  askOpeningQuestion,
  interpretContribution,
  reconcilePendingDerivations,
} from '../session-facilitation/api.ts'
import { loadConfig } from './config.ts'
import { createRoutes } from './routes.ts'
import { startScheduler } from './scheduler.ts'

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
