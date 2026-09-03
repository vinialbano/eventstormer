import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { EventStore } from '~/plumbing/event-store/port.ts'
import { applyOperation, Operation } from '../domain-model-capture/api.ts'
import type { ContributionId, ProposalId, SessionId, WorkshopId } from '../plumbing/ids.ts'
import { loadConfig, type HostConfig } from './config.ts'
import { createRoutes } from './routes.ts'

let directory: string

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'eventstormer-routes-'))
})
afterEach(() => {
  rmSync(directory, { recursive: true, force: true })
})

const wired = () => {
  const config = loadConfig({
    FACILITATOR_MODE: 'scripted',
    EVENTSTORMER_DB: join(directory, 'e.db'),
    DATA_DIR: directory,
  })
  return { config, app: createRoutes(config) }
}

const createWorkshop = async (app: ReturnType<typeof createRoutes>): Promise<WorkshopId> => {
  const response = await app.request('/api/workshops', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ creatorName: 'Dana' }),
  })
  const { workshopId } = (await response.json()) as { workshopId: string }
  return workshopId as WorkshopId
}

const author = { accepter: { name: 'Dana' } }
const at = '2026-08-30T12:00:00.000Z'

const postBoardOperation = async (
  app: ReturnType<typeof createRoutes>,
  workshopId: WorkshopId,
  body: unknown,
): Promise<Response> =>
  app.request(`/api/workshops/${workshopId}/board/operations`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

const seedProposal = (
  store: EventStore,
  sessionId: SessionId,
  proposalId: ProposalId,
  label: string,
): void => {
  store.append(
    { context: 'session-facilitation', aggregate: 'proposal', id: proposalId },
    -1,
    [
      {
        at,
        opVersion: 1,
        operation: {
          v: 1,
          type: 'Building Block Proposed',
          proposalId,
          sessionId,
          contributionId: 'c_1' as ContributionId,
          blockKind: 'domain-event',
          label,
          bar: 'strict',
          at,
        },
      },
    ],
  )
}

const startSession = async (
  app: ReturnType<typeof createRoutes>,
  workshopId: WorkshopId,
): Promise<SessionId> => {
  const response = await app.request(`/api/workshops/${workshopId}/sessions`, { method: 'POST' })
  expect(response.status).toBe(202)
  const { sessionId } = (await response.json()) as { sessionId: string }
  return sessionId as SessionId
}

const captureBlockViaAccept = async (
  config: HostConfig,
  app: ReturnType<typeof createRoutes>,
  workshopId: WorkshopId,
  label: string,
): Promise<string> => {
  const sessionResponse = await app.request(`/api/workshops/${workshopId}/sessions`, { method: 'POST' })
  expect(sessionResponse.status).toBe(202)
  const { sessionId } = (await sessionResponse.json()) as { sessionId: string }

  seedProposal(config.store, sessionId as SessionId, 'p_1' as ProposalId, label)

  const acceptResponse = await app.request('/api/proposals/p_1/accept', { method: 'POST' })
  expect(acceptResponse.status).toBe(200)
  const acceptBody = (await acceptResponse.json()) as { proposal: { buildingBlockId?: string } }
  const buildingBlockId = acceptBody.proposal.buildingBlockId
  if (buildingBlockId === undefined) throw new Error('expected buildingBlockId after accept')

  return buildingBlockId
}

describe('createRoutes — the mounted /api surface', () => {
  it('serves health under /api', async () => {
    const response = await wired().app.request('/api/health')
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ status: 'ok', opSchemaVersion: 1 })
  })

  it('mounts the session-facilitation write capabilities: POST /api/workshops creates a workshop', async () => {
    const response = await wired().app.request('/api/workshops', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ creatorName: 'Dana' }),
    })
    expect(response.status).toBe(201)
    const body = (await response.json()) as { workshopId: string; url: string }
    expect(body.url).toBe(`/workshops/${body.workshopId}`)
  })

  it('serves POST /api/workshops/:id/board/operations through the capture api', async () => {
    const { config, app } = wired()
    const workshopId = await createWorkshop(app)
    const buildingBlockId = await captureBlockViaAccept(config, app, workshopId, 'Loan recorded')

    const reword = await postBoardOperation(app, workshopId, {
      v: 1,
      kind: 'reword',
      target: buildingBlockId,
      label: 'Loan was recorded',
      author,
    })
    expect(reword.status).toBe(200)
    await expect(reword.json()).resolves.toEqual({ position: 1 })

    const board = await app.request(`/api/workshops/${workshopId}/board`)
    expect(board.status).toBe(200)
    const boardBody = (await board.json()) as { blocks: { id: string; label: string }[] }
    expect(boardBody.blocks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: buildingBlockId, label: 'Loan was recorded' }),
      ]),
    )

    const account = await app.request(`/api/workshops/${workshopId}/readable-account`)
    expect(account.status).toBe(200)
    const accountBody = (await account.json()) as { markdown: string }
    expect(accountBody.markdown).toContain('- Event: Loan was recorded')
    expect(accountBody.markdown).not.toContain('- Event: Loan recorded')
  })

  it('flags a hot spot annotating a captured event and GET /board shows the callout and count', async () => {
    const { config, app } = wired()
    const workshopId = await createWorkshop(app)
    const buildingBlockId = await captureBlockViaAccept(config, app, workshopId, 'Payment taken')

    const flagged = await app.request(`/api/workshops/${workshopId}/board/hot-spots`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ label: 'Payment keeps timing out', annotatesTargetId: buildingBlockId, author }),
    })
    expect(flagged.status).toBe(200)
    const { hotSpotId } = (await flagged.json()) as { hotSpotId: string }

    const board = await app.request(`/api/workshops/${workshopId}/board`)
    expect(board.status).toBe(200)
    const boardBody = (await board.json()) as {
      hotSpotCount: number
      blocks: { id: string; kind: string; annotates?: string | null }[]
    }
    expect(boardBody.hotSpotCount).toBe(1)
    expect(boardBody.blocks).toContainEqual(
      expect.objectContaining({ id: hotSpotId, kind: 'hot-spot', annotates: buildingBlockId }),
    )
  })

  it('accepts a resolution through the host: raise a hot spot, accept, GET /board shows it resolved', async () => {
    const { config, app } = wired()
    const workshopId = await createWorkshop(app)
    const sessionId = await startSession(app, workshopId)

    const flagged = await app.request(`/api/workshops/${workshopId}/board/hot-spots`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ label: 'Payment keeps timing out', author }),
    })
    expect(flagged.status).toBe(200)
    const { hotSpotId } = (await flagged.json()) as { hotSpotId: string }

    config.store.append(
      { context: 'session-facilitation', aggregate: 'resolution', id: 'r_1' },
      -1,
      [
        {
          at,
          opVersion: 1,
          operation: {
            v: 1,
            at,
            type: 'Resolution Proposed',
            resolutionId: 'r_1',
            sessionId,
            contributionId: 'c_1' as ContributionId,
            hotSpotId,
            reference: 'added a retry with backoff',
          },
        },
      ],
    )

    const accepted = await app.request('/api/resolutions/r_1/accept', { method: 'POST' })
    expect(accepted.status).toBe(200)

    const board = await app.request(`/api/workshops/${workshopId}/board`)
    const boardBody = (await board.json()) as {
      blocks: { id: string; resolved?: boolean; reference?: unknown }[]
    }
    expect(boardBody.blocks).toContainEqual(
      expect.objectContaining({ id: hotSpotId, resolved: true, reference: 'added a retry with backoff' }),
    )
  })

  it('serves both artifact GETs: empty board is 200 and references list the building-blocks site', async () => {
    const { config, app } = wired()
    const workshopId = await createWorkshop(app)

    const empty = await app.request(`/api/workshops/${workshopId}/readable-account`)
    expect(empty.status).toBe(200)
    const emptyBody = (await empty.json()) as { position: number; markdown: string }
    expect(emptyBody.position).toBe(-1)
    expect(emptyBody.markdown).toContain('# Readable account')
    expect(emptyBody.markdown).toContain('Narrators: 0')

    applyOperation(
      { store: config.store, clock: config.clock },
      workshopId,
      Operation.parse({
        author: { accepter: { name: 'Dana' } },
        kind: 'capture-domain-event',
        id: 'b_1',
        label: 'Loan recorded',
      }),
    )

    const account = await app.request(`/api/workshops/${workshopId}/readable-account`)
    expect(account.status).toBe(200)
    const accountBody = (await account.json()) as { markdown: string }
    expect(accountBody.markdown).toContain('- Event: Loan recorded')

    const references = await app.request(`/api/workshops/${workshopId}/board/blocks/b_1/references`)
    expect(references.status).toBe(200)
    await expect(references.json()).resolves.toEqual([
      { kind: 'readable-account', path: 'building-blocks' },
    ])
  })

  describe('mounted capability smoke', () => {
    it('GET /api/workshops/:id/board (board-access)', async () => {
      const { config, app } = wired()
      const workshopId = await createWorkshop(app)
      applyOperation(
        { store: config.store, clock: config.clock },
        workshopId,
        Operation.parse({
          author: { accepter: { name: 'Dana' } },
          kind: 'capture-domain-event',
          id: 'b_smoke',
          label: 'Smoke event',
        }),
      )
      const response = await app.request(`/api/workshops/${workshopId}/board`)
      expect(response.status).not.toBe(404)
      expect(response.status).toBe(200)
    })

    it('POST /api/workshops/:id/scope (set-scope)', async () => {
      const { app } = wired()
      const workshopId = await createWorkshop(app)
      const response = await app.request(`/api/workshops/${workshopId}/scope`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ statement: 'A lending library for members.' }),
      })
      expect(response.status).not.toBe(404)
      expect(response.status).toBe(200)
    })

    it('POST /api/workshops/:id/sessions (start-session)', async () => {
      const { app } = wired()
      const workshopId = await createWorkshop(app)
      const response = await app.request(`/api/workshops/${workshopId}/sessions`, { method: 'POST' })
      expect(response.status).not.toBe(404)
      expect(response.status).toBe(202)
    })

    it('POST /api/sessions/:id/contributions (make-contribution)', async () => {
      const { app } = wired()
      const workshopId = await createWorkshop(app)
      const sessionId = await startSession(app, workshopId)
      const response = await app.request(`/api/sessions/${sessionId}/contributions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: 'A member borrows a book.' }),
      })
      expect(response.status).not.toBe(404)
      expect(response.status).toBe(202)
    })

    it('POST /api/proposals/:id/accept (review-proposal)', async () => {
      const { config, app } = wired()
      const workshopId = await createWorkshop(app)
      const sessionId = await startSession(app, workshopId)
      seedProposal(config.store, sessionId, 'p_smoke' as ProposalId, 'Book borrowed')
      const response = await app.request('/api/proposals/p_smoke/accept', { method: 'POST' })
      expect(response.status).not.toBe(404)
      expect(response.status).toBe(200)
    })

    it('POST /api/sessions/:id/close (close-session)', async () => {
      const { app } = wired()
      const workshopId = await createWorkshop(app)
      const sessionId = await startSession(app, workshopId)
      const response = await app.request(`/api/sessions/${sessionId}/close`, { method: 'POST' })
      expect(response.status).not.toBe(404)
      expect(response.status).toBe(200)
    })
  })

  describe('error-path smoke', () => {
    it('GET /api/workshops/:id/session returns 404 for an unknown workshop', async () => {
      const response = await wired().app.request('/api/workshops/w_does_not_exist/session')
      expect(response.status).toBe(404)
      await expect(response.json()).resolves.toEqual({ error: 'unknown-workshop' })
    })

    it('POST /api/workshops returns 400 for a malformed body', async () => {
      const response = await wired().app.request('/api/workshops', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      })
      expect(response.status).toBe(400)
      await expect(response.json()).resolves.toEqual({ error: 'invalid-body' })
    })
  })
})
