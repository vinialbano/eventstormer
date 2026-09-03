<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import type { ResolutionDisposition } from '../types.ts'

/**
 * One proposed resolution for an open hot spot. Presentational — it emits intent
 * and the dock does the POST + refetch, so it never resolves the hot spot
 * optimistically. The reference is editable before accept; Accept runs the
 * synchronous resolve chain. Mirrors `ProposalCard.vue`.
 */
const props = defineProps<{
  reference: string
  disposition: ResolutionDisposition
  /** The block this resolution's hot spot marks, when known. */
  hotSpotLabel?: string | undefined
  /** The apply-bounce reason when `disposition === 'LAPSED'`. */
  lapsedReason?: string | undefined
  busy?: boolean | undefined
}>()

const emit = defineEmits<{
  accept: []
  reject: []
  edit: [reference: string]
}>()

const editing = ref(false)
const draft = ref('')
const inputElement = ref<HTMLInputElement | null>(null)

const startEdit = async (): Promise<void> => {
  draft.value = props.reference
  editing.value = true
  await nextTick()
  inputElement.value?.focus()
  inputElement.value?.select()
}
const saveEdit = (): void => {
  const next = draft.value.trim()
  editing.value = false
  if (next.length > 0 && next !== props.reference) emit('edit', next)
}
const cancelEdit = (): void => {
  editing.value = false
}

const state = computed<'resolved' | 'dismissed' | 'lapsed' | 'applying' | 'active'>(() => {
  if (props.disposition === 'APPLIED') return 'resolved'
  if (props.disposition === 'REJECTED') return 'dismissed'
  if (props.disposition === 'LAPSED') return 'lapsed'
  if (props.disposition === 'ACCEPTED' || props.busy) return 'applying'
  return 'active'
})
const lapsedLine = computed(() =>
  props.lapsedReason === 'already-resolved'
    ? 'Set aside — already resolved'
    : 'Set aside',
)
</script>

<template>
  <p v-if="state === 'resolved'" class="rc rc--receipt" role="status">
    <span aria-hidden="true">✓</span> Resolved<template v-if="reference"> — {{ reference }}</template>
  </p>
  <p v-else-if="state === 'dismissed'" class="rc rc--dismissed" role="status">
    <span aria-hidden="true">✕</span> Not resolved
  </p>
  <p v-else-if="state === 'lapsed'" class="rc rc--dismissed" role="status">{{ lapsedLine }}</p>
  <p v-else-if="state === 'applying'" class="rc rc--dismissed" role="status">Resolving…</p>

  <div v-else class="rc rc--active" role="group" aria-label="Resolution">
    <div class="rc__head">
      <span class="rc__pill">RESOLUTION</span>
      <span v-if="hotSpotLabel" class="rc__on">for {{ hotSpotLabel }}</span>
    </div>

    <label v-if="editing" class="rc__editwrap">
      <span class="sr-only">Edit reference</span>
      <input
        ref="inputElement"
        v-model="draft"
        class="rc__input"
        type="text"
        @keydown.enter.prevent="saveEdit"
        @keydown.esc.prevent="cancelEdit"
      >
    </label>
    <p v-else class="rc__ref">{{ reference }}</p>

    <div v-if="editing" class="rc__actions">
      <button type="button" class="btn btn--primary" @click="saveEdit">Save</button>
      <button type="button" class="btn btn--ghost" @click="cancelEdit">Cancel</button>
    </div>
    <div v-else class="rc__actions">
      <button type="button" class="btn btn--primary" @click="emit('accept')">Accept</button>
      <button type="button" class="btn btn--outline" @click="startEdit">Edit</button>
      <button type="button" class="btn btn--outline btn--danger" @click="emit('reject')">Reject</button>
    </div>
  </div>
</template>

<style scoped>
.rc {
  margin: 0;
  font-size: 0.875rem;
}
.rc--receipt {
  color: var(--color-event-ink);
  font-weight: 600;
}
.rc--dismissed {
  color: var(--color-text-soft);
}
.rc--active {
  border: 1px solid var(--color-line);
  border-radius: var(--radius-card);
  background-color: var(--color-surface);
  box-shadow: var(--shadow-card);
  padding: 12px 14px;
}
.rc__head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.rc__pill {
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 2px 7px;
  border-radius: var(--radius-chip);
  background-color: var(--color-event);
  color: var(--color-event-ink);
}
.rc__on {
  font-size: 0.6875rem;
  color: var(--color-text-soft);
}
.rc__ref {
  margin: 0 0 10px;
  font-size: 0.9375rem;
  color: var(--color-text);
  line-height: 1.4;
}
.rc__editwrap {
  display: block;
  margin-bottom: 10px;
}
.rc__input {
  width: 100%;
  font: inherit;
  padding: 6px 8px;
  border: 1px solid var(--color-event-strong);
  border-radius: var(--radius-control);
  background-color: var(--color-surface);
}
.rc__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.btn {
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 700;
  height: 32px;
  padding: 0 12px;
  border-radius: var(--radius-control);
  border: 1px solid transparent;
  cursor: pointer;
}
.btn--primary {
  background-color: var(--color-event);
  color: var(--color-event-ink);
}
.btn--primary:hover {
  background-color: var(--color-event-strong);
}
.btn--outline {
  background-color: var(--color-surface);
  border-color: var(--color-line);
  color: var(--color-text);
}
.btn--outline:hover {
  border-color: var(--color-text-soft);
}
.btn--danger {
  color: var(--color-danger);
}
.btn--ghost {
  background: none;
  color: var(--color-text-soft);
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}
</style>
