import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'
import type { BoardBlockInput } from '../layout.ts'
import { applyBoardEdit } from '../kernel/apply-board-edit.ts'
import {
  decodeDragged,
  DRAG_MIME,
  dropSiteFromElement,
  encodeDragged,
  relationFromConnect,
  relationFromDrop,
  type DraggedBlock,
  type RelationEdit,
} from '../kernel/semantic-edit.ts'
import { isTypingSurface } from '../kernel/typing-surface.ts'

/** Board mutation application, cycle-error feedback, drag-and-drop, and keyboard shortcuts. */
export const useBoardMutations = (options: {
  workshopId: Ref<string | undefined>
  accepter: Ref<string | undefined>
  blocks: Ref<BoardBlockInput[]>
  selectedId: Ref<string | null>
  lastPlacedId: Ref<string | null>
  withdrawAskId: Ref<string | null>
  editingId: Ref<string | null>
  confirmOpen: Ref<boolean>
  onBoardDirty: () => void
  startReword: (id: string) => Promise<void>
  cancelReword: () => void
  requestConfirm: () => void
}) => {
  const relationError = ref('')
  const dragging = ref<DraggedBlock | null>(null)

  const applyEdit = async (edit: RelationEdit): Promise<void> => {
    const workshopId = options.workshopId.value
    const accepter = options.accepter.value
    if (workshopId === undefined || workshopId.length === 0 || accepter === undefined) return
    const result = await applyBoardEdit({
      workshopId,
      accepter,
      edit,
      blockLabels: new Map(options.blocks.value.map((block) => [block.id, block.label])),
    })
    if (result.ok) {
      relationError.value = ''
      options.onBoardDirty()
      return
    }
    relationError.value = result.cycleError
  }

  const postEdit = async (kind: 'withdraw' | 'reinstate', target: string): Promise<void> => {
    await applyEdit({ kind, target })
  }

  const onConnectEvents = (payload: { source: string; target: string }): void => {
    const edit = relationFromConnect(payload.source, payload.target)
    if (edit === undefined) return
    void applyEdit(edit)
  }

  const onBacklogDragStart = (event: DragEvent, block: BoardBlockInput): void => {
    const payload = { id: block.id, kind: block.kind }
    dragging.value = payload
    event.dataTransfer?.setData(DRAG_MIME, encodeDragged(payload))
  }

  const onTimelineDrop = (event: DragEvent): void => {
    event.preventDefault()
    const dragged = decodeDragged(event.dataTransfer?.getData(DRAG_MIME) ?? '') ?? dragging.value ?? undefined
    dragging.value = null
    if (dragged === undefined) return
    const edit = relationFromDrop(dragged, dropSiteFromElement(event.target))
    if (edit === undefined) return
    void applyEdit(edit)
  }

  const placeSelected = (): void => {
    const id = options.selectedId.value
    if (id === null) return
    options.lastPlacedId.value = id
    void applyEdit({ kind: 'place', target: id })
  }

  const rewordSelected = (): void => {
    const id = options.selectedId.value
    if (id === null) return
    void options.startReword(id)
  }

  const unplaceSelected = (): void => {
    const id = options.selectedId.value
    if (id === null) return
    void applyEdit({ kind: 'unplace', target: id })
  }

  const sequenceSelectedAfter = (): void => {
    const predecessor = options.lastPlacedId.value
    const successor = options.selectedId.value
    if (predecessor === null || successor === null) return
    void applyEdit({ kind: 'sequence', predecessor, successor })
  }

  const markSelectedPivotal = (): void => {
    const id = options.selectedId.value
    if (id === null) return
    void applyEdit({ kind: 'mark-pivotal', target: id })
  }

  const unmarkSelectedPivotal = (): void => {
    const id = options.selectedId.value
    if (id === null) return
    void applyEdit({ kind: 'unmark-pivotal', target: id })
  }

  const dismissEsc = (): void => {
    if (options.confirmOpen.value) {
      options.confirmOpen.value = false
      return
    }
    if (options.withdrawAskId.value !== null) {
      options.withdrawAskId.value = null
      return
    }
    options.cancelReword()
  }

  const onWindowKeydown = (event: KeyboardEvent): void => {
    if (isTypingSurface(event.target)) {
      if (event.key === 'Escape' && options.editingId.value !== null) {
        event.preventDefault()
        dismissEsc()
      }
      if (event.key === 'Enter' && options.editingId.value !== null) {
        event.preventDefault()
        options.requestConfirm()
      }
      return
    }
    if (event.key === 'Escape') {
      dismissEsc()
      return
    }
    if (options.editingId.value !== null || options.selectedId.value === null) return
    if (event.key !== 'e' && event.key !== 'E' && event.key !== 'Enter') return
    event.preventDefault()
    void options.startReword(options.selectedId.value)
  }

  onMounted(() => {
    window.addEventListener('keydown', onWindowKeydown)
  })
  onBeforeUnmount(() => {
    window.removeEventListener('keydown', onWindowKeydown)
  })

  return {
    relationError,
    applyEdit,
    postEdit,
    onConnectEvents,
    onBacklogDragStart,
    onTimelineDrop,
    placeSelected,
    rewordSelected,
    unplaceSelected,
    sequenceSelectedAfter,
    markSelectedPivotal,
    unmarkSelectedPivotal,
  }
}
