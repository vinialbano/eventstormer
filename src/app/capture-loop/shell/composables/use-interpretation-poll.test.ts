import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'
import type { InterpretationStatus, SessionView } from '../../types.ts'
import { useProposalsStore } from '../../stores/proposals.ts'
import { useSessionStore } from '../../stores/session.ts'
import { useInterpretationPoll } from './use-interpretation-poll.ts'

const viewWith = (
  scope: SessionView['scope']['status'],
  contributions: InterpretationStatus[],
): SessionView => ({
  sessionId: 's1',
  sessionOpen: true,
  creatorName: 'Maria',
  scope: { status: scope },
  transcript: [],
  openQuestions: [],
  contributions: contributions.map((status, index) => ({ contributionId: `c${String(index)}`, status })),
  fullyDerived: contributions.every((status) => status === 'derived' || status === 'failed'),
})

let current: SessionView

const json = (body: unknown): Response =>
  new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })

beforeEach(() => {
  setActivePinia(createPinia())
  vi.useFakeTimers()
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) =>
      Promise.resolve(
        url.includes('/session') ? json(current) : json({ proposals: [] }),
      ),
    ),
  )
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

const setup = async () => {
  const session = useSessionStore()
  const proposals = useProposalsStore()
  await session.load('w1')
  await proposals.load('s1')
  const scope = effectScope()
  const poll = scope.run(() => useInterpretationPoll(50))
  if (poll === undefined) throw new Error('poll not created')
  return { session, proposals, poll, scope }
}

it('polls while a contribution is interpreting and stops once fully derived', async () => {
  current = viewWith('set', ['interpreting'])
  const { poll, scope } = await setup()
  expect(poll.polling.value).toBe(true)

  // still interpreting after a tick — keep going
  await vi.advanceTimersByTimeAsync(60)
  expect(poll.polling.value).toBe(true)

  // interpreted but not yet derived — MUST keep polling
  current = viewWith('set', ['interpreted'])
  await vi.advanceTimersByTimeAsync(60)
  expect(poll.polling.value).toBe(true)

  // fully derived — go idle
  current = viewWith('set', ['derived'])
  await vi.advanceTimersByTimeAsync(60)
  expect(poll.polling.value).toBe(false)

  scope.stop()
})

it('polls while a contribution is pending and stops once fully derived', async () => {
  current = viewWith('set', ['pending'])
  const { poll, scope } = await setup()
  expect(poll.polling.value).toBe(true)

  await vi.advanceTimersByTimeAsync(60)
  expect(poll.polling.value).toBe(true)

  current = viewWith('set', ['derived'])
  await vi.advanceTimersByTimeAsync(60)
  expect(poll.polling.value).toBe(false)

  scope.stop()
})

it('polls while the scope is unset even with no contributions', async () => {
  current = viewWith('proposed', [])
  const { poll, scope } = await setup()
  expect(poll.polling.value).toBe(true)

  current = viewWith('set', [])
  await vi.advanceTimersByTimeAsync(60)
  expect(poll.polling.value).toBe(false)
  scope.stop()
})

it('keeps polling after a store refetch rejects — the loop is not wedged', async () => {
  current = viewWith('set', ['interpreting'])
  const { session, proposals, poll, scope } = await setup()
  const sessionRefetch = vi.spyOn(session, 'refetch')
  vi.spyOn(proposals, 'refetch').mockRejectedValue(new Error('network down'))

  await vi.advanceTimersByTimeAsync(60) // one tick: proposals.refetch rejects
  await vi.advanceTimersByTimeAsync(60) // the loop rescheduled anyway -> another tick

  expect(poll.polling.value).toBe(true)
  expect(sessionRefetch.mock.calls.length).toBeGreaterThanOrEqual(2)
  scope.stop()
})

it('never fetches board over poll ticks', async () => {
  current = viewWith('set', ['interpreting'])
  const { scope } = await setup()
  const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>
  fetchMock.mockClear()

  for (let tick = 0; tick < 5; tick += 1) {
    await vi.advanceTimersByTimeAsync(60)
  }

  const urls = fetchMock.mock.calls.map((call) => call[0] as string)
  expect(urls.some((url) => url.includes('/board'))).toBe(false)
  scope.stop()
})

it('does not poll a settled resumed session', async () => {
  current = viewWith('set', ['derived', 'failed'])
  const { poll, scope } = await setup()
  expect(poll.polling.value).toBe(false)
  scope.stop()
})

it('refetchNow refreshes both polled stores', async () => {
  current = viewWith('set', ['derived'])
  const { session, poll, scope } = await setup()
  expect(session.view?.contributions[0]?.status).toBe('derived')

  current = viewWith('set', ['interpreting'])
  await poll.refetchNow()

  expect(session.view?.contributions[0]?.status).toBe('interpreting')
  scope.stop()
})

it('clears timers when the effect scope stops', async () => {
  current = viewWith('set', ['interpreting'])
  const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>
  const { poll, scope } = await setup()
  fetchMock.mockClear()

  scope.stop()
  expect(poll.polling.value).toBe(false)

  await vi.advanceTimersByTimeAsync(200)
  expect(fetchMock).not.toHaveBeenCalled()
})
