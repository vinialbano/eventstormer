import { Hono } from 'hono'
import type { ResolutionId } from '~/plumbing/ids.ts'
import { acceptResolution } from '../../infrastructure/accept-resolution.ts'
import type { ReviewResolutionDeps } from './deps.ts'

export const acceptResolutionRoutes = (deps: ReviewResolutionDeps) =>
  new Hono().post('/resolutions/:id/accept', (context) => {
    const id = context.req.param('id') as ResolutionId
    const handled = acceptResolution(deps, id)
    return context.json(handled.json, handled.status)
  })
