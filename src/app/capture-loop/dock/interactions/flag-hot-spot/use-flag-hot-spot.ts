import { flagHotSpot } from '../../../transport/hot-spots.ts'

interface DockEmit {
  mutated: () => void
  boardDirty: () => void
}

export interface FlagRequest {
  label: string
  /** Present when flagging on a selected block; absent for a board-level flag. */
  targetId?: string | null
  modelAffecting?: boolean
}

/**
 * Direct "flag hot spot" orchestration. Posts one `raise-hot-spot` (plus a
 * follow-on `annotate` server-side when a target is named), then signals the
 * shell to refetch the board — the callout, list, and count update with no
 * reload. A rejected flag (bad target) surfaces as a thrown `HttpError` and
 * emits nothing.
 */
export const useFlagHotSpot = (workshopId: () => string, accepter: () => string, emit: DockEmit) => {
  const onFlag = async (request: FlagRequest): Promise<void> => {
    const targetId = request.targetId ?? undefined
    await flagHotSpot(workshopId(), {
      label: request.label,
      author: { accepter: { name: accepter() } },
      ...(targetId === undefined ? {} : { annotatesTargetId: targetId }),
      ...(request.modelAffecting === undefined ? {} : { modelAffecting: request.modelAffecting }),
    })
    emit.boardDirty()
    emit.mutated()
  }

  return { onFlag }
}
