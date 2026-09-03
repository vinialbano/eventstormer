<script setup lang="ts">
import { computed } from 'vue'
import type { HotSpotCallout, HotSpotView } from '../../types.ts'

/**
 * The wall's hot-spot legend — a quiet app panel top-right. Shows the running
 * count, each annotated hot spot against the block it marks, and the
 * unannotated ones as a plain list. A resolved hot spot shows its reference; an
 * open one does not. Colour is never the only signal — resolved carries the
 * word and a check glyph.
 */
const props = defineProps<{
  hotSpots: HotSpotView
  blockLabels: Readonly<Record<string, string>>
}>()

interface Row {
  callout: HotSpotCallout
  on: string | null
}

const rows = computed<Row[]>(() => {
  const annotated: Row[] = []
  for (const [targetId, callouts] of props.hotSpots.annotated) {
    for (const callout of callouts) {
      annotated.push({ callout, on: props.blockLabels[targetId] ?? null })
    }
  }
  const unannotated: Row[] = props.hotSpots.unannotated.map((callout) => ({ callout, on: null }))
  return [...annotated, ...unannotated]
})
</script>

<template>
  <aside class="hsp" aria-label="Hot spots">
    <p class="hsp__count" role="status">Hot spots <span>{{ hotSpots.count }}</span></p>
    <ul v-if="rows.length > 0" class="hsp__list" role="list">
      <li v-for="row in rows" :key="row.callout.hotSpotId" class="hsp__row">
        <span class="hsp__glyph" aria-hidden="true">{{ row.callout.resolved ? '✓' : '!' }}</span>
        <span class="hsp__body">
          <span class="hsp__label">{{ row.callout.label }}</span>
          <span v-if="row.on !== null" class="hsp__on">on {{ row.on }}</span>
          <span v-if="row.callout.resolved" class="hsp__resolved">
            Resolved<template v-if="row.callout.reference !== null"> — {{ row.callout.reference }}</template>
          </span>
        </span>
      </li>
    </ul>
  </aside>
</template>

<style scoped>
.hsp {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 3;
  width: 248px;
  max-height: 60vh;
  overflow-y: auto;
  padding: 12px 14px;
  background-color: var(--color-surface);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
}
.hsp__count {
  margin: 0 0 8px;
  font-family: var(--font-ui);
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--color-text);
}
.hsp__count span {
  margin-left: 4px;
  color: var(--color-text-soft);
  font-weight: 800;
}
.hsp__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.hsp__row {
  display: flex;
  gap: 8px;
  font-family: var(--font-ui);
  font-size: 0.8125rem;
}
.hsp__glyph {
  flex: none;
  width: 18px;
  height: 18px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  font-weight: 800;
  font-size: 0.75rem;
  background-color: color-mix(in srgb, var(--color-danger) 16%, var(--color-surface));
  color: var(--color-danger);
}
.hsp__row:has(.hsp__resolved) .hsp__glyph {
  background-color: var(--color-surface-sunk);
  color: var(--color-text-soft);
}
.hsp__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.hsp__label {
  font-weight: 700;
  color: var(--color-text);
}
.hsp__on {
  color: var(--color-text-soft);
}
.hsp__resolved {
  color: var(--color-text-soft);
}
</style>
