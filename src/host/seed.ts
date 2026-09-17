import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import type { StreamKey } from '~/plumbing/event-store/port.ts'
import type { WorkshopId } from '~/plumbing/ids.ts'
import {
  type Facilitator,
  interpretContribution,
  reconcilePendingDerivations,
} from '../session-facilitation/api.ts'
import type { HostConfig } from './config.ts'
import { createRoutes } from './routes.ts'

/**
 * The offline demo seed. `runSeed` drives the **real** capability handlers
 * through `createRoutes(config)` + `app.request()` — the seeded board is
 * byte-identical to one a user's clicks would produce. The scripted
 * `Facilitator` in `deps` supplies every interpretation from a committed
 * fixture, so no model is called and no `ANTHROPIC_API_KEY` is read.
 *
 * A `data/seed.json` marker records the seeded workshop and every stream it
 * wrote; a re-run refuses unless `force` is passed, and `force` deletes only
 * those streams before re-seeding.
 */

export interface SeedDeps {
  config: HostConfig
  /** The scripted interpretation source — never the Anthropic adapter. */
  facilitator: Facilitator
  /** The narration, in order. Each body is posted as one contribution. */
  turns: readonly { speaker: string; body: string }[]
  scopeStatement: string
  creatorName: string
  /** Where the seed marker lives (`data/seed.json`). */
  markerPath: string
}

interface SeedMarker {
  workshopId: string
  streams: StreamKey[]
  seededAt: string
}

export type SeedOutcome =
  | { status: 'seeded'; workshopId: WorkshopId; url: string }
  | { status: 'refused'; workshopId: WorkshopId }

const REVIEWABLE_DISPOSITIONS = new Set(['PROPOSED', 'EDITED', 'APPLY_FAILED'])

const workshopStream = (id: string): StreamKey => ({ context: 'session-facilitation', aggregate: 'workshop', id })
const boardStream = (id: string): StreamKey => ({ context: 'domain-model-capture', aggregate: 'board', id })
const sessionStream = (id: string): StreamKey => ({ context: 'session-facilitation', aggregate: 'session', id })
const proposalStream = (id: string): StreamKey => ({ context: 'session-facilitation', aggregate: 'proposal', id })
const resolutionStream = (id: string): StreamKey => ({ context: 'session-facilitation', aggregate: 'resolution', id })

const readMarker = (path: string): SeedMarker | undefined =>
  existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as SeedMarker) : undefined

const wipe = (config: HostConfig, marker: SeedMarker): void => {
  const deleteStream = config.db.prepare(
    'DELETE FROM operation_log WHERE context = ? AND aggregate = ? AND stream_id = ?',
  )
  for (const stream of marker.streams) deleteStream.run(stream.context, stream.aggregate, stream.id)
  config.db.prepare('DELETE FROM session_index WHERE workshop_id = ?').run(marker.workshopId)
}

type App = ReturnType<typeof createRoutes>

const postJson = async (app: App, path: string, body?: unknown): Promise<Response> =>
  app.request(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })

const jsonOf = async <T>(response: Response): Promise<T> => (await response.json()) as T

export const runSeed = async (deps: SeedDeps, options: { force: boolean }): Promise<SeedOutcome> => {
  const { config } = deps

  const existing = readMarker(deps.markerPath)
  if (existing !== undefined) {
    if (!options.force) return { status: 'refused', workshopId: existing.workshopId as WorkshopId }
    wipe(config, existing)
  }

  const interpretDeps = {
    store: config.store,
    db: config.db,
    clock: config.clock,
    facilitator: deps.facilitator,
    inFlight: config.inFlight,
    mint: config.mint,
  }

  const app = createRoutes(config)
  const streams: StreamKey[] = []

  const workshop = await jsonOf<{ workshopId: string }>(
    await postJson(app, '/api/workshops', { creatorName: deps.creatorName }),
  )
  const workshopId = workshop.workshopId
  streams.push(workshopStream(workshopId), boardStream(workshopId))

  await postJson(app, `/api/workshops/${workshopId}/scope`, { statement: deps.scopeStatement })

  const session = await jsonOf<{ sessionId: string }>(
    await postJson(app, `/api/workshops/${workshopId}/sessions`),
  )
  const sessionId = session.sessionId
  streams.push(sessionStream(sessionId))

  for (const turn of deps.turns) {
    await postJson(app, `/api/sessions/${sessionId}/contributions`, { text: turn.body })

    // The interpretation worker + the derive/reconcile tick, run inline — the
    // same functions the scheduler drives. The scripted facilitator answers
    // `interpret` from the committed fixture; no model call, no network.
    await interpretContribution(interpretDeps)
    reconcilePendingDerivations(interpretDeps)

    const { proposals } = await jsonOf<{ proposals: { proposalId: string; disposition: string }[] }>(
      await app.request(`/api/sessions/${sessionId}/proposals`),
    )
    for (const proposal of proposals) {
      if (!REVIEWABLE_DISPOSITIONS.has(proposal.disposition)) continue
      await postJson(app, `/api/proposals/${proposal.proposalId}/accept`)
      streams.push(proposalStream(proposal.proposalId))
    }

    const { resolutions } = await jsonOf<{ resolutions: { resolutionId: string; disposition: string }[] }>(
      await app.request(`/api/sessions/${sessionId}/resolutions`),
    )
    for (const resolution of resolutions) {
      if (resolution.disposition !== 'PROPOSED' && resolution.disposition !== 'EDITED') continue
      await postJson(app, `/api/resolutions/${resolution.resolutionId}/accept`)
      streams.push(resolutionStream(resolution.resolutionId))
    }
  }

  const seen = new Set<string>()
  const uniqueStreams = streams.filter((stream) => {
    const key = `${stream.context}/${stream.aggregate}/${stream.id}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  mkdirSync(dirname(deps.markerPath), { recursive: true })
  const marker: SeedMarker = { workshopId, streams: uniqueStreams, seededAt: config.clock() }
  writeFileSync(deps.markerPath, `${JSON.stringify(marker, null, 2)}\n`)

  return { status: 'seeded', workshopId: workshopId as WorkshopId, url: `/workshops/${workshopId}` }
}
