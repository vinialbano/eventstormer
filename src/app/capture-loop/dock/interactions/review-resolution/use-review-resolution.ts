import { acceptResolution, editResolution, rejectResolution } from '../../../transport/resolutions.ts'

interface DockEmit {
  mutated: () => void
  boardDirty: () => void
}

/**
 * Resolution review actions — accept, edit, reject. Mirrors `useReviewProposal`:
 * the composable POSTs and emits the dock refetch signals; the card stays
 * presentational and never mutates model state optimistically. Accept touches
 * the board (it resolves the hot spot), so it emits `board-dirty` too.
 */
export const useReviewResolution = (emit: DockEmit) => {
  const run = async (work: Promise<unknown>, boardDirty = false): Promise<void> => {
    await work
    if (boardDirty) emit.boardDirty()
    emit.mutated()
  }

  const onAccept = (id: string): Promise<void> => run(acceptResolution(id), true)
  const onReject = (id: string): Promise<void> => run(rejectResolution(id))
  const onEdit = (id: string, reference: string): Promise<void> => run(editResolution(id, reference))

  return { onAccept, onReject, onEdit }
}
