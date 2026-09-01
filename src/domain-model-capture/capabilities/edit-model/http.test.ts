import { describe, expect, it } from 'vitest'
import { createMemoryEventStore } from '~/plumbing/event-store/memory-store.ts'
import type { BuildingBlockId, WorkshopId } from '~/plumbing/ids.ts'
import { replay } from '../../domain/board/replay.ts'
import { Operation } from '../../domain/schema/index.ts'
import { applyOperation } from '../../infrastructure/apply-operation.ts'
import { boardStream } from '../../infrastructure/board-stream.ts'
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

  it('rejects sequence with 422 not-implemented-in-slice and does not append', async () => {
    const deps = depsFor()
    capture(deps, 'b_1', 'Loan recorded')
    capture(deps, 'b_2', 'Book returned')

    const response = await postOp(deps, {
      v: 1,
      kind: 'sequence',
      predecessor: 'b_1',
      successor: 'b_2',
      author,
    })
    expect(response.status).toBe(422)
    await expect(response.json()).resolves.toEqual({
      error: 'not-implemented-in-slice',
      classification: 'systemic',
    })
    expect(logOf(deps)).toHaveLength(2)
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
