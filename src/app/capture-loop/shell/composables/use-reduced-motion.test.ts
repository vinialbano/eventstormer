import { afterEach, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'
import { useReducedMotion } from './use-reduced-motion.ts'

afterEach(() => {
  vi.unstubAllGlobals()
})

const stubMatchMedia = (
  matches: boolean,
): { change: (next: boolean) => void; removeListener: ReturnType<typeof vi.fn> } => {
  let listener: ((event: MediaQueryListEvent) => void) | null = null
  const removeListener = vi.fn()
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({
      matches,
      addEventListener: vi.fn((_event: string, handler: (event: MediaQueryListEvent) => void) => {
        listener = handler
      }),
      removeEventListener: removeListener,
    }),
  )
  return {
    change: (next: boolean) => {
      listener?.({ matches: next } as MediaQueryListEvent)
    },
    removeListener,
  }
}

it('reflects the initial prefers-reduced-motion state', () => {
  stubMatchMedia(true)
  const scope = effectScope()
  const reduced = scope.run(() => useReducedMotion())
  expect(reduced?.value).toBe(true)
  scope.stop()
})

it('defaults to motion allowed when the query is off', () => {
  stubMatchMedia(false)
  const scope = effectScope()
  const reduced = scope.run(() => useReducedMotion())
  expect(reduced?.value).toBe(false)
  scope.stop()
})

it('updates when the matchMedia change event fires', () => {
  const media = stubMatchMedia(false)
  const scope = effectScope()
  const reduced = scope.run(() => useReducedMotion())
  expect(reduced?.value).toBe(false)

  media.change(true)
  expect(reduced?.value).toBe(true)

  media.change(false)
  expect(reduced?.value).toBe(false)
  scope.stop()
})

it('removes the change listener when the scope disposes', () => {
  const media = stubMatchMedia(false)
  const scope = effectScope()
  scope.run(() => useReducedMotion())
  scope.stop()
  expect(media.removeListener).toHaveBeenCalledWith('change', expect.any(Function))
})
