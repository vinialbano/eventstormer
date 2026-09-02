import { HttpError, postBoardOperation } from '../../transport/board.ts'
import { cycleLine, isCycleRejection, type RelationEdit } from './semantic-edit.ts'

export type ApplyBoardEditResult = { ok: true } | { ok: false; cycleError: string }

/** POST a relation edit; map cycle 422 to inline copy without rethrowing. */
export const applyBoardEdit = async (options: {
  workshopId: string
  accepter: string
  edit: RelationEdit
  blockLabels: ReadonlyMap<string, string>
}): Promise<ApplyBoardEditResult> => {
  try {
    await postBoardOperation(options.workshopId, {
      v: 1,
      ...options.edit,
      author: { accepter: { name: options.accepter } },
    })
    return { ok: true }
  } catch (caught) {
    if (caught instanceof HttpError && caught.status === 422 && isCycleRejection(caught.body)) {
      return {
        ok: false,
        cycleError: cycleLine(caught.body.path, options.blockLabels),
      }
    }
    throw caught
  }
}
