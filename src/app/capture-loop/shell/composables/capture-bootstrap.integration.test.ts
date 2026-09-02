import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CaptureEffectPorts } from '../orchestration/apply-capture-effect.ts'
import { coldLoadCaptureScreen } from '../orchestration/capture-bootstrap.ts'
import { useSessionStore } from '../../stores/session.ts'
import type { SessionView } from '../../types.ts'

const port = () => ({
  load: vi.fn().mockResolvedValue(undefined),
  refetch: vi.fn().mockResolvedValue(undefined),
})

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

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

// Suite: capture-bootstrap integration
// Invariant: Board cold-load gating reads session.view after async session.load completes.
// Boundary IN: coldLoadCaptureScreen with live Pinia session store and stubbed fetch.
// Boundary OUT: Pure predicates and port-only tests (orchestration/capture-bootstrap.test.ts).

describe('capture-bootstrap integration', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reads live session view after async session load when gating board', async () => {
    const sessionStore = useSessionStore()
    const board = port()
    const ports: CaptureEffectPorts = {
      session: {
        load: sessionStore.load.bind(sessionStore),
        refetch: sessionStore.refetch.bind(sessionStore),
      },
      proposals: port(),
      board,
      account: port(),
    }

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(viewWithContributions())))
    await coldLoadCaptureScreen('w1', ports, () => sessionStore.view)

    expect(board.load).toHaveBeenCalledWith('w1')
  })

  it('skips board load when live session view has no contributions after load', async () => {
    const sessionStore = useSessionStore()
    const board = port()
    const ports: CaptureEffectPorts = {
      session: {
        load: sessionStore.load.bind(sessionStore),
        refetch: sessionStore.refetch.bind(sessionStore),
      },
      proposals: port(),
      board,
      account: port(),
    }

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        json({
          ...viewWithContributions(),
          contributions: [],
          fullyDerived: false,
        }),
      ),
    )
    await coldLoadCaptureScreen('w1', ports, () => sessionStore.view)

    expect(board.load).not.toHaveBeenCalled()
  })
})
