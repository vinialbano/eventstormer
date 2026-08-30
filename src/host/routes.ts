import { Hono } from 'hono'
import { type BoardAccessDeps, boardAccessRoutes } from '../domain-model-capture/api.ts'
import { healthRoutes } from './health.ts'

/**
 * The whole URL map, in one readable file. Slices export routes as values and
 * this file chooses their prefixes — there is no filesystem routing anywhere in
 * this project, and adding some would remove the only place the API is legible.
 */
export const createRoutes = (deps: BoardAccessDeps) =>
  new Hono().route('/api', healthRoutes).route('/api', boardAccessRoutes(deps))
