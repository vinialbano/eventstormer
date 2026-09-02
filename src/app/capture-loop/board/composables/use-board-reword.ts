import { nextTick, ref, type Ref } from 'vue'
import type { BoardBlockInput } from '../layout.ts'

/** Inline reword draft state wired to the existing reword confirm UI. */
export const useBoardReword = (blocks: Ref<BoardBlockInput[]>, onBoardDirty: () => void) => {
  const editingId = ref<string | null>(null)
  const draft = ref('')
  const labelError = ref('')
  const confirmOpen = ref(false)
  const draftInput = ref<HTMLInputElement | null>(null)

  const bindDraftInput = (element: unknown): void => {
    draftInput.value = element instanceof HTMLInputElement ? element : null
  }

  const cancelReword = (): void => {
    confirmOpen.value = false
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

  const onRewordConfirmed = (): void => {
    onBoardDirty()
    cancelReword()
  }

  const startReword = async (id: string): Promise<void> => {
    const block = blocks.value.find((candidate) => candidate.id === id)
    if (block === undefined || block.withdrawn === true) return
    editingId.value = id
    draft.value = block.label
    await nextTick()
    draftInput.value?.focus()
    draftInput.value?.select()
  }

  return {
    editingId,
    draft,
    labelError,
    confirmOpen,
    bindDraftInput,
    cancelReword,
    requestConfirm,
    onRewordConfirmed,
    startReword,
  }
}
