import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getJson } from '../client.ts'
import type { SessionView } from '../types.ts'

/**
 * The `session` store — cold-loads from the single GET `/workshops/:id/session`
 * (docs/adr/007: one store, one GET, no store imports another). `refetch` is what the
 * short-poll and every post-mutation refresh call.
 */
export const useSessionStore = defineStore('session', () => {
  const workshopId = ref<string | null>(null)
  const view = ref<SessionView | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const scopeStatus = computed(() => view.value?.scope.status ?? 'none')
  const sessionId = computed(() => view.value?.sessionId ?? null)
  const sessionOpen = computed(() => view.value?.sessionOpen ?? false)
  const creatorName = computed(() => view.value?.creatorName ?? '')

  const refetch = async (): Promise<void> => {
    if (workshopId.value === null) return
    loading.value = true
    try {
      view.value = await getJson<SessionView>(`/api/workshops/${workshopId.value}/session`)
      error.value = null
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'load failed'
    } finally {
      loading.value = false
    }
  }

  const load = async (id: string): Promise<void> => {
    workshopId.value = id
    await refetch()
  }

  return {
    workshopId,
    view,
    loading,
    error,
    scopeStatus,
    sessionId,
    sessionOpen,
    creatorName,
    load,
    refetch,
  }
})
