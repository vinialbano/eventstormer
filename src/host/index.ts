import { systemClock } from '~/plumbing/clock.ts'
import { createSqliteEventStore } from '~/plumbing/event-store/sqlite-adapter.ts'
import { createRoutes } from './routes.ts'

/**
 * The composition root. `@hono/vite-dev-server` boots this in the same process
 * that serves the SPA; `/api/*` is handed to the Hono app.
 */
export default createRoutes({ store: createSqliteEventStore(), clock: systemClock })
