import { afterEach, describe, expect, it, vi } from 'vitest'
import { HttpError } from '../../transport/board.ts'
import * as boardTransport from '../../transport/board.ts'
import { applyBoardEdit } from './apply-board-edit.ts'

afterEach(() => {
  vi.restoreAllMocks()
})

const labels = new Map([
  ['eA', 'Loan recorded'],
  ['eB', 'Book returned'],
])

// Suite: apply-board-edit
// Invariant: POST apply returns ok or typed cycle inline copy; other errors rethrow.
// Boundary IN: Kernel transport apply and 422 cycle mapping.
// Boundary OUT: onBoardDirty emission and UI feedback (use-relate-blocks.test.ts).

describe('applyBoardEdit', () => {
  it('POSTs the edit with author and returns ok', async () => {
    vi.spyOn(boardTransport, 'postBoardOperation').mockResolvedValue({ position: 1 })

    const result = await applyBoardEdit({
      workshopId: 'w1',
      accepter: 'Maria',
      edit: { kind: 'place', target: 'eA' },
      blockLabels: labels,
    })

    expect(result).toEqual({ ok: true })
    expect(boardTransport.postBoardOperation).toHaveBeenCalledWith('w1', {
      v: 1,
      kind: 'place',
      target: 'eA',
      author: { accepter: { name: 'Maria' } },
    })
  })

  it('returns cycle inline copy on 422 without rethrowing', async () => {
    vi.spyOn(boardTransport, 'postBoardOperation').mockRejectedValue(
      new HttpError(422, { error: 'cycle', path: ['eA', 'eB', 'eA'] }),
    )

    const result = await applyBoardEdit({
      workshopId: 'w1',
      accepter: 'Maria',
      edit: { kind: 'sequence', predecessor: 'eA', successor: 'eB' },
      blockLabels: labels,
    })

    expect(result).toEqual({
      ok: false,
      cycleError: 'That sequence would loop: Loan recorded → Book returned → Loan recorded.',
    })
  })

  it('rethrows non-cycle 422 errors', async () => {
    vi.spyOn(boardTransport, 'postBoardOperation').mockRejectedValue(
      new HttpError(422, { error: 'kind-permission' }),
    )

    await expect(
      applyBoardEdit({
        workshopId: 'w1',
        accepter: 'Maria',
        edit: { kind: 'place', target: 'eA' },
        blockLabels: labels,
      }),
    ).rejects.toThrow(HttpError)
  })

  it('rethrows non-cycle errors', async () => {
    vi.spyOn(boardTransport, 'postBoardOperation').mockRejectedValue(new HttpError(500, {}))

    await expect(
      applyBoardEdit({
        workshopId: 'w1',
        accepter: 'Maria',
        edit: { kind: 'place', target: 'eA' },
        blockLabels: labels,
      }),
    ).rejects.toThrow(HttpError)
  })
})
