<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { postJson } from '../client.ts'

/**
 * The one field that stands between a person and a workshop: their display
 * name. It becomes the segment speaker, the proposal accepter, and the human
 * half of every applied operation's author.
 */
const router = useRouter()
const name = ref('')
const busy = ref(false)
const error = ref<string | null>(null)

const create = async (): Promise<void> => {
  const creatorName = name.value.trim()
  if (creatorName.length === 0 || busy.value) return
  busy.value = true
  error.value = null
  try {
    const { workshopId } = await postJson<{ workshopId: string; url: string }>('/api/workshops', {
      creatorName,
    })
    await router.push(`/workshops/${workshopId}`)
  } catch {
    error.value = 'Could not start the workshop. Try again.'
    busy.value = false
  }
}
</script>

<template>
  <main class="create">
    <form class="create__card" @submit.prevent="create">
      <h1 class="create__title">Start a workshop</h1>
      <p class="create__sub">
        You’ll describe how your business works, one piece at a time, and watch the model take shape.
      </p>
      <label class="create__label" for="creator-name">Your name</label>
      <input
        id="creator-name"
        v-model="name"
        class="create__input"
        type="text"
        autocomplete="name"
        maxlength="80"
        placeholder="e.g. Maria"
      >
      <button class="create__go" type="submit" :disabled="name.trim().length === 0 || busy">
        {{ busy ? 'Starting…' : 'Start workshop' }}
      </button>
      <p v-if="error" class="create__error" role="alert">{{ error }}</p>
    </form>
  </main>
</template>

<style scoped>
.create {
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: 24px;
  background-color: var(--color-paper);
}
.create__card {
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  background-color: var(--color-surface);
  border-radius: var(--radius-panel);
  box-shadow: var(--shadow-panel);
  padding: 28px;
}
.create__title {
  margin: 0 0 6px;
  font-family: var(--font-ui);
  font-size: 1.75rem;
  font-weight: 800;
}
.create__sub {
  margin: 0 0 20px;
  font-size: 0.9375rem;
  line-height: 1.5;
  color: var(--color-text-soft);
}
.create__label {
  font-size: 0.8125rem;
  font-weight: 700;
  margin-bottom: 6px;
}
.create__input {
  font: inherit;
  font-size: 1rem;
  padding: 10px 12px;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-control);
  background-color: var(--color-surface-sunk);
  margin-bottom: 16px;
}
.create__input:focus-visible {
  border-color: var(--color-event-strong);
}
.create__go {
  font: inherit;
  font-size: 0.9375rem;
  font-weight: 700;
  height: 42px;
  border: none;
  border-radius: var(--radius-control);
  background-color: var(--color-event);
  color: var(--color-event-ink);
  cursor: pointer;
}
.create__go:hover:not(:disabled) {
  background-color: var(--color-event-strong);
  color: var(--color-event-ink);
}
.create__go:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.create__error {
  margin: 12px 0 0;
  font-size: 0.8125rem;
  color: var(--color-danger);
}
</style>
