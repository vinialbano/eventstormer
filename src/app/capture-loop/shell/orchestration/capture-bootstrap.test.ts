import { describe, expect, it, vi } from 'vitest'
import type { SessionView } from '../../types.ts'
import {
  coldLoadCaptureScreen,
  shouldLoadBoardOnBootstrap,
  shouldLoadProposals,
} from './capture-bootstrap.ts'
import type { CaptureEffectPorts } from './apply-capture-effect.ts'

const port = () => ({
  load: vi.fn().mockResolvedValue(undefined),
  refetch: vi.fn().mockResolvedValue(undefined),
})

const viewWithContributions = (): SessionView => ({
  sessionId: 's1',
  sessionOpen: true,
  creatorName: 'Ada',
  scope: { status: 'set' },
  contributions: [{ contributionId: 'c1', status: 'derived' as const }],
  transcript: [],
  openQuestions: [],
  fullyDerived: true,
})

describe('capture-bootstrap', () => {
  it('loads board on bootstrap only when contributions exist', () => {
    expect(shouldLoadBoardOnBootstrap(null)).toBe(false)
    expect(shouldLoadBoardOnBootstrap(viewWithContributions())).toBe(true)
    expect(
      shouldLoadBoardOnBootstrap({
        ...viewWithContributions(),
        contributions: [],
        fullyDerived: false,
      }),
    ).toBe(false)
  })

  it('gates proposals load on open session', () => {
    expect(shouldLoadProposals(null, false)).toBe(false)
    expect(shouldLoadProposals('s1', false)).toBe(false)
    expect(shouldLoadProposals(null, true)).toBe(false)
    expect(shouldLoadProposals('s1', true)).toBe(true)
  })

  it('cold-loads session always and board conditionally', async () => {
    const session = port()
    const board = port()
    const ports: CaptureEffectPorts = {
      session,
      proposals: port(),
      board,
      account: port(),
    }

    await coldLoadCaptureScreen('w1', ports, () => viewWithContributions())

    expect(session.load).toHaveBeenCalledWith('w1')
    expect(board.load).toHaveBeenCalledWith('w1')
  })

  it('skips board load when no contributions yet', async () => {
    const session = port()
    const board = port()
    const ports: CaptureEffectPorts = {
      session,
      proposals: port(),
      board,
      account: port(),
    }

    await coldLoadCaptureScreen('w1', ports, () => null)

    expect(session.load).toHaveBeenCalledWith('w1')
    expect(board.load).not.toHaveBeenCalled()
  })
})
