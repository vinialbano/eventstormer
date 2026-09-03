import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchResolutions } from '../transport/resolutions.ts'
import type { ResolutionCard } from '../types.ts'

/**
 * The `resolutions` store — cold-loads from `/sessions/:id/resolutions`
 * (ADR-007). Keyed by the open session id. No import of the `session`,
 * `proposals`, or `board` store.
 */
export const useResolutionsStore = defineStore('resolutions', () => {
  const sessionId = ref<string | null>(null)
  const cards = ref<ResolutionCard[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const refetch = async (): Promise<void> => {
    if (sessionId.value === null) return
    loading.value = true
    try {
      const body = await fetchResolutions(sessionId.value)
      cards.value = body.resolutions
      error.value = null
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : 'load failed'
    } finally {
      loading.value = false
    }
  }

  const load = async (id: string): Promise<void> => {
    sessionId.value = id
    await refetch()
  }

  return { sessionId, cards, loading, error, load, refetch }
})
