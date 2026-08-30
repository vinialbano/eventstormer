<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useReducedMotion } from '../composables/use-reduced-motion.ts'
import { layoutBoard, type BoardBlockInput } from './layout.ts'

/**
 * The board wall — a full-screen EventStorming surface. Slice 1 renders the
 * backlog area only (docs/adr/006: the layout is the pure `layoutBoard`; this file is
 * the swappable renderer). A pending proposal is NEVER drawn here — no ghost
 * sticky (that treatment is reword-only, slice 3).
 */
const props = defineProps<{ blocks: BoardBlockInput[] }>()

const viewport = ref({ w: 1280, h: 800 })
const measure = (): void => {
  viewport.value = {
    w: Math.max(320, window.innerWidth),
    h: Math.max(320, window.innerHeight),
  }
}
onMounted(() => {
  measure()
  window.addEventListener('resize', measure)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', measure)
})

const layout = computed(() => layoutBoard(props.blocks, viewport.value))

// The focal moment (DESIGN.md §6): a block that has just landed on the wall
// gets a brief settle + fading highlight, then it is just part of the wall.
// Reduced motion skips the wash — the sticky simply appears.
const reduced = useReducedMotion()
const seen = new Set<string>()
const fresh = ref(new Set<string>())
let mounted = false

watch(
  () => props.blocks.map((b) => b.id),
  (ids) => {
    for (const id of ids) {
      if (seen.has(id)) continue
      seen.add(id)
      if (mounted && !reduced.value) {
        fresh.value = new Set(fresh.value).add(id)
        window.setTimeout(() => {
          const next = new Set(fresh.value)
          next.delete(id)
          fresh.value = next
        }, 1000)
      }
    }
  },
  { immediate: true },
)
onMounted(() => {
  mounted = true
})

const KIND_LABEL: Record<string, string> = {
  'domain-event': 'event',
  actor: 'actor',
  system: 'system',
}
const kindWord = (kind: string): string => KIND_LABEL[kind] ?? kind
</script>

<template>
  <div
    class="wall"
    role="region"
    aria-label="EventStorming board"
    :style="{ minWidth: `${layout.canvas.w}px`, minHeight: `${layout.canvas.h}px` }"
  >
    <svg
      class="wall__ink"
      :viewBox="`0 0 ${layout.canvas.w} ${layout.canvas.h}`"
      :width="layout.canvas.w"
      :height="layout.canvas.h"
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <defs>
        <filter id="wall-rough" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="2" seed="7" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="3.4" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <marker id="time-head" viewBox="0 0 12 12" refX="9" refY="6" markerWidth="9" markerHeight="9" orient="auto">
          <path d="M1 1 L10 6 L1 11" fill="none" stroke="var(--color-time)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </marker>
      </defs>

      <g filter="url(#wall-rough)">
        <rect
          :x="16"
          :y="16"
          :width="layout.canvas.w - 32"
          :height="layout.canvas.h - 32"
          rx="10"
          fill="none"
          stroke="var(--color-ink)"
          stroke-width="3"
        />
        <rect
          :x="layout.frame.x"
          :y="layout.frame.y"
          :width="layout.frame.w"
          :height="layout.frame.h"
          rx="12"
          fill="var(--color-paper-edge)"
          fill-opacity="0.55"
          stroke="var(--color-ink)"
          stroke-width="2"
          stroke-dasharray="2 7"
          stroke-linecap="round"
        />
        <line
          :x1="layout.timeGuide.x1"
          :y1="layout.timeGuide.y1"
          :x2="layout.timeGuide.x2"
          :y2="layout.timeGuide.y2"
          stroke="var(--color-time)"
          stroke-width="3"
          stroke-linecap="round"
          marker-end="url(#time-head)"
        />
      </g>
    </svg>

    <span class="wall__marker" :style="{ left: `${layout.frame.x + 14}px`, top: `${layout.frame.y + 2}px` }">
      backlog
    </span>
    <span
      class="wall__marker wall__marker--time"
      :style="{ left: `${layout.timeGuide.x1}px`, top: `${layout.timeGuide.y1 - 34}px` }"
    >
      time
    </span>

    <span aria-hidden="true" class="wall__tape wall__tape--tl" />
    <span aria-hidden="true" class="wall__tape wall__tape--tr" />
    <span aria-hidden="true" class="wall__tape wall__tape--bl" />
    <span aria-hidden="true" class="wall__tape wall__tape--br" />

    <ul
      class="wall__backlog"
      role="list"
      aria-label="Backlog"
      :data-empty="layout.backlog.length === 0 ? 'true' : 'false'"
    >
      <li
        v-for="s in layout.backlog"
        :key="s.id"
        class="sticky"
        :class="{ 'sticky--fresh': fresh.has(s.id) }"
        :data-kind="s.kind"
        tabindex="0"
        :aria-label="`${kindWord(s.kind)}: ${s.label}`"
        :style="{
          left: `${s.x}px`,
          top: `${s.y}px`,
          width: `${s.w}px`,
          height: `${s.h}px`,
          '--tilt': `${s.tilt}deg`,
        }"
      >
        <span class="sticky__label">{{ s.label }}</span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.wall {
  position: relative;
  background-color: var(--color-paper);
  background-image:
    radial-gradient(120% 120% at 50% 0%, transparent 55%, rgb(43 39 35 / 0.07) 100%),
    repeating-linear-gradient(92deg, rgb(255 255 255 / 0.18) 0 2px, transparent 2px 6px);
  overflow: hidden;
}

.wall__ink {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.wall__marker {
  position: absolute;
  font-family: var(--font-marker);
  font-size: 1.25rem;
  color: var(--color-ink);
  transform: rotate(-1.5deg);
  user-select: none;
}
.wall__marker--time {
  color: var(--color-time);
  transform: rotate(-1deg);
}

.wall__tape {
  position: absolute;
  width: 74px;
  height: 26px;
  background-color: rgb(214 197 160 / 0.72);
  box-shadow: inset 0 0 0 1px rgb(43 39 35 / 0.06);
}
.wall__tape--tl { left: -22px; top: 18px; transform: rotate(-42deg); }
.wall__tape--tr { right: -22px; top: 18px; transform: rotate(42deg); }
.wall__tape--bl { left: -22px; bottom: 18px; transform: rotate(42deg); }
.wall__tape--br { right: -22px; bottom: 18px; transform: rotate(-42deg); }

.wall__backlog {
  position: absolute;
  inset: 0;
  margin: 0;
  padding: 0;
  list-style: none;
}

.sticky {
  position: absolute;
  display: grid;
  place-items: center;
  padding: 10px;
  text-align: center;
  border-radius: 2px;
  background-color: var(--color-event);
  color: var(--color-event-ink);
  box-shadow: var(--shadow-sticky);
  transform: rotate(var(--tilt, 0deg));
}
.sticky[data-kind='actor'] { background-color: var(--color-pivotal); }
.sticky[data-kind='system'] { background-color: #e8dcc4; }

.sticky__label {
  font-family: var(--font-marker);
  font-size: 1.0625rem;
  font-weight: 700;
  line-height: 1.15;
  overflow-wrap: anywhere;
}

.sticky:focus-visible {
  outline: 2px solid var(--color-ink);
  outline-offset: 3px;
}

.sticky--fresh {
  animation: sticky-settle 0.9s var(--ease-flight);
}
@keyframes sticky-settle {
  0% {
    transform: rotate(var(--tilt, 0deg)) scale(1.08);
    box-shadow: 0 0 0 6px color-mix(in srgb, var(--color-event) 55%, transparent), var(--shadow-sticky);
  }
  100% {
    transform: rotate(var(--tilt, 0deg)) scale(1);
    box-shadow: 0 0 0 0 transparent, var(--shadow-sticky);
  }
}
</style>
