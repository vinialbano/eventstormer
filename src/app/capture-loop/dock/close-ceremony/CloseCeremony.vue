<script setup lang="ts">
import { computed, ref } from 'vue'
import type { CeremonyStep } from '../interactions/close-ceremony/use-close-ceremony.ts'
import type { CloseReport } from '../../transport/close.ts'

/**
 * The in-dock close ceremony, per `.impeccable/surfaces/src-app-capture-loop-close.md`.
 * One card that advances through stakeholder question → problem picker → confirm →
 * closed. Presentational: it emits intent and reads the composable's state; the
 * session is only frozen when the parent runs `confirm`. Choosing a problem and
 * skipping are the same size and weight (F09 / DESIGN §8). With reduced motion the
 * steps swap with no transition.
 */
const props = defineProps<{
  step: CeremonyStep
  busy: boolean
  error: string | null
  report: CloseReport | null
  openHotSpots: { hotSpotId: string; label: string }[]
  reducedMotion?: boolean
}>()

const emit = defineEmits<{
  answer: [complete: boolean, absentNames: string[]]
  choose: [hotSpotId: string]
  skip: [reason: 'none-chosen' | 'no-impediments-yet']
  back: []
  confirm: []
  cancel: []
}>()

const namingPeople = ref(false)
const names = ref<string[]>([])
const draftName = ref('')
const selectedProblem = ref<string | null>(null)
const skipping = ref(false)

const addName = (): void => {
  const next = draftName.value.trim()
  if (next.length === 0 || names.value.includes(next)) return
  names.value.push(next)
  draftName.value = ''
}
const removeName = (name: string): void => {
  names.value = names.value.filter((entry) => entry !== name)
}

const submitStakeholder = (): void => {
  if (namingPeople.value) {
    if (names.value.length === 0) return
    emit('answer', false, [...names.value])
  } else {
    emit('answer', true, [])
  }
}

const chosenLabel = computed(
  () => props.openHotSpots.find((hotSpot) => hotSpot.hotSpotId === selectedProblem.value)?.label,
)
</script>

<template>
  <section
    class="close"
    :class="{ 'close--reduced': reducedMotion }"
    aria-label="Close the session"
  >
    <!-- Step 1 — stakeholder question -->
    <div v-if="step === 'stakeholder'" class="close__step">
      <p class="close__lead" role="status">
        Before we close — would anyone else tell this differently?
      </p>

      <div v-if="!namingPeople" class="close__actions">
        <button type="button" class="close__option close__option--primary" @click="submitStakeholder">
          Nobody else
        </button>
        <button type="button" class="close__option" @click="namingPeople = true">
          Someone would
        </button>
      </div>

      <div v-else class="close__names">
        <ul v-if="names.length > 0" class="close__chips">
          <li v-for="name in names" :key="name" class="close__chip">
            {{ name }}
            <button
              type="button"
              class="close__chipx"
              :aria-label="`Remove ${name}`"
              @click="removeName(name)"
            >
              ✕
            </button>
          </li>
        </ul>
        <div class="close__namerow">
          <label class="close__namelabel">
            <span class="sr-only">Name someone who would add to this</span>
            <input
              v-model="draftName"
              class="close__input"
              type="text"
              placeholder="e.g. my ops lead"
              @keydown.enter.prevent="addName"
            >
          </label>
          <button type="button" class="close__add" @click="addName">Add</button>
        </div>
        <button
          type="button"
          class="close__option close__option--primary"
          :disabled="names.length === 0"
          @click="submitStakeholder"
        >
          That's everyone
        </button>
      </div>
    </div>

    <!-- Step 2 — problem picker -->
    <div v-else-if="step === 'problem'" class="close__step">
      <p class="close__lead" role="status">Which problem is most worth attacking next?</p>

      <p v-if="openHotSpots.length === 0" class="close__signal" role="status">
        No hot spots on the model — that's a signal to interpret, not a pass or a failure.
      </p>

      <div v-else role="radiogroup" aria-label="Open hot spots" class="close__list">
        <button
          v-for="hotSpot in openHotSpots"
          :key="hotSpot.hotSpotId"
          type="button"
          role="radio"
          :aria-checked="selectedProblem === hotSpot.hotSpotId"
          class="close__option close__option--row"
          :class="{ 'close__option--picked': selectedProblem === hotSpot.hotSpotId }"
          @click="selectedProblem = hotSpot.hotSpotId"
        >
          <span class="close__dot" aria-hidden="true" />
          {{ hotSpot.label }}
        </button>
      </div>

      <button
        v-if="!skipping && openHotSpots.length > 0"
        type="button"
        class="close__option close__option--primary"
        :disabled="selectedProblem === null"
        @click="selectedProblem !== null && emit('choose', selectedProblem)"
      >
        Choose this problem
      </button>

      <div v-if="!skipping" class="close__skiprow">
        <button type="button" class="close__option close__option--row" @click="skipping = true">
          Skip — don't name a problem
        </button>
      </div>

      <div v-else class="close__list">
        <button
          type="button"
          class="close__option close__option--row"
          @click="emit('skip', 'none-chosen')"
        >
          No problem chosen
        </button>
        <button
          type="button"
          class="close__option close__option--row"
          @click="emit('skip', 'no-impediments-yet')"
        >
          No real impediments yet
        </button>
      </div>
    </div>

    <!-- Step 3 — confirm -->
    <div v-else-if="step === 'confirm'" class="close__step">
      <p class="close__lead">Close this session?</p>
      <p v-if="chosenLabel" class="close__summary">Problem: {{ chosenLabel }}</p>
      <p v-else class="close__summary">No problem named</p>
      <div class="close__actions">
        <button
          type="button"
          class="close__option close__option--primary"
          :disabled="busy"
          @click="emit('confirm')"
        >
          {{ busy ? 'Closing…' : 'Close session' }}
        </button>
        <button type="button" class="close__ghost" @click="emit('back')">Back</button>
      </div>
    </div>

    <!-- Closed -->
    <p v-else-if="step === 'closed'" class="close__done" role="status">
      <span aria-hidden="true">✓</span>
      This session is closed.
      <template v-if="report">
        <template v-if="report.noHotSpotsIsASignal">
          No hot spots on the model — a signal to interpret.
        </template>
        <template v-else>
          {{ report.hotSpotCount }} hot {{ report.hotSpotCount === 1 ? 'spot' : 'spots' }} on the model.
        </template>
      </template>
    </p>

    <p v-if="busy && step !== 'confirm'" class="close__hint" role="status">Recording…</p>
    <p v-if="error" class="close__err" role="status">{{ error }}</p>
    <button
      v-if="step !== 'closed' && step !== 'confirm'"
      type="button"
      class="close__ghost"
      @click="emit('cancel')"
    >
      Not now
    </button>
  </section>
</template>

<style scoped>
.close {
  border: 1px solid var(--color-line);
  border-radius: var(--radius-card);
  background-color: var(--color-surface);
  box-shadow: var(--shadow-card);
  padding: 14px;
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.close__step {
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: opacity 120ms ease;
}
.close--reduced .close__step,
.close--reduced * {
  transition: none !important;
  animation: none !important;
}
.close__lead {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--color-text);
}
.close__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.close__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 220px;
  overflow-y: auto;
}
/* One box for every choice — a problem row and Skip are the same size and weight (F09). */
.close__option {
  font: inherit;
  font-size: 0.875rem;
  font-weight: 700;
  min-height: 32px;
  padding: 8px 12px;
  border-radius: var(--radius-control);
  border: 1px solid var(--color-line);
  background-color: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
  text-align: left;
}
.close__option--row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}
.close__option--primary {
  border-color: transparent;
  background-color: var(--color-event);
  color: var(--color-event-ink);
}
.close__option--picked {
  border-color: var(--color-event-strong);
  background-color: color-mix(in srgb, var(--color-event) 18%, var(--color-surface));
}
.close__option:disabled {
  opacity: 0.5;
  cursor: default;
}
.close__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background-color: var(--color-event);
  flex: none;
}
.close__skiprow,
.close__names {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.close__namerow {
  display: flex;
  gap: 6px;
}
.close__namelabel {
  flex: 1;
}
.close__input {
  width: 100%;
  font: inherit;
  padding: 6px 8px;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-control);
  background-color: var(--color-surface-sunk);
}
.close__add {
  font: inherit;
  font-weight: 700;
  padding: 0 12px;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-control);
  background-color: var(--color-surface);
  cursor: pointer;
}
.close__chips {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.close__chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8125rem;
  padding: 2px 4px 2px 8px;
  border-radius: var(--radius-chip);
  background-color: var(--color-surface-sunk);
}
.close__chipx {
  border: none;
  background: none;
  cursor: pointer;
  color: var(--color-text-soft);
  font-size: 0.75rem;
}
.close__signal,
.close__summary {
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-text-soft);
}
.close__done {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-event-ink);
}
.close__hint,
.close__err {
  margin: 0;
  font-size: 0.8125rem;
}
.close__err {
  color: var(--color-danger);
}
.close__ghost {
  align-self: flex-start;
  border: none;
  background: none;
  font: inherit;
  font-size: 0.8125rem;
  color: var(--color-text-soft);
  cursor: pointer;
  padding: 0;
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
