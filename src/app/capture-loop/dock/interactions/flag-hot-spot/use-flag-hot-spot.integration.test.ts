import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, ref } from 'vue'
import { useCaptureOrchestration } from '../../../shell/composables/use-capture-orchestration.ts'
import { useFlagHotSpot } from './use-flag-hot-spot.ts'

// Suite: use-flag-hot-spot integration
// Invariant: A direct flag POSTs raise-hot-spot and then the shell refetches the board, so the
//   callout / list / count update with no reload.
// Boundary IN: useFlagHotSpot wired to a real useCaptureOrchestration with stubbed fetch.
// Boundary OUT: board affordance emit (BoardWall.test.ts), the HTTP capability (server tests).

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

const board = { position: 3, blocks: [], follows: [], causedBy: [], hotSpotCount: 1 }
const account = { position: 3, markdown: '# Readable account\n' }
const session = {
  sessionId: 's1',
  sessionOpen: true,
  creatorName: 'Maria',
  scope: { status: 'set' as const },
  contributions: [{ contributionId: 'c1', status: 'derived' as const }],
  transcript: [],
  openQuestions: [],
  fullyDerived: true,
}

describe('useFlagHotSpot integration', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('posts the flag with its target id and then refetches the board', async () => {
    const fetchMock = vi.fn((url: string, init?: RequestInit): Promise<Response> => {
      if (init?.method === 'POST' && !url.endsWith('/hot-spots')) return Promise.resolve(json({}))
      if (url.endsWith('/session')) return Promise.resolve(json(session))
      if (url.endsWith('/board')) return Promise.resolve(json(board))
      if (url.endsWith('/readable-account')) return Promise.resolve(json(account))
      if (url.endsWith('/proposals')) return Promise.resolve(json({ proposals: [] }))
      if (url.endsWith('/hot-spots')) return Promise.resolve(json({ hotSpotId: 'h1', annotates: 'eA' }))
      return Promise.resolve(json({}))
    })
    vi.stubGlobal('fetch', fetchMock)

    const scope = effectScope()
    let orch!: ReturnType<typeof useCaptureOrchestration>
    scope.run(() => {
      orch = useCaptureOrchestration(ref('w1'))
    })
    await orch.session.load('w1')
    fetchMock.mockClear()

    const flag = useFlagHotSpot(() => 'w1', () => 'Maria', {
      mutated: () => {
        void orch.onMutated()
      },
      boardDirty: () => {
        void orch.onBoardDirty()
      },
    })
    await flag.onFlag({ targetId: 'eA', label: 'Concern: Payment captured' })
    await Promise.resolve()

    const calls = fetchMock.mock.calls.map((call) => ({
      url: call[0],
      method: call[1]?.method ?? 'GET',
      body: typeof call[1]?.body === 'string' ? call[1].body : '',
    }))
    const post = calls.find((call) => call.url.endsWith('/hot-spots'))
    expect(post?.method).toBe('POST')
    expect(JSON.parse(post?.body ?? '')).toEqual({
      label: 'Concern: Payment captured',
      author: { accepter: { name: 'Maria' } },
      annotatesTargetId: 'eA',
    })
    expect(calls.some((call) => call.url.endsWith('/board') && call.method === 'GET')).toBe(true)
    scope.stop()
  })
})
