import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchProposals } from '../transport/proposals.ts'
import type { ProposalCard } from '../types.ts'

/**
 * The `proposals` store — cold-loads from `/sessions/:id/proposals` (ADR-007).
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
      const body = await fetchProposals(sessionId.value)
      cards.value = body.proposals
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
