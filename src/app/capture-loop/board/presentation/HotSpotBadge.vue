<script setup lang="ts">
import type { HotSpotCallout } from '../../types.ts'

/**
 * A hot-spot callout pinned to a backlog target sticky's top-right corner.
 * Open hot spots show a `!` mark and their label; a resolved one shows a check
 * and its reference. Keyboard-reachable and announced (DESIGN §8).
 */
defineProps<{
  x: number
  y: number
  callouts: HotSpotCallout[]
}>()
</script>

<template>
  <ul
    class="hsb"
    role="list"
    aria-label="Hot spots on this block"
    :style="{ left: `${x}px`, top: `${y}px` }"
  >
    <li
      v-for="callout in callouts"
      :key="callout.hotSpotId"
      class="hsb__pin"
      :class="{ 'hsb__pin--resolved': callout.resolved }"
      tabindex="0"
      :aria-label="
        callout.resolved
          ? `Resolved hot spot: ${callout.label}${callout.reference === null ? '' : ` — ${callout.reference}`}`
          : `Open hot spot: ${callout.label}`
      "
    >
      <span class="hsb__glyph" aria-hidden="true">{{ callout.resolved ? '✓' : '!' }}</span>
      <span v-if="callout.resolved && callout.reference !== null" class="hsb__ref">{{ callout.reference }}</span>
    </li>
  </ul>
</template>

<style scoped>
.hsb {
  position: absolute;
  z-index: 3;
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
  transform: translate(-50%, -50%);
}
.hsb__pin {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 200px;
  padding: 2px 8px 2px 4px;
  border-radius: 999px;
  background-color: var(--color-surface);
  box-shadow: var(--shadow-card);
  font-family: var(--font-ui);
  font-size: 0.75rem;
  color: var(--color-text);
}
.hsb__pin:focus-visible {
  outline: 2px solid var(--color-event-strong);
  outline-offset: 2px;
}
.hsb__glyph {
  flex: none;
  width: 18px;
  height: 18px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  font-weight: 800;
  background-color: color-mix(in srgb, var(--color-danger) 16%, var(--color-surface));
  color: var(--color-danger);
}
.hsb__pin--resolved .hsb__glyph {
  background-color: var(--color-surface-sunk);
  color: var(--color-text-soft);
}
.hsb__ref {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--color-text-soft);
}
</style>
