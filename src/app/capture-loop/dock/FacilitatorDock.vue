<script setup lang="ts">
import { CollapsibleContent, CollapsibleRoot, CollapsibleTrigger } from 'reka-ui'
import { computed, ref } from 'vue'
import type { ProposalCard as ProposalCardData } from '../types.ts'
import { useProposalsStore } from '../stores/proposals.ts'
import { useSessionStore } from '../stores/session.ts'
import ConversationTurn from './ConversationTurn.vue'
import DockComposer from './DockComposer.vue'
import ProposalCard from './ProposalCard.vue'
import {
  acceptProposal,
  editProposal,
  holdProposal,
  rejectProposal,
  submitContribution,
  unholdProposal,
} from './mutations.ts'

/**
 * The floating facilitator dock (brief §3). Conversation column: plain-language
 * turns with inline proposal cards welded to the contribution that produced
 * them. Collapses to a `Facilitator · n` pill (parked dot when anything is
 * held). The pending drawer is added alongside in T29.
 *
 * Every action is a POST then a `mutated` emit — the parent refetches the
 * cold-loadable stores; an accept also emits `board-dirty` so the wall
 * re-renders from a server-confirmed GET. Nothing is written optimistically.
 */
const props = defineProps<{ sessionId: string | null; accepter: string }>()
const emit = defineEmits<{ mutated: []; 'board-dirty': [] }>()

const session = useSessionStore()
const proposals = useProposalsStore()

const open = ref(true)

const ACTIONABLE = new Set(['PROPOSED', 'EDITED', 'APPLY_FAILED'])

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

const feed = computed<FeedItem[]>(() => {
  const items: FeedItem[] = []
  const turns = session.view?.transcript ?? []
  turns.forEach((turn, i) => {
    items.push({
      type: 'turn',
      key: `t${String(i)}`,
      kind: turn.kind,
      speaker: turn.speaker,
      text: turn.text,
    })
    if (turn.kind === 'contribution' && turn.contributionId !== undefined) {
      const cards = byContribution.value.get(turn.contributionId)
      if (cards !== undefined && cards.length > 0) {
        items.push({ type: 'cluster', key: `c${turn.contributionId}`, cards })
      }
    }
  })
  return items
})

const pendingCount = computed(
  () => proposals.cards.filter((c) => !c.overflow && ACTIONABLE.has(c.disposition)).length,
)
const anyHeld = computed(() => proposals.cards.some((c) => c.held && ACTIONABLE.has(c.disposition)))

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

const onAcceptAll = async (cards: ProposalCardData[]): Promise<void> => {
  for (const card of acceptableInCluster(cards)) {
    await acceptProposal(card.proposalId)
  }
  emit('board-dirty')
  emit('mutated')
}

const onSubmit = (text: string): Promise<void> => {
  if (props.sessionId === null) return Promise.resolve()
  return run(submitContribution(props.sessionId, text))
}
</script>

<template>
  <CollapsibleRoot v-model:open="open" class="dock" :class="{ 'dock--collapsed': !open }">
    <CollapsibleTrigger v-if="!open" class="dock__pill">
      Facilitator
      <span class="dock__count">{{ pendingCount }}</span>
      <span v-if="anyHeld" class="dock__dot" aria-label="parked proposals" />
    </CollapsibleTrigger>

    <CollapsibleContent class="dock__panel">
      <header class="dock__header">
        <h2 class="dock__title">Facilitator</h2>
        <CollapsibleTrigger class="dock__min" aria-label="Collapse the dock">–</CollapsibleTrigger>
      </header>

      <div class="dock__feed">
        <template v-for="item in feed" :key="item.key">
          <ConversationTurn
            v-if="item.type === 'turn'"
            :kind="item.kind"
            :speaker="item.speaker"
            :text="item.text"
          />
          <div v-else class="dock__cluster">
            <ProposalCard
              v-for="card in item.cards"
              :key="card.proposalId"
              kind-label="EVENT"
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
            <button
              v-if="acceptableInCluster(item.cards).length > 1"
              type="button"
              class="dock__acceptall"
              @click="onAcceptAll(item.cards)"
            >
              Accept all
            </button>
          </div>
        </template>
      </div>

      <DockComposer :catching-up="catchingUp" @submit="onSubmit" />
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
  width: 380px;
  max-height: min(70vh, 620px);
  display: flex;
  flex-direction: column;
  background-color: var(--color-surface);
  border-radius: var(--radius-panel);
  box-shadow: var(--shadow-panel);
  padding: 16px;
  overflow: hidden;
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
.dock__cluster {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 6px 0 12px 40px;
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
  .dock__panel {
    width: 100%;
    border-radius: var(--radius-panel) var(--radius-panel) 0 0;
  }
}
</style>
