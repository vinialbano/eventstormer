import { Hono } from 'hono'
import { z } from 'zod'
import type { ProposalId, SessionId } from '~/plumbing/ids.ts'
import { proposalsView } from '../../domain/read-models/proposals-view.ts'
import { sessionProposalIds } from '../../domain/read-models/session-summary.ts'
import { decide } from '../../domain/proposal/decide.ts'
import type { ProposalCommand } from '../../domain/proposal/model.ts'
import { replay } from '../../domain/proposal/replay.ts'
import { ProposalEvent, SessionEvent } from '../../domain/schema/events.ts'
import { proposalStream, sessionStream, storedOps } from '../../infrastructure/streams.ts'
import type { ReviewProposalDeps } from './deps.ts'

const EditBody = z.object({ label: z.string() })

const readProposal = (deps: ReviewProposalDeps, id: ProposalId): ProposalEvent[] =>
  deps.store.read(proposalStream(id)).map((r) => ProposalEvent.parse(r.operation))

type Reviewed = Extract<
  ProposalCommand,
  { type: 'Edit Proposal' | 'Reject Proposal' | 'Hold Proposal' | 'Unhold Proposal' }
>

const statusFor = (kind: string): 400 | 404 | 409 =>
  kind === 'not-born' ? 404 : kind === 'label-too-long' ? 400 : 409

const act = (deps: ReviewProposalDeps, id: ProposalId, cmd: Reviewed) => {
  const rows = deps.store.read(proposalStream(id))
  if (rows.length === 0) return { status: 404 as const, error: 'unknown-proposal' as const }

  const decided = decide(replay(rows.map((r) => ProposalEvent.parse(r.operation))), cmd)
  if (!decided.ok) return { status: statusFor(decided.error.kind), error: decided.error.kind }

  if (decided.value.length > 0) {
    deps.store.append(proposalStream(id), rows.length - 1, storedOps(decided.value))
  }
  return { status: 200 as const, error: undefined }
}

/**
 * `POST /proposals/:id/{edit,reject,hold,unhold}` — one `Proposal.decide` each,
 * appended only when `decide` emits (an idempotent no-op skips the append). Hold
 * / Unhold are a reversible marker orthogonal to the disposition (AD-020).
 *
 * `GET /sessions/:id/proposals` — this session's pending + terminal proposals
 * with disposition, held flag, `APPLY_FAILED` reason, and the ">7 among this
 * contribution" overflow grouping (a read-model computation).
 */
export const reviewProposalRoutes = (deps: ReviewProposalDeps) =>
  new Hono()
    .post('/proposals/:id/edit', async (c) => {
      const id = c.req.param('id') as ProposalId
      const body = EditBody.safeParse(await c.req.json().catch(() => null))
      if (!body.success) return c.json({ error: 'invalid-body' as const }, 400)
      const r = act(deps, id, { type: 'Edit Proposal', proposalId: id, label: body.data.label, at: deps.clock() })
      return r.error === undefined ? c.json({ ok: true as const }, 200) : c.json({ error: r.error }, r.status)
    })
    .post('/proposals/:id/reject', (c) => {
      const id = c.req.param('id') as ProposalId
      const r = act(deps, id, { type: 'Reject Proposal', proposalId: id, at: deps.clock() })
      return r.error === undefined ? c.json({ ok: true as const }, 200) : c.json({ error: r.error }, r.status)
    })
    .post('/proposals/:id/hold', (c) => {
      const id = c.req.param('id') as ProposalId
      const r = act(deps, id, { type: 'Hold Proposal', proposalId: id, at: deps.clock() })
      return r.error === undefined ? c.json({ ok: true as const }, 200) : c.json({ error: r.error }, r.status)
    })
    .post('/proposals/:id/unhold', (c) => {
      const id = c.req.param('id') as ProposalId
      const r = act(deps, id, { type: 'Unhold Proposal', proposalId: id, at: deps.clock() })
      return r.error === undefined ? c.json({ ok: true as const }, 200) : c.json({ error: r.error }, r.status)
    })
    .get('/sessions/:id/proposals', (c) => {
      const sessionId = c.req.param('id') as SessionId
      const sessionEvents = deps.store
        .read(sessionStream(sessionId))
        .map((r) => SessionEvent.parse(r.operation))
      const streams = sessionProposalIds(sessionEvents).map((proposalId) => ({
        proposalId,
        events: readProposal(deps, proposalId),
      }))
      return c.json({ proposals: proposalsView(sessionEvents, streams) })
    })
