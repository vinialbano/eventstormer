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
const loading = ref(false)
const loaded = ref(false)
const posting = ref(false)

const siteLine = (site: ReferenceSite): string =>
  site.path === 'building-blocks' ? 'Readable account · Building blocks' : site.path

const loadReferences = async (): Promise<void> => {
  loading.value = true
  loaded.value = false
  loadError.value = false
  try {
    sites.value = await getJson<ReferenceSite[]>(
      `/api/workshops/${props.workshopId}/board/blocks/${props.blockId}/references`,
    )
    loaded.value = true
  } catch {
    loadError.value = true
    loaded.value = false
    sites.value = []
  } finally {
    loading.value = false
  }
}

const ensurePortal = (): void => {
  if (document.querySelector('#reword-portal') !== null) return
  const host = document.createElement('div')
  host.id = 'reword-portal'
  document.body.append(host)
}

ensurePortal()

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
  if (loadError.value || posting.value || loading.value || !loaded.value) return
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
    <PopoverPortal to="#reword-portal">
      <PopoverContent
        class="reword-pop"
        :side-offset="10"
        :force-mount="open"
        @open-auto-focus.prevent
        @interact-outside.prevent
      >
        <div aria-label="Reword impact" class="reword-impact" role="dialog">
          <p class="reword-impact__lead">This name appears in:</p>
          <p v-if="loadError" class="reword-impact__error">
            Couldn't list where this appears — retry or cancel.
          </p>
          <ul v-else class="reword-impact__sites">
            <li
              v-for="(site, index) in sites"
              :key="`${site.path}-${String(index)}`"
              class="reword-impact__site"
            >
              {{ siteLine(site) }}
            </li>
          </ul>
          <div class="reword-impact__actions">
            <button
              v-if="loadError"
              type="button"
              class="reword-impact__btn reword-impact__btn--quiet"
              @click="loadReferences"
            >
              Retry
            </button>
            <button
              v-else
              type="button"
              class="reword-impact__btn reword-impact__btn--go"
              :disabled="posting || loading || !loaded"
              @click="confirm"
            >
              Confirm reword
            </button>
            <button type="button" class="reword-impact__btn reword-impact__btn--quiet" @click="close">
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
:deep(.reword-pop) {
  padding: 0;
  background: transparent;
  box-shadow: none;
  border: none;
}
.reword-impact {
  box-sizing: border-box;
  width: min(300px, calc(100vw - 32px));
  padding: 12px 14px;
  border: 1px solid var(--color-paper-edge);
  border-radius: var(--radius-card);
  background-color: var(--color-surface);
  color: var(--color-text);
  box-shadow: var(--shadow-panel);
  font-family: var(--font-ui);
  font-size: 0.8125rem;
  line-height: 1.4;
}
.reword-impact__lead {
  margin: 0 0 6px;
  font-weight: 700;
}
.reword-impact__error {
  margin: 0 0 10px;
  color: var(--color-danger);
}
.reword-impact__sites {
  display: grid;
  gap: 4px;
  margin: 0 0 10px;
  padding: 0;
  list-style: none;
}
.reword-impact__site {
  padding: 6px 8px;
  border-radius: 8px;
  background-color: var(--color-surface-sunk);
}
.reword-impact__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.reword-impact__btn {
  font: inherit;
  font-weight: 700;
  height: 32px;
  padding: 0 12px;
  border-radius: var(--radius-control);
  cursor: pointer;
}
.reword-impact__btn--go {
  border: none;
  background-color: var(--color-event);
  color: var(--color-event-ink);
}
.reword-impact__btn--quiet {
  border: 1px solid var(--color-line);
  background-color: var(--color-surface);
  color: var(--color-text);
}
.reword-impact__btn:focus-visible {
  outline: 2px solid var(--color-event-strong);
  outline-offset: 2px;
}
.reword-impact__btn:disabled {
  opacity: 0.5;
}
</style>
