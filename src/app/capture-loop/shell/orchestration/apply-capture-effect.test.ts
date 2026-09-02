import { describe, expect, it, vi } from 'vitest'
import {
  applyCaptureZoneEvent,
  type CaptureEffectPorts,
} from './apply-capture-effect.ts'

const port = () => {
  const load = vi.fn().mockResolvedValue(undefined)
  const refetch = vi.fn().mockResolvedValue(undefined)
  return { load, refetch }
}

const ports = (): CaptureEffectPorts => ({
  session: port(),
  proposals: port(),
  board: port(),
  account: port(),
})

// Suite: apply-capture-effect
// Invariant: Zone events invoke the correct store loaders through injected ports.
// Boundary IN: applyCaptureZoneEvent port orchestration (framework-free).
// Boundary OUT: Production onMutated wiring via useInterpretationPoll.refetchNow().

describe('applyCaptureZoneEvent', () => {
  it('refetches board and account on board-dirty', async () => {
    const effectPorts = ports()
    await applyCaptureZoneEvent('board-dirty', effectPorts, { workshopId: 'w1' })

    expect(effectPorts.board.load).toHaveBeenCalledWith('w1')
    expect(effectPorts.account.load).toHaveBeenCalledWith('w1')
    expect(effectPorts.session.refetch).not.toHaveBeenCalled()
    expect(effectPorts.proposals.refetch).not.toHaveBeenCalled()
  })

  // Production routes onMutated through useInterpretationPoll.refetchNow(), not
  // applyCaptureZoneEvent('mutated'). This test guards the graph contract if wired later.
  it('refetches session and proposals on mutated', async () => {
    const effectPorts = ports()
    await applyCaptureZoneEvent('mutated', effectPorts, { workshopId: 'w1' })

    expect(effectPorts.session.load).toHaveBeenCalledWith('w1')
    expect(effectPorts.proposals.refetch).toHaveBeenCalled()
    expect(effectPorts.board.load).not.toHaveBeenCalled()
    expect(effectPorts.account.load).not.toHaveBeenCalled()
  })
})
