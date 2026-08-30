import { afterEach, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'
import { useReducedMotion } from './use-reduced-motion.ts'

afterEach(() => {
  vi.unstubAllGlobals()
})

const stubMatchMedia = (matches: boolean): void => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({
      matches,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  )
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
