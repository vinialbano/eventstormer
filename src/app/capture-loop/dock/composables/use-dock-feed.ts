import { computed, ref, type Ref } from 'vue'
import type { ProposalCard, SessionView } from '../../types.ts'

const ACTIONABLE = new Set(['PROPOSED', 'EDITED', 'APPLY_FAILED'])

export type FeedItem =
  | { type: 'turn'; key: string; kind: 'contribution' | 'question' | 'notice'; speaker: string; text: string }
  | { type: 'cluster'; key: string; cards: ProposalCard[]; sourceText: string }

/** Feed assembly, scope-card visibility, and pending grouping for the facilitator dock. */
export const useDockFeed = (
  sessionView: Ref<SessionView | null>,
  proposalCards: Ref<ProposalCard[]>,
  sessionId: Ref<string | null>,
) => {
  const scopeDismissed = ref(false)

  const scopeState = computed(() => sessionView.value?.scope ?? { status: 'none' as const })
  const showScopeCard = computed(
    () => scopeState.value.status === 'proposed' && !scopeDismissed.value,
  )
  const showGettingStarted = computed(
    () => sessionId.value !== null && scopeState.value.status === 'none',
  )
  const showFirstPrompt = computed(() => scopeState.value.status === 'set')

  const byContribution = computed(() => {
    const map = new Map<string, ProposalCard[]>()
    for (const card of proposalCards.value) {
      if (card.overflow) continue
      const list = map.get(card.contributionId) ?? []
      list.push(card)
      map.set(card.contributionId, list)
    }
    return map
  })

  const contribStatus = computed(
    () =>
      new Map(
        (sessionView.value?.contributions ?? []).map((contribution) => [
          contribution.contributionId,
          contribution.status,
        ]),
      ),
  )

  const feed = computed<FeedItem[]>(() => {
    const items: FeedItem[] = []
    const turns = sessionView.value?.transcript ?? []
    for (const [index, turn] of turns.entries()) {
      if (turn.kind === 'question' && turn.questionKind === 'scope') continue
      items.push({
        type: 'turn',
        key: `t${String(index)}`,
        kind: turn.kind,
        speaker: turn.speaker,
        text: turn.text,
      })
      if (turn.kind !== 'contribution' || turn.contributionId === undefined) continue

      const cards = byContribution.value.get(turn.contributionId)
      if (cards !== undefined && cards.length > 0) {
        items.push({ type: 'cluster', key: `c${turn.contributionId}`, cards, sourceText: turn.text })
        continue
      }
      if (turns[index + 1]?.kind === 'question' || turns[index + 1]?.kind === 'notice') continue
      const status = contribStatus.value.get(turn.contributionId)
      if (status === 'failed') {
        items.push({
          type: 'turn',
          key: `k${turn.contributionId}`,
          kind: 'notice',
          speaker: 'facilitator',
          text: "I couldn't make sense of that one — try rephrasing it.",
        })
      } else if (status === 'derived') {
        items.push({
          type: 'turn',
          key: `k${turn.contributionId}`,
          kind: 'notice',
          speaker: 'facilitator',
          text: 'Noted — nothing to capture from that one.',
        })
      }
    }
    return items
  })

  const actionable = computed(() =>
    proposalCards.value.filter((card) => ACTIONABLE.has(card.disposition)),
  )
  const parked = computed(() => actionable.value.filter((card) => card.held))
  const awaiting = computed(() => actionable.value.filter((card) => !card.held))
  const pendingCount = computed(() => actionable.value.length)
  const anyHeld = computed(() => parked.value.length > 0)

  const acceptableInCluster = (cards: ProposalCard[]): ProposalCard[] =>
    cards.filter((card) => !card.held && ACTIONABLE.has(card.disposition))

  const dismissScopeCard = (): void => {
    scopeDismissed.value = true
  }

  return {
    scopeState,
    showScopeCard,
    showGettingStarted,
    showFirstPrompt,
    feed,
    parked,
    awaiting,
    pendingCount,
    anyHeld,
    acceptableInCluster,
    dismissScopeCard,
  }
}
