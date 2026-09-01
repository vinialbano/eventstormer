import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { computeTimelineLayout } from '~/domain-model-capture/domain/timeline/compute-timeline-layout.ts'
import { getJson, HttpError } from '../client.ts'
import type { BoardSnapshot } from '../types.ts'

const EMPTY: BoardSnapshot = { position: -1, blocks: [], follows: [], causedBy: [] }

type LayoutSnapshot = Parameters<typeof computeTimelineLayout>[0]

const toLayoutSnapshot = (http: BoardSnapshot): LayoutSnapshot =>
  ({
    position: http.position,
    follows: http.follows,
    causedBy: http.causedBy,
    blocks: new Map(
      http.blocks.map((block) => [
        block.id,
        {
          kind: block.kind,
          label: block.label,
          withdrawn: block.withdrawn,
          placement: block.placement,
          pivotal: block.pivotal,
          provenance: block.provenance ?? { accepter: { name: '_' } },
        },
      ]),
    ),
  }) as LayoutSnapshot

/**
 * The `board` store — cold-loads from `/workshops/:id/board` (ADR-007). The
 * board stream 404s until the first operation is applied, so an empty board is
 * a normal state, not an error. Refetched only after an accept resolves — never
 * optimistically (the wall is server-confirmed). Hide-withdrawn is a local view
 * filter: toggling it recomputes ranks from the published snapshot and does
 * not fetch.
 */
export const useBoardStore = defineStore('board', () => {
  const workshopId = ref<string | null>(null)
  const snapshot = ref<BoardSnapshot>(EMPTY)
  const showWithdrawn = ref(false)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const timeline = computed(() =>
    computeTimelineLayout(toLayoutSnapshot(snapshot.value), {
      includeWithdrawn: showWithdrawn.value,
    }),
  )

  const refetch = async (): Promise<void> => {
    if (workshopId.value === null) return
    loading.value = true
    try {
      snapshot.value = await getJson<BoardSnapshot>(`/api/workshops/${workshopId.value}/board`)
      error.value = null
    } catch (caught) {
      if (caught instanceof HttpError && caught.status === 404) {
        snapshot.value = EMPTY
        error.value = null
      } else {
        error.value = caught instanceof Error ? caught.message : 'load failed'
      }
    } finally {
      loading.value = false
    }
  }

  const load = async (id: string): Promise<void> => {
    workshopId.value = id
    await refetch()
  }

  return { workshopId, snapshot, showWithdrawn, timeline, loading, error, load, refetch }
})
