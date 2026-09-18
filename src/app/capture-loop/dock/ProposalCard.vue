<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import type { Disposition, ProposalIntent } from '../types.ts'

/**
 * One proposed building block or model-change, welded to the facilitator turn
 * that produced it. Purely presentational — it emits intent and the dock does the
 * POST + refetch, so the card never mutates model state optimistically. The same
 * component renders the scope card (a `kindLabel` of `SCOPE`, no bar) and a
 * model-change proposal (an `intent` in place of a building-block `label`).
 */
const props = defineProps<{
  kindLabel: string
  /** Raw building-block kind — drives the pill colour. Absent on the scope / model-change card. */
  pillKind?: 'domain-event' | 'actor' | 'system' | undefined
  /** The building-block label — absent on a model-change card, which carries `intent`. */
  label?: string | undefined
  /** The resolved relation / pivotal / reword — present on a model-change card. */
  intent?: ProposalIntent | undefined
  disposition: Disposition
  held?: boolean | undefined
  bar?: 'lenient' | 'strict' | undefined
  applyFailedReason?: string | undefined
  accepter?: string | undefined
  busy?: boolean | undefined
  noHold?: boolean | undefined
  /** The contribution this card was proposed from — quoted so Accept is not a reflex. */
  sourceText?: string | undefined
  /** A later reword on the same target won — the board carries `supersededByLabel`,
   * not this card's label. Disposition is still `APPLIED`. */
  superseded?: boolean | undefined
  supersededByLabel?: string | undefined
}>()

const pillClass = computed(() => {
  if (props.intent !== undefined) return 'pc__pill--intent'
  return props.pillKind === undefined ? undefined : `pc__pill--${props.pillKind}`
})

/** A model-change card has an `intent`; a building-block / scope card has a `label`.
 * A card with neither renders nothing (forward-compat guard). */
const hasContent = computed(
  () => props.intent !== undefined || (props.label !== undefined && props.label !== ''),
)
/** The one-line body — the intent summary, or the building-block label. */
const body = computed(() => props.intent?.summary ?? props.label ?? '')

const emit = defineEmits<{
  accept: []
  reject: []
  hold: []
  unhold: []
  edit: [label: string]
  /** A model-change edit — `newLabel` for a reword, or `field` + the replacement
   * block's current board label for a relation endpoint swap / pivotal target. */
  'edit-intent': [changed: { newLabel: string } | { field: string; label: string }]
}>()

const editing = ref(false)
const moreOpen = ref(false)
const draft = ref('')
const draftLabel = ref('')
const selectedField = ref('')
const inputElement = ref<HTMLInputElement | null>(null)
/** The label most recently submitted for a relation/pivotal endpoint edit, or
 * `null` when nothing is in flight. A plain `emit` carries no acknowledgement
 * (Vue never returns a listener's result), so the card learns an edit landed
 * by watching for this exact value to come back on the resolved endpoint —
 * closing only then keeps the draft and selection intact through a 422. */
const pendingEndpointLabel = ref<string | null>(null)

/** A reword's label, a relation's endpoint, or a pivotal's target are editable
 * inline; anything else falls back to the plain building-block `edit` emit. */
const editableIntent = computed(
  () =>
    props.intent?.kind === 'reword' ||
    props.intent?.kind === 'relation' ||
    props.intent?.kind === 'pivotal',
)
const canEdit = computed(() => props.intent === undefined || editableIntent.value)
const editSeed = computed(() =>
  props.intent?.kind === 'reword' ? (props.intent.newLabel ?? '') : (props.label ?? ''),
)

const endpointOptions = computed(() => props.intent?.endpoints ?? [])
/** The board's current label at whichever endpoint is selected (relation) or
 * the pivotal's single target — recomputed live so it tracks a landed edit. */
const resolvedEndpointLabel = computed(() => {
  if (props.intent?.kind === 'pivotal') return props.intent.target?.label ?? ''
  return endpointOptions.value.find((endpoint) => endpoint.field === selectedField.value)?.label ?? ''
})

const startEdit = async (): Promise<void> => {
  pendingEndpointLabel.value = null
  if (props.intent?.kind === 'relation') {
    selectedField.value = endpointOptions.value[0]?.field ?? ''
    draftLabel.value = resolvedEndpointLabel.value
  } else if (props.intent?.kind === 'pivotal') {
    draftLabel.value = resolvedEndpointLabel.value
  } else {
    draft.value = editSeed.value
  }
  editing.value = true
  await nextTick()
  inputElement.value?.focus()
  inputElement.value?.select()
}
const onEndpointChange = (): void => {
  draftLabel.value = resolvedEndpointLabel.value
}
const saveEdit = (): void => {
  if (props.intent?.kind === 'relation' || props.intent?.kind === 'pivotal') {
    const label = draftLabel.value.trim()
    const field = props.intent.kind === 'pivotal' ? 'target' : selectedField.value
    if (label.length === 0 || field === '') return
    if (label === resolvedEndpointLabel.value) {
      editing.value = false
      return
    }
    pendingEndpointLabel.value = label
    emit('edit-intent', { field, label })
    return
  }
  const next = draft.value.trim()
  if (next.length === 0 || next === editSeed.value) {
    editing.value = false
    return
  }
  if (editableIntent.value) {
    pendingEndpointLabel.value = next
    emit('edit-intent', { newLabel: next })
  } else {
    editing.value = false
    emit('edit', next)
  }
}
const cancelEdit = (): void => {
  editing.value = false
  pendingEndpointLabel.value = null
}

/** Closes the editor once the value we submitted is reflected back from the
 * server — never on an unrelated refetch (the interpretation poll runs
 * regardless), and never on a 422, since a rejected edit writes nothing. */
watch(
  () => (props.intent?.kind === 'reword' ? props.intent.newLabel : resolvedEndpointLabel.value),
  (landed) => {
    if (pendingEndpointLabel.value !== null && landed === pendingEndpointLabel.value) {
      editing.value = false
      pendingEndpointLabel.value = null
    }
  },
)

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
  if (sourceQuote.value === null || props.intent !== undefined) return true
  return sourceQuote.value
    .toLocaleLowerCase()
    .includes((props.label ?? '').trim().toLocaleLowerCase())
})
</script>

<template>
  <p v-if="hasContent && state === 'receipt' && superseded" class="pc pc--superseded" role="status">
    <span aria-hidden="true">↺</span> Superseded<template v-if="supersededByLabel"> — “{{ supersededByLabel }}” was kept instead</template><template v-else> — another contribution’s text was kept</template>
  </p>
  <p v-else-if="hasContent && state === 'receipt'" class="pc pc--receipt" role="status">
    <span aria-hidden="true">✓</span> {{ body }}<template v-if="accepter"> — added by {{ accepter }}</template>
  </p>
  <p v-else-if="hasContent && state === 'dismissed'" class="pc pc--dismissed" role="status">
    <span aria-hidden="true">✕</span> Dismissed
  </p>
  <p v-else-if="hasContent && state === 'lapsed'" class="pc pc--dismissed" role="status">Set aside</p>

  <div
    v-else-if="hasContent"
    class="pc pc--active"
    role="group"
    :aria-label="`Proposal: ${body}`"
    :class="{ 'pc--held': held }"
    :data-disposition="disposition"
  >
    <span v-if="held" class="pc__ribbon" aria-hidden="true" />
    <div class="pc__head">
      <span class="pc__pill" :class="pillClass">{{ kindLabel }}</span>
      <span v-if="bar === 'lenient'" class="pc__bar" title="Kept your wording">your words</span>
      <span v-if="held" class="pc__parked">parked</span>
    </div>

    <div v-if="editing && intent?.kind === 'relation'" class="pc__editwrap">
      <label>
        <span class="sr-only">Choose the endpoint to replace</span>
        <select v-model="selectedField" class="pc__input" @change="onEndpointChange">
          <option v-for="endpoint in endpointOptions" :key="endpoint.field" :value="endpoint.field">
            {{ endpoint.label }}
          </option>
        </select>
      </label>
      <label>
        <span class="sr-only">Replacement block's current board label</span>
        <input
          ref="inputElement"
          v-model="draftLabel"
          class="pc__input"
          type="text"
          @keydown.enter.prevent="saveEdit"
          @keydown.esc.prevent="cancelEdit"
        >
      </label>
    </div>
    <label v-else-if="editing && intent?.kind === 'pivotal'" class="pc__editwrap">
      <span class="sr-only">Replacement block's current board label</span>
      <input
        ref="inputElement"
        v-model="draftLabel"
        class="pc__input"
        type="text"
        @keydown.enter.prevent="saveEdit"
        @keydown.esc.prevent="cancelEdit"
      >
    </label>
    <label v-else-if="editing" class="pc__editwrap">
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
    <p v-else class="pc__label">{{ body }}</p>
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
        <button v-if="canEdit" type="button" class="btn btn--outline" @click="startEdit">Edit</button>
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
.pc--superseded {
  color: var(--color-text-soft);
  font-weight: 600;
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
.pc__pill--intent {
  background-color: var(--color-surface-sunk);
  color: var(--color-text-soft);
  border: 1px solid var(--color-line);
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
