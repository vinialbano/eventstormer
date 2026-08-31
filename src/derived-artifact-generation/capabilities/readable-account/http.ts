import { Hono } from 'hono'
import { readBoardSnapshot } from '~/domain-model-capture/api.ts'
import type { WorkshopId } from '~/plumbing/ids.ts'
import { readArtifactSource } from '~/session-facilitation/api.ts'
import { listReferences } from '../../domain/list-references.ts'
import type { AccountBlock, AccountDocument } from '../../domain/model.ts'
import { renderReadableAccount } from '../../domain/render-readable-account.ts'
import type { ReadableAccountDeps } from './deps.ts'

const toAccountBlocks = (
  blocks: { id: AccountBlock['id']; kind: string; label: string; withdrawn: boolean }[],
): AccountBlock[] =>
  blocks.flatMap((block) => {
    if (block.kind === 'domain-event' || block.kind === 'actor' || block.kind === 'system') {
      return [{ id: block.id, kind: block.kind, label: block.label, withdrawn: block.withdrawn }]
    }
    return []
  })

const documentFor = (
  deps: ReadableAccountDeps,
  workshopId: WorkshopId,
): { position: number; document: AccountDocument } | undefined => {
  const source = readArtifactSource({ store: deps.store, db: deps.db }, workshopId)
  if (!source.ok) return undefined
  const snapshot = readBoardSnapshot({ store: deps.store }, workshopId)
  return {
    position: snapshot.position,
    document: renderReadableAccount({
      position: snapshot.position,
      format: source.value.format,
      scope: source.value.scope,
      narratorCount: source.value.narratorCount,
      blocks: toAccountBlocks(snapshot.blocks),
      quotes: source.value.quotes,
    }),
  }
}

/**
 * `GET /workshops/:id/readable-account` and
 * `GET /workshops/:id/board/blocks/:blockId/references`.
 * Unknown workshop is 404; a known workshop with an empty board is 200.
 */
export const readableAccountRoutes = (deps: ReadableAccountDeps) =>
  new Hono()
    .get('/workshops/:id/readable-account', (context) => {
      const loaded = documentFor(deps, context.req.param('id') as WorkshopId)
      if (loaded === undefined) return context.json({ error: 'workshop-not-found' as const }, 404)
      return context.json({ position: loaded.position, markdown: loaded.document.markdown })
    })
    .get('/workshops/:id/board/blocks/:blockId/references', (context) => {
      const loaded = documentFor(deps, context.req.param('id') as WorkshopId)
      if (loaded === undefined) return context.json({ error: 'workshop-not-found' as const }, 404)
      return context.json(listReferences(loaded.document, context.req.param('blockId') as AccountBlock['id']))
    })
