<script setup lang="ts">
import { computed, onMounted, ref, toRef, watch } from 'vue'
import ReadableAccountDrawer from '../account/ReadableAccountDrawer.vue'
import { BoardWall, type BoardBlockInput } from '../board/index.ts'
import { useInterpretationPoll } from '../composables/use-interpretation-poll.ts'
import FacilitatorDock from '../dock/FacilitatorDock.vue'
import { useAccountStore } from '../stores/account.ts'
import { useBoardStore } from '../stores/board.ts'
import { useProposalsStore } from '../stores/proposals.ts'
import { useSessionStore } from '../stores/session.ts'
import { startSession as postStartSession } from '../transport/session.ts'
import { useBoardViewState } from '../view-state/board-view.ts'

/**
 * The capture screen (brief §1): a full-screen board wall with a floating
 * facilitator dock over it. The wall re-renders only from a server-confirmed
 * GET — an accept emits `board-dirty`, every write emits `mutated` and the poll
 * refetches. Nothing is written optimistically (ADR-007).
 */
const props = defineProps<{ id: string }>()

const session = useSessionStore()
const proposals = useProposalsStore()
const board = useBoardStore()
const boardView = useBoardViewState(toRef(board, 'snapshot'))
const { showWithdrawn, timeline } = boardView
const account = useAccountStore()
const poll = useInterpretationPoll()

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
const needsSession = computed(() => loaded.value && !session.sessionOpen)

const loadAll = async (): Promise<void> => {
  await session.load(props.id)
  // The board stream 404s until the first operation is applied — fetch it only
  // when the session view says something has been derived, and after every
  // accept (brief §3: the wall is fetched post-accept, never eagerly).
  if ((session.view?.contributions.length ?? 0) > 0) await board.load(props.id)
  loaded.value = true
}

watch(
  () => [session.sessionId, session.sessionOpen] as const,
  async ([sessionId, open]) => {
    if (sessionId !== null && open) await proposals.load(sessionId)
  },
  { immediate: true },
)

const startSession = async (): Promise<void> => {
  if (startingSession.value) return
  startingSession.value = true
  try {
    await postStartSession(props.id)
    await loadAll()
  } finally {
    startingSession.value = false
  }
}

const onMutated = (): Promise<void> => poll.refetchNow()
const onBoardDirty = (): Promise<void> =>
  Promise.all([board.load(props.id), account.load(props.id)]).then(() => undefined)

const toggleAccount = (): Promise<void> => {
  accountOpen.value = !accountOpen.value
  if (accountOpen.value && account.document === null) return account.load(props.id)
  return Promise.resolve()
}

onMounted(loadAll)
</script>

<template>
  <div class="screen">
    <BoardWall
      :blocks="blocks"
      :timeline="timeline"
      :show-withdrawn="showWithdrawn"
      :workshop-id="id"
      :accepter="session.creatorName"
      :revision="board.snapshot.position"
      class="screen__wall"
      @board-dirty="onBoardDirty"
      @update:show-withdrawn="showWithdrawn = $event"
    />

    <FacilitatorDock
      v-if="session.sessionOpen"
      :workshop-id="id"
      :session-id="session.sessionId"
      :accepter="session.creatorName"
      :block-labels="blockLabels"
      @mutated="onMutated"
      @board-dirty="onBoardDirty"
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
