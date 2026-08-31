<script setup lang="ts">
import { PopoverAnchor, PopoverContent, PopoverPortal, PopoverRoot } from 'reka-ui'
import { ref, watch } from 'vue'
import { getJson } from '../client.ts'
import { postBoardOperation } from '../dock/mutations.ts'

interface ReferenceSite {
  kind: string
  path: string
}

const props = defineProps<{
  open: boolean
  workshopId: string
  blockId: string
  label: string
  revision: number
  accepter: string
}>()

const emit = defineEmits<{
  'update:open': [open: boolean]
  confirmed: []
  cancel: []
}>()

const sites = ref<ReferenceSite[]>([])
const loadError = ref(false)
const posting = ref(false)

const siteLine = (site: ReferenceSite): string =>
  site.path === 'building-blocks' ? 'Readable account · Building blocks' : site.path

const loadReferences = async (): Promise<void> => {
  loadError.value = false
  try {
    sites.value = await getJson<ReferenceSite[]>(
      `/api/workshops/${props.workshopId}/board/blocks/${props.blockId}/references`,
    )
  } catch {
    loadError.value = true
    sites.value = []
  }
}

watch(
  () => [props.open, props.revision, props.blockId] as const,
  ([isOpen]) => {
    if (isOpen) void loadReferences()
  },
  { immediate: true },
)

const close = (): void => {
  emit('update:open', false)
  emit('cancel')
}

const onOpenChange = (next: boolean): void => {
  if (!next) close()
}

const confirm = async (): Promise<void> => {
  if (loadError.value || posting.value) return
  posting.value = true
  try {
    await postBoardOperation(props.workshopId, {
      v: 1,
      kind: 'reword',
      target: props.blockId,
      label: props.label,
      author: { accepter: { name: props.accepter } },
    })
    emit('confirmed')
    emit('update:open', false)
  } finally {
    posting.value = false
  }
}
</script>

<template>
  <PopoverRoot :open="open" @update:open="onOpenChange">
    <PopoverAnchor as-child>
      <span class="reword-anchor" />
    </PopoverAnchor>
    <PopoverPortal>
      <PopoverContent
        class="reword-pop"
        :side-offset="10"
        :force-mount="open"
        @open-auto-focus.prevent
        @interact-outside.prevent
      >
        <div aria-label="Reword impact" role="dialog">
          <p class="reword-pop__lead">This name appears in:</p>
          <p v-if="loadError" class="reword-pop__error">
            Couldn't list where this appears — retry or cancel.
          </p>
          <ul v-else class="reword-pop__sites">
            <li v-for="(site, index) in sites" :key="`${site.path}-${String(index)}`">
              {{ siteLine(site) }}
            </li>
          </ul>
          <div class="reword-pop__actions">
            <button
              v-if="loadError"
              type="button"
              class="reword-pop__btn reword-pop__btn--quiet"
              @click="loadReferences"
            >
              Retry
            </button>
            <button
              v-else
              type="button"
              class="reword-pop__btn reword-pop__btn--go"
              :disabled="posting"
              @click="confirm"
            >
              Confirm reword
            </button>
            <button type="button" class="reword-pop__btn reword-pop__btn--quiet" @click="close">
              Cancel
            </button>
          </div>
        </div>
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>

<style scoped>
.reword-anchor {
  position: absolute;
  inset: auto 0 0 0;
  height: 1px;
  pointer-events: none;
}
.reword-pop {
  z-index: 40;
  width: min(320px, calc(100vw - 32px));
  padding: 14px 16px;
  border-radius: var(--radius-card);
  background-color: var(--color-surface);
  color: var(--color-text);
  box-shadow: var(--shadow-panel);
  font-family: var(--font-ui);
  font-size: 0.875rem;
}
.reword-pop__lead {
  margin: 0 0 8px;
  font-weight: 700;
}
.reword-pop__error {
  margin: 0 0 12px;
  color: var(--color-danger);
}
.reword-pop__sites {
  margin: 0 0 12px;
  padding-left: 1.1em;
}
.reword-pop__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.reword-pop__btn {
  font: inherit;
  font-weight: 700;
  height: 36px;
  padding: 0 14px;
  border-radius: var(--radius-control);
  cursor: pointer;
}
.reword-pop__btn--go {
  border: none;
  background-color: var(--color-event);
  color: var(--color-event-ink);
}
.reword-pop__btn--quiet {
  border: 1px solid var(--color-line);
  background-color: var(--color-surface);
  color: var(--color-text);
}
.reword-pop__btn:focus-visible {
  outline: 2px solid var(--color-event-strong);
  outline-offset: 2px;
}
.reword-pop__btn:disabled {
  opacity: 0.5;
}
</style>
