<script setup lang="ts">
import type { ProposalCard as ProposalCardData, SessionView } from '../types.ts'
import { kindLabel } from './kind-label.ts'
import ConversationTurn from './ConversationTurn.vue'
import ProposalCard from './ProposalCard.vue'
import type { FeedItem } from './composables/use-dock-feed.ts'

const props = defineProps<{
  showGettingStarted: boolean
  showScopeCard: boolean
  showFirstPrompt: boolean
  scopeState: SessionView['scope']
  feed: FeedItem[]
  blockLabels: Readonly<Record<string, string>>
  accepter: string
  pulsingId: string | null
  acceptableInCluster: (cards: ProposalCardData[]) => ProposalCardData[]
}>()

const emit = defineEmits<{
  'scope-accept': []
  'scope-edit': [statement: string]
  'scope-reject': []
  accept: [proposalId: string]
  reject: [proposalId: string]
  hold: [proposalId: string]
  unhold: [proposalId: string]
  edit: [proposalId: string, label: string]
  'accept-all-cluster': [cards: ProposalCardData[]]
}>()

const liveLabel = (card: ProposalCardData): string => {
  if (card.buildingBlockId === undefined) return card.label
  return props.blockLabels[card.buildingBlockId] ?? card.label
}
</script>

<template>
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
          @accept="emit('scope-accept')"
          @edit="(statement) => emit('scope-edit', statement)"
          @reject="emit('scope-reject')"
        />
      </div>
    </div>

    <!--
      A UI affordance (brief §5), not a facilitator.askOpening turn:
      fixed copy that leads the feed once the scope is set. The model's
      only opening turn is the scope question, rendered as the F05 card above.
    -->
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
            :label="liveLabel(card)"
            :disposition="card.disposition"
            :held="card.held"
            :bar="card.bar"
            :apply-failed-reason="card.applyFailedReason"
            :accepter="accepter"
            :source-text="item.sourceText"
            @accept="emit('accept', card.proposalId)"
            @reject="emit('reject', card.proposalId)"
            @hold="emit('hold', card.proposalId)"
            @unhold="emit('unhold', card.proposalId)"
            @edit="(label) => emit('edit', card.proposalId, label)"
          />
        </div>
        <button
          v-if="acceptableInCluster(item.cards).length > 1"
          type="button"
          class="dock__acceptall"
          @click="emit('accept-all-cluster', item.cards)"
        >
          Accept all
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
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
</style>
