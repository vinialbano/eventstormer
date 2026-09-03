<script setup lang="ts">
import { computed, onMounted, ref, toRef, watch } from 'vue'
import ReadableAccountDrawer from './account/ReadableAccountDrawer.vue'
import { BoardWall, type BoardBlockInput } from '../board/index.ts'
import FacilitatorDock from '../dock/FacilitatorDock.vue'
import { useCaptureOrchestration } from './composables/use-capture-orchestration.ts'
import { useFlagHotSpot } from '../dock/interactions/flag-hot-spot/use-flag-hot-spot.ts'
import { startSession as postStartSession } from '../transport/session.ts'
import { useBoardViewState } from '../view-state/board-view.ts'

/**
 * The capture screen (brief §1): a full-screen board wall with a floating
 * facilitator dock over it. The wall re-renders only from a server-confirmed
 * GET — an accept emits `board-dirty`, every write emits `mutated` and the poll
 * refetches. Nothing is written optimistically (ADR-007).
 */
const props = defineProps<{ id: string }>()

const orch = useCaptureOrchestration(toRef(props, 'id'))
const { session, board, account } = orch
const boardView = useBoardViewState(toRef(board, 'snapshot'))
const { showWithdrawn, timeline, hotSpots } = boardView

const flag = useFlagHotSpot(() => props.id, () => session.creatorName, {
  mutated: (): void => {
    void orch.onMutated()
  },
  boardDirty: (): void => {
    void orch.onBoardDirty()
  },
})
const onFlagHotSpot = (request: { targetId: string | null; label: string }): void => {
  void flag.onFlag(request)
}

const startingSession = ref(false)
const loaded = ref(false)
const accountOpen = ref(false)

const blocks = computed((): BoardBlockInput[] =>
  board.snapshot.blocks.map((block) => ({
    id: block.id,
    kind: block.kind,
    label: block.label,
    withdrawn: block.withdrawn,
    placement: block.placement,
    pivotal: block.pivotal,
    speaker: block.provenance?.accepter.name,
  })),
)
const blockLabels = computed(() =>
  Object.fromEntries(board.snapshot.blocks.map((block) => [block.id, block.label])),
)
const openHotSpots = computed(() =>
  [...hotSpots.value.annotated.values(), hotSpots.value.unannotated]
    .flat()
    .filter((callout) => !callout.resolved)
    .map((callout) => ({ hotSpotId: callout.hotSpotId, label: callout.label })),
)
const needsSession = computed(() => loaded.value && !session.sessionOpen)

const coldLoad = async (): Promise<void> => {
  await orch.coldLoad()
  loaded.value = true
}

watch(
  () => [session.sessionId, session.sessionOpen] as const,
  async () => {
    if (orch.shouldLoadProposals()) await orch.loadProposals()
  },
  { immediate: true },
)

const startSession = async (): Promise<void> => {
  if (startingSession.value) return
  startingSession.value = true
  try {
    await postStartSession(props.id)
    await coldLoad()
  } finally {
    startingSession.value = false
  }
}

const toggleAccount = (): Promise<void> => {
  accountOpen.value = !accountOpen.value
  if (accountOpen.value && account.document === null) return account.load(props.id)
  return Promise.resolve()
}

onMounted(coldLoad)
</script>

<template>
  <div class="screen">
    <BoardWall
      :blocks="blocks"
      :timeline="timeline"
      :show-withdrawn="showWithdrawn"
      :hot-spots="hotSpots"
      :workshop-id="id"
      :accepter="session.creatorName"
      :revision="board.snapshot.position"
      class="screen__wall"
      @board-dirty="orch.onBoardDirty"
      @update:show-withdrawn="showWithdrawn = $event"
      @flag-hot-spot="onFlagHotSpot"
    />

    <FacilitatorDock
      v-if="session.sessionOpen"
      :workshop-id="id"
      :session-id="session.sessionId"
      :accepter="session.creatorName"
      :block-labels="blockLabels"
      :open-hot-spots="openHotSpots"
      @mutated="orch.onMutated"
      @board-dirty="orch.onBoardDirty"
    />

    <button
      type="button"
      class="screen__account"
      aria-label="Readable account"
      :aria-expanded="accountOpen"
      @click="toggleAccount"
    >
      Readable account
    </button>
    <ReadableAccountDrawer v-if="accountOpen" />
    <div id="reword-portal" class="screen__reword-portal" />

    <div v-if="needsSession" class="screen__gate">
      <div class="screen__gatecard">
        <h2 class="screen__gatetitle">Ready when you are</h2>
        <p class="screen__gatetext">Start a session to begin describing your business.</p>
        <button
          type="button"
          class="screen__gatego"
          :disabled="startingSession"
          @click="startSession"
        >
          {{ startingSession ? 'Starting…' : 'Start session' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.screen {
  position: relative;
  min-height: 100dvh;
  overflow: auto;
}
.screen__wall {
  display: block;
}
.screen__gate {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  background-color: color-mix(in srgb, var(--color-paper) 70%, transparent);
  backdrop-filter: blur(2px);
  z-index: 30;
}
.screen__gatecard {
  background-color: var(--color-surface);
  border-radius: var(--radius-panel);
  box-shadow: var(--shadow-panel);
  padding: 28px;
  max-width: 360px;
  text-align: center;
}
.screen__gatetitle {
  margin: 0 0 6px;
  font-family: var(--font-ui);
  font-size: 1.375rem;
  font-weight: 800;
}
.screen__gatetext {
  margin: 0 0 18px;
  color: var(--color-text-soft);
  font-size: 0.9375rem;
}
.screen__gatego {
  font: inherit;
  font-weight: 700;
  height: 40px;
  padding: 0 20px;
  border: none;
  border-radius: var(--radius-control);
  background-color: var(--color-event);
  color: var(--color-event-ink);
  cursor: pointer;
}
.screen__gatego:disabled {
  opacity: 0.5;
}
.screen__account {
  position: fixed;
  top: 20px;
  right: 16px;
  z-index: 16;
  height: 36px;
  padding: 0 14px;
  border: none;
  border-radius: var(--radius-control);
  background-color: var(--color-surface);
  color: var(--color-text);
  box-shadow: var(--shadow-card);
  font-family: var(--font-ui);
  font-weight: 700;
  font-size: 0.875rem;
  cursor: pointer;
}
.screen__account:focus-visible {
  outline: 2px solid var(--color-event-strong);
  outline-offset: 2px;
}
.screen__reword-portal {
  position: fixed;
  inset: 0;
  z-index: 40;
  pointer-events: none;
}
.screen__reword-portal :deep([data-reka-popper-content-wrapper]) {
  pointer-events: auto;
}
</style>
