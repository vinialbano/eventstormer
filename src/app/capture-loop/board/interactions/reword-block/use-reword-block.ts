import { nextTick, ref, watch, type Ref } from 'vue'
import { postBoardOperation } from '../../../transport/board.ts'
import type { BoardBlockInput } from '../../layout.ts'
import {
  confirmLoadFailed,
  confirmLoadSucceeded,
  idleConfirm,
  startConfirmLoad,
  startConfirmPost,
  type RewordConfirmPhase,
} from './reword-confirm.ts'
import { type FetchBlockReferences } from './reword-references.ts'

interface RewordBlockOptions {
  blocks: Ref<BoardBlockInput[]>
  workshopId: Ref<string | undefined>
  accepter: Ref<string | undefined>
  revision: Ref<number | undefined>
  onBoardDirty: () => void
  fetchReferences: FetchBlockReferences
}

/** Inline reword draft + two-step confirm interaction for one building block. */
export const useRewordBlock = (options: RewordBlockOptions) => {
  const editingId = ref<string | null>(null)
  const draft = ref('')
  const labelError = ref('')
  const confirmOpen = ref(false)
  const confirmPhase = ref<RewordConfirmPhase>(idleConfirm())
  const draftInput = ref<HTMLInputElement | null>(null)

  const bindDraftInput = (element: unknown): void => {
    draftInput.value = element instanceof HTMLInputElement ? element : null
  }

  const resetConfirm = (): void => {
    confirmOpen.value = false
    confirmPhase.value = idleConfirm()
  }

  const cancelReword = (): void => {
    resetConfirm()
    editingId.value = null
    draft.value = ''
    labelError.value = ''
  }

  const requestConfirm = (): void => {
    if (draft.value.trim().length === 0) {
      labelError.value = "Name can't be empty."
      return
    }
    labelError.value = ''
    confirmOpen.value = true
  }

  const loadReferences = async (): Promise<void> => {
    const workshopId = options.workshopId.value
    const blockId = editingId.value
    if (workshopId === undefined || workshopId.length === 0 || blockId === null) {
      confirmPhase.value = confirmLoadFailed()
      return
    }

    confirmPhase.value = startConfirmLoad()
    try {
      const sites = await options.fetchReferences(workshopId, blockId)
      confirmPhase.value = confirmLoadSucceeded(sites)
    } catch {
      confirmPhase.value = confirmLoadFailed()
    }
  }

  const confirmReword = async (): Promise<void> => {
    if (confirmPhase.value.kind !== 'ready') return
    const workshopId = options.workshopId.value
    const blockId = editingId.value
    const accepter = options.accepter.value
    if (
      workshopId === undefined ||
      workshopId.length === 0 ||
      blockId === null ||
      accepter === undefined
    ) {
      return
    }

    const sites = confirmPhase.value.sites
    confirmPhase.value = startConfirmPost(sites)
    try {
      await postBoardOperation(workshopId, {
        v: 1,
        kind: 'reword',
        target: blockId,
        label: draft.value.trim(),
        author: { accepter: { name: accepter } },
      })
      options.onBoardDirty()
      cancelReword()
    } catch {
      confirmPhase.value = confirmLoadSucceeded(sites)
    }
  }

  const startReword = async (id: string): Promise<void> => {
    const block = options.blocks.value.find((candidate) => candidate.id === id)
    if (block === undefined || block.withdrawn === true) return
    editingId.value = id
    draft.value = block.label
    await nextTick()
    draftInput.value?.focus()
    draftInput.value?.select()
  }

  watch(
    () =>
      [
        confirmOpen.value,
        options.revision.value,
        editingId.value,
        options.workshopId.value,
      ] as const,
    ([isOpen]) => {
      if (isOpen) void loadReferences()
    },
  )

  return {
    editingId,
    draft,
    labelError,
    confirmOpen,
    confirmPhase,
    bindDraftInput,
    cancelReword,
    requestConfirm,
    confirmReword,
    retryReferences: loadReferences,
    startReword,
  }
}
