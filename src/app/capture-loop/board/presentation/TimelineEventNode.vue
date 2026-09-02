<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import { CELL, tiltFor } from '../layout.ts'
import type { EventNodeData } from '../use-dagre-layout.ts'
import './sticky-chrome.css'

defineProps<{
  id: string
  data: EventNodeData
}>()

const emit = defineEmits<{ select: [id: string] }>()

const cellSize = `${String(CELL)}px`
</script>

<template>
  <div
    class="event-node sticky"
    :class="{
      'sticky--withdrawn': data.withdrawn,
      'event-node--pivotal': data.pivotal,
    }"
    :data-kind="'domain-event'"
    :data-event-id="id"
    :data-withdrawn="data.withdrawn ? 'true' : 'false'"
    :style="{ width: cellSize, '--tilt': `${tiltFor(id)}deg` }"
    @click.stop="emit('select', id)"
  >
    <Handle class="event-node__handle" type="target" :position="Position.Left" />
    <span v-if="data.pivotal" class="event-node__bar" aria-hidden="true" />
    <span class="sticky__label">{{ data.label }}</span>
    <span v-if="data.speaker" class="sticky__who">{{ data.speaker }}</span>
    <ul v-if="data.attachments.length > 0" class="event-node__chips" aria-label="Causes">
      <li v-for="chip in data.attachments" :key="chip.id" class="event-node__chip" :data-kind="chip.kind">
        {{ chip.label }}
      </li>
    </ul>
    <Handle class="event-node__handle" type="source" :position="Position.Right" />
  </div>
</template>

<style scoped>
.event-node {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  min-height: v-bind(cellSize);
  padding: 10px 12px 8px;
}

.event-node__bar {
  position: absolute;
  left: -11px;
  top: -10px;
  bottom: -10px;
  width: 7px;
  border-radius: 2px;
  background-color: var(--color-pivotal);
  box-shadow: 0 1px 2px rgb(43 39 35 / 0.18);
}

.event-node__handle {
  width: 8px;
  height: 8px;
  border: none;
  background: transparent;
}

.event-node__chips {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 4px;
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
  width: 100%;
}

.event-node__chip {
  max-width: 100%;
  padding: 1px 6px;
  border-radius: 999px;
  font-family: var(--font-ui);
  font-size: 0.625rem;
  font-weight: 700;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  background-color: var(--color-actor);
  color: var(--color-actor-ink);
}
.event-node__chip[data-kind='system'] {
  background-color: var(--color-system);
  color: var(--color-system-ink);
}
</style>
