import { computed, onScopeDispose, ref, watch } from 'vue'
import { useProposalsStore } from '../../stores/proposals.ts'
import { useResolutionsStore } from '../../stores/resolutions.ts'
import { useSessionStore } from '../../stores/session.ts'

/**
 * Short-poll transport for facilitator output (no SSE). While any
 * contribution is still moving toward a fully-derived turn, or the scope is not
 * yet set, refetch `session` + `proposals` on a fixed interval; go idle once
 * everything has landed. A slow / partial `deriveTracks` leaves a contribution
 * `interpreted` but not `derived` — polling MUST continue through that window,
 * otherwise cards stay missing until a manual refresh.
 *
 * `board` is deliberately not polled here: the wall refetches only after an
 * an accept resolves (`board-dirty` → `board.load`), never on a timer, never optimistically.
 *
 * `resolutions` are polled on the same interval while any resolution is still
 * pending review (a facilitator may propose one at any point), and drop out of
 * the poll once every resolution is terminal.
 */
const IN_FLIGHT = new Set(['pending', 'interpreting', 'interpreted'])
const RESOLUTION_PENDING = new Set(['PROPOSED', 'EDITED', 'ACCEPTED'])

export const useInterpretationPoll = (intervalMs = 1000) => {
  const session = useSessionStore()
  const proposals = useProposalsStore()
  const resolutions = useResolutionsStore()

  const polling = ref(false)
  let timer: ReturnType<typeof setTimeout> | undefined

  const anyResolutionPending = computed(() =>
    resolutions.cards.some((card) => RESOLUTION_PENDING.has(card.disposition)),
  )

  const shouldPoll = computed(() => {
    const view = session.view
    if (view === null) return false
    if (view.scope.status !== 'set') return true
    if (view.contributions.some((contribution) => IN_FLIGHT.has(contribution.status))) return true
    return anyResolutionPending.value
  })

  watch(
    () => session.view?.sessionId ?? null,
    (id) => {
      if (id !== null && resolutions.sessionId !== id) void resolutions.load(id)
    },
    { immediate: true },
  )

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

  // Always reschedule, even if a refetch rejects — one failed poll must not wedge
  // the loop on a permanent spinner. The stores swallow their own load errors
  // today; the catch is the guard if that ever changes.
  const tick = async (): Promise<void> => {
    try {
      await Promise.all([session.refetch(), proposals.refetch(), resolutions.refetch()])
    } catch {
      /* transient — the next tick retries */
    }
    schedule()
  }

  /** Refetch the polled stores now — call after every mutation POST. */
  const refetchNow = tick

  watch(shouldPoll, schedule, { immediate: true })
  onScopeDispose(stop)

  return { polling, refetchNow, stop }
}
