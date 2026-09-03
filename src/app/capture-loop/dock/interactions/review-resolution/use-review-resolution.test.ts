import { afterEach, describe, expect, it, vi } from 'vitest'
import * as resolutionsTransport from '../../../transport/resolutions.ts'
import { useReviewResolution } from './use-review-resolution.ts'

// Suite: use-review-resolution
// Invariant: Resolution review actions call transport once and emit the correct dock refetch signals.
//   Accept also emits board-dirty (it resolves the hot spot).
// Boundary IN: onAccept/onReject/onEdit in the composable with stubbed transport.
// Boundary OUT: HTTP client (transport tests), card button wiring (ResolutionCard.test.ts).

afterEach(() => {
  vi.restoreAllMocks()
})

const review = () => {
  const mutated = vi.fn<() => void>()
  const boardDirty = vi.fn<() => void>()
  const hooks = useReviewResolution({
    mutated: () => { mutated() },
    boardDirty: () => { boardDirty() },
  })
  return { emit: { mutated, boardDirty }, hooks }
}

describe('useReviewResolution', () => {
  it('onAccept posts accept and emits board-dirty then mutated', async () => {
    vi.spyOn(resolutionsTransport, 'acceptResolution').mockResolvedValue({})
    const { emit, hooks } = review()

    await hooks.onAccept('r1')

    expect(resolutionsTransport.acceptResolution).toHaveBeenCalledWith('r1')
    expect(emit.boardDirty).toHaveBeenCalledTimes(1)
    expect(emit.mutated).toHaveBeenCalledTimes(1)
  })

  it('onReject posts reject and emits mutated only', async () => {
    vi.spyOn(resolutionsTransport, 'rejectResolution').mockResolvedValue({})
    const { emit, hooks } = review()

    await hooks.onReject('r1')

    expect(resolutionsTransport.rejectResolution).toHaveBeenCalledWith('r1')
    expect(emit.boardDirty).not.toHaveBeenCalled()
    expect(emit.mutated).toHaveBeenCalledTimes(1)
  })

  it('onEdit posts the reference and emits mutated only', async () => {
    vi.spyOn(resolutionsTransport, 'editResolution').mockResolvedValue({})
    const { emit, hooks } = review()

    await hooks.onEdit('r1', 'we added a retry step')

    expect(resolutionsTransport.editResolution).toHaveBeenCalledWith('r1', 'we added a retry step')
    expect(emit.boardDirty).not.toHaveBeenCalled()
    expect(emit.mutated).toHaveBeenCalledTimes(1)
  })

  it('emits nothing when accept rejects', async () => {
    vi.spyOn(resolutionsTransport, 'acceptResolution').mockRejectedValue(new Error('network'))
    const { emit, hooks } = review()

    await expect(hooks.onAccept('r1')).rejects.toThrow('network')

    expect(emit.boardDirty).not.toHaveBeenCalled()
    expect(emit.mutated).not.toHaveBeenCalled()
  })
})
