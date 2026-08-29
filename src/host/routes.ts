import { Hono } from 'hono'
import { healthRoutes } from './health.ts'

/**
 * The whole URL map, in one readable file. Slices export routes as values and
 * this file chooses their prefixes — there is no filesystem routing anywhere in
 * this project, and adding some would remove the only place the API is legible.
 */
export const routes = new Hono().route('/api', healthRoutes)
