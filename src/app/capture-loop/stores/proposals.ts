import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getJson } from '../client.ts'
import type { ProposalCard } from '../types.ts'

/**
 * The `proposals` store — cold-loads from `/sessions/:id/proposals` (docs/adr/007).
 * Keyed by the open session id. No import of the `session` or `board` store.
 */
export const useProposalsStore = defineStore('proposals', () => {
  const sessionId = ref<string | null>(null)
  const cards = ref<ProposalCard[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const refetch = async (): Promise<void> => {
    if (sessionId.value === null) return
    loading.value = true
    try {
      const body = await getJson<{ proposals: ProposalCard[] }>(
        `/api/sessions/${sessionId.value}/proposals`,
      )
      cards.value = body.proposals
      error.value = null
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'load failed'
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
