import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useArtifactsStore } from './artifacts.ts'

// Suite: artifacts store ↔ transport seam
// Invariant: the artifacts panel is a live projection — selecting fetches, an
//   applied-operation signal re-fetches the selected artifact, the download is
//   the bytes on screen, and a failed read surfaces without wedging the panel.
// Boundary IN: useArtifactsStore driving transport/artifacts.ts over stubbed fetch.
// Boundary OUT: the panel component (ArtifactsDrawer.test.ts), orchestration
//   wiring (apply-capture-effect.test.ts, use-capture-orchestration.integration.test.ts).

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

const modelAt = (boardPosition: number) => ({
  format: 'eventstormer.model',
  formatVersion: 1,
  renderedAt: '2026-09-06T10:00:00.000Z',
  boardPosition,
  sessionRecordPosition: 0,
  buildingBlocks: [{ id: 'e_1', kind: 'domain-event', label: 'Order placed' }],
  follows: [],
  causedBy: [],
})

beforeEach(() => {
  setActivePinia(createPinia())
})
afterEach(() => {
  vi.unstubAllGlobals()
})

describe('artifacts store', () => {
  it('fetches the selected artifact from its route on load and select', async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url.endsWith('/artifacts/model')) return Promise.resolve(json(modelAt(2)))
      if (url.endsWith('/artifacts/summary')) {
        return Promise.resolve(json({ boardPosition: 2, sessionRecordPosition: 0, markdown: '# Model summary\n' }))
      }
      return Promise.resolve(json({ error: 'x' }, 500))
    })
    vi.stubGlobal('fetch', fetchMock)

    const store = useArtifactsStore()
    await store.load('w1', 's1')

    expect(fetchMock).toHaveBeenCalledWith('/api/workshops/w1/artifacts/model')
    expect(store.body).toContain('"boardPosition": 2')

    await store.select('summary')

    expect(fetchMock).toHaveBeenCalledWith('/api/workshops/w1/artifacts/summary')
    expect(store.selected).toBe('summary')
    expect(store.body).toBe('# Model summary\n')
  })

  it('re-fetches the selected artifact on an applied-operation signal and updates the body', async () => {
    let boardPosition = 2
    const fetchMock = vi.fn((url: string) => {
      if (url.endsWith('/artifacts/model')) return Promise.resolve(json(modelAt(boardPosition)))
      return Promise.resolve(json({ error: 'x' }, 500))
    })
    vi.stubGlobal('fetch', fetchMock)

    const store = useArtifactsStore()
    await store.load('w1', 's1')
    expect(store.stamp.boardPosition).toBe(2)

    boardPosition = 3
    await store.refetch()

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(store.stamp.boardPosition).toBe(3)
    expect(store.body).toContain('"boardPosition": 3')
    expect(store.error).toBeNull()
  })

  it('produces a stamped download of the bytes on screen', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(modelAt(4))))

    const store = useArtifactsStore()
    await store.load('w1', 's1')

    expect(store.download).toEqual({
      filename: 'w1-model-4.json',
      mime: 'application/json',
      contents: store.body,
    })
  })

  it('surfaces a failed read as an error and keeps the panel usable', async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url.endsWith('/artifacts/model')) return Promise.resolve(json({ error: 'model-render-failed' }, 500))
      if (url.endsWith('/artifacts/summary')) {
        return Promise.resolve(json({ boardPosition: 0, sessionRecordPosition: 0, markdown: '# Model summary\n' }))
      }
      return Promise.resolve(json({}, 200))
    })
    vi.stubGlobal('fetch', fetchMock)

    const store = useArtifactsStore()
    await store.load('w1', 's1')

    expect(store.error).not.toBeNull()
    expect(store.model).toBeNull()
    expect(store.download).toBeNull()

    await store.select('summary')

    expect(store.error).toBeNull()
    expect(store.body).toBe('# Model summary\n')
  })

  it('does not fetch the transcript without a session and flags it unavailable', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(modelAt(1)))
    vi.stubGlobal('fetch', fetchMock)

    const store = useArtifactsStore()
    await store.load('w1', null)
    fetchMock.mockClear()

    await store.select('transcript')

    expect(fetchMock).not.toHaveBeenCalled()
    expect(store.transcriptUnavailable).toBe(true)

    store.setSession('s1')
    fetchMock.mockResolvedValue(json({ position: 5, markdown: '# Session transcript\n' }))
    await store.refetch()

    expect(fetchMock).toHaveBeenCalledWith('/api/workshops/w1/sessions/s1/artifacts/transcript')
    expect(store.transcriptUnavailable).toBe(false)
    expect(store.stamp.boardPosition).toBe(5)
  })
})
