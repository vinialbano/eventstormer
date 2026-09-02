import { afterEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { HttpError } from '../../../transport/board.ts'
import * as boardTransport from '../../../transport/board.ts'
import { useRelateBlocks } from './use-relate-blocks.ts'

afterEach(() => {
  vi.restoreAllMocks()
})

const posted = () => vi.mocked(boardTransport.postBoardOperation)

const relateBlocks = (over: {
  workshopId?: string | undefined
  accepter?: string | undefined
  onBoardDirty?: () => void
}) => {
  const onBoardDirty = over.onBoardDirty ?? vi.fn<() => void>()
  return {
    onBoardDirty,
    relate: useRelateBlocks({
      workshopId: ref('workshopId' in over ? over.workshopId : 'w1'),
      accepter: ref('accepter' in over ? over.accepter : 'Maria'),
      blocks: ref([
        { id: 'eA', kind: 'domain-event', label: 'Loan recorded' },
        { id: 'eB', kind: 'domain-event', label: 'Book returned' },
      ]),
      selectedId: ref('eA'),
      lastPlacedId: ref(null),
      onBoardDirty,
    }),
  }
}

// Suite: use-relate-blocks
// Invariant: Successful edits emit board-dirty; cycle and transport failures do not.
// Boundary IN: onBoardDirty callback contract in the relate-blocks composable.
// Boundary OUT: HTTP POST and cycle mapping (apply-board-edit.test.ts), wall gestures (BoardWall.drop.test.ts).

describe('useRelateBlocks', () => {
  it('emits board-dirty once when applyBoardEdit succeeds', async () => {
    vi.spyOn(boardTransport, 'postBoardOperation').mockResolvedValue({ position: 9 })

    const { onBoardDirty, relate } = relateBlocks({})
    await relate.applyEdit({ kind: 'place', target: 'eA' })

    expect(onBoardDirty).toHaveBeenCalledTimes(1)
    expect(relate.relationError.value).toBe('')
  })

  it('does not emit board-dirty when the server rejects a cycle', async () => {
    vi.spyOn(boardTransport, 'postBoardOperation').mockRejectedValue(
      new HttpError(422, { error: 'cycle', path: ['eA', 'eB', 'eA'] }),
    )

    const { onBoardDirty, relate } = relateBlocks({})
    await relate.applyEdit({ kind: 'sequence', predecessor: 'eA', successor: 'eB' })

    expect(posted()).toHaveBeenCalledWith(
      'w1',
      expect.objectContaining({ kind: 'sequence', predecessor: 'eA', successor: 'eB' }),
    )
    expect(onBoardDirty).not.toHaveBeenCalled()
    expect(relate.relationError.value).toContain('loop')
  })

  it('rejects and does not emit board-dirty when postBoardOperation fails with a non-cycle error', async () => {
    vi.spyOn(boardTransport, 'postBoardOperation').mockRejectedValue(new HttpError(500, {}))

    const { onBoardDirty, relate } = relateBlocks({})
    await expect(relate.applyEdit({ kind: 'place', target: 'eA' })).rejects.toThrow(HttpError)
    expect(onBoardDirty).not.toHaveBeenCalled()
  })

  it('does not POST when workshopId is undefined', async () => {
    vi.spyOn(boardTransport, 'postBoardOperation')
    const { onBoardDirty, relate } = relateBlocks({ workshopId: undefined })
    await relate.applyEdit({ kind: 'place', target: 'eA' })
    expect(posted()).not.toHaveBeenCalled()
    expect(onBoardDirty).not.toHaveBeenCalled()
  })

  it('does not POST when workshopId is empty', async () => {
    vi.spyOn(boardTransport, 'postBoardOperation')
    const { onBoardDirty, relate } = relateBlocks({ workshopId: '' })
    await relate.applyEdit({ kind: 'place', target: 'eA' })
    expect(posted()).not.toHaveBeenCalled()
    expect(onBoardDirty).not.toHaveBeenCalled()
  })

  it('does not POST when accepter is undefined', async () => {
    vi.spyOn(boardTransport, 'postBoardOperation')
    const { onBoardDirty, relate } = relateBlocks({ accepter: undefined })
    await relate.applyEdit({ kind: 'place', target: 'eA' })
    expect(posted()).not.toHaveBeenCalled()
    expect(onBoardDirty).not.toHaveBeenCalled()
  })
})
