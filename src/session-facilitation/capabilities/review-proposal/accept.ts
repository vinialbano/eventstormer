import { Hono } from 'hono'
import type { ProposalId } from '~/plumbing/ids.ts'
import { acceptProposal } from '../../infrastructure/accept-proposal.ts'
import type { ReviewProposalDeps } from './deps.ts'

export const acceptRoutes = (deps: ReviewProposalDeps) =>
  new Hono().post('/proposals/:id/accept', (context) => {
    const id = context.req.param('id') as ProposalId
    const handled = acceptProposal(deps, id)
    return context.json(handled.json, handled.status)
  })
