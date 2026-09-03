import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, ref } from 'vue'
import { useCaptureOrchestration } from '../../../shell/composables/use-capture-orchestration.ts'
import { useCloseCeremony } from './use-close-ceremony.ts'

// Suite: use-close-ceremony integration
// Invariant: the ceremony holds the session OPEN through the stakeholder answer and the
//   problem pick — `/sessions/:id/close` fires only on `confirm` — and once it fires the
//   shell refetches the board (swept hot spots + count) and the session (now closed).
// Boundary IN: useCloseCeremony wired to a real useCaptureOrchestration with stubbed fetch.
// Boundary OUT: card wiring (component tests), the HTTP capabilities (server tests).

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

const board = { position: 5, blocks: [], follows: [], causedBy: [], hotSpotCount: 2 }
const account = { position: 5, markdown: '# Readable account\n' }
const openSession = {
  sessionId: 's1',
  sessionOpen: true,
  creatorName: 'Maria',
  scope: { status: 'set' as const },
  contributions: [{ contributionId: 'c1', status: 'derived' as const }],
  transcript: [],
  openQuestions: [],
  fullyDerived: true,
}

const setup = () => {
  const calls: { url: string; method: string; body: string }[] = []
  const fetchMock = vi.fn((url: string, init?: RequestInit): Promise<Response> => {
    calls.push({
      url,
      method: init?.method ?? 'GET',
      body: typeof init?.body === 'string' ? init.body : '',
    })
    if (url.endsWith('/session')) return Promise.resolve(json(openSession))
    if (url.endsWith('/board')) return Promise.resolve(json(board))
    if (url.endsWith('/readable-account')) return Promise.resolve(json(account))
    if (url.endsWith('/proposals')) return Promise.resolve(json({ proposals: [] }))
    if (url.endsWith('/resolutions')) return Promise.resolve(json({ resolutions: [] }))
    if (url.endsWith('/close')) {
      return Promise.resolve(json({ ok: true, hotSpotCount: 2, noHotSpotsIsASignal: false }))
    }
    return Promise.resolve(json({}))
  })
  vi.stubGlobal('fetch', fetchMock)
  return { calls, fetchMock }
}

describe('useCloseCeremony integration', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('closes only on confirm, then refetches the board and the session', async () => {
    const { calls, fetchMock } = setup()

    const scope = effectScope()
    let orch!: ReturnType<typeof useCaptureOrchestration>
    scope.run(() => {
      orch = useCaptureOrchestration(ref('w1'))
    })
    await orch.session.load('w1')

    const ceremony = useCloseCeremony(
      () => 'w1',
      () => orch.session.sessionId,
      {
        mutated: () => {
          void orch.onMutated()
        },
        boardDirty: () => {
          void orch.onBoardDirty()
        },
      },
    )

    ceremony.start()
    await ceremony.answerStakeholder(true)
    await ceremony.chooseProblem('h1')

    expect(calls.some((call) => call.url.endsWith('/close'))).toBe(false)
    expect(ceremony.step.value).toBe('confirm')

    fetchMock.mockClear()
    calls.length = 0
    await ceremony.confirm()
    await Promise.resolve()

    const closePost = calls.find((call) => call.url.endsWith('/sessions/s1/close'))
    expect(closePost?.method).toBe('POST')
    expect(ceremony.step.value).toBe('closed')
    expect(calls.some((call) => call.url.endsWith('/board') && call.method === 'GET')).toBe(true)
    expect(calls.some((call) => call.url.endsWith('/session') && call.method === 'GET')).toBe(true)

    scope.stop()
  })

  it('a skip posts {skipReason} and still holds the session open until confirm', async () => {
    const { calls } = setup()

    const scope = effectScope()
    let orch!: ReturnType<typeof useCaptureOrchestration>
    scope.run(() => {
      orch = useCaptureOrchestration(ref('w1'))
    })
    await orch.session.load('w1')

    const noop = vi.fn<() => void>()
    const ceremony = useCloseCeremony(
      () => 'w1',
      () => orch.session.sessionId,
      { mutated: noop, boardDirty: noop },
    )

    ceremony.start()
    await ceremony.answerStakeholder(false, ['ops lead'])
    await ceremony.skipProblem('no-impediments-yet')

    const skipPost = calls.find((call) => call.url.endsWith('/chosen-problem'))
    expect(JSON.parse(skipPost?.body ?? '{}')).toEqual({ skipReason: 'no-impediments-yet' })
    expect(calls.some((call) => call.url.endsWith('/close'))).toBe(false)

    scope.stop()
  })
})
