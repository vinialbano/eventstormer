// Suite: transport board
// Invariant: postBoardOperation serialises each board-edit kind to the correct POST body shape.
// Boundary IN: transport/board.ts fetch adapter with stubbed fetch.
// Boundary OUT: BoardWall gesture integration (BoardWall.drop.test.ts, RewordConfirm.test.ts).

import { describe, expect, it, vi } from 'vitest'
import * as client from '../client.ts'
import {
  fetchBlockReferences,
  postBoardOperation,
  referenceSiteLine,
  type BoardEdit,
} from './board.ts'

const author = { accepter: { name: 'Maria' } } as const

// Suite: board transport
// Invariant: POST bodies match the BoardEdit discriminated union; GET references uses the block route.
// Boundary IN: fetchBlockReferences path, referenceSiteLine copy, postBoardOperation wire shapes.
// Boundary OUT: composable dirty callbacks (use-reword-block.test.ts), wall gestures (BoardWall.drop.test.ts).

describe('fetchBlockReferences', () => {
  it('GETs the block references route via getJson', async () => {
    const sites = [{ kind: 'readable-account', path: 'building-blocks' }]
    const getJson = vi.spyOn(client, 'getJson').mockResolvedValue(sites)

    await expect(fetchBlockReferences('w1', 'b1')).resolves.toEqual(sites)
    expect(getJson).toHaveBeenCalledWith('/api/workshops/w1/board/blocks/b1/references')
  })
})

describe('referenceSiteLine', () => {
  it('names the readable-account building-blocks path', () => {
    expect(referenceSiteLine({ kind: 'readable-account', path: 'building-blocks' })).toBe(
      'Readable account · Building blocks',
    )
    expect(referenceSiteLine({ kind: 'other', path: 'timeline' })).toBe('timeline')
  })
})

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
