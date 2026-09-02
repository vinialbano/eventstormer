import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, ref } from 'vue'
import type { SessionView } from '../../types.ts'
import { useCaptureOrchestration } from './use-capture-orchestration.ts'

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

const viewWithContributions = (): SessionView => ({
  sessionId: 's1',
  sessionOpen: true,
  creatorName: 'Maria',
  scope: { status: 'set' },
  contributions: [{ contributionId: 'c1', status: 'derived' as const }],
  transcript: [],
  openQuestions: [],
  fullyDerived: true,
})

const emptyBoard = { position: -1, blocks: [], follows: [], causedBy: [] }
const emptyAccount = { position: -1, markdown: '# Readable account\n' }

// Suite: use-capture-orchestration integration
// Invariant: The shell adapter wires cold load and zone events to the correct store loaders.
// Boundary IN: useCaptureOrchestration with live Pinia stores and stubbed fetch.
// Boundary OUT: Pure orchestration modules (orchestration/*.test.ts), full SFC mount (CaptureScreen.test.ts).

const setup = () => {
  const scope = effectScope()
  const workshopId = ref('w1')
  let orch!: ReturnType<typeof useCaptureOrchestration>
  scope.run(() => {
    orch = useCaptureOrchestration(workshopId)
  })
  return { scope, orch }
}

describe('useCaptureOrchestration integration', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('cold-loads board when live session view has contributions after async load', async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url.endsWith('/session')) return Promise.resolve(json(viewWithContributions()))
      if (url.endsWith('/board')) return Promise.resolve(json(emptyBoard))
      return Promise.resolve(json({}))
    })
    vi.stubGlobal('fetch', fetchMock)

    const { scope, orch } = setup()
    await orch.coldLoad()

    expect(fetchMock.mock.calls.some((call) => call[0].endsWith('/session'))).toBe(true)
    expect(fetchMock.mock.calls.some((call) => call[0].endsWith('/board'))).toBe(true)
    scope.stop()
  })

  it('skips board cold-load when live session view has no contributions after load', async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url.endsWith('/session')) {
        return Promise.resolve(
          json({
            ...viewWithContributions(),
            contributions: [],
            fullyDerived: false,
          }),
        )
      }
      return Promise.resolve(json({}))
    })
    vi.stubGlobal('fetch', fetchMock)

    const { scope, orch } = setup()
    await orch.coldLoad()

    expect(fetchMock.mock.calls.some((call) => call[0].endsWith('/session'))).toBe(true)
    expect(fetchMock.mock.calls.some((call) => call[0].endsWith('/board'))).toBe(false)
    scope.stop()
  })

  it('refetches session and proposals only on mutated', async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url.endsWith('/session')) return Promise.resolve(json(viewWithContributions()))
      if (url.endsWith('/board')) return Promise.resolve(json(emptyBoard))
      if (url.endsWith('/readable-account')) return Promise.resolve(json(emptyAccount))
      if (url.endsWith('/proposals')) return Promise.resolve(json({ proposals: [] }))
      return Promise.resolve(json({}))
    })
    vi.stubGlobal('fetch', fetchMock)

    const { scope, orch } = setup()
    await orch.session.load('w1')
    await orch.proposals.load('s1')
    fetchMock.mockClear()

    await orch.onMutated()

    const urls = fetchMock.mock.calls.map((call) => call[0])
    expect(urls.some((url) => url.endsWith('/session'))).toBe(true)
    expect(urls.some((url) => url.endsWith('/proposals'))).toBe(true)
    expect(urls.some((url) => url.endsWith('/board'))).toBe(false)
    expect(urls.some((url) => url.endsWith('/readable-account'))).toBe(false)
    scope.stop()
  })

  it('loads board and account on board-dirty', async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url.endsWith('/session')) return Promise.resolve(json(viewWithContributions()))
      if (url.endsWith('/board')) return Promise.resolve(json({ ...emptyBoard, position: 1 }))
      if (url.endsWith('/readable-account')) return Promise.resolve(json({ ...emptyAccount, position: 1 }))
      if (url.endsWith('/proposals')) return Promise.resolve(json({ proposals: [] }))
      return Promise.resolve(json({}))
    })
    vi.stubGlobal('fetch', fetchMock)

    const { scope, orch } = setup()
    await orch.session.load('w1')
    fetchMock.mockClear()

    await orch.onBoardDirty()

    const urls = fetchMock.mock.calls.map((call) => call[0])
    expect(urls.filter((url) => url.endsWith('/board'))).toHaveLength(1)
    expect(urls.filter((url) => url.endsWith('/readable-account'))).toHaveLength(1)
    expect(urls.some((url) => url.endsWith('/session'))).toBe(false)
    expect(urls.some((url) => url.endsWith('/proposals'))).toBe(false)
    scope.stop()
  })
})
