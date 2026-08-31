import { Hono } from 'hono'
import { readableAccountRoutes } from '../derived-artifact-generation/api.ts'
import { boardAccessRoutes, editModelRoutes } from '../domain-model-capture/api.ts'
import {
  closeSessionRoutes,
  makeContributionRoutes,
  reviewProposalRoutes,
  setScopeRoutes,
  startSessionRoutes,
  startWorkshopRoutes,
} from '../session-facilitation/api.ts'
import type { HostConfig } from './config.ts'
import { healthRoutes } from './health.ts'

/**
 * The whole URL map, in one readable file. Slices export routes as values and
 * this file chooses their prefixes — there is no filesystem routing anywhere in
 * this project, and adding some would remove the only place the API is legible.
 * Every context is reached only through its `api.ts`.
 */
export const createRoutes = (config: HostConfig) => {
  const { store, db, clock, inFlight } = config
  const io = { store, clock }
  const withDb = { store, db, clock }

  return new Hono()
    .route('/api', healthRoutes)
    .route('/api', boardAccessRoutes(io))
    .route('/api', editModelRoutes(io))
    .route('/api', readableAccountRoutes({ store, db }))
    .route('/api', startWorkshopRoutes(io))
    .route('/api', setScopeRoutes(io))
    .route('/api', startSessionRoutes(withDb))
    .route('/api', makeContributionRoutes({ ...withDb, inFlight: () => inFlight.contributions() }))
    .route('/api', reviewProposalRoutes(io))
    .route('/api', closeSessionRoutes(withDb))
}
