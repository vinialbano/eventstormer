import { computed, onScopeDispose, ref, watch } from 'vue'
import { useProposalsStore } from '../stores/proposals.ts'
import { useSessionStore } from '../stores/session.ts'

/**
 * Short-poll transport for facilitator output (no SSE). While any
 * contribution is still moving toward a fully-derived turn, or the scope is not
 * yet set, refetch `session` + `proposals` on a fixed interval; go idle once
 * everything has landed. A slow / partial `deriveTracks` leaves a contribution
 * `interpreted` but not `derived` — polling MUST continue through that window,
 * otherwise cards stay missing until a manual refresh.
 *
 * `board` is deliberately not polled here: the wall refetches only after an
 * accept resolves (`refetchAfterAccept`), never on a timer, never optimistically.
 */
const IN_FLIGHT = new Set(['pending', 'interpreting', 'interpreted'])

export const useInterpretationPoll = (intervalMs = 1000) => {
  const session = useSessionStore()
  const proposals = useProposalsStore()

  const polling = ref(false)
  let timer: ReturnType<typeof setTimeout> | undefined

  const shouldPoll = computed(() => {
    const view = session.view
    if (view === null) return false
    if (view.scope.status !== 'set') return true
    return view.contributions.some((c) => IN_FLIGHT.has(c.status))
  })

  const stop = (): void => {
    if (timer !== undefined) {
      clearTimeout(timer)
      timer = undefined
    }
    polling.value = false
  }

  const schedule = (): void => {
    if (timer !== undefined) {
      clearTimeout(timer)
      timer = undefined
    }
    if (!shouldPoll.value) {
      polling.value = false
      return
    }
    polling.value = true
    timer = setTimeout(() => {
      void tick()
    }, intervalMs)
  }

  const tick = async (): Promise<void> => {
    await Promise.all([session.refetch(), proposals.refetch()])
    schedule()
  }

  /** Refetch the polled stores now — call after every mutation POST. */
  const refetchNow = async (): Promise<void> => {
    await Promise.all([session.refetch(), proposals.refetch()])
    schedule()
  }

  watch(shouldPoll, schedule, { immediate: true })
  onScopeDispose(stop)

  return { polling, refetchNow, stop }
}
