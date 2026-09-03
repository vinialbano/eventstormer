<script setup lang="ts">
import RewordConfirm from '../interactions/reword-block/RewordConfirm.vue'
import type { RewordConfirmPhase } from '../interactions/reword-block/reword-confirm.ts'
import './sticky-chrome.css'

defineProps<{
  frameX: number
  frameY: number
  frameH: number
  showWithdrawn?: boolean | undefined
  relationError: string | null
  selectedId: string | null
  editingId: string | null
  selectedOnTimeline: boolean
  selectedBlockLabel?: string | undefined
  draft: string
  labelError: string | null
  confirmOpen: boolean
  confirmPhase: RewordConfirmPhase
  bindDraftInput: (element: unknown) => void
  canPlace: boolean
  canUnplace: boolean
  canSequenceAfter: boolean
  canMarkPivotal: boolean
  canUnmarkPivotal: boolean
}>()

const emit = defineEmits<{
  'update:show-withdrawn': [value: boolean]
  'update:draft': [value: string]
  'update:confirm-open': [open: boolean]
  'place-selected': []
  'unplace-selected': []
  'reword-selected': []
  'sequence-selected-after': []
  'mark-selected-pivotal': []
  'unmark-selected-pivotal': []
  'flag-selected': []
  'flag-board': []
  'request-confirm': []
  'cancel-reword': []
  confirm: []
  retry: []
}>()

const onShowWithdrawnChange = (event: Event): void => {
  const target = event.target
  if (!(target instanceof HTMLInputElement)) return
  emit('update:show-withdrawn', target.checked)
}
</script>

<template>
  <label
    class="wall__reveal"
    :style="{
      left: `${frameX}px`,
      top: `${frameY + frameH + 12}px`,
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
      left: `${frameX}px`,
      top: `${frameY + frameH + 84}px`,
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
      left: `${frameX}px`,
      top: `${frameY + frameH + 44}px`,
    }"
  >
    <button v-if="canPlace" type="button" class="wall__action" aria-label="Place on timeline" @click="emit('place-selected')">
      Place on timeline
    </button>
    <button v-if="canUnplace" type="button" class="wall__action" aria-label="Unplace" @click="emit('unplace-selected')">
      Unplace
    </button>
    <button v-if="canUnplace" type="button" class="wall__action" aria-label="Reword" @click="emit('reword-selected')">
      Reword
    </button>
    <button
      v-if="canSequenceAfter"
      type="button"
      class="wall__action"
      aria-label="Sequence after"
      @click="emit('sequence-selected-after')"
    >
      Sequence after
    </button>
    <button
      v-if="canMarkPivotal"
      type="button"
      class="wall__action"
      aria-label="Mark pivotal"
      @click="emit('mark-selected-pivotal')"
    >
      Mark pivotal
    </button>
    <button
      v-if="canUnmarkPivotal"
      type="button"
      class="wall__action"
      aria-label="Unmark pivotal"
      @click="emit('unmark-selected-pivotal')"
    >
      Unmark
    </button>
    <button
      type="button"
      class="wall__action"
      aria-label="Flag hot spot"
      @click="emit('flag-selected')"
    >
      Flag hot spot
    </button>
  </div>
  <button
    type="button"
    class="wall__flag"
    aria-label="Flag a hot spot"
    :style="{
      left: `${frameX}px`,
      top: `${frameY + frameH + 108}px`,
    }"
    @click="emit('flag-board')"
  >
    Flag a hot spot
  </button>
  <div
    v-if="editingId !== null && selectedOnTimeline"
    class="wall__reword"
    :style="{
      left: `${frameX}px`,
      top: `${frameY + frameH + 44}px`,
    }"
  >
    <div class="sticky sticky--event sticky--reword">
      <label class="sticky__edit">
        <span class="sr-only">Reword label</span>
        <input
          :ref="bindDraftInput"
          :value="draft"
          class="sticky__input"
          type="text"
          @input="emit('update:draft', ($event.target as HTMLInputElement).value)"
          @keydown.enter.prevent="emit('request-confirm')"
        >
      </label>
      <p v-if="labelError" class="sticky__error">{{ labelError }}</p>
      <div class="sticky__ghostbtns">
        <button type="button" class="sticky__keep" aria-label="Keep wording" @click.stop="emit('request-confirm')">
          ✓
        </button>
        <button type="button" class="sticky__cancel" aria-label="Cancel" @click.stop="emit('cancel-reword')">
          ✕
        </button>
      </div>
      <RewordConfirm
        :open="confirmOpen"
        :phase="confirmPhase"
        @update:open="emit('update:confirm-open', $event)"
        @confirm="emit('confirm')"
        @cancel="emit('cancel-reword')"
        @retry="emit('retry')"
      />
    </div>
  </div>
</template>

<style scoped>
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

.wall__flag {
  position: absolute;
  z-index: 3;
  height: 28px;
  padding: 0 12px;
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
.wall__flag:focus-visible {
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
</style>
