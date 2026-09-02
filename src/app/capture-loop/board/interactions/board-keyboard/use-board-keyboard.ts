import { onBeforeUnmount, onMounted } from 'vue'
import { isTypingSurface } from '../../kernel/typing-surface.ts'

export interface BoardKeyboardDispatch {
  isEditing: () => boolean
  hasSelection: () => boolean
  onDismiss: () => void
  onRequestConfirm: () => void
  onRewordSelected: () => void
}

/** Global board key dispatch — wired from BoardWall with gesture callbacks. */
export const useBoardKeyboard = (dispatch: BoardKeyboardDispatch): void => {
  const onWindowKeydown = (event: KeyboardEvent): void => {
    if (isTypingSurface(event.target)) {
      if (event.key === 'Escape' && dispatch.isEditing()) {
        event.preventDefault()
        dispatch.onDismiss()
      }
      if (event.key === 'Enter' && dispatch.isEditing()) {
        event.preventDefault()
        dispatch.onRequestConfirm()
      }
      return
    }
    if (event.key === 'Escape') {
      dispatch.onDismiss()
      return
    }
    if (dispatch.isEditing() || !dispatch.hasSelection()) return
    if (event.key !== 'e' && event.key !== 'E' && event.key !== 'Enter') return
    event.preventDefault()
    dispatch.onRewordSelected()
  }

  onMounted(() => {
    window.addEventListener('keydown', onWindowKeydown)
  })
  onBeforeUnmount(() => {
    window.removeEventListener('keydown', onWindowKeydown)
  })
}
