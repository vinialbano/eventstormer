import { Hono } from 'hono'
import { readBoardSnapshot } from '~/domain-model-capture/api.ts'
import type { WorkshopId } from '~/plumbing/ids.ts'
import { readArtifactSource, readSessionRecordPosition } from '~/session-facilitation/api.ts'
import { renderSummary } from '../../domain/render-summary.ts'
import type { SummaryDeps } from './deps.ts'

interface SummaryResponse {
  boardPosition: number
  sessionRecordPosition: number
  markdown: string
}

/**
 * Render the deterministic F10 summary from the Board snapshot + workshop
 * record. Every read is synchronous — the EventStore port has no async API — so
 * the whole projection runs without an `await`; the composite version stamp
 * (`boardPosition`, `sessionRecordPosition`, `renderedAt`) is embedded.
 * `undefined` means the workshop stream is empty.
 */
const summaryFor = (deps: SummaryDeps, workshopId: WorkshopId): SummaryResponse | undefined => {
  const source = readArtifactSource({ store: deps.store, db: deps.db }, workshopId)
  if (!source.ok) return undefined
  const snapshot = readBoardSnapshot({ store: deps.store }, workshopId)
  const rendered = renderSummary({
    snapshot: {
      blocks: snapshot.blocks.map((block) => ({
        id: block.id,
        kind: block.kind,
        label: block.label,
        withdrawn: block.withdrawn,
        placement: block.placement,
        pivotal: block.pivotal,
      })),
      follows: snapshot.follows,
      causedBy: snapshot.causedBy,
    },
    source: {
      format: source.value.format,
      scope: source.value.scope,
      narratorCount: source.value.narratorCount,
      stakeholderCheck: source.value.stakeholderCheck,
      chosenProblem: source.value.chosenProblem,
      openModelAffectingHotSpots: source.value.openModelAffectingHotSpots,
    },
    boardPosition: snapshot.position,
    sessionRecordPosition: readSessionRecordPosition(
      { store: deps.store, db: deps.db },
      workshopId,
    ),
    renderedAt: deps.clock(),
  })
  return {
    boardPosition: rendered.boardPosition,
    sessionRecordPosition: rendered.sessionRecordPosition,
    markdown: rendered.markdown,
  }
}

/**
 * `GET /workshops/:id/artifacts/summary` — the F10 deterministic summary.
 * Unknown workshop is 404 and writes nothing; a read failing mid-render is 500
 * with no partial body (the document is built whole before the response).
 */
export const summaryRoutes = (deps: SummaryDeps) =>
  new Hono().get('/workshops/:id/artifacts/summary', (context) => {
    let summary: SummaryResponse | undefined
    try {
      summary = summaryFor(deps, context.req.param('id') as WorkshopId)
    } catch {
      return context.json({ error: 'summary-render-failed' as const }, 500)
    }
    if (summary === undefined) return context.json({ error: 'workshop-not-found' as const }, 404)
    return context.json(summary)
  })
