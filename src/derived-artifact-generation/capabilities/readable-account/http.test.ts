import { testClient } from 'hono/testing'
import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it } from 'vitest'
import { applyOperation, Operation } from '~/domain-model-capture/api.ts'
import { createMemoryEventStore } from '~/plumbing/event-store/memory-store.ts'
import type { WorkshopId } from '~/plumbing/ids.ts'
import {
  applySessionFacilitationMigrations,
  startWorkshopRoutes,
  type SessionIndexDb,
} from '~/session-facilitation/api.ts'
import { emptyAccountMarkdown } from '../../domain/empty-account-markdown.ts'
import type { ReadableAccountDeps } from './deps.ts'
import { readableAccountRoutes } from './http.ts'

const clock = () => '2026-08-30T12:00:00.000Z'
const author = { accepter: { name: 'Dana' } }

const loanRecordedMarkdown = `# Readable account
Format: Big Picture
Narrators: 0
Scope: (not set)

## Coverage
- Stakeholder check: not run
- Chosen problem: not run
- Timeline and relations: not run

## Building blocks
- Event: Loan recorded

## Quoted evidence
`

const withdrawnMarkdown = `# Readable account
Format: Big Picture
Narrators: 0
Scope: (not set)

## Coverage
- Stakeholder check: not run
- Chosen problem: not run
- Timeline and relations: not run

## Building blocks
- Event (withdrawn): Loan recorded

## Quoted evidence
`

const buildingBlocksSite = { kind: 'readable-account', path: 'building-blocks' }

const newDb = (): SessionIndexDb => {
  const raw = new DatabaseSync(':memory:')
  applySessionFacilitationMigrations(raw)
  return raw
}

const startWorkshop = async (deps: ReadableAccountDeps): Promise<WorkshopId> => {
  const response = await testClient(startWorkshopRoutes({ store: deps.store, clock })).workshops.$post({
    json: { creatorName: 'Dana' },
  })
  const { workshopId } = (await response.json()) as { workshopId: string }
  return workshopId as WorkshopId
}

const accountClient = (deps: ReadableAccountDeps) => testClient(readableAccountRoutes(deps))

const getAccount = (deps: ReadableAccountDeps, id: string) =>
  accountClient(deps).workshops[':id']['readable-account'].$get({ param: { id } })

const getReferences = (deps: ReadableAccountDeps, id: string, blockId: string) =>
  accountClient(deps).workshops[':id'].board.blocks[':blockId'].references.$get({
    param: { id, blockId },
  })

describe('GET /workshops/:id/readable-account', () => {
  it('returns identical markdown bodies for two GETs with no intervening operation', async () => {
    const deps: ReadableAccountDeps = { store: createMemoryEventStore(), db: newDb() }
    const workshopId = await startWorkshop(deps)
    applyOperation(
      { store: deps.store, clock },
      workshopId,
      Operation.parse({ author, kind: 'capture-domain-event', id: 'b_1', label: 'Loan recorded' }),
    )

    const first = await getAccount(deps, workshopId)
    const second = await getAccount(deps, workshopId)
    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    const firstBody = (await first.json()) as { position: number; markdown: string }
    const secondBody = (await second.json()) as { position: number; markdown: string }
    expect(firstBody.markdown).toBe(loanRecordedMarkdown)
    expect(secondBody.markdown).toBe(firstBody.markdown)
    expect(firstBody.position).toBe(0)
  })

  it('returns 200 empty-state markdown for a known workshop with an empty board', async () => {
    const deps: ReadableAccountDeps = { store: createMemoryEventStore(), db: newDb() }
    const workshopId = await startWorkshop(deps)

    const response = await getAccount(deps, workshopId)
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ position: -1, markdown: emptyAccountMarkdown })
  })

  it('returns 404 for an unknown workshop', async () => {
    const deps: ReadableAccountDeps = { store: createMemoryEventStore(), db: newDb() }
    const response = await getAccount(deps, 'nope')
    expect(response.status).toBe(404)
  })
})

describe('GET /workshops/:id/board/blocks/:blockId/references', () => {
  it('returns the building-blocks site for a withdrawn target and [] for an unknown id', async () => {
    const deps: ReadableAccountDeps = { store: createMemoryEventStore(), db: newDb() }
    const workshopId = await startWorkshop(deps)
    applyOperation(
      { store: deps.store, clock },
      workshopId,
      Operation.parse({ author, kind: 'capture-domain-event', id: 'b_1', label: 'Loan recorded' }),
    )
    applyOperation(
      { store: deps.store, clock },
      workshopId,
      Operation.parse({ author, kind: 'withdraw', target: 'b_1' }),
    )

    const listed = await getReferences(deps, workshopId, 'b_1')
    expect(listed.status).toBe(200)
    await expect(listed.json()).resolves.toEqual([buildingBlocksSite])

    const missing = await getReferences(deps, workshopId, 'absent')
    expect(missing.status).toBe(200)
    await expect(missing.json()).resolves.toEqual([])

    const account = await getAccount(deps, workshopId)
    await expect(account.json()).resolves.toEqual({ position: 1, markdown: withdrawnMarkdown })
  })

  it('returns 404 for an unknown workshop', async () => {
    const deps: ReadableAccountDeps = { store: createMemoryEventStore(), db: newDb() }
    const response = await getReferences(deps, 'nope', 'b_1')
    expect(response.status).toBe(404)
  })
})
