<script setup lang="ts">
import { ref } from 'vue'

/**
 * The contribution composer. Always enabled — during a provider outage it still
 * accepts contributions and shows a quiet "catching up" line, never an error
 * state (S1-55). Enter sends; Shift+Enter is a newline.
 */
const props = defineProps<{ catchingUp?: boolean; sending?: boolean }>()
const emit = defineEmits<{ submit: [text: string] }>()

const text = ref('')

const send = (): void => {
  const value = text.value.trim()
  if (value.length === 0 || props.sending) return
  emit('submit', value)
  text.value = ''
}
</script>

<template>
  <div class="composer">
    <p v-if="catchingUp" class="composer__note" role="status">Catching up…</p>
    <div class="composer__row">
      <textarea
        v-model="text"
        class="composer__field"
        rows="1"
        placeholder="Describe what happens…"
        aria-label="Describe what happens"
        @keydown.enter.exact.prevent="send"
      />
      <button
        type="button"
        class="composer__send"
        :disabled="text.trim().length === 0 || sending"
        aria-label="Send"
        @click="send"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path d="M4 12L20 4l-4 16-4-7-8-1z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.composer {
  border-top: 1px solid var(--color-line);
  padding-top: 10px;
}
.composer__note {
  margin: 0 0 6px;
  font-size: 0.75rem;
  color: var(--color-text-soft);
}
.composer__row {
  display: flex;
  gap: 8px;
  align-items: flex-end;
}
.composer__field {
  flex: 1;
  font: inherit;
  font-size: 0.9375rem;
  resize: none;
  min-height: 40px;
  max-height: 140px;
  padding: 9px 12px;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-control);
  background-color: var(--color-surface-sunk);
}
.composer__field:focus-visible {
  border-color: var(--color-event-strong);
}
.composer__send {
  flex: none;
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border: none;
  border-radius: var(--radius-control);
  background-color: var(--color-event);
  color: var(--color-event-ink);
  cursor: pointer;
}
.composer__send:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
