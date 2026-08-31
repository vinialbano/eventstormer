<script setup lang="ts">
import { CollapsibleContent, CollapsibleRoot, CollapsibleTrigger } from 'reka-ui'
import { computed, nextTick, ref } from 'vue'
import type { ProposalCard as ProposalCardData } from '../types.ts'
import { useProposalsStore } from '../stores/proposals.ts'
import { useSessionStore } from '../stores/session.ts'
import ConversationTurn from './ConversationTurn.vue'
import { kindLabel } from './kind-label.ts'
import DockComposer from './DockComposer.vue'
import PendingDrawer from './PendingDrawer.vue'
import ProposalCard from './ProposalCard.vue'
import {
  acceptProposal,
  editProposal,
  holdProposal,
  rejectProposal,
  setScope,
  submitContribution,
  unholdProposal,
} from './mutations.ts'

/**
 * The floating facilitator dock (brief §3). Conversation column with inline
 * proposal cards welded to the contribution that produced them; an in-dock
 * pending drawer that widens the dock rightward; the scope question rendered as
 * the first F05 accept/edit/reject card (no separate screen).
 * Collapses to a `Facilitator · n` pill (parked dot when anything is held).
 *
 * Every action is a POST then a `mutated` emit — the parent refetches the
 * cold-loadable stores; an accept also emits `board-dirty`. Nothing is written
 * optimistically.
 */
const props = defineProps<{
  workshopId: string
  sessionId: string | null
  accepter: string
}>()
const emit = defineEmits<{ mutated: []; 'board-dirty': [] }>()

const session = useSessionStore()
const proposals = useProposalsStore()

const open = ref(true)
const drawerOpen = ref(false)
const scopeDismissed = ref(false)
const pulsingId = ref<string | null>(null)

const ACTIONABLE = new Set(['PROPOSED', 'EDITED', 'APPLY_FAILED'])

const scopeState = computed(() => session.view?.scope ?? { status: 'none' as const })
const showScopeCard = computed(
  () => scopeState.value.status === 'proposed' && !scopeDismissed.value,
)
const showGettingStarted = computed(
  () => props.sessionId !== null && scopeState.value.status === 'none',
)

const byContribution = computed(() => {
  const map = new Map<string, ProposalCardData[]>()
  for (const card of proposals.cards) {
    if (card.overflow) continue
    const list = map.get(card.contributionId) ?? []
    list.push(card)
    map.set(card.contributionId, list)
  }
  return map
})

type FeedItem =
  | { type: 'turn'; key: string; kind: 'contribution' | 'question' | 'notice'; speaker: string; text: string }
  | { type: 'cluster'; key: string; cards: ProposalCardData[] }

const contribStatus = computed(
  () => new Map((session.view?.contributions ?? []).map((c) => [c.contributionId, c.status])),
)

const feed = computed<FeedItem[]>(() => {
  const items: FeedItem[] = []
  const turns = session.view?.transcript ?? []
  turns.forEach((turn, i) => {
    // The scope question is rendered as its own F05 card, not a plain message.
    if (turn.kind === 'question' && turn.questionKind === 'scope') return
    items.push({
      type: 'turn',
      key: `t${String(i)}`,
      kind: turn.kind,
      speaker: turn.speaker,
      text: turn.text,
    })
    if (turn.kind !== 'contribution' || turn.contributionId === undefined) return

    const cards = byContribution.value.get(turn.contributionId)
    if (cards !== undefined && cards.length > 0) {
      items.push({ type: 'cluster', key: `c${turn.contributionId}`, cards })
      return
    }
    // No proposals for this contribution. Give the facilitator a visible reply
    // so a turn never looks dropped — unless it already answered with a
    // question or a notice (the next transcript turn), which stands on its own.
    if (turns[i + 1]?.kind === 'question' || turns[i + 1]?.kind === 'notice') return
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
  })
  return items
})

// Once the scope is set, the facilitator's opening prompt leads the conversation
// and stays there — the feed reads as a chat log, messages append below it
// (brief §5). Before that it is the F05 scope card instead (`showScopeCard`).
const showFirstPrompt = computed(() => scopeState.value.status === 'set')

const actionable = computed(() =>
  proposals.cards.filter((c) => ACTIONABLE.has(c.disposition)),
)
const parked = computed(() => actionable.value.filter((c) => c.held))
const awaiting = computed(() => actionable.value.filter((c) => !c.held))
const pendingCount = computed(() => actionable.value.length)
const anyHeld = computed(() => parked.value.length > 0)

const catchingUp = computed(() =>
  (session.view?.contributions ?? []).some((c) => c.status === 'pending' || c.status === 'interpreting'),
)

const acceptableInCluster = (cards: ProposalCardData[]): ProposalCardData[] =>
  cards.filter((c) => !c.held && ACTIONABLE.has(c.disposition))

const run = async (work: Promise<unknown>, boardDirty = false): Promise<void> => {
  await work
  if (boardDirty) emit('board-dirty')
  emit('mutated')
}

const onAccept = (id: string): Promise<void> => run(acceptProposal(id), true)
const onReject = (id: string): Promise<void> => run(rejectProposal(id))
const onHold = (id: string): Promise<void> => run(holdProposal(id))
const onUnhold = (id: string): Promise<void> => run(unholdProposal(id))
const onEdit = (id: string, label: string): Promise<void> => run(editProposal(id, label))

const acceptEvery = async (cards: ProposalCardData[]): Promise<void> => {
  for (const card of cards) await acceptProposal(card.proposalId)
  emit('board-dirty')
  emit('mutated')
}
const onAcceptAllCluster = (cards: ProposalCardData[]): Promise<void> =>
  acceptEvery(acceptableInCluster(cards))
const onAcceptAllRemaining = (): Promise<void> => acceptEvery(awaiting.value)

const onScopeAccept = (): Promise<void> => {
  const statement = scopeState.value.proposedStatement
  return statement === undefined ? Promise.resolve() : run(setScope(props.workshopId, statement))
}
const onScopeEdit = (statement: string): Promise<void> => run(setScope(props.workshopId, statement))
const onScopeReject = (): void => {
  scopeDismissed.value = true
}

const onSubmit = (text: string): Promise<void> =>
  props.sessionId === null ? Promise.resolve() : run(submitContribution(props.sessionId, text))

const onJump = async (proposalId: string): Promise<void> => {
  drawerOpen.value = false
  await nextTick()
  document.getElementById(`proposal-${proposalId}`)?.scrollIntoView({ block: 'center' })
  pulsingId.value = proposalId
  window.setTimeout(() => {
    if (pulsingId.value === proposalId) pulsingId.value = null
  }, 1200)
}
</script>

<template>
  <CollapsibleRoot v-model:open="open" class="dock" :class="{ 'dock--wide': drawerOpen }">
    <CollapsibleTrigger v-if="!open" class="dock__pill">
      Facilitator
      <span class="dock__count">{{ pendingCount }}</span>
      <span v-if="anyHeld" class="dock__dot" aria-label="parked proposals" />
    </CollapsibleTrigger>

    <CollapsibleContent class="dock__panel">
      <div class="dock__cols">
        <div class="dock__conversation">
          <header class="dock__header">
            <h2 class="dock__title">Facilitator</h2>
            <CollapsibleTrigger class="dock__min" aria-label="Collapse the dock">–</CollapsibleTrigger>
          </header>

          <div class="dock__feed">
            <p v-if="showGettingStarted" class="dock__placeholder" role="status">
              Getting started… the facilitator is preparing your first question.
            </p>

            <div v-if="showScopeCard" class="dock__scope">
              <ConversationTurn
                kind="question"
                speaker="facilitator"
                text="What business are we mapping? Here’s a starting point — accept, edit, or reject it."
              />
              <div class="dock__cluster">
                <ProposalCard
                  kind-label="SCOPE"
                  :label="scopeState.proposedStatement ?? ''"
                  disposition="PROPOSED"
                  :no-hold="true"
                  @accept="onScopeAccept"
                  @edit="onScopeEdit"
                  @reject="onScopeReject"
                />
              </div>
            </div>

            <ConversationTurn
              v-if="showFirstPrompt"
              kind="question"
              speaker="facilitator"
              text="Scope set. Now walk me through it — describe the first thing that happens, one moment at a time."
            />

            <template v-for="item in feed" :key="item.key">
              <ConversationTurn
                v-if="item.type === 'turn'"
                :kind="item.kind"
                :speaker="item.speaker"
                :text="item.text"
              />
              <div v-else class="dock__cluster">
                <div
                  v-for="card in item.cards"
                  :id="`proposal-${card.proposalId}`"
                  :key="card.proposalId"
                  class="dock__cardslot"
                  :class="{ 'dock__cardslot--pulse': pulsingId === card.proposalId }"
                >
                  <ProposalCard
                    :kind-label="kindLabel(card.blockKind)"
                    :pill-kind="card.blockKind"
                    :label="card.label"
                    :disposition="card.disposition"
                    :held="card.held"
                    :bar="card.bar"
                    :apply-failed-reason="card.applyFailedReason"
                    :accepter="accepter"
                    @accept="onAccept(card.proposalId)"
                    @reject="onReject(card.proposalId)"
                    @hold="onHold(card.proposalId)"
                    @unhold="onUnhold(card.proposalId)"
                    @edit="(label) => onEdit(card.proposalId, label)"
                  />
                </div>
                <button
                  v-if="acceptableInCluster(item.cards).length > 1"
                  type="button"
                  class="dock__acceptall"
                  @click="onAcceptAllCluster(item.cards)"
                >
                  Accept all
                </button>
              </div>
            </template>
          </div>

          <DockComposer :catching-up="catchingUp" @submit="onSubmit" />
        </div>

        <button
          v-if="!drawerOpen && pendingCount > 0"
          type="button"
          class="dock__handle"
          @click="drawerOpen = true"
        >
          <span class="dock__handle-label">Pending</span>
          <span class="dock__handle-dot" :class="{ 'dock__handle-dot--held': anyHeld }" />
          <span class="dock__handle-n">{{ pendingCount }}</span>
        </button>

        <div v-if="drawerOpen" class="dock__drawer">
          <button type="button" class="dock__drawerclose" aria-label="Close the pending list" @click="drawerOpen = false">
            ›
          </button>
          <PendingDrawer
            :parked="parked"
            :awaiting="awaiting"
            @jump="onJump"
            @accept-all="onAcceptAllRemaining"
          />
        </div>
      </div>
    </CollapsibleContent>
  </CollapsibleRoot>
</template>

<style scoped>
.dock {
  position: fixed;
  left: 20px;
  bottom: 20px;
  z-index: 20;
}
.dock__panel {
  background-color: var(--color-surface);
  border-radius: var(--radius-panel);
  box-shadow: var(--shadow-panel);
  overflow: hidden;
}
.dock__cols {
  display: flex;
  max-height: min(70vh, 620px);
}
.dock__conversation {
  width: 380px;
  display: flex;
  flex-direction: column;
  padding: 16px;
}
.dock__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.dock__title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
}
.dock__min {
  border: none;
  background: none;
  font-size: 1.25rem;
  line-height: 1;
  color: var(--color-text-soft);
  cursor: pointer;
  padding: 4px 8px;
}
.dock__feed {
  flex: 1;
  overflow-y: auto;
  padding-right: 4px;
}
.dock__placeholder,
.dock__scope {
  margin-bottom: 12px;
}
.dock__placeholder {
  font-size: 0.9375rem;
  color: var(--color-text-soft);
}
.dock__cluster {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 6px 0 12px 40px;
}
.dock__cardslot--pulse {
  animation: pulse 1.2s var(--ease-flight);
  border-radius: var(--radius-card);
}
@keyframes pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 transparent;
  }
  25% {
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-event) 45%, transparent);
  }
}
.dock__acceptall {
  align-self: flex-start;
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--color-event-ink);
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px 0;
}

.dock__handle {
  flex: none;
  align-self: stretch;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: 34px;
  padding: 12px 0;
  border: none;
  border-left: 1px solid var(--color-line);
  background-color: var(--color-surface-sunk);
  cursor: pointer;
}
.dock__handle-label {
  writing-mode: vertical-rl;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--color-text-soft);
}
.dock__handle-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background-color: var(--color-event);
}
.dock__handle-dot--held {
  background-color: var(--color-parked);
}
.dock__handle-n {
  font-size: 0.8125rem;
  font-weight: 800;
  color: var(--color-event-ink);
}

.dock__drawer {
  position: relative;
  display: flex;
  padding: 16px 16px 16px 0;
  background-color: var(--color-surface);
}
.dock__drawerclose {
  position: absolute;
  top: 8px;
  right: 8px;
  border: none;
  background: none;
  font-size: 1.125rem;
  color: var(--color-text-soft);
  cursor: pointer;
}

.dock__pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font: inherit;
  font-weight: 700;
  padding: 10px 16px;
  border: none;
  border-radius: 999px;
  background-color: var(--color-surface);
  box-shadow: var(--shadow-panel);
  cursor: pointer;
}
.dock__count {
  font-weight: 800;
  color: var(--color-event-ink);
  background-color: color-mix(in srgb, var(--color-event) 22%, var(--color-surface));
  border-radius: 999px;
  padding: 0 8px;
  min-width: 20px;
  text-align: center;
}
.dock__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--color-parked);
}

@media (max-width: 1024px) {
  .dock {
    left: 0;
    right: 0;
    bottom: 0;
  }
  .dock__conversation {
    width: 100%;
  }
  .dock__panel {
    border-radius: var(--radius-panel) var(--radius-panel) 0 0;
  }
  .dock__drawer {
    display: none;
  }
}
</style>
