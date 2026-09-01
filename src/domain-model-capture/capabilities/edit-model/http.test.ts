import { describe, expect, it } from 'vitest'
import { createMemoryEventStore } from '~/plumbing/event-store/memory-store.ts'
import type { BuildingBlockId, WorkshopId } from '~/plumbing/ids.ts'
import { replay } from '../../domain/board/replay.ts'
import { Operation } from '../../domain/schema/index.ts'
import { applyOperation } from '../../infrastructure/apply-operation.ts'
import { boardStream } from '../../infrastructure/board-stream.ts'
import { readBoardSnapshot } from '../../api.ts'
import type { EditModelDeps } from './deps.ts'
import { editModelRoutes } from './http.ts'

const workshopId = 'w_1' as WorkshopId
const author = { accepter: { name: 'Dana' } }
const clock = () => '2026-08-30T12:00:00.000Z'

const depsFor = (): EditModelDeps => ({ store: createMemoryEventStore(), clock })

const capture = (deps: EditModelDeps, id: string, label: string) =>
  applyOperation(
    deps,
    workshopId,
    Operation.parse({ author, kind: 'capture-domain-event', id, label }),
  )

const identify = (deps: EditModelDeps, id: string, label: string) =>
  applyOperation(
    deps,
    workshopId,
    Operation.parse({ author, kind: 'identify-actor', id, label }),
  )

const postOp = (deps: EditModelDeps, body: unknown, id: string = workshopId) =>
  editModelRoutes(deps).request(`/workshops/${id}/board/operations`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

const logOf = (deps: EditModelDeps) => deps.store.read(boardStream(workshopId))

const snapshotOf = (deps: EditModelDeps) =>
  replay(logOf(deps).map((row) => Operation.parse(row.operation)))

const rewordBody = (label: string, target = 'b_1') => ({
  v: 1,
  kind: 'reword' as const,
  target,
  label,
  author,
})

describe('POST /workshops/:id/board/operations', () => {
  it('appends one reword with a distinct label, keeps the id, and returns the new position', async () => {
    const deps = depsFor()
    capture(deps, 'b_1', 'Loan recorded')

    const response = await postOp(deps, rewordBody('Loan was recorded'))
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ position: 1 })
    expect(logOf(deps)).toHaveLength(2)
    expect(snapshotOf(deps).blocks.get('b_1' as BuildingBlockId)).toMatchObject({
      label: 'Loan was recorded',
      withdrawn: false,
    })
  })

  it('appends exactly one reword when the label is unchanged', async () => {
    const deps = depsFor()
    capture(deps, 'b_1', 'Loan recorded')

    const response = await postOp(deps, rewordBody('Loan recorded'))
    expect(response.status).toBe(200)
    expect(logOf(deps)).toHaveLength(2)
    expect(snapshotOf(deps).blocks.get('b_1' as BuildingBlockId)).toMatchObject({
      label: 'Loan recorded',
    })
  })

  it('appends sequence, bumps position, and GET board shows the follows edge', async () => {
    const deps = depsFor()
    capture(deps, 'eA', 'Loan recorded')
    capture(deps, 'eB', 'Book returned')

    const response = await postOp(deps, {
      v: 1,
      kind: 'sequence',
      predecessor: 'eA',
      successor: 'eB',
      author,
    })
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ position: 2 })
    expect(logOf(deps)).toHaveLength(3)

    const board = readBoardSnapshot({ store: deps.store }, workshopId)
    expect(board.follows).toEqual([{ predecessor: 'eA', successor: 'eB' }])
    expect(board.blocks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'eA', placement: 'timeline' }),
        expect.objectContaining({ id: 'eB', placement: 'timeline' }),
      ]),
    )
  })

  it.each([
    {
      name: 'place puts the captured event on the timeline',
      seed: (deps: EditModelDeps) => {
        capture(deps, 'e1', 'Loan recorded')
      },
      body: { v: 1, kind: 'place' as const, target: 'e1', author },
      position: 1,
      logLength: 2,
      assertBoard: (board: ReturnType<typeof readBoardSnapshot>) => {
        expect(board.blocks).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ id: 'e1', placement: 'timeline' }),
          ]),
        )
      },
    },
    {
      name: 'unplace returns an isolated event to the backlog',
      seed: (deps: EditModelDeps) => {
        capture(deps, 'e1', 'Loan recorded')
        applyOperation(deps, workshopId, Operation.parse({ author, kind: 'place', target: 'e1' }))
      },
      body: { v: 1, kind: 'unplace' as const, target: 'e1', author },
      position: 2,
      logLength: 3,
      assertBoard: (board: ReturnType<typeof readBoardSnapshot>) => {
        expect(board.blocks).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ id: 'e1', placement: 'backlog' }),
          ]),
        )
      },
    },
    {
      name: 'unsequence drops the follows edge',
      seed: (deps: EditModelDeps) => {
        capture(deps, 'eA', 'Loan recorded')
        capture(deps, 'eB', 'Book returned')
        applyOperation(
          deps,
          workshopId,
          Operation.parse({ author, kind: 'sequence', predecessor: 'eA', successor: 'eB' }),
        )
      },
      body: { v: 1, kind: 'unsequence' as const, predecessor: 'eA', successor: 'eB', author },
      position: 3,
      logLength: 4,
      assertBoard: (board: ReturnType<typeof readBoardSnapshot>) => {
        expect(board.follows).toEqual([])
      },
    },
    {
      name: 'insert-between replaces A→B with A→C and C→B and places C',
      seed: (deps: EditModelDeps) => {
        capture(deps, 'eA', 'Loan recorded')
        capture(deps, 'eB', 'Book returned')
        capture(deps, 'eC', 'Fine assessed')
        applyOperation(
          deps,
          workshopId,
          Operation.parse({ author, kind: 'sequence', predecessor: 'eA', successor: 'eB' }),
        )
      },
      body: {
        v: 1,
        kind: 'insert-between' as const,
        predecessor: 'eA',
        inserted: 'eC',
        successor: 'eB',
        author,
      },
      position: 4,
      logLength: 5,
      assertBoard: (board: ReturnType<typeof readBoardSnapshot>) => {
        expect(board.follows).toEqual([
          { predecessor: 'eA', successor: 'eC' },
          { predecessor: 'eC', successor: 'eB' },
        ])
        expect(board.follows).not.toContainEqual({ predecessor: 'eA', successor: 'eB' })
        expect(board.blocks).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ id: 'eC', placement: 'timeline' }),
          ]),
        )
      },
    },
    {
      name: 'link-cause publishes the causedBy edge',
      seed: (deps: EditModelDeps) => {
        identify(deps, 'a1', 'Clerk')
        capture(deps, 'eA', 'Loan recorded')
      },
      body: { v: 1, kind: 'link-cause' as const, cause: 'a1', effect: 'eA', author },
      position: 2,
      logLength: 3,
      assertBoard: (board: ReturnType<typeof readBoardSnapshot>) => {
        expect(board.causedBy).toEqual([{ cause: 'a1', effect: 'eA' }])
      },
    },
    {
      name: 'unlink-cause removes the causedBy edge',
      seed: (deps: EditModelDeps) => {
        identify(deps, 'a1', 'Clerk')
        capture(deps, 'eA', 'Loan recorded')
        applyOperation(
          deps,
          workshopId,
          Operation.parse({ author, kind: 'link-cause', cause: 'a1', effect: 'eA' }),
        )
      },
      body: { v: 1, kind: 'unlink-cause' as const, cause: 'a1', effect: 'eA', author },
      position: 3,
      logLength: 4,
      assertBoard: (board: ReturnType<typeof readBoardSnapshot>) => {
        expect(board.causedBy).toEqual([])
      },
    },
    {
      name: 'mark-pivotal sets pivotal true',
      seed: (deps: EditModelDeps) => {
        capture(deps, 'eA', 'Loan recorded')
      },
      body: { v: 1, kind: 'mark-pivotal' as const, target: 'eA', author },
      position: 1,
      logLength: 2,
      assertBoard: (board: ReturnType<typeof readBoardSnapshot>) => {
        expect(board.blocks).toEqual(
          expect.arrayContaining([expect.objectContaining({ id: 'eA', pivotal: true })]),
        )
      },
    },
    {
      name: 'unmark-pivotal sets pivotal false',
      seed: (deps: EditModelDeps) => {
        capture(deps, 'eA', 'Loan recorded')
        applyOperation(
          deps,
          workshopId,
          Operation.parse({ author, kind: 'mark-pivotal', target: 'eA' }),
        )
      },
      body: { v: 1, kind: 'unmark-pivotal' as const, target: 'eA', author },
      position: 2,
      logLength: 3,
      assertBoard: (board: ReturnType<typeof readBoardSnapshot>) => {
        expect(board.blocks).toEqual(
          expect.arrayContaining([expect.objectContaining({ id: 'eA', pivotal: false })]),
        )
      },
    },
  ])('$name', async ({ seed, body, position, logLength, assertBoard }) => {
    const deps = depsFor()
    seed(deps)

    const response = await postOp(deps, body)
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ position })
    expect(logOf(deps)).toHaveLength(logLength)

    assertBoard(readBoardSnapshot({ store: deps.store }, workshopId))
  })

  it('rejects raise-hot-spot with 422 not-implemented-in-slice and does not append', async () => {
    const deps = depsFor()
    capture(deps, 'b_1', 'Loan recorded')

    const response = await postOp(deps, {
      v: 1,
      kind: 'raise-hot-spot',
      id: 'h_1',
      label: 'Unclear fee',
      author,
    })
    expect(response.status).toBe(422)
    await expect(response.json()).resolves.toEqual({
      error: 'not-implemented-in-slice',
      classification: 'systemic',
    })
    expect(logOf(deps)).toHaveLength(1)
  })

  it('rejects a cycling sequence with 422 cycle and the offending path', async () => {
    const deps = depsFor()
    capture(deps, 'eA', 'Loan recorded')
    capture(deps, 'eB', 'Book returned')
    capture(deps, 'eC', 'Fine assessed')
    await postOp(deps, {
      v: 1,
      kind: 'sequence',
      predecessor: 'eA',
      successor: 'eB',
      author,
    })
    await postOp(deps, {
      v: 1,
      kind: 'sequence',
      predecessor: 'eB',
      successor: 'eC',
      author,
    })

    const response = await postOp(deps, {
      v: 1,
      kind: 'sequence',
      predecessor: 'eC',
      successor: 'eA',
      author,
    })
    expect(response.status).toBe(422)
    await expect(response.json()).resolves.toEqual({
      error: 'cycle',
      classification: 'systemic',
      path: ['eC', 'eA', 'eB', 'eC'],
    })
    expect(logOf(deps)).toHaveLength(5)
  })

  it('rejects an empty label with 422 empty-label, not 400', async () => {
    const deps = depsFor()
    capture(deps, 'b_1', 'Loan recorded')

    const empty = await postOp(deps, rewordBody(''))
    expect(empty.status).toBe(422)
    await expect(empty.json()).resolves.toEqual({ error: 'empty-label', classification: 'systemic' })

    const whitespace = await postOp(deps, rewordBody('   '))
    expect(whitespace.status).toBe(422)
    await expect(whitespace.json()).resolves.toEqual({
      error: 'empty-label',
      classification: 'systemic',
    })
    expect(logOf(deps)).toHaveLength(1)
  })

  it('rejects a label longer than 10000 characters with 400', async () => {
    const deps = depsFor()
    capture(deps, 'b_1', 'Loan recorded')

    const response = await postOp(deps, rewordBody('x'.repeat(10_001)))
    expect(response.status).toBe(400)
    expect(logOf(deps)).toHaveLength(1)
  })

  it('returns 404 when the board stream is empty', async () => {
    const response = await postOp(depsFor(), rewordBody('Loan was recorded'))
    expect(response.status).toBe(404)
  })

  it('rejects reword of a withdrawn target, withdraw of a withdrawn target, reinstate of an active target, and an unknown target', async () => {
    const deps = depsFor()
    capture(deps, 'b_1', 'Loan recorded')
    capture(deps, 'b_2', 'Book returned')
    applyOperation(deps, workshopId, Operation.parse({ author, kind: 'withdraw', target: 'b_1' }))

    const rewordWithdrawn = await postOp(deps, rewordBody('Loan was recorded', 'b_1'))
    expect(rewordWithdrawn.status).toBe(422)
    await expect(rewordWithdrawn.json()).resolves.toEqual({
      error: 'withdrawn-target',
      classification: 'systemic',
    })

    const reWithdraw = await postOp(deps, { v: 1, kind: 'withdraw', target: 'b_1', author })
    expect(reWithdraw.status).toBe(422)
    await expect(reWithdraw.json()).resolves.toEqual({
      error: 'already-withdrawn',
      classification: 'systemic',
    })

    const reinstateActive = await postOp(deps, { v: 1, kind: 'reinstate', target: 'b_2', author })
    expect(reinstateActive.status).toBe(422)
    await expect(reinstateActive.json()).resolves.toEqual({
      error: 'not-withdrawn',
      classification: 'systemic',
    })

    const unknown = await postOp(deps, { v: 1, kind: 'withdraw', target: 'missing', author })
    expect(unknown.status).toBe(422)
    await expect(unknown.json()).resolves.toEqual({
      error: 'unknown-target',
      classification: 'systemic',
    })
    expect(logOf(deps)).toHaveLength(3)
  })

  it('withdraws then reinstates with one op each and the same id', async () => {
    const deps = depsFor()
    capture(deps, 'b_1', 'Loan recorded')

    const withdrawn = await postOp(deps, { v: 1, kind: 'withdraw', target: 'b_1', author })
    expect(withdrawn.status).toBe(200)
    expect(logOf(deps)).toHaveLength(2)
    expect(snapshotOf(deps).blocks.get('b_1' as BuildingBlockId)).toMatchObject({ withdrawn: true })

    const reinstated = await postOp(deps, { v: 1, kind: 'reinstate', target: 'b_1', author })
    expect(reinstated.status).toBe(200)
    expect(logOf(deps)).toHaveLength(3)
    expect(snapshotOf(deps).blocks.get('b_1' as BuildingBlockId)).toMatchObject({
      withdrawn: false,
      label: 'Loan recorded',
    })
  })

  it('records the body author as accepter-only on the appended operation', async () => {
    const deps = depsFor()
    capture(deps, 'b_1', 'Loan recorded')

    await postOp(deps, rewordBody('Loan was recorded'))
    const appended = Operation.parse(logOf(deps).at(-1)?.operation)
    expect(appended).toMatchObject({
      kind: 'reword',
      author: { accepter: { name: 'Dana' } },
    })
    expect(appended.author).not.toHaveProperty('proposer')
  })
})
