import { computed, ref, type Ref } from 'vue'
import { computeTimelineLayout } from '~/domain-model-capture/domain/timeline/compute-timeline-layout.ts'
import type { BoardSnapshot } from '../types.ts'

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
  }) as unknown as LayoutSnapshot

/**
 * Client-only board view state — hide-withdrawn and the derived timeline layout.
 * The board Pinia store holds the server projection; this module owns view filters.
 */
export const useBoardViewState = (snapshot: Ref<BoardSnapshot>) => {
  const showWithdrawn = ref(false)
  const timeline = computed(() =>
    computeTimelineLayout(toLayoutSnapshot(snapshot.value), {
      includeWithdrawn: showWithdrawn.value,
    }),
  )

  return { showWithdrawn, timeline }
}
