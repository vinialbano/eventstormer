import { Hono } from 'hono'
import { readBoardSnapshot } from '~/domain-model-capture/api.ts'
import type { WorkshopId } from '~/plumbing/ids.ts'
import { readArtifactSource, readSessionRecordPosition } from '~/session-facilitation/api.ts'
import type { ModelJson } from '../../domain/model-json.ts'
import { serialise } from '../../domain/serialise.ts'
import type { ModelExportDeps } from './deps.ts'

/**
 * Serialise the Board snapshot + workshop record into `ModelJson`. Every read is
 * synchronous — the EventStore port has no async API — so the whole projection
 * runs without an `await`; the composite version stamp (`boardPosition`,
 * `sessionRecordPosition`, `renderedAt`) is embedded. `undefined` means the
 * workshop stream is empty.
 */
const modelFor = (deps: ModelExportDeps, workshopId: WorkshopId): ModelJson | undefined => {
  const source = readArtifactSource({ store: deps.store, db: deps.db }, workshopId)
  if (!source.ok) return undefined
  const snapshot = readBoardSnapshot({ store: deps.store }, workshopId)
  return serialise({
    snapshot: {
      blocks: snapshot.blocks,
      follows: snapshot.follows,
      causedBy: snapshot.causedBy,
    },
    source: source.value,
    boardPosition: snapshot.position,
    sessionRecordPosition: readSessionRecordPosition({ store: deps.store, db: deps.db }, workshopId),
    renderedAt: deps.clock(),
  })
}

/**
 * `GET /workshops/:id/artifacts/model` — the F10 JSON export. Unknown workshop
 * is 404 and writes nothing; a read failing mid-render is 500 with no partial
 * body (the document is built whole before the response is sent).
 */
export const modelExportRoutes = (deps: ModelExportDeps) =>
  new Hono().get('/workshops/:id/artifacts/model', (context) => {
    let model: ModelJson | undefined
    try {
      model = modelFor(deps, context.req.param('id') as WorkshopId)
    } catch {
      return context.json({ error: 'model-render-failed' as const }, 500)
    }
    if (model === undefined) return context.json({ error: 'workshop-not-found' as const }, 404)
    return context.json(model)
  })
