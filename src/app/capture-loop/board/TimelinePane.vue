<script setup lang="ts">
import { VueFlow, type Connection } from '@vue-flow/core'
import { computed } from 'vue'
import type { TimelineLayout } from '~/domain-model-capture/domain/timeline/compute-timeline-layout.ts'
import TimelineEventNode from './presentation/TimelineEventNode.vue'
import { type BoardBlockInput } from './layout.ts'
import { layoutTimeline, type EventNodeData } from './use-dagre-layout.ts'

const props = defineProps<{
  blocks: BoardBlockInput[]
  timeline: TimelineLayout
}>()

const emit = defineEmits<{
  'connect-events': [payload: { source: string; target: string }]
  select: [id: string]
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

const onConnect = (connection: Connection): void => {
  emit('connect-events', { source: connection.source, target: connection.target })
}

const onNodeClick = (click: { node: { id: string } }): void => {
  emit('select', click.node.id)
}

defineExpose({ onConnect })
</script>

<template>
  <VueFlow
    class="timeline"
    :nodes="graph.nodes"
    :edges="graph.edges"
    :nodes-draggable="false"
    :nodes-connectable="true"
    :edges-updatable="false"
    :auto-connect="false"
    :fit-view-on-init="true"
    :min-zoom="0.4"
    :max-zoom="1.6"
    :default-edge-options="{ type: 'default' }"
    pan-on-scroll
    @connect="onConnect"
    @node-click="onNodeClick"
  >
    <template #node-event="nodeProps">
      <TimelineEventNode
        :id="nodeProps.id"
        :data="nodeProps.data as EventNodeData"
        @select="emit('select', $event)"
      />
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
</style>
