import { afterEach, describe, expect, it, vi } from 'vitest'
import * as hotSpotsTransport from '../../../transport/hot-spots.ts'
import { useFlagHotSpot } from './use-flag-hot-spot.ts'

// Suite: use-flag-hot-spot
// Invariant: A direct flag posts one raise-hot-spot (with the target id only when a block is
//   selected) and then signals the shell to refetch the board.
// Boundary IN: onFlag in the composable with stubbed transport.
// Boundary OUT: HTTP client (transport tests), board emit wiring (BoardWall.test.ts),
//   shell refetch (use-flag-hot-spot.integration.test.ts).

afterEach(() => {
  vi.restoreAllMocks()
})

const setup = () => {
  const mutated = vi.fn<() => void>()
  const boardDirty = vi.fn<() => void>()
  const hooks = useFlagHotSpot(
    () => 'w1',
    () => 'Maria',
    { mutated: () => { mutated() }, boardDirty: () => { boardDirty() } },
  )
  return { emit: { mutated, boardDirty }, hooks }
}

describe('useFlagHotSpot', () => {
  it('flags on a selected block: posts the target id and author, then refetches the board', async () => {
    const flag = vi.spyOn(hotSpotsTransport, 'flagHotSpot').mockResolvedValue({})
    const { emit, hooks } = setup()

    await hooks.onFlag({ targetId: 'eA', label: 'Concern: Payment captured', modelAffecting: false })

    expect(flag).toHaveBeenCalledWith('w1', {
      label: 'Concern: Payment captured',
      author: { accepter: { name: 'Maria' } },
      annotatesTargetId: 'eA',
      modelAffecting: false,
    })
    expect(emit.boardDirty).toHaveBeenCalledTimes(1)
    expect(emit.mutated).toHaveBeenCalledTimes(1)
  })

  it('flags with no target: posts no annotatesTargetId', async () => {
    const flag = vi.spyOn(hotSpotsTransport, 'flagHotSpot').mockResolvedValue({})
    const { emit, hooks } = setup()

    await hooks.onFlag({ targetId: null, label: 'Hot spot' })

    expect(flag).toHaveBeenCalledWith('w1', {
      label: 'Hot spot',
      author: { accepter: { name: 'Maria' } },
    })
    expect(emit.boardDirty).toHaveBeenCalledTimes(1)
    expect(emit.mutated).toHaveBeenCalledTimes(1)
  })

  it('emits nothing when the flag is rejected', async () => {
    vi.spyOn(hotSpotsTransport, 'flagHotSpot').mockRejectedValue(new Error('unknown-target'))
    const { emit, hooks } = setup()

    await expect(hooks.onFlag({ targetId: 'gone', label: 'Hot spot' })).rejects.toThrow('unknown-target')

    expect(emit.boardDirty).not.toHaveBeenCalled()
    expect(emit.mutated).not.toHaveBeenCalled()
  })
})
