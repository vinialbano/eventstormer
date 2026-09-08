<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { renderArtifactMarkdown } from './render-artifact-markdown.ts'
import { useReducedMotion } from '../composables/use-reduced-motion.ts'
import { useArtifactsStore } from '../../stores/artifacts.ts'
import type { ArtifactKind } from '../../types.ts'

/**
 * Right-edge live artifacts drawer — sibling of the readable-account drawer. A
 * segmented control picks one of the three derived artifacts; the store fetches
 * it and re-fetches on every applied operation (`board-dirty`). The body shows
 * the current bytes (pretty JSON in a code block, Markdown → sanitised HTML) and
 * the Download action produces the stamped file from the bytes on screen — the
 * panel never transforms artifact bytes.
 */
const artifacts = useArtifactsStore()
const reduced = useReducedMotion()

const segments: { kind: ArtifactKind; label: string }[] = [
  { kind: 'model', label: 'JSON' },
  { kind: 'summary', label: 'Summary' },
  { kind: 'transcript', label: 'Transcript' },
]
const segmentLabel = computed(
  () => segments.find((segment) => segment.kind === artifacts.selected)?.label ?? '',
)

const stampLine = computed(() => {
  const { boardPosition, sessionRecordPosition } = artifacts.stamp
  if (boardPosition === null) return '—'
  const board = `Board position ${String(boardPosition)}`
  return sessionRecordPosition === null
    ? board
    : `${board} · session record ${String(sessionRecordPosition)}`
})

const bodyHtml = ref<HTMLElement | null>(null)
const markdownHtml = computed(() =>
  artifacts.selected === 'model' ? '' : renderArtifactMarkdown(artifacts.body),
)
watch([markdownHtml, bodyHtml], () => {
  if (bodyHtml.value !== null) bodyHtml.value.innerHTML = markdownHtml.value
})

const showBody = computed(
  () =>
    !artifacts.transcriptUnavailable &&
    artifacts.error === null &&
    (artifacts.body.length > 0 || artifacts.catchingUp),
)

const select = (kind: ArtifactKind): Promise<void> => artifacts.select(kind)

const onSegmentKey = (event: KeyboardEvent, index: number): void => {
  const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0
  if (step === 0) return
  event.preventDefault()
  const next = segments[(index + step + segments.length) % segments.length]
  if (next === undefined) return
  void select(next.kind)
  void nextTick(() => {
    const group = (event.currentTarget as HTMLElement).parentElement
    group?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus()
  })
}

const triggerDownload = (): void => {
  const file = artifacts.download
  if (file === null) return
  const url = URL.createObjectURL(new Blob([file.contents], { type: file.mime }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = file.filename
  anchor.rel = 'noopener'
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <aside
    class="artifacts"
    :class="{ 'artifacts--reduced': reduced }"
    role="region"
    aria-labelledby="artifacts-title"
  >
    <h2 id="artifacts-title" class="artifacts__title">Artifacts</h2>

    <div class="artifacts__segments" role="radiogroup" aria-label="Artifact">
      <button
        v-for="(segment, index) in segments"
        :key="segment.kind"
        type="button"
        class="artifacts__segment"
        role="radio"
        :aria-checked="artifacts.selected === segment.kind"
        :tabindex="artifacts.selected === segment.kind ? 0 : -1"
        @click="select(segment.kind)"
        @keydown="onSegmentKey($event, index)"
      >
        {{ segment.label }}
      </button>
    </div>

    <p class="artifacts__stamp">{{ stampLine }}</p>

    <button
      type="button"
      class="artifacts__download"
      :disabled="artifacts.download === null"
      @click="triggerDownload"
    >
      Download
    </button>

    <p v-if="artifacts.catchingUp" class="artifacts__note" role="status">Catching up…</p>

    <div
      v-if="artifacts.transcriptUnavailable"
      class="artifacts__message"
    >
      The transcript covers one session. Start a session to see it.
    </div>
    <div v-else-if="artifacts.error !== null" class="artifacts__message" role="status">
      Couldn’t load this artifact.
      <button type="button" class="artifacts__retry" @click="artifacts.refetch()">Try again</button>
    </div>
    <p v-else-if="!showBody" class="artifacts__message">Loading…</p>
    <pre
      v-else-if="artifacts.selected === 'model'"
      class="artifacts__code"
      tabindex="0"
      :aria-label="`${segmentLabel} export`"
    >{{ artifacts.body }}</pre>
    <div
      v-else
      ref="bodyHtml"
      class="artifacts__body"
      tabindex="0"
      :aria-label="`${segmentLabel} export`"
    />
  </aside>
</template>

<style scoped>
.artifacts {
  position: fixed;
  top: 16px;
  right: 16px;
  bottom: 16px;
  z-index: 15;
  width: min(380px, calc(100vw - 32px));
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
  padding: 20px 22px;
  border-radius: var(--radius-panel);
  background-color: var(--color-surface);
  box-shadow: var(--shadow-panel);
  font-family: var(--font-ui);
  color: var(--color-text);
}
.artifacts__title {
  margin: 0 36px 0 0;
  font-size: 1.125rem;
  font-weight: 800;
}
.artifacts__segments {
  display: flex;
  gap: 4px;
  padding: 3px;
  border-radius: var(--radius-control);
  background-color: var(--color-surface-sunk);
}
.artifacts__segment {
  flex: 1;
  height: 32px;
  border: none;
  border-radius: 7px;
  background-color: transparent;
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--color-text-soft);
  cursor: pointer;
}
.artifacts__segment[aria-checked='true'] {
  background-color: var(--color-surface);
  color: var(--color-text);
  box-shadow: inset 0 0 0 1px var(--color-line), 0 0 0 2px transparent;
}
.artifacts__segment[aria-checked='true']::after {
  content: '';
  display: block;
  height: 2px;
  margin: 4px 8px 0;
  border-radius: 1px;
  background-color: var(--color-event);
}
.artifacts__segment:focus-visible {
  outline: 2px solid var(--color-event-strong);
  outline-offset: 2px;
}
.artifacts__stamp {
  margin: 0;
  font-size: 0.75rem;
  color: var(--color-text-soft);
}
.artifacts__download {
  align-self: flex-start;
  height: 32px;
  padding: 0 14px;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-control);
  background-color: var(--color-surface);
  font: inherit;
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--color-text);
  cursor: pointer;
}
.artifacts__download:disabled {
  opacity: 0.5;
  cursor: default;
}
.artifacts__download:focus-visible,
.artifacts__retry:focus-visible {
  outline: 2px solid var(--color-event-strong);
  outline-offset: 2px;
}
.artifacts__note {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--color-text-soft);
}
.artifacts__message {
  margin: 0;
  font-size: 0.9375rem;
  color: var(--color-text-soft);
}
.artifacts__retry {
  margin-left: 6px;
  border: none;
  background: none;
  font: inherit;
  font-weight: 700;
  color: var(--color-event-strong);
  cursor: pointer;
  text-decoration: underline;
}
.artifacts__code,
.artifacts__body {
  flex: 1;
  overflow: auto;
  margin: 0;
  transition: opacity 120ms ease;
}
.artifacts--reduced .artifacts__code,
.artifacts--reduced .artifacts__body {
  transition: none;
}
.artifacts__code {
  padding: 12px;
  border-radius: var(--radius-control);
  background-color: var(--color-surface-sunk);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.8125rem;
  line-height: 1.4;
  white-space: pre;
}
.artifacts__body {
  font-size: 0.9375rem;
  line-height: 1.45;
}
.artifacts__body :deep(h1) {
  font-size: 1rem;
  margin: 0 0 8px;
}
.artifacts__body :deep(h2) {
  margin: 18px 0 8px;
  font-size: 0.9375rem;
  font-weight: 700;
}
</style>
