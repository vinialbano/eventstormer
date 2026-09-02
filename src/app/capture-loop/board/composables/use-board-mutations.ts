import { type Ref } from 'vue'
import type { BoardBlockInput } from '../layout.ts'
import { useRelateBlocks } from '../interactions/relate-blocks/use-relate-blocks.ts'

/** Bundled wrapper until BoardWall composes relate-blocks directly. */
export const useBoardMutations = (options: {
  workshopId: Ref<string | undefined>
  accepter: Ref<string | undefined>
  blocks: Ref<BoardBlockInput[]>
  selectedId: Ref<string | null>
  lastPlacedId: Ref<string | null>
  onBoardDirty: () => void
  startReword: (id: string) => Promise<void>
}) => {
  const relate = useRelateBlocks({
    workshopId: options.workshopId,
    accepter: options.accepter,
    blocks: options.blocks,
    selectedId: options.selectedId,
    lastPlacedId: options.lastPlacedId,
    onBoardDirty: options.onBoardDirty,
  })

  const rewordSelected = (): void => {
    const id = options.selectedId.value
    if (id === null) return
    void options.startReword(id)
  }

  return { ...relate, rewordSelected }
}
