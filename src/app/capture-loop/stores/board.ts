import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getJson, HttpError } from '../client.ts'
import type { BoardSnapshot } from '../types.ts'

const EMPTY: BoardSnapshot = { position: -1, blocks: [] }

/**
 * The `board` store — cold-loads from `/workshops/:id/board` (ADR-007). The
 * board stream 404s until the first operation is applied, so an empty board is
 * a normal state, not an error. Refetched only after an accept resolves — never
 * optimistically (the wall is server-confirmed).
 */
export const useBoardStore = defineStore('board', () => {
  const workshopId = ref<string | null>(null)
  const snapshot = ref<BoardSnapshot>(EMPTY)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const refetch = async (): Promise<void> => {
    if (workshopId.value === null) return
    loading.value = true
    try {
      snapshot.value = await getJson<BoardSnapshot>(`/api/workshops/${workshopId.value}/board`)
      error.value = null
    } catch (e) {
      if (e instanceof HttpError && e.status === 404) {
        snapshot.value = EMPTY
        error.value = null
      } else {
        error.value = e instanceof Error ? e.message : 'load failed'
      }
    } finally {
      loading.value = false
    }
  }

  const load = async (id: string): Promise<void> => {
    workshopId.value = id
    await refetch()
  }

  return { workshopId, snapshot, loading, error, load, refetch }
})
