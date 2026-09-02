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

describe('applyCaptureZoneEvent', () => {
  it('refetches board and account on board-dirty', async () => {
    const effectPorts = ports()
    await applyCaptureZoneEvent('board-dirty', effectPorts, { workshopId: 'w1' })

    expect(effectPorts.board.load).toHaveBeenCalledWith('w1')
    expect(effectPorts.account.load).toHaveBeenCalledWith('w1')
    expect(effectPorts.session.refetch).not.toHaveBeenCalled()
    expect(effectPorts.proposals.refetch).not.toHaveBeenCalled()
  })

  it('refetches session and proposals on mutated', async () => {
    const effectPorts = ports()
    await applyCaptureZoneEvent('mutated', effectPorts, { workshopId: 'w1' })

    expect(effectPorts.session.load).toHaveBeenCalledWith('w1')
    expect(effectPorts.proposals.refetch).toHaveBeenCalled()
    expect(effectPorts.board.load).not.toHaveBeenCalled()
    expect(effectPorts.account.load).not.toHaveBeenCalled()
  })
})
