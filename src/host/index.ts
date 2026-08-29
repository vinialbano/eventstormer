import { routes } from './routes.ts'

/**
 * The composition root. `@hono/vite-dev-server` boots this in the same process
 * that serves the SPA; `/api/*` is handed to the Hono app.
 */
export default routes
