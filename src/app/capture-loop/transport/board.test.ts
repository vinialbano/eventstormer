import { describe, expect, it, vi } from 'vitest'
import { postBoardOperation, type BoardEdit } from './board.ts'

const author = { accepter: { name: 'Maria' } } as const

// place and reword wire shapes are also asserted in BoardWall.drop.test.ts and
// RewordConfirm.test.ts; this file pins the discriminated-union kinds that lack
// a dedicated component test (sequence, link-cause).

describe('postBoardOperation', () => {
  it('POSTs a sequence body with predecessor and successor and no target', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ position: 4 }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const operation: BoardEdit = {
      v: 1,
      kind: 'sequence',
      predecessor: 'eA',
      successor: 'eB',
      author,
    }
    await postBoardOperation('w1', operation)

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/workshops/w1/board/operations',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          v: 1,
          kind: 'sequence',
          predecessor: 'eA',
          successor: 'eB',
          author,
        }),
      }),
    )
    vi.unstubAllGlobals()
  })

  it('POSTs a link-cause body with cause and effect and no target', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ position: 5 }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const operation: BoardEdit = {
      v: 1,
      kind: 'link-cause',
      cause: 'a1',
      effect: 'eA',
      author,
    }
    await postBoardOperation('w1', operation)

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/workshops/w1/board/operations',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          v: 1,
          kind: 'link-cause',
          cause: 'a1',
          effect: 'eA',
          author,
        }),
      }),
    )
    vi.unstubAllGlobals()
  })

  it('POSTs a place body with target and no predecessor or successor', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ position: 2 }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const operation: BoardEdit = {
      v: 1,
      kind: 'place',
      target: 'eC',
      author,
    }
    await postBoardOperation('w1', operation)

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/workshops/w1/board/operations',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          v: 1,
          kind: 'place',
          target: 'eC',
          author,
        }),
      }),
    )
    vi.unstubAllGlobals()
  })

  it('POSTs a reword body with target and label and no predecessor or successor', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ position: 3 }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const operation: BoardEdit = {
      v: 1,
      kind: 'reword',
      target: 'eA',
      label: 'Loan was recorded',
      author,
    }
    await postBoardOperation('w1', operation)

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/workshops/w1/board/operations',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          v: 1,
          kind: 'reword',
          target: 'eA',
          label: 'Loan was recorded',
          author,
        }),
      }),
    )
    vi.unstubAllGlobals()
  })
})
