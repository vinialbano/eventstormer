<script setup lang="ts">
import { Handle, Position, VueFlow } from '@vue-flow/core'
import { computed } from 'vue'
import type { TimelineLayout } from '~/domain-model-capture/domain/timeline/compute-timeline-layout.ts'
import { CELL, tiltFor, type BoardBlockInput } from './layout.ts'
import { layoutTimeline, type EventNodeData } from './use-dagre-layout.ts'

const props = defineProps<{
  blocks: BoardBlockInput[]
  timeline: TimelineLayout
}>()

const blockMap = computed(
  () =>
    new Map(
      props.blocks.map((block) => [
        block.id,
        {
          label: block.label,
          kind: block.kind,
          withdrawn: block.withdrawn === true,
          speaker: block.speaker,
        },
      ]),
    ),
)

const graph = computed(() => layoutTimeline(props.timeline, blockMap.value))
const cellSize = `${String(CELL)}px`
</script>

<template>
  <VueFlow
    class="timeline"
    :nodes="graph.nodes"
    :edges="graph.edges"
    :nodes-draggable="false"
    :nodes-connectable="true"
    :edges-updatable="false"
    :fit-view-on-init="true"
    :min-zoom="0.4"
    :max-zoom="1.6"
    :default-edge-options="{ type: 'default' }"
    pan-on-scroll
  >
    <template #node-event="nodeProps">
      <div
        class="event-node sticky"
        :class="{
          'sticky--withdrawn': (nodeProps.data as EventNodeData).withdrawn,
          'event-node--pivotal': (nodeProps.data as EventNodeData).pivotal,
        }"
        :data-kind="'domain-event'"
        :data-withdrawn="(nodeProps.data as EventNodeData).withdrawn ? 'true' : 'false'"
        :style="{ width: cellSize, '--tilt': `${tiltFor(nodeProps.id)}deg` }"
      >
        <Handle class="event-node__handle" type="target" :position="Position.Left" />
        <span
          v-if="(nodeProps.data as EventNodeData).pivotal"
          class="event-node__bar"
          aria-hidden="true"
        />
        <span class="sticky__label">{{ (nodeProps.data as EventNodeData).label }}</span>
        <span v-if="(nodeProps.data as EventNodeData).speaker" class="sticky__who">
          {{ (nodeProps.data as EventNodeData).speaker }}
        </span>
        <ul
          v-if="(nodeProps.data as EventNodeData).attachments.length > 0"
          class="event-node__chips"
          aria-label="Causes"
        >
          <li
            v-for="chip in (nodeProps.data as EventNodeData).attachments"
            :key="chip.id"
            class="event-node__chip"
            :data-kind="chip.kind"
          >
            {{ chip.label }}
          </li>
        </ul>
        <Handle class="event-node__handle" type="source" :position="Position.Right" />
      </div>
    </template>
  </VueFlow>
</template>

<style>
@import "@vue-flow/core/dist/style.css";
</style>

<style scoped>
.timeline {
  width: 100%;
  height: 100%;
  min-width: 280px;
  min-height: 240px;
  background: transparent;
}

.timeline :deep(.vue-flow__node-event) {
  background: transparent;
  border: none;
  padding: 0;
  box-shadow: none;
}

.timeline :deep(.vue-flow__edge-path) {
  stroke: var(--color-ink);
  stroke-width: 2.2;
  stroke-linecap: round;
}

.timeline :deep(.vue-flow__attribution) {
  display: none;
}

.event-node {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  min-height: v-bind(cellSize);
  padding: 10px 12px 8px;
  text-align: center;
  border-radius: 2px;
  background-color: var(--color-event);
  color: var(--color-event-ink);
  box-shadow: var(--shadow-sticky);
  transform: rotate(var(--tilt, 0deg));
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

.sticky__label {
  font-family: var(--font-marker);
  font-size: 1.0625rem;
  font-weight: 700;
  line-height: 1.15;
  overflow-wrap: anywhere;
}

.sticky__who {
  margin-top: 6px;
  font-family: var(--font-ui);
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.02em;
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

.sticky--withdrawn {
  background-color: color-mix(in srgb, var(--color-ink) 22%, var(--color-paper));
  color: var(--color-ink);
  box-shadow: 0 1px 2px rgb(43 39 35 / 0.12);
  text-decoration: line-through;
}
</style>
