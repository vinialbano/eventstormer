<script setup lang="ts">
import { CollapsibleContent, CollapsibleRoot, CollapsibleTrigger } from 'reka-ui'
import { computed, nextTick, ref, toRef } from 'vue'
import type { ProposalCard } from '../types.ts'
import { useProposalsStore } from '../stores/proposals.ts'
import { useResolutionsStore } from '../stores/resolutions.ts'
import { useSessionStore } from '../stores/session.ts'
import { useReducedMotion } from '../shell/composables/use-reduced-motion.ts'
import { useDockFeed } from './composables/use-dock-feed.ts'
import { useCloseCeremony } from './interactions/close-ceremony/use-close-ceremony.ts'
import { useContribute } from './interactions/contribute/use-contribute.ts'
import { useReviewProposal } from './interactions/review-proposal/use-review-proposal.ts'
import { useReviewResolution } from './interactions/review-resolution/use-review-resolution.ts'
import CloseCeremony from './close-ceremony/CloseCeremony.vue'
import DockComposer from './DockComposer.vue'
import DockFeed from './DockFeed.vue'
import PendingDrawer from './PendingDrawer.vue'
import ResolutionCard from './ResolutionCard.vue'

/**
 * The floating facilitator dock (brief §3). Layout and wiring only — feed assembly
 * lives in `use-dock-feed` + `DockFeed`; proposal review and contribution capture
 * live in their interaction folders.
 */
const props = defineProps<{
  workshopId: string
  sessionId: string | null
  accepter: string
  blockLabels: Readonly<Record<string, string>>
  /** Hot spots open right now — the close-ceremony problem picker's candidates. */
  openHotSpots: { hotSpotId: string; label: string }[]
}>()
const emit = defineEmits<{ mutated: []; 'board-dirty': [] }>()

const session = useSessionStore()
const proposals = useProposalsStore()
const resolutions = useResolutionsStore()

const sessionView = computed(() => session.view)
const proposalCards = computed(() => proposals.cards)
const sessionId = toRef(props, 'sessionId')

const RESOLUTION_PENDING = new Set(['PROPOSED', 'EDITED', 'ACCEPTED'])
const resolutionCards = computed(() => resolutions.cards)
const pendingResolutions = computed(() =>
  resolutionCards.value.filter((card) => RESOLUTION_PENDING.has(card.disposition)),
)

const dockEmit = {
  mutated: (): void => {
    emit('mutated')
  },
  boardDirty: (): void => {
    emit('board-dirty')
  },
}

const {
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
} = useDockFeed(sessionView, proposalCards, sessionId)
const review = useReviewProposal(
  () => props.workshopId,
  () => scopeState.value.proposedStatement,
  dockEmit,
)
const resolutionReview = useReviewResolution(dockEmit)
const { catchingUp, onSubmit } = useContribute(sessionId, sessionView, dockEmit)

const {
  step: ceremonyStep,
  busy: ceremonyBusy,
  error: ceremonyError,
  report: ceremonyReport,
  start: startCeremony,
  cancel: cancelCeremony,
  back: ceremonyBack,
  answerStakeholder,
  chooseProblem,
  skipProblem,
  confirm: confirmCeremony,
} = useCloseCeremony(
  () => props.workshopId,
  () => props.sessionId,
  dockEmit,
)
const reducedMotion = useReducedMotion()

const open = ref(true)
const drawerOpen = ref(false)
const pulsingId = ref<string | null>(null)

const onScopeReject = (): void => {
  dismissScopeCard()
}

const onAcceptAllCluster = (cards: ProposalCard[]): Promise<void> =>
  review.onAcceptAllCluster(cards, acceptableInCluster(cards))

const onAcceptAllRemaining = (): Promise<void> =>
  review.onAcceptAllRemaining(awaiting.value)

const pulsingResolutionId = ref<string | null>(null)

const onJump = async (proposalId: string): Promise<void> => {
  drawerOpen.value = false
  await nextTick()
  document.getElementById(`proposal-${proposalId}`)?.scrollIntoView({ block: 'center' })
  pulsingId.value = proposalId
  window.setTimeout(() => {
    if (pulsingId.value === proposalId) pulsingId.value = null
  }, 1200)
}
const onJumpResolution = async (resolutionId: string): Promise<void> => {
  drawerOpen.value = false
  await nextTick()
  document.getElementById(`resolution-${resolutionId}`)?.scrollIntoView({ block: 'center' })
  pulsingResolutionId.value = resolutionId
  window.setTimeout(() => {
    if (pulsingResolutionId.value === resolutionId) pulsingResolutionId.value = null
  }, 1200)
}
</script>

<template>
  <CollapsibleRoot v-model:open="open" class="dock" :class="{ 'dock--wide': drawerOpen }">
    <CollapsibleTrigger v-if="!open" class="dock__pill">
      Facilitator
      <span v-if="pendingCount > 0" class="dock__count">{{ pendingCount }}</span>
      <span v-if="anyHeld" class="dock__dot" aria-label="parked proposals" />
    </CollapsibleTrigger>

    <CollapsibleContent class="dock__panel">
      <div class="dock__cols">
        <div class="dock__conversation">
          <header class="dock__header">
            <h2 class="dock__title">Facilitator</h2>
            <CollapsibleTrigger class="dock__min" aria-label="Collapse the dock">–</CollapsibleTrigger>
          </header>

          <DockFeed
            :show-getting-started="showGettingStarted"
            :show-scope-card="showScopeCard"
            :show-first-prompt="showFirstPrompt"
            :scope-state="scopeState"
            :feed="feed"
            :block-labels="blockLabels"
            :accepter="accepter"
            :pulsing-id="pulsingId"
            :acceptable-in-cluster="acceptableInCluster"
            @scope-accept="review.onScopeAccept"
            @scope-edit="review.onScopeEdit"
            @scope-reject="onScopeReject"
            @accept="review.onAccept"
            @reject="review.onReject"
            @hold="review.onHold"
            @unhold="review.onUnhold"
            @edit="review.onEdit"
            @accept-all-cluster="onAcceptAllCluster"
          />

          <section
            v-if="resolutionCards.length > 0"
            class="dock__resolutions"
            aria-label="Resolutions"
          >
            <ResolutionCard
              v-for="card in resolutionCards"
              :id="`resolution-${card.resolutionId}`"
              :key="card.resolutionId"
              class="dock__resolution"
              :class="{ 'dock__resolution--pulse': pulsingResolutionId === card.resolutionId }"
              :reference="card.reference"
              :disposition="card.disposition"
              :lapsed-reason="card.lapsedReason"
              @accept="resolutionReview.onAccept(card.resolutionId)"
              @reject="resolutionReview.onReject(card.resolutionId)"
              @edit="resolutionReview.onEdit(card.resolutionId, $event)"
            />
          </section>

          <CloseCeremony
            v-if="ceremonyStep !== 'idle'"
            class="dock__ceremony"
            :step="ceremonyStep"
            :busy="ceremonyBusy"
            :error="ceremonyError"
            :report="ceremonyReport"
            :open-hot-spots="openHotSpots"
            :reduced-motion="reducedMotion"
            @answer="answerStakeholder"
            @choose="chooseProblem"
            @skip="skipProblem"
            @back="ceremonyBack"
            @confirm="confirmCeremony"
            @cancel="cancelCeremony"
          />

          <DockComposer :catching-up="catchingUp" @submit="onSubmit" />

          <button
            v-if="ceremonyStep === 'idle'"
            type="button"
            class="dock__close"
            @click="startCeremony"
          >
            Close session
          </button>
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
            :resolutions="pendingResolutions"
            @jump="onJump"
            @jump-resolution="onJumpResolution"
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

.dock__close {
  align-self: flex-start;
  margin-top: 8px;
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 700;
  min-height: 32px;
  padding: 6px 12px;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-control);
  background-color: var(--color-surface);
  color: var(--color-text-soft);
  cursor: pointer;
}
.dock__close:focus-visible {
  outline: 2px solid var(--color-event-strong);
  outline-offset: 2px;
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
