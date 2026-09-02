import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  useBoardKeyboard,
  type BoardKeyboardDispatch,
} from './use-board-keyboard.ts'

const mountKeyboard = (over: Partial<BoardKeyboardDispatch> = {}) => {
  const dispatch: BoardKeyboardDispatch = {
    isEditing: over.isEditing ?? (() => false),
    hasSelection: over.hasSelection ?? (() => false),
    onDismiss: over.onDismiss ?? vi.fn(),
    onRequestConfirm: over.onRequestConfirm ?? vi.fn(),
    onRewordSelected: over.onRewordSelected ?? vi.fn(),
  }

  const Harness = defineComponent({
    setup() {
      useBoardKeyboard(dispatch)
      return {}
    },
    template: '<div />',
  })

  return { wrapper: mount(Harness), dispatch }
}

const windowKey = (
  key: string,
  target?: EventTarget | null,
  options?: { cancelable?: boolean },
): KeyboardEvent => {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: options?.cancelable ?? true,
  })
  if (target !== undefined) {
    Object.defineProperty(event, 'target', { value: target })
  }
  window.dispatchEvent(event)
  return event
}

// Suite: use-board-keyboard
// Invariant: Window keydown routes dismiss, confirm, and reword to dispatch callbacks with correct guards.
// Boundary IN: Escape / Enter on typing surfaces vs global; e/E/Enter reword when selected and not editing.
// Boundary OUT: Reword UI state (use-reword-block.test.ts), wall mount wiring (BoardWall.test.ts).

describe('useBoardKeyboard', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calls onDismiss and preventDefault for Escape on a typing surface while editing', () => {
    const { dispatch } = mountKeyboard({ isEditing: () => true })
    const field = document.createElement('input')
    const event = windowKey('Escape', field)

    expect(dispatch.onDismiss).toHaveBeenCalledTimes(1)
    expect(event.defaultPrevented).toBe(true)
  })

  it('calls onRequestConfirm and preventDefault for Enter on a typing surface while editing', () => {
    const { dispatch } = mountKeyboard({ isEditing: () => true })
    const field = document.createElement('input')
    const event = windowKey('Enter', field)

    expect(dispatch.onRequestConfirm).toHaveBeenCalledTimes(1)
    expect(event.defaultPrevented).toBe(true)
  })

  it('calls onDismiss for Escape outside a typing surface', () => {
    const { dispatch } = mountKeyboard()
    windowKey('Escape')

    expect(dispatch.onDismiss).toHaveBeenCalledTimes(1)
  })

  it.each(['e', 'E', 'Enter'])(
    'calls onRewordSelected and preventDefault for %s when selected and not editing',
    (key) => {
      const { dispatch } = mountKeyboard({
        hasSelection: () => true,
        isEditing: () => false,
      })
      const event = windowKey(key)

      expect(dispatch.onRewordSelected).toHaveBeenCalledTimes(1)
      expect(event.defaultPrevented).toBe(true)
    },
  )

  it('does not reword when editing or when nothing is selected', () => {
    const editing = mountKeyboard({
      isEditing: () => true,
      hasSelection: () => true,
    })
    windowKey('e')
    expect(editing.dispatch.onRewordSelected).not.toHaveBeenCalled()

    const noSelection = mountKeyboard({
      isEditing: () => false,
      hasSelection: () => false,
    })
    windowKey('e')
    expect(noSelection.dispatch.onRewordSelected).not.toHaveBeenCalled()
  })

  it('does not reword when e is typed on a typing surface', () => {
    const { dispatch } = mountKeyboard({
      hasSelection: () => true,
      isEditing: () => false,
    })
    const field = document.createElement('input')
    const event = windowKey('e', field)

    expect(dispatch.onRewordSelected).not.toHaveBeenCalled()
    expect(event.defaultPrevented).toBe(false)
  })
})
