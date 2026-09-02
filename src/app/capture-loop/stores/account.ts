import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { renderAccountHtml } from '../account/render-account-html.ts'
import { fetchReadableAccount } from '../transport/account.ts'
import type { AccountSnapshot } from '../types.ts'

/**
 * The `account` store — cold-loads from `/workshops/:id/readable-account`
 * (ADR-007). A known workshop with an empty board is 200 with empty-state
 * markdown, not 404. Unknown workshop is 404 and an error. No import of a
 * sibling store.
 */
export const useAccountStore = defineStore('account', () => {
  const workshopId = ref<string | null>(null)
  const document = ref<AccountSnapshot | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const html = computed(() => (document.value === null ? '' : renderAccountHtml(document.value.markdown)))

  const refetch = async (): Promise<void> => {
    if (workshopId.value === null) return
    loading.value = true
    try {
      document.value = await fetchReadableAccount(workshopId.value)
      error.value = null
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : 'load failed'
    } finally {
      loading.value = false
    }
  }

  const load = async (id: string): Promise<void> => {
    workshopId.value = id
    await refetch()
  }

  return { workshopId, document, html, loading, error, load, refetch }
})
