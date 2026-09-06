import { Hono } from 'hono'
import { z } from 'zod'
import { readBoardSnapshot } from '../../../domain-model-capture/api.ts'
import type { BuildingBlockId, ProposalId, SessionId } from '~/plumbing/ids.ts'
import { proposalsView } from '../../domain/read-models/proposals-view.ts'
import { sessionProposalIds } from '../../domain/read-models/session-summary.ts'
import { decide } from '../../domain/proposal/decide.ts'
import type { ProposalCommand } from '../../domain/proposal/model.ts'
import { replay } from '../../domain/proposal/replay.ts'
import { ProposalEvent, SessionEvent } from '../../domain/schema/events.ts'
import { proposalStream, sessionStream, storedOps } from '../../infrastructure/streams.ts'
import { acceptRoutes } from './accept.ts'
import type { ReviewProposalDeps } from './deps.ts'

const EditBody = z.object({ label: z.string() })
const KindBody = z.object({ modelAffecting: z.boolean() })

/** A model-change edit swaps one relation endpoint for another board block (by
 * its current label) and/or sets a new reword label. The kind is fixed at birth
 * — there is no field that changes it. */
const ModelChangeEditBody = z
  .object({
    field: z.enum(['predecessor', 'successor', 'inserted', 'cause', 'effect', 'target']).optional(),
    label: z.string().min(1).optional(),
    newLabel: z.string().min(1).max(200).optional(),
  })
  .refine((body) => (body.field === undefined) === (body.label === undefined), {
    error: 'field and label go together',
  })
  .refine((body) => body.field !== undefined || body.newLabel !== undefined, {
    error: 'nothing to change',
  })

const readProposal = (deps: ReviewProposalDeps, id: ProposalId): ProposalEvent[] =>
  deps.store.read(proposalStream(id)).map((row) => ProposalEvent.parse(row.operation))

const readSession = (deps: ReviewProposalDeps, id: SessionId): SessionEvent[] =>
  deps.store.read(sessionStream(id)).map((row) => SessionEvent.parse(row.operation))

type ModelChangeProposed = Extract<ProposalEvent, { type: 'Model Change Proposed' }>
type ModelChangeChanged = Extract<ProposalEvent, { type: 'Model Change Edited' }>['changed']

/** `POST /proposals/:id/edit` for a model-change proposal — resolve the new
 * endpoint label against the current board (unknown → 422), fold it into
 * `Model Change Edited { changed }`. */
const editModelChange = (
  deps: ReviewProposalDeps,
  id: ProposalId,
  birth: ModelChangeProposed,
  events: ProposalEvent[],
  raw: unknown,
): { json: unknown; status: 200 | 400 | 404 | 409 | 422 } => {
  const body = ModelChangeEditBody.safeParse(raw)
  if (!body.success) return { json: { error: 'invalid-body' as const }, status: 400 }

  const workshopId = readSession(deps, birth.sessionId).find(
    (event) => event.type === 'Session Started',
  )?.workshopId
  if (workshopId === undefined) return { json: { error: 'unknown-session' as const }, status: 404 }

  const changed: ModelChangeChanged = {}
  if (body.data.field !== undefined && body.data.label !== undefined) {
    const match = readBoardSnapshot(deps, workshopId).blocks.find(
      (block) => !block.withdrawn && block.label === body.data.label,
    )
    if (match === undefined) return { json: { error: 'unknown-label' as const }, status: 422 }
    changed[body.data.field] = match.id
  }
  if (body.data.newLabel !== undefined) changed.newLabel = body.data.newLabel

  const decided = decide(replay(events), {
    type: 'Edit Model Change',
    proposalId: id,
    changed,
    at: deps.clock(),
  })
  if (!decided.ok) return { json: { error: decided.error.kind }, status: 409 }
  if (decided.value.length > 0) {
    deps.store.append(proposalStream(id), events.length - 1, storedOps(decided.value))
  }
  return { json: { ok: true as const }, status: 200 }
}

type Reviewed = Extract<
  ProposalCommand,
  {
    type:
      | 'Edit Proposal'
      | 'Set Proposal Kind'
      | 'Reject Proposal'
      | 'Hold Proposal'
      | 'Unhold Proposal'
  }
>

const statusFor = (kind: string): 400 | 404 | 409 =>
  kind === 'not-born' ? 404 : kind === 'label-too-long' ? 400 : 409

const act = (deps: ReviewProposalDeps, id: ProposalId, command: Reviewed) => {
  const rows = deps.store.read(proposalStream(id))
  if (rows.length === 0) return { status: 404 as const, error: 'unknown-proposal' as const }

  const decided = decide(replay(rows.map((row) => ProposalEvent.parse(row.operation))), command)
  if (!decided.ok) return { status: statusFor(decided.error.kind), error: decided.error.kind }

  if (decided.value.length > 0) {
    deps.store.append(proposalStream(id), rows.length - 1, storedOps(decided.value))
  }
  return { status: 200 as const, error: undefined }
}

/**
 * `POST /proposals/:id/{edit,kind,reject,hold,unhold}` — one `Proposal.decide`
 * each, appended only when `decide` emits (an idempotent no-op skips the append).
 * `kind` flips a hot-spot proposal's `modelAffecting` before it is accepted; Hold
 * / Unhold are a reversible marker orthogonal to the disposition.
 *
 * `GET /sessions/:id/proposals` — this session's pending + terminal proposals
 * with disposition, held flag, `APPLY_FAILED` reason, and the ">7 among this
 * contribution" overflow grouping (a read-model computation).
 */
export const reviewProposalRoutes = (deps: ReviewProposalDeps) =>
  new Hono()
    .post('/proposals/:id/edit', async (context) => {
      const id = context.req.param('id') as ProposalId
      const raw: unknown = await context.req.json().catch(() => null)

      const events = readProposal(deps, id)
      const birth = events.find(
        (event) => event.type === 'Building Block Proposed' || event.type === 'Model Change Proposed',
      )
      if (birth?.type === 'Model Change Proposed') {
        const outcome = editModelChange(deps, id, birth, events, raw)
        return context.json(outcome.json, outcome.status)
      }

      const body = EditBody.safeParse(raw)
      if (!body.success) return context.json({ error: 'invalid-body' as const }, 400)
      const outcome = act(deps, id, { type: 'Edit Proposal', proposalId: id, label: body.data.label, at: deps.clock() })
      return outcome.error === undefined ? context.json({ ok: true as const }, 200) : context.json({ error: outcome.error }, outcome.status)
    })
    .post('/proposals/:id/kind', async (context) => {
      const id = context.req.param('id') as ProposalId
      const body = KindBody.safeParse(await context.req.json().catch(() => null))
      if (!body.success) return context.json({ error: 'invalid-body' as const }, 400)
      const outcome = act(deps, id, {
        type: 'Set Proposal Kind',
        proposalId: id,
        modelAffecting: body.data.modelAffecting,
        at: deps.clock(),
      })
      return outcome.error === undefined
        ? context.json({ ok: true as const }, 200)
        : context.json({ error: outcome.error }, outcome.status)
    })
    .post('/proposals/:id/reject', (context) => {
      const id = context.req.param('id') as ProposalId
      const outcome = act(deps, id, { type: 'Reject Proposal', proposalId: id, at: deps.clock() })
      return outcome.error === undefined ? context.json({ ok: true as const }, 200) : context.json({ error: outcome.error }, outcome.status)
    })
    .post('/proposals/:id/hold', (context) => {
      const id = context.req.param('id') as ProposalId
      const outcome = act(deps, id, { type: 'Hold Proposal', proposalId: id, at: deps.clock() })
      return outcome.error === undefined ? context.json({ ok: true as const }, 200) : context.json({ error: outcome.error }, outcome.status)
    })
    .post('/proposals/:id/unhold', (context) => {
      const id = context.req.param('id') as ProposalId
      const outcome = act(deps, id, { type: 'Unhold Proposal', proposalId: id, at: deps.clock() })
      return outcome.error === undefined ? context.json({ ok: true as const }, 200) : context.json({ error: outcome.error }, outcome.status)
    })
    .route('/', acceptRoutes(deps))
    .get('/sessions/:id/proposals', (context) => {
      const sessionId = context.req.param('id') as SessionId
      const sessionEvents = deps.store
        .read(sessionStream(sessionId))
        .map((row) => SessionEvent.parse(row.operation))
      const streams = sessionProposalIds(sessionEvents).map((proposalId) => ({
        proposalId,
        events: readProposal(deps, proposalId),
      }))

      const started = sessionEvents.find((event) => event.type === 'Session Started')
      const labels =
        started?.type === 'Session Started'
          ? new Map(
              readBoardSnapshot(deps, started.workshopId).blocks.map((block) => [block.id, block.label]),
            )
          : new Map<BuildingBlockId, string>()
      const resolveLabel = (id: BuildingBlockId): string | undefined => labels.get(id)

      return context.json({ proposals: proposalsView(sessionEvents, streams, resolveLabel) })
    })
