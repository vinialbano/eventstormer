import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'
import type { InterpretationStatus, SessionView } from '../types.ts'
import { useProposalsStore } from '../stores/proposals.ts'
import { useSessionStore } from '../stores/session.ts'
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
  contributions: contributions.map((status, i) => ({ contributionId: `c${String(i)}`, status })),
  fullyDerived: contributions.every((s) => s === 'derived' || s === 'failed'),
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

it('does not poll a settled resumed session', async () => {
  current = viewWith('set', ['derived', 'failed'])
  const { poll, scope } = await setup()
  expect(poll.polling.value).toBe(false)
  scope.stop()
})

it('refetchNow refreshes both polled stores', async () => {
  current = viewWith('set', ['derived'])
  const { poll, scope } = await setup()
  const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>
  fetchMock.mockClear()

  await poll.refetchNow()

  const urls = fetchMock.mock.calls.map((c) => c[0] as string)
  expect(urls).toContain('/api/workshops/w1/session')
  expect(urls).toContain('/api/sessions/s1/proposals')
  scope.stop()
})
