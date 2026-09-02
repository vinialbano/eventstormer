<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, toRef } from 'vue'
import type { TimelineLayout } from '~/domain-model-capture/domain/timeline/compute-timeline-layout.ts'
import { useBoardMutations } from './composables/use-board-mutations.ts'
import { useBoardReword } from './composables/use-board-reword.ts'
import { useBoardSelection } from './composables/use-board-selection.ts'
import { useFreshStickyHighlight } from './composables/use-fresh-sticky-highlight.ts'
import { layoutBoard, type BoardBlockInput } from './layout.ts'
import RewordConfirm from './RewordConfirm.vue'
import TimelinePane from './TimelinePane.vue'

/**
 * The board wall — a full-screen EventStorming surface. The backlog is the
 * pure `layoutBoard` renderer; placed events render in the timeline pane from
 * domain ranks.
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

const reword = useBoardReword(blocks, onBoardDirty)
const {
  editingId,
  draft,
  labelError,
  confirmOpen,
  bindDraftInput,
  cancelReword,
  requestConfirm,
  onRewordConfirmed,
  startReword,
} = reword

const mutations = useBoardMutations({
  workshopId: toRef(props, 'workshopId'),
  accepter: toRef(props, 'accepter'),
  blocks,
  selectedId,
  lastPlacedId: selection.lastPlacedId,
  withdrawAskId,
  editingId,
  confirmOpen,
  onBoardDirty,
  startReword,
  cancelReword,
  requestConfirm,
})
const {
  relationError,
  postEdit,
  onConnectEvents,
  onBacklogDragStart,
  onTimelineDrop,
  placeSelected,
  rewordSelected,
  unplaceSelected,
  sequenceSelectedAfter,
  markSelectedPivotal,
  unmarkSelectedPivotal,
} = mutations

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

const onShowWithdrawnChange = (event: Event): void => {
  const target = event.target
  if (!(target instanceof HTMLInputElement)) return
  emit('update:showWithdrawn', target.checked)
}

const KIND_LABEL: Record<string, string> = {
  'domain-event': 'event',
  actor: 'actor',
  system: 'system',
}
const kindWord = (kind: string): string => KIND_LABEL[kind] ?? kind
</script>

<template>
  <div
    class="wall"
    role="region"
    aria-label="EventStorming board"
    :style="{ minWidth: `${layout.canvas.w}px`, minHeight: `${layout.canvas.h}px` }"
  >
    <svg
      class="wall__ink"
      :viewBox="`0 0 ${layout.canvas.w} ${layout.canvas.h}`"
      :width="layout.canvas.w"
      :height="layout.canvas.h"
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <defs>
        <filter id="wall-rough" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="2" seed="7" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="3.4" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <marker id="time-head" viewBox="0 0 12 12" refX="9" refY="6" markerWidth="9" markerHeight="9" orient="auto">
          <path d="M1 1 L10 6 L1 11" fill="none" stroke="var(--color-time)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </marker>
      </defs>

      <g filter="url(#wall-rough)">
        <rect
          :x="16"
          :y="16"
          :width="layout.canvas.w - 32"
          :height="layout.canvas.h - 32"
          rx="10"
          fill="none"
          stroke="var(--color-ink)"
          stroke-width="3"
        />
        <rect
          :x="layout.frame.x"
          :y="layout.frame.y"
          :width="layout.frame.w"
          :height="layout.frame.h"
          rx="12"
          fill="var(--color-paper-edge)"
          fill-opacity="0.55"
          stroke="var(--color-ink)"
          stroke-width="2"
          stroke-dasharray="2 7"
          stroke-linecap="round"
        />
        <line
          :x1="layout.timeGuide.x1"
          :y1="layout.timeGuide.y1"
          :x2="layout.timeGuide.x2"
          :y2="layout.timeGuide.y2"
          stroke="var(--color-time)"
          stroke-width="3"
          stroke-linecap="round"
          marker-end="url(#time-head)"
        />
      </g>
    </svg>

    <span class="wall__marker" :style="{ left: `${layout.frame.x + 14}px`, top: `${layout.frame.y + 2}px` }">
      backlog
    </span>
    <span
      class="wall__marker wall__marker--time"
      :style="{ left: `${layout.timeGuide.x1}px`, top: `${layout.timeGuide.y1 - 34}px` }"
    >
      time
    </span>

    <span aria-hidden="true" class="wall__tape wall__tape--tl" />
    <span aria-hidden="true" class="wall__tape wall__tape--tr" />
    <span aria-hidden="true" class="wall__tape wall__tape--bl" />
    <span aria-hidden="true" class="wall__tape wall__tape--br" />

    <ul
      class="wall__backlog"
      role="list"
      aria-label="Backlog"
      :data-empty="layout.backlog.length === 0 ? 'true' : 'false'"
    >
      <li
        v-for="s in layout.backlog"
        :key="s.id"
        class="sticky"
        :class="{
          'sticky--fresh': fresh.has(s.id),
          'sticky--withdrawn': s.withdrawn,
          'sticky--selected': selectedId === s.id && editingId !== s.id,
          'sticky--reword': editingId === s.id,
        }"
        :data-kind="s.kind"
        :data-withdrawn="s.withdrawn ? 'true' : 'false'"
        tabindex="0"
        :draggable="!s.withdrawn"
        :aria-label="s.speaker === undefined ? `${kindWord(s.kind)}: ${s.label}` : `${kindWord(s.kind)}: ${s.label}, added by ${s.speaker}`"
        :style="{
          left: `${s.x}px`,
          top: `${s.y}px`,
          width: `${s.w}px`,
          height: `${s.h}px`,
          '--tilt': `${s.tilt}deg`,
        }"
        @focus="selectSticky(s.id)"
        @click="selectSticky(s.id)"
        @dragstart="onBacklogDragStart($event, s)"
      >
        <button
          v-if="showsActiveControls(s.id, s.withdrawn, editingId)"
          type="button"
          class="sticky__pencil"
          aria-label="Reword"
          @click.stop="startReword(s.id)"
        >
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
            <path
              d="M11.5 2.5l2 2-8 8H3.5v-2l8-8z"
              fill="none"
              stroke="currentColor"
              stroke-width="1.4"
              stroke-linejoin="round"
            />
          </svg>
        </button>
        <button
          v-if="showsActiveControls(s.id, s.withdrawn, editingId) && withdrawAskId !== s.id"
          type="button"
          class="sticky__status"
          aria-label="Withdraw"
          @click.stop="withdrawAskId = s.id"
        >
          Withdraw
        </button>
        <button
          v-if="showsActiveControls(s.id, s.withdrawn, editingId) && withdrawAskId === s.id"
          type="button"
          class="sticky__status"
          aria-label="Confirm withdraw"
          @click.stop="postEdit('withdraw', s.id)"
        >
          Withdraw this name
        </button>
        <button
          v-if="showsReinstate(s.id, s.withdrawn)"
          type="button"
          class="sticky__status"
          aria-label="Reinstate"
          @click.stop="postEdit('reinstate', s.id)"
        >
          Reinstate
        </button>

        <template v-if="editingId === s.id">
          <label class="sticky__edit">
            <span class="sr-only">Reword label</span>
            <input
              :ref="bindDraftInput"
              v-model="draft"
              class="sticky__input"
              type="text"
              @keydown.enter.prevent="requestConfirm"
            >
          </label>
          <p v-if="labelError" class="sticky__error">{{ labelError }}</p>
          <div class="sticky__ghostbtns">
            <button type="button" class="sticky__keep" aria-label="Keep wording" @click.stop="requestConfirm">
              ✓
            </button>
            <button type="button" class="sticky__cancel" aria-label="Cancel" @click.stop="cancelReword">✕</button>
          </div>
          <RewordConfirm
            :open="confirmOpen"
            :workshop-id="workshopId ?? ''"
            :block-id="s.id"
            :label="draft.trim()"
            :revision="revision ?? -1"
            :accepter="accepter ?? ''"
            @update:open="confirmOpen = $event"
            @confirmed="onRewordConfirmed"
          />
        </template>
        <template v-else>
          <span class="sticky__label">{{ s.label }}</span>
          <span v-if="s.speaker" class="sticky__who">{{ s.speaker }}</span>
        </template>
      </li>
    </ul>

    <label
      class="wall__reveal"
      :style="{
        left: `${layout.frame.x}px`,
        top: `${layout.frame.y + layout.frame.h + 12}px`,
      }"
    >
      <input
        type="checkbox"
        :checked="showWithdrawn"
        aria-label="Show withdrawn"
        @change="onShowWithdrawnChange"
      >
      Show withdrawn
    </label>
    <p
      v-if="relationError"
      class="wall__cycle"
      role="alert"
      :style="{
        left: `${layout.frame.x}px`,
        top: `${layout.frame.y + layout.frame.h + 84}px`,
      }"
    >
      {{ relationError }}
    </p>
    <div
      v-if="selectedId !== null && editingId === null"
      class="wall__actions"
      role="toolbar"
      aria-label="Sticky actions"
      :style="{
        left: `${layout.frame.x}px`,
        top: `${layout.frame.y + layout.frame.h + 44}px`,
      }"
    >
      <button v-if="canPlace" type="button" class="wall__action" aria-label="Place on timeline" @click="placeSelected">
        Place on timeline
      </button>
      <button v-if="canUnplace" type="button" class="wall__action" aria-label="Unplace" @click="unplaceSelected">
        Unplace
      </button>
      <button
        v-if="canUnplace"
        type="button"
        class="wall__action"
        aria-label="Reword"
        @click="rewordSelected"
      >
        Reword
      </button>
      <button
        v-if="canSequenceAfter"
        type="button"
        class="wall__action"
        aria-label="Sequence after"
        @click="sequenceSelectedAfter"
      >
        Sequence after
      </button>
      <button
        v-if="canMarkPivotal"
        type="button"
        class="wall__action"
        aria-label="Mark pivotal"
        @click="markSelectedPivotal"
      >
        Mark pivotal
      </button>
      <button
        v-if="canUnmarkPivotal"
        type="button"
        class="wall__action"
        aria-label="Unmark pivotal"
        @click="unmarkSelectedPivotal"
      >
        Unmark
      </button>
    </div>
    <div
      v-if="editingId !== null && selectedOnTimeline && selectedBlock !== undefined"
      class="wall__reword"
      :style="{
        left: `${layout.frame.x}px`,
        top: `${layout.frame.y + layout.frame.h + 44}px`,
      }"
    >
      <div class="sticky sticky--event sticky--reword">
        <label class="sticky__edit">
          <span class="sr-only">Reword label</span>
          <input
            :ref="bindDraftInput"
            v-model="draft"
            class="sticky__input"
            type="text"
            @keydown.enter.prevent="requestConfirm"
          >
        </label>
        <p v-if="labelError" class="sticky__error">{{ labelError }}</p>
        <div class="sticky__ghostbtns">
          <button type="button" class="sticky__keep" aria-label="Keep wording" @click.stop="requestConfirm">
            ✓
          </button>
          <button type="button" class="sticky__cancel" aria-label="Cancel" @click.stop="cancelReword">✕</button>
        </div>
        <RewordConfirm
          :open="confirmOpen"
          :workshop-id="workshopId ?? ''"
          :block-id="editingId"
          :label="draft.trim()"
          :revision="revision ?? -1"
          :accepter="accepter ?? ''"
          @update:open="confirmOpen = $event"
          @confirmed="onRewordConfirmed"
        />
      </div>
    </div>

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

.wall__ink {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.wall__marker {
  position: absolute;
  font-family: var(--font-marker);
  font-size: 1.25rem;
  color: var(--color-ink);
  transform: rotate(-1.5deg);
  user-select: none;
}
.wall__marker--time {
  color: var(--color-time);
  transform: rotate(-1deg);
}

.wall__tape {
  position: absolute;
  width: 74px;
  height: 26px;
  background-color: rgb(214 197 160 / 0.72);
  box-shadow: inset 0 0 0 1px rgb(43 39 35 / 0.06);
}
.wall__tape--tl { left: -22px; top: 18px; transform: rotate(-42deg); }
.wall__tape--tr { right: -22px; top: 18px; transform: rotate(42deg); }
.wall__tape--bl { left: -22px; bottom: 18px; transform: rotate(42deg); }
.wall__tape--br { right: -22px; bottom: 18px; transform: rotate(-42deg); }

.wall__backlog {
  position: absolute;
  inset: 0;
  margin: 0;
  padding: 0;
  list-style: none;
}

.wall__timeline {
  position: absolute;
  z-index: 1;
}

.wall__reveal {
  position: absolute;
  z-index: 3;
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-ui);
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--color-text);
  cursor: pointer;
}
.wall__reveal input {
  margin: 0;
  accent-color: var(--color-ink);
}

.wall__cycle {
  position: absolute;
  z-index: 3;
  max-width: 36rem;
  margin: 0;
  font-family: var(--font-ui);
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--color-event-ink);
  background-color: var(--color-event);
  box-shadow: var(--shadow-card);
  padding: 8px 12px;
  border-radius: var(--radius-control);
}

.wall__actions {
  position: absolute;
  z-index: 3;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.wall__action {
  height: 28px;
  padding: 0 10px;
  border: none;
  border-radius: var(--radius-control);
  background-color: var(--color-surface);
  color: var(--color-text);
  box-shadow: var(--shadow-card);
  font-family: var(--font-ui);
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
}
.wall__action:focus-visible {
  outline: 2px solid var(--color-ink);
  outline-offset: 2px;
}

.wall__reword {
  position: absolute;
  z-index: 4;
  width: 132px;
}
.wall__reword .sticky {
  position: relative;
}

.sticky {
  position: absolute;
  display: grid;
  place-items: center;
  padding: 10px;
  text-align: center;
  border-radius: 2px;
  background-color: var(--color-event);
  color: var(--color-event-ink);
  box-shadow: var(--shadow-sticky);
  transform: rotate(var(--tilt, 0deg));
}
.sticky[data-kind='actor'] { background-color: var(--color-actor); color: var(--color-actor-ink); }
.sticky[data-kind='system'] { background-color: var(--color-system); color: var(--color-system-ink); }

.sticky__label {
  font-family: var(--font-marker);
  font-size: 1.0625rem;
  font-weight: 700;
  line-height: 1.15;
  overflow-wrap: anywhere;
}
.sticky__who {
  margin-top: 6px;
  font-family: var(--font-ui);
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.sticky:focus-visible {
  outline: 2px solid var(--color-ink);
  outline-offset: 3px;
}

.sticky--selected {
  outline: 2px solid var(--color-ink);
  outline-offset: 4px;
}

.sticky--withdrawn {
  background-color: color-mix(in srgb, var(--color-ink) 22%, var(--color-paper));
  color: var(--color-ink);
  box-shadow: 0 1px 2px rgb(43 39 35 / 0.12);
  text-decoration: line-through;
}
.sticky--withdrawn[data-kind='actor'],
.sticky--withdrawn[data-kind='system'] {
  background-color: color-mix(in srgb, var(--color-ink) 22%, var(--color-paper));
  color: var(--color-ink);
}

.sticky--reword {
  background-color: color-mix(in srgb, var(--color-event) 38%, var(--color-paper));
  box-shadow: none;
  outline: 2px dashed var(--color-event);
  outline-offset: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 8px 8px 6px;
}
.sticky--reword[data-kind='actor'] {
  background-color: color-mix(in srgb, var(--color-actor) 38%, var(--color-paper));
  outline-color: var(--color-actor);
}
.sticky--reword[data-kind='system'] {
  background-color: color-mix(in srgb, var(--color-system) 38%, var(--color-paper));
  outline-color: var(--color-system);
}

.sticky__pencil {
  position: absolute;
  top: -12px;
  right: -12px;
  z-index: 2;
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border: none;
  border-radius: 999px;
  background-color: var(--color-surface);
  color: var(--color-ink);
  box-shadow: var(--shadow-card);
  cursor: pointer;
}
.sticky__pencil:focus-visible {
  outline: 2px solid var(--color-event-strong);
  outline-offset: 2px;
}

.sticky__status {
  position: absolute;
  left: 8px;
  right: 8px;
  bottom: 8px;
  z-index: 2;
  height: 28px;
  border: none;
  border-radius: var(--radius-control);
  background-color: var(--color-surface);
  color: var(--color-text);
  box-shadow: var(--shadow-card);
  font-family: var(--font-ui);
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
}
.sticky__status:focus-visible {
  outline: 2px solid var(--color-event-strong);
  outline-offset: 2px;
}

.sticky__edit {
  display: grid;
  flex: 1;
  min-height: 0;
  width: 100%;
}
.sticky__input {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  font-family: var(--font-marker);
  font-size: 1.0625rem;
  font-weight: 700;
  line-height: 1.15;
  text-align: center;
  color: inherit;
  resize: none;
}
.sticky__input:focus {
  outline: none;
}

.sticky__ghostbtns {
  display: flex;
  justify-content: center;
  gap: 8px;
}
.sticky__error {
  margin: 0;
  font-family: var(--font-ui);
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--color-danger);
}
.sticky__keep,
.sticky__cancel {
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 999px;
  font: inherit;
  font-size: 0.875rem;
  font-weight: 700;
  cursor: pointer;
  line-height: 1;
}
.sticky__keep {
  background-color: var(--color-event);
  color: var(--color-event-ink);
}
.sticky__cancel {
  background-color: var(--color-surface);
  color: var(--color-ink);
  box-shadow: inset 0 0 0 1px var(--color-line);
}
.sticky__keep:focus-visible,
.sticky__cancel:focus-visible {
  outline: 2px solid var(--color-event-strong);
  outline-offset: 2px;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.sticky--fresh {
  animation: sticky-settle 0.9s var(--ease-flight);
}
@keyframes sticky-settle {
  0% {
    transform: rotate(var(--tilt, 0deg)) scale(1.08);
    box-shadow: 0 0 0 6px color-mix(in srgb, var(--color-event) 55%, transparent), var(--shadow-sticky);
  }
  100% {
    transform: rotate(var(--tilt, 0deg)) scale(1);
    box-shadow: 0 0 0 0 transparent, var(--shadow-sticky);
  }
}
</style>
