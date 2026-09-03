<script setup lang="ts">
import type { ProposalCard, ResolutionCard } from '../types.ts'
import { kindLabel } from './kind-label.ts'

/**
 * The in-dock pending drawer (brief §3) — an *index*, not a second card. Rows
 * are kind pill + label + jump chevron, grouped `Parked by you` / `Awaiting
 * review` / `Resolutions`. A row click jumps to the inline card and pulses it.
 * `Accept all remaining` at the foot; there is no reject-all.
 */
withDefaults(
  defineProps<{
    parked: ProposalCard[]
    awaiting: ProposalCard[]
    resolutions?: ResolutionCard[]
  }>(),
  { resolutions: () => [] },
)
const emit = defineEmits<{
  jump: [proposalId: string]
  'jump-resolution': [resolutionId: string]
  'accept-all': []
}>()
</script>

<template>
  <div class="drawer" role="group" aria-label="Pending proposals">
    <section v-if="parked.length > 0" class="drawer__group">
      <h3 class="drawer__heading">Parked by you <span>{{ parked.length }}</span></h3>
      <button
        v-for="card in parked"
        :key="card.proposalId"
        type="button"
        class="drawer__row"
        @click="emit('jump', card.proposalId)"
      >
        <span class="drawer__pill" :class="`drawer__pill--${card.blockKind}`">{{ kindLabel(card.blockKind) }}</span>
        <span class="drawer__label">{{ card.label }}</span>
        <span class="drawer__chev" aria-hidden="true">›</span>
      </button>
    </section>

    <section v-if="awaiting.length > 0" class="drawer__group">
      <h3 class="drawer__heading">Awaiting review <span>{{ awaiting.length }}</span></h3>
      <button
        v-for="card in awaiting"
        :key="card.proposalId"
        type="button"
        class="drawer__row"
        @click="emit('jump', card.proposalId)"
      >
        <span class="drawer__pill" :class="`drawer__pill--${card.blockKind}`">{{ kindLabel(card.blockKind) }}</span>
        <span class="drawer__label">{{ card.label }}</span>
        <span class="drawer__chev" aria-hidden="true">›</span>
      </button>
    </section>

    <section v-if="resolutions.length > 0" class="drawer__group">
      <h3 class="drawer__heading">Resolutions <span>{{ resolutions.length }}</span></h3>
      <button
        v-for="card in resolutions"
        :key="card.resolutionId"
        type="button"
        class="drawer__row"
        @click="emit('jump-resolution', card.resolutionId)"
      >
        <span class="drawer__pill drawer__pill--resolution">FIX</span>
        <span class="drawer__label">{{ card.reference }}</span>
        <span class="drawer__chev" aria-hidden="true">›</span>
      </button>
    </section>

    <p
      v-if="parked.length === 0 && awaiting.length === 0 && resolutions.length === 0"
      class="drawer__empty"
    >
      Nothing pending.
    </p>

    <button
      v-if="awaiting.length > 0"
      type="button"
      class="drawer__acceptall"
      @click="emit('accept-all')"
    >
      Accept all remaining
    </button>
  </div>
</template>

<style scoped>
.drawer {
  width: 300px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-left: 16px;
  border-left: 1px solid var(--color-line);
  overflow-y: auto;
}
.drawer__group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.drawer__heading {
  margin: 0 0 2px;
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--color-text);
}
.drawer__heading span {
  color: var(--color-text-soft);
  font-weight: 600;
}
.drawer__row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  text-align: left;
  font: inherit;
  padding: 8px 10px;
  border: none;
  border-radius: var(--radius-control);
  background-color: var(--color-surface-sunk);
  cursor: pointer;
}
.drawer__row:hover {
  background-color: color-mix(in srgb, var(--color-event) 10%, var(--color-surface-sunk));
}
.drawer__pill {
  flex: none;
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  padding: 2px 6px;
  border-radius: var(--radius-chip);
  background-color: var(--color-event);
  color: var(--color-event-ink);
}
.drawer__pill--actor {
  background-color: var(--color-actor);
  color: var(--color-actor-ink);
}
.drawer__pill--system {
  background-color: var(--color-system);
  color: var(--color-system-ink);
}
.drawer__pill--resolution {
  background-color: color-mix(in srgb, var(--color-danger) 16%, var(--color-surface));
  color: var(--color-danger);
}
.drawer__label {
  flex: 1;
  min-width: 0;
  font-size: 0.875rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.drawer__chev {
  flex: none;
  color: var(--color-text-soft);
}
.drawer__empty {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--color-text-soft);
}
.drawer__acceptall {
  margin-top: auto;
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--color-event-ink);
  background: none;
  border: none;
  padding: 8px 0 0;
  text-align: left;
  cursor: pointer;
}
</style>
