<script setup lang="ts">
import { computed } from 'vue'

/**
 * One line of the dock conversation. Facilitator questions and out-of-format
 * notices are `role="status"` messages — never error states (brief §5).
 */
const props = defineProps<{
  kind: 'contribution' | 'question' | 'notice'
  speaker: string
  text: string
}>()

const isFacilitator = computed(() => props.kind !== 'contribution')
const name = computed(() => (isFacilitator.value ? 'Facilitator' : props.speaker))
const initials = computed(() =>
  name.value
    .split(/\s+/)
    .map((w) => w[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase(),
)
</script>

<template>
  <div
    class="turn"
    :class="{ 'turn--facilitator': isFacilitator }"
    :role="kind === 'contribution' ? undefined : 'status'"
  >
    <span class="turn__avatar" aria-hidden="true">
      <svg v-if="isFacilitator" viewBox="0 0 24 24" width="20" height="20">
        <circle cx="12" cy="9" r="4" fill="none" stroke="currentColor" stroke-width="1.8" />
        <path d="M5 20c1.6-3.6 4.1-5.4 7-5.4s5.4 1.8 7 5.4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
      </svg>
      <template v-else>{{ initials }}</template>
    </span>
    <div class="turn__body">
      <p class="turn__name">{{ name }}</p>
      <p class="turn__text">{{ text }}</p>
    </div>
  </div>
</template>

<style scoped>
.turn {
  display: flex;
  gap: 10px;
  padding: 8px 0;
}
.turn__avatar {
  flex: none;
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  font-size: 0.6875rem;
  font-weight: 800;
  background-color: var(--color-surface-sunk);
  color: var(--color-text-soft);
}
.turn--facilitator .turn__avatar {
  background-color: color-mix(in srgb, var(--color-event) 18%, var(--color-surface));
  color: var(--color-event-ink);
}
.turn__body {
  min-width: 0;
}
.turn__name {
  margin: 0 0 2px;
  font-size: 0.8125rem;
  font-weight: 700;
}
.turn__text {
  margin: 0;
  font-size: 0.9375rem;
  line-height: 1.45;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  max-width: 62ch;
}
.turn--facilitator .turn__text {
  color: var(--color-text);
}
</style>
