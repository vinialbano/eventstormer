<script setup lang="ts">
import RewordConfirm from '../RewordConfirm.vue'
import './sticky-chrome.css'

interface BacklogSticky {
  id: string
  kind: string
  label: string
  withdrawn: boolean
  tilt: number
  speaker?: string | undefined
  x: number
  y: number
  w: number
  h: number
}

const KIND_LABEL: Record<string, string> = {
  'domain-event': 'event',
  actor: 'actor',
  system: 'system',
}

defineProps<{
  stickies: BacklogSticky[]
  empty: boolean
  fresh: ReadonlySet<string>
  selectedId: string | null
  editingId: string | null
  withdrawAskId: string | null
  draft: string
  labelError: string | null
  confirmOpen: boolean
  bindDraftInput: (element: unknown) => void
  workshopId?: string | undefined
  revision?: number | undefined
  accepter?: string | undefined
  showsActiveControls: (id: string, withdrawn: boolean, editingId: string | null) => boolean
  showsReinstate: (id: string, withdrawn: boolean) => boolean
}>()

const emit = defineEmits<{
  select: [id: string]
  'drag-start': [event: DragEvent, sticky: BacklogSticky]
  'start-reword': [id: string]
  withdraw: [id: string]
  'confirm-withdraw': [id: string]
  reinstate: [id: string]
  'request-confirm': []
  'cancel-reword': []
  'update:confirm-open': [open: boolean]
  'reword-confirmed': []
  'update:draft': [value: string]
}>()

const kindWord = (kind: string): string => KIND_LABEL[kind] ?? kind
</script>

<template>
  <ul
    class="backlog-pane"
    role="list"
    aria-label="Backlog"
    :data-empty="empty ? 'true' : 'false'"
  >
    <li
      v-for="sticky in stickies"
      :key="sticky.id"
      class="sticky"
      :class="{
        'sticky--fresh': fresh.has(sticky.id),
        'sticky--withdrawn': sticky.withdrawn,
        'sticky--selected': selectedId === sticky.id && editingId !== sticky.id,
        'sticky--reword': editingId === sticky.id,
      }"
      :data-kind="sticky.kind"
      :data-withdrawn="sticky.withdrawn ? 'true' : 'false'"
      tabindex="0"
      :draggable="!sticky.withdrawn"
      :aria-label="
        sticky.speaker === undefined
          ? `${kindWord(sticky.kind)}: ${sticky.label}`
          : `${kindWord(sticky.kind)}: ${sticky.label}, added by ${sticky.speaker}`
      "
      :style="{
        left: `${sticky.x}px`,
        top: `${sticky.y}px`,
        width: `${sticky.w}px`,
        height: `${sticky.h}px`,
        '--tilt': `${sticky.tilt}deg`,
      }"
      @focus="emit('select', sticky.id)"
      @click="emit('select', sticky.id)"
      @dragstart="emit('drag-start', $event, sticky)"
    >
      <button
        v-if="showsActiveControls(sticky.id, sticky.withdrawn, editingId)"
        type="button"
        class="sticky__pencil"
        aria-label="Reword"
        @click.stop="emit('start-reword', sticky.id)"
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
        v-if="showsActiveControls(sticky.id, sticky.withdrawn, editingId) && withdrawAskId !== sticky.id"
        type="button"
        class="sticky__status"
        aria-label="Withdraw"
        @click.stop="emit('withdraw', sticky.id)"
      >
        Withdraw
      </button>
      <button
        v-if="showsActiveControls(sticky.id, sticky.withdrawn, editingId) && withdrawAskId === sticky.id"
        type="button"
        class="sticky__status"
        aria-label="Confirm withdraw"
        @click.stop="emit('confirm-withdraw', sticky.id)"
      >
        Withdraw this name
      </button>
      <button
        v-if="showsReinstate(sticky.id, sticky.withdrawn)"
        type="button"
        class="sticky__status"
        aria-label="Reinstate"
        @click.stop="emit('reinstate', sticky.id)"
      >
        Reinstate
      </button>

      <template v-if="editingId === sticky.id">
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
          :workshop-id="workshopId ?? ''"
          :block-id="sticky.id"
          :label="draft.trim()"
          :revision="revision ?? -1"
          :accepter="accepter ?? ''"
          @update:open="emit('update:confirm-open', $event)"
          @confirmed="emit('reword-confirmed')"
        />
      </template>
      <template v-else>
        <span class="sticky__label">{{ sticky.label }}</span>
        <span v-if="sticky.speaker" class="sticky__who">{{ sticky.speaker }}</span>
      </template>
    </li>
  </ul>
</template>

<style scoped>
.backlog-pane {
  position: absolute;
  inset: 0;
  margin: 0;
  padding: 0;
  list-style: none;
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
</style>
