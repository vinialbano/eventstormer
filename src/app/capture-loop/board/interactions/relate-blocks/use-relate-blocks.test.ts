import { afterEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import * as applyBoardEditModule from '../../kernel/apply-board-edit.ts'
import { useRelateBlocks } from './use-relate-blocks.ts'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useRelateBlocks', () => {
  it('does not emit board-dirty when applyBoardEdit returns a cycle error', async () => {
    vi.spyOn(applyBoardEditModule, 'applyBoardEdit').mockResolvedValue({
      ok: false,
      cycleError: 'That sequence would loop.',
    })

    const onBoardDirty = vi.fn()
    const relate = useRelateBlocks({
      workshopId: ref('w1'),
      accepter: ref('Maria'),
      blocks: ref([{ id: 'eA', kind: 'domain-event', label: 'Loan recorded' }]),
      selectedId: ref('eA'),
      lastPlacedId: ref(null),
      onBoardDirty,
    })

    await relate.applyEdit({ kind: 'place', target: 'eA' })

    expect(onBoardDirty).not.toHaveBeenCalled()
    expect(relate.relationError.value).toContain('loop')
  })
})
