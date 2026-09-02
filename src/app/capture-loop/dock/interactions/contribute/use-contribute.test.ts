import { afterEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import type { SessionView } from '../../../types.ts'
import * as sessionTransport from '../../../transport/session.ts'
import { useContribute } from './use-contribute.ts'

afterEach(() => {
  vi.restoreAllMocks()
})

const sessionView = (contributions: SessionView['contributions']): SessionView => ({
  sessionId: 's1',
  sessionOpen: true,
  creatorName: 'Maria',
  scope: { status: 'set' },
  transcript: [],
  openQuestions: [],
  contributions,
  fullyDerived: contributions.every((contribution) => contribution.status === 'derived'),
})

const contribute = (over: {
  sessionId?: string | null
  sessionView?: SessionView | null
} = {}) => {
  const mutated = vi.fn<() => void>()
  const hooks = useContribute(
    ref('sessionId' in over ? over.sessionId : 's1'),
    ref('sessionView' in over ? over.sessionView : sessionView([])),
    { mutated: () => { mutated() } },
  )
  return { mutated, hooks }
}

// Suite: use-contribute
// Invariant: Contribution submit posts when a session exists and surfaces interpreting state to the composer.
// Boundary IN: catchingUp computed and onSubmit guard/emit contract in the composable.
// Boundary OUT: composer DOM (FacilitatorDock.test.ts), transport wire shapes (session transport tests).

describe('useContribute', () => {
  it('catchingUp is true when a contribution is pending', () => {
    const { hooks } = contribute({
      sessionView: sessionView([{ contributionId: 'c1', status: 'pending' }]),
    })

    expect(hooks.catchingUp.value).toBe(true)
  })

  it('catchingUp is true when a contribution is interpreting', () => {
    const { hooks } = contribute({
      sessionView: sessionView([
        { contributionId: 'c1', status: 'derived' },
        { contributionId: 'c2', status: 'interpreting' },
      ]),
    })

    expect(hooks.catchingUp.value).toBe(true)
  })

  it('catchingUp is false when every contribution is derived or failed', () => {
    const { hooks } = contribute({
      sessionView: sessionView([
        { contributionId: 'c1', status: 'derived' },
        { contributionId: 'c2', status: 'failed' },
      ]),
    })

    expect(hooks.catchingUp.value).toBe(false)
  })

  it('onSubmit no-ops when sessionId is null', async () => {
    const submit = vi.spyOn(sessionTransport, 'submitContribution')
    const { mutated, hooks } = contribute({ sessionId: null })

    await hooks.onSubmit('A customer places an order.')

    expect(submit).not.toHaveBeenCalled()
    expect(mutated).not.toHaveBeenCalled()
  })

  it('onSubmit posts the contribution and emits mutated when sessionId is set', async () => {
    vi.spyOn(sessionTransport, 'submitContribution').mockResolvedValue({})
    const { mutated, hooks } = contribute()

    await hooks.onSubmit('A customer places an order.')

    expect(sessionTransport.submitContribution).toHaveBeenCalledWith('s1', 'A customer places an order.')
    expect(mutated).toHaveBeenCalledTimes(1)
  })

  it('does not emit mutated when submitContribution rejects', async () => {
    vi.spyOn(sessionTransport, 'submitContribution').mockRejectedValue(new Error('network'))
    const { mutated, hooks } = contribute()

    await expect(hooks.onSubmit('A customer places an order.')).rejects.toThrow('network')

    expect(mutated).not.toHaveBeenCalled()
  })
})
