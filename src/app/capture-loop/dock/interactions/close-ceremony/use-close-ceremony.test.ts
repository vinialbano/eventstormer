import { afterEach, describe, expect, it, vi } from 'vitest'
import * as closeTransport from '../../../transport/close.ts'
import { useCloseCeremony } from './use-close-ceremony.ts'

// Suite: use-close-ceremony
// Invariant: the ceremony records the stakeholder answer and the chosen problem while the
//   session is still OPEN, and only `confirm` POSTs `/sessions/:id/close` — no session
//   freeze before the final press. A failed step advances nothing.
// Boundary IN: the composable actions with stubbed transport.
// Boundary OUT: the HTTP client (transport tests), card wiring (component tests), the
//   board/session refetch (integration test).

afterEach(() => {
  vi.restoreAllMocks()
})

const ceremony = () => {
  const mutated = vi.fn<() => void>()
  const boardDirty = vi.fn<() => void>()
  const hooks = useCloseCeremony(
    () => 'w1',
    () => 's1',
    { mutated: () => { mutated() }, boardDirty: () => { boardDirty() } },
  )
  return { emit: { mutated, boardDirty }, hooks }
}

const stubTransport = () => {
  const stakeholder = vi
    .spyOn(closeTransport, 'recordStakeholderCheck')
    .mockResolvedValue({})
  const problem = vi.spyOn(closeTransport, 'recordChosenProblem').mockResolvedValue({})
  const close = vi
    .spyOn(closeTransport, 'closeSession')
    .mockResolvedValue({ ok: true, hotSpotCount: 3, noHotSpotsIsASignal: false })
  return { stakeholder, problem, close }
}

describe('useCloseCeremony', () => {
  it('start moves to the stakeholder step and closes nothing', () => {
    const { close } = stubTransport()
    const { hooks } = ceremony()

    hooks.start()

    expect(hooks.step.value).toBe('stakeholder')
    expect(close).not.toHaveBeenCalled()
  })

  it('answering "nobody else" posts complete:true and advances to the picker', async () => {
    const { stakeholder, close } = stubTransport()
    const { hooks } = ceremony()

    await hooks.answerStakeholder(true)

    expect(stakeholder).toHaveBeenCalledWith('w1', { complete: true, absentNames: [] })
    expect(hooks.step.value).toBe('problem')
    expect(close).not.toHaveBeenCalled()
  })

  it('naming people posts complete:false with every name', async () => {
    const { stakeholder } = stubTransport()
    const { hooks } = ceremony()

    await hooks.answerStakeholder(false, ['ops lead', 'the chef'])

    expect(stakeholder).toHaveBeenCalledWith('w1', {
      complete: false,
      absentNames: ['ops lead', 'the chef'],
    })
  })

  it('choosing a problem posts its id and advances to confirm without closing', async () => {
    const { problem, close } = stubTransport()
    const { hooks } = ceremony()

    await hooks.chooseProblem('h1')

    expect(problem).toHaveBeenCalledWith('w1', { problemHotSpotId: 'h1' })
    expect(hooks.step.value).toBe('confirm')
    expect(close).not.toHaveBeenCalled()
  })

  it('skipping posts the skip reason', async () => {
    const { problem } = stubTransport()
    const { hooks } = ceremony()

    await hooks.skipProblem('no-impediments-yet')

    expect(problem).toHaveBeenCalledWith('w1', { skipReason: 'no-impediments-yet' })
    expect(hooks.step.value).toBe('confirm')
  })

  it('confirm posts the close, keeps the report, and signals both refetches', async () => {
    const { close } = stubTransport()
    const { emit, hooks } = ceremony()

    await hooks.confirm()

    expect(close).toHaveBeenCalledWith('s1')
    expect(hooks.step.value).toBe('closed')
    expect(hooks.report.value).toEqual({ ok: true, hotSpotCount: 3, noHotSpotsIsASignal: false })
    expect(emit.boardDirty).toHaveBeenCalledTimes(1)
    expect(emit.mutated).toHaveBeenCalledTimes(1)
  })

  it('a failed stakeholder POST stays on the step, sets an error, and closes nothing', async () => {
    vi.spyOn(closeTransport, 'recordStakeholderCheck').mockRejectedValue(new Error('network'))
    const close = vi.spyOn(closeTransport, 'closeSession').mockResolvedValue({
      ok: true,
      hotSpotCount: 0,
      noHotSpotsIsASignal: true,
    })
    const { hooks } = ceremony()
    hooks.start()

    await hooks.answerStakeholder(true)

    expect(hooks.step.value).toBe('stakeholder')
    expect(hooks.error.value).toBe("Couldn't record that — try again")
    expect(close).not.toHaveBeenCalled()
  })

  it('back returns from confirm to the picker; cancel returns to idle before close', async () => {
    stubTransport()
    const { hooks } = ceremony()

    await hooks.chooseProblem('h1')
    hooks.back()
    expect(hooks.step.value).toBe('problem')

    hooks.cancel()
    expect(hooks.step.value).toBe('idle')
  })

  it('cancel is a no-op once the session is closed', async () => {
    stubTransport()
    const { hooks } = ceremony()

    await hooks.confirm()
    hooks.cancel()

    expect(hooks.step.value).toBe('closed')
  })
})
