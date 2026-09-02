<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, toRef } from 'vue'
import type { TimelineLayout } from '~/domain-model-capture/domain/timeline/compute-timeline-layout.ts'
import { useRelateBlocks } from './interactions/relate-blocks/use-relate-blocks.ts'
import { useBoardSelection } from './composables/use-board-selection.ts'
import { useFreshStickyHighlight } from './composables/use-fresh-sticky-highlight.ts'
import { useBoardKeyboard } from './interactions/board-keyboard/use-board-keyboard.ts'
import { fetchBlockReferences } from './interactions/reword-block/reword-references.ts'
import { useRewordBlock } from './interactions/reword-block/use-reword-block.ts'
import { layoutBoard, type BoardBlockInput } from './layout.ts'
import BacklogPane from './presentation/BacklogPane.vue'
import BoardActionToolbar from './presentation/BoardActionToolbar.vue'
import BoardWallChrome from './presentation/BoardWallChrome.vue'
import TimelinePane from './TimelinePane.vue'

/**
 * The board wall — a full-screen EventStorming surface. Composes presentation
 * components; interaction logic lives in board interactions and composables.
 */

const EMPTY_TIMELINE: TimelineLayout = { tracks: [], edges: [], attachments: {}, pivotal: [] }

const props = defineProps<{
  blocks: BoardBlockInput[]
  timeline?: TimelineLayout
  workshopId?: string
  accepter?: string
  revision?: number
  showWithdrawn?: boolean
}>()
const emit = defineEmits<{ 'board-dirty': []; 'update:showWithdrawn': [value: boolean] }>()

const viewport = ref({ w: 1280, h: 800 })
const measure = (): void => {
  viewport.value = {
    w: Math.max(320, window.innerWidth),
    h: Math.max(320, window.innerHeight),
  }
}

const blocks = toRef(props, 'blocks')
const timeline = computed(() => props.timeline ?? EMPTY_TIMELINE)
const onBoardDirty = (): void => {
  emit('board-dirty')
}

const selection = useBoardSelection(blocks, timeline)
const {
  selectedId,
  withdrawAskId,
  timelineEventIds,
  selectSticky,
  selectedBlock,
  selectedOnTimeline,
  canPlace,
  canUnplace,
  canSequenceAfter,
  canMarkPivotal,
  canUnmarkPivotal,
  showsActiveControls,
  showsReinstate,
} = selection

const reword = useRewordBlock({
  blocks,
  workshopId: toRef(props, 'workshopId'),
  accepter: toRef(props, 'accepter'),
  revision: toRef(props, 'revision'),
  onBoardDirty,
  fetchReferences: fetchBlockReferences,
})
const {
  editingId,
  draft,
  labelError,
  confirmOpen,
  confirmPhase,
  bindDraftInput,
  cancelReword,
  requestConfirm,
  confirmReword,
  retryReferences,
  startReword,
} = reword

const relate = useRelateBlocks({
  workshopId: toRef(props, 'workshopId'),
  accepter: toRef(props, 'accepter'),
  blocks,
  selectedId,
  lastPlacedId: selection.lastPlacedId,
  onBoardDirty,
})
const {
  relationError,
  postEdit,
  onConnectEvents,
  onBacklogDragStart,
  onTimelineDrop,
  placeSelected,
  unplaceSelected,
  sequenceSelectedAfter,
  markSelectedPivotal,
  unmarkSelectedPivotal,
} = relate

const rewordSelected = (): void => {
  const id = selectedId.value
  if (id !== null) void startReword(id)
}

useBoardKeyboard({
  isEditing: () => editingId.value !== null,
  hasSelection: () => selectedId.value !== null,
  onDismiss: (): void => {
    if (confirmOpen.value) {
      confirmOpen.value = false
      return
    }
    if (withdrawAskId.value !== null) {
      withdrawAskId.value = null
      return
    }
    cancelReword()
  },
  onRequestConfirm: requestConfirm,
  onRewordSelected: (): void => {
    const id = selectedId.value
    if (id !== null) void startReword(id)
  },
})

const { fresh } = useFreshStickyHighlight(blocks)

onMounted(() => {
  measure()
  window.addEventListener('resize', measure)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', measure)
})

const attachedIds = computed(() => {
  const ids = new Set<string>()
  for (const causes of Object.values(timeline.value.attachments)) {
    for (const id of causes) ids.add(id)
  }
  return ids
})
const backlogBlocks = computed(() =>
  props.blocks.filter((block) => {
    if (!props.showWithdrawn && block.withdrawn) return false
    if (block.placement === 'timeline') return false
    if (timelineEventIds.value.has(block.id)) return false
    if (attachedIds.value.has(block.id)) return false
    return true
  }),
)
const layout = computed(() => layoutBoard(backlogBlocks.value, viewport.value))
</script>

<template>
  <div
    class="wall"
    role="region"
    aria-label="EventStorming board"
    :style="{ minWidth: `${layout.canvas.w}px`, minHeight: `${layout.canvas.h}px` }"
  >
    <BoardWallChrome
      :canvas-w="layout.canvas.w"
      :canvas-h="layout.canvas.h"
      :frame-x="layout.frame.x"
      :frame-y="layout.frame.y"
      :frame-w="layout.frame.w"
      :frame-h="layout.frame.h"
      :time-guide-x1="layout.timeGuide.x1"
      :time-guide-y1="layout.timeGuide.y1"
      :time-guide-x2="layout.timeGuide.x2"
      :time-guide-y2="layout.timeGuide.y2"
    />

    <BacklogPane
      :stickies="layout.backlog"
      :empty="layout.backlog.length === 0"
      :fresh="fresh"
      :selected-id="selectedId"
      :editing-id="editingId"
      :withdraw-ask-id="withdrawAskId"
      :draft="draft"
      :label-error="labelError"
      :confirm-open="confirmOpen"
      :confirm-phase="confirmPhase"
      :bind-draft-input="bindDraftInput"
      :shows-active-controls="showsActiveControls"
      :shows-reinstate="showsReinstate"
      @select="selectSticky"
      @drag-start="onBacklogDragStart"
      @start-reword="startReword"
      @withdraw="withdrawAskId = $event"
      @confirm-withdraw="postEdit('withdraw', $event)"
      @reinstate="postEdit('reinstate', $event)"
      @update:draft="draft = $event"
      @request-confirm="requestConfirm"
      @cancel-reword="cancelReword"
      @update:confirm-open="confirmOpen = $event"
      @confirm="confirmReword"
      @retry="retryReferences"
    />

    <BoardActionToolbar
      :frame-x="layout.frame.x"
      :frame-y="layout.frame.y"
      :frame-h="layout.frame.h"
      :show-withdrawn="showWithdrawn"
      :relation-error="relationError"
      :selected-id="selectedId"
      :editing-id="editingId"
      :selected-on-timeline="selectedOnTimeline && selectedBlock !== undefined"
      :draft="draft"
      :label-error="labelError"
      :confirm-open="confirmOpen"
      :confirm-phase="confirmPhase"
      :bind-draft-input="bindDraftInput"
      :can-place="canPlace"
      :can-unplace="canUnplace"
      :can-sequence-after="canSequenceAfter"
      :can-mark-pivotal="canMarkPivotal"
      :can-unmark-pivotal="canUnmarkPivotal"
      @update:show-withdrawn="emit('update:showWithdrawn', $event)"
      @update:draft="draft = $event"
      @place-selected="placeSelected"
      @unplace-selected="unplaceSelected"
      @reword-selected="rewordSelected"
      @sequence-selected-after="sequenceSelectedAfter"
      @mark-selected-pivotal="markSelectedPivotal"
      @unmark-selected-pivotal="unmarkSelectedPivotal"
      @request-confirm="requestConfirm"
      @cancel-reword="cancelReword"
      @update:confirm-open="confirmOpen = $event"
      @confirm="confirmReword"
      @retry="retryReferences"
    />

    <div
      class="wall__timeline"
      role="region"
      aria-label="Timeline"
      :style="{
        left: `${layout.frame.x + layout.frame.w + 24}px`,
        top: `${layout.timeGuide.y1 + 24}px`,
        width: `${Math.max(280, layout.canvas.w - layout.frame.x - layout.frame.w - 80)}px`,
        height: `${Math.max(240, layout.canvas.h - layout.timeGuide.y1 - 80)}px`,
      }"
      @dragover.prevent
      @drop="onTimelineDrop"
    >
      <TimelinePane
        :blocks="blocks"
        :timeline="timeline"
        @connect-events="onConnectEvents"
        @select="selectSticky"
      />
    </div>
  </div>
</template>

<style scoped>
.wall {
  position: relative;
  background-color: var(--color-paper);
  background-image:
    radial-gradient(120% 120% at 50% 0%, transparent 55%, rgb(43 39 35 / 0.07) 100%),
    repeating-linear-gradient(92deg, rgb(255 255 255 / 0.18) 0 2px, transparent 2px 6px);
  overflow: hidden;
}

.wall__timeline {
  position: absolute;
  z-index: 1;
}
</style>
