<script setup lang="ts">
/**
 * Decorative wall chrome — ink frame, time guide, corner tape, section markers.
 */

defineProps<{
  canvasW: number
  canvasH: number
  frameX: number
  frameY: number
  frameW: number
  frameH: number
  timeGuideX1: number
  timeGuideY1: number
  timeGuideX2: number
  timeGuideY2: number
}>()
</script>

<template>
  <svg
    class="wall__ink"
    :viewBox="`0 0 ${canvasW} ${canvasH}`"
    :width="canvasW"
    :height="canvasH"
    aria-hidden="true"
    preserveAspectRatio="none"
  >
    <defs>
      <filter id="wall-rough" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="2" seed="7" result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale="3.4" xChannelSelector="R" yChannelSelector="G" />
      </filter>
      <marker id="time-head" viewBox="0 0 12 12" refX="9" refY="6" markerWidth="9" markerHeight="9" orient="auto">
        <path
          d="M1 1 L10 6 L1 11"
          fill="none"
          stroke="var(--color-time)"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </marker>
    </defs>

    <g filter="url(#wall-rough)">
      <rect
        :x="16"
        :y="16"
        :width="canvasW - 32"
        :height="canvasH - 32"
        rx="10"
        fill="none"
        stroke="var(--color-ink)"
        stroke-width="3"
      />
      <rect
        :x="frameX"
        :y="frameY"
        :width="frameW"
        :height="frameH"
        rx="12"
        fill="var(--color-paper-edge)"
        fill-opacity="0.55"
        stroke="var(--color-ink)"
        stroke-width="2"
        stroke-dasharray="2 7"
        stroke-linecap="round"
      />
      <line
        :x1="timeGuideX1"
        :y1="timeGuideY1"
        :x2="timeGuideX2"
        :y2="timeGuideY2"
        stroke="var(--color-time)"
        stroke-width="3"
        stroke-linecap="round"
        marker-end="url(#time-head)"
      />
    </g>
  </svg>

  <span class="wall__marker" :style="{ left: `${frameX + 14}px`, top: `${frameY + 2}px` }">
    backlog
  </span>
  <span
    class="wall__marker wall__marker--time"
    :style="{ left: `${timeGuideX1}px`, top: `${timeGuideY1 - 34}px` }"
  >
    time
  </span>

  <span aria-hidden="true" class="wall__tape wall__tape--tl" />
  <span aria-hidden="true" class="wall__tape wall__tape--tr" />
  <span aria-hidden="true" class="wall__tape wall__tape--bl" />
  <span aria-hidden="true" class="wall__tape wall__tape--br" />
</template>

<style scoped>
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
</style>
