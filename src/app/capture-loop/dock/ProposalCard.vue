<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import type { Disposition } from '../types.ts'

/**
 * One proposed building block, welded to the facilitator turn that produced it.
 * Purely presentational — it emits intent and the dock does the POST + refetch,
 * so the card never mutates model state optimistically. The same component
 * renders the scope card: a `kindLabel` of `SCOPE`, no bar.
 */
const props = defineProps<{
  kindLabel: string
  /** Raw building-block kind — drives the pill colour. Absent on the scope card. */
  pillKind?: 'domain-event' | 'actor' | 'system' | undefined
  label: string
  disposition: Disposition
  held?: boolean | undefined
  bar?: 'lenient' | 'strict' | undefined
  applyFailedReason?: string | undefined
  accepter?: string | undefined
  busy?: boolean | undefined
  noHold?: boolean | undefined
  /** The contribution this card was proposed from — quoted so Accept is not a reflex. */
  sourceText?: string | undefined
}>()

const pillClass = computed(() =>
  props.pillKind === undefined ? undefined : `pc__pill--${props.pillKind}`,
)

const emit = defineEmits<{
  accept: []
  reject: []
  hold: []
  unhold: []
  edit: [label: string]
}>()

const editing = ref(false)
const moreOpen = ref(false)
const draft = ref('')
const inputElement = ref<HTMLInputElement | null>(null)

const startEdit = async (): Promise<void> => {
  draft.value = props.label
  editing.value = true
  await nextTick()
  inputElement.value?.focus()
  inputElement.value?.select()
}
const saveEdit = (): void => {
  const next = draft.value.trim()
  editing.value = false
  if (next.length > 0 && next !== props.label) emit('edit', next)
}
const cancelEdit = (): void => {
  editing.value = false
}

const state = computed<'receipt' | 'dismissed' | 'lapsed' | 'active'>(() => {
  if (props.disposition === 'APPLIED') return 'receipt'
  if (props.disposition === 'REJECTED') return 'dismissed'
  if (props.disposition === 'LAPSED') return 'lapsed'
  return 'active'
})
const applying = computed(() => props.busy || props.disposition === 'ACCEPTED')
const failed = computed(() => props.disposition === 'APPLY_FAILED')

const sourceQuote = computed(() => {
  const source = props.sourceText?.trim()
  return source === undefined || source.length === 0 ? null : source
})
const nameInSource = computed(() => {
  if (sourceQuote.value === null) return true
  return sourceQuote.value.toLocaleLowerCase().includes(props.label.trim().toLocaleLowerCase())
})
</script>

<template>
  <p v-if="state === 'receipt'" class="pc pc--receipt" role="status">
    <span aria-hidden="true">✓</span> {{ label }}<template v-if="accepter"> — added by {{ accepter }}</template>
  </p>
  <p v-else-if="state === 'dismissed'" class="pc pc--dismissed" role="status">
    <span aria-hidden="true">✕</span> Dismissed
  </p>
  <p v-else-if="state === 'lapsed'" class="pc pc--dismissed" role="status">Set aside</p>

  <div
    v-else
    class="pc pc--active"
    role="group"
    :aria-label="`Proposal: ${label}`"
    :class="{ 'pc--held': held }"
    :data-disposition="disposition"
  >
    <span v-if="held" class="pc__ribbon" aria-hidden="true" />
    <div class="pc__head">
      <span class="pc__pill" :class="pillClass">{{ kindLabel }}</span>
      <span v-if="bar === 'lenient'" class="pc__bar" title="Kept your wording">your words</span>
      <span v-if="held" class="pc__parked">parked</span>
    </div>

    <label v-if="editing" class="pc__editwrap">
      <span class="sr-only">Edit label</span>
      <input
        ref="inputElement"
        v-model="draft"
        class="pc__input"
        type="text"
        @keydown.enter.prevent="saveEdit"
        @keydown.esc.prevent="cancelEdit"
      >
    </label>
    <p v-else class="pc__label">{{ label }}</p>
    <p v-if="sourceQuote !== null" class="pc__said">You said: {{ sourceQuote }}</p>
    <p v-if="sourceQuote !== null && !nameInSource" class="pc__mismatch">
      This name is not in what you said — check it before you add it.
    </p>

    <p v-if="failed && applyFailedReason" class="pc__reason">Couldn’t add it: {{ applyFailedReason }}</p>

    <div v-if="editing" class="pc__actions">
      <button type="button" class="btn btn--primary" @click="saveEdit">Save</button>
      <button type="button" class="btn btn--ghost" @click="cancelEdit">Cancel</button>
    </div>
    <div v-else-if="applying" class="pc__actions">
      <span class="pc__applying" role="status">Adding…</span>
    </div>
    <div v-else class="pc__actions">
      <button type="button" class="btn btn--primary" @click="emit('accept')">
        {{ failed ? 'Try again' : 'Accept' }}
      </button>
      <button
        v-if="held"
        type="button"
        class="btn btn--outline"
        @click="emit('unhold')"
      >
        Unpark
      </button>
      <button
        type="button"
        class="btn btn--outline"
        :aria-expanded="moreOpen"
        @click="moreOpen = !moreOpen"
      >
        Not this
      </button>
      <template v-if="moreOpen">
        <button type="button" class="btn btn--outline" @click="startEdit">Edit</button>
        <button type="button" class="btn btn--outline btn--danger" @click="emit('reject')">Reject</button>
        <button
          v-if="!held && !noHold"
          type="button"
          class="btn btn--outline"
          @click="emit('hold')"
        >
          Hold
        </button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.pc {
  margin: 0;
  font-size: 0.875rem;
}
.pc--receipt {
  color: var(--color-event-ink);
  font-weight: 600;
}
.pc--dismissed {
  color: var(--color-text-soft);
}

.pc--active {
  position: relative;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-card);
  background-color: var(--color-surface);
  box-shadow: var(--shadow-card);
  padding: 12px 14px;
  overflow: hidden;
}
.pc--held {
  background-color: var(--color-surface-sunk);
}
.pc__ribbon {
  position: absolute;
  inset: 0 auto 0 0;
  width: 4px;
  background-color: var(--color-parked);
}

.pc__head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.pc__pill {
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 2px 7px;
  border-radius: var(--radius-chip);
  background-color: var(--color-event);
  color: var(--color-event-ink);
}
.pc__pill--actor {
  background-color: var(--color-actor);
  color: var(--color-actor-ink);
}
.pc__pill--system {
  background-color: var(--color-system);
  color: var(--color-system-ink);
}
.pc__bar {
  font-size: 0.6875rem;
  color: var(--color-text-soft);
}
.pc__parked {
  font-size: 0.6875rem;
  font-weight: 700;
  color: var(--color-parked);
  text-transform: lowercase;
}

.pc__label {
  margin: 0 0 6px;
  font-family: var(--font-marker);
  font-size: 1.0625rem;
  font-weight: 700;
  color: var(--color-text);
}
.pc__said {
  margin: 0 0 8px;
  font-size: 0.8125rem;
  color: var(--color-text-soft);
  line-height: 1.4;
}
.pc__mismatch {
  margin: 0 0 10px;
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--color-text);
  line-height: 1.4;
}
.pc__reason {
  margin: 0 0 10px;
  font-size: 0.8125rem;
  color: var(--color-danger);
}
.pc__editwrap {
  display: block;
  margin-bottom: 10px;
}
.pc__input {
  width: 100%;
  font: inherit;
  font-family: var(--font-marker);
  font-size: 1.0625rem;
  padding: 6px 8px;
  border: 1px solid var(--color-event-strong);
  border-radius: var(--radius-control);
  background-color: var(--color-surface);
}

.pc__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.pc__applying {
  font-size: 0.8125rem;
  color: var(--color-text-soft);
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
  color: var(--color-event-ink);
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
