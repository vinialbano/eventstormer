import { describe, expect, it, vi } from 'vitest'
import { postBoardOperation, type BoardEdit } from './mutations.ts'

const author = { accepter: { name: 'Maria' } } as const

describe('postBoardOperation', () => {
  it('POSTs a sequence body with predecessor and successor and no target', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ position: 4 }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      ),
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
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).not.toHaveProperty('target')
    vi.unstubAllGlobals()
  })

  it('POSTs a link-cause body with cause and effect and no target', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ position: 5 }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      ),
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
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).not.toHaveProperty('target')
    vi.unstubAllGlobals()
  })
})
