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

interface HotSpotCallout {
  hotSpotId: string
  label: string
  modelAffecting: boolean
  resolved: boolean
  /** The recorded resolution reference — a string once resolved, else `null`. */
  reference: string | null
}

interface HotSpotView {
  /** Callouts keyed by the building-block id each hot spot annotates. */
  annotated: Map<string, HotSpotCallout[]>
  /** Hot spots that annotate nothing — rendered as a list, not an error. */
  unannotated: HotSpotCallout[]
  count: number
}

const calloutOf = (block: BoardSnapshot['blocks'][number]): HotSpotCallout => ({
  hotSpotId: block.id,
  label: block.label,
  modelAffecting: block.modelAffecting ?? true,
  resolved: block.resolved ?? false,
  reference: typeof block.reference === 'string' ? block.reference : null,
})

const deriveHotSpots = (snapshot: BoardSnapshot): HotSpotView => {
  const annotated = new Map<string, HotSpotCallout[]>()
  const unannotated: HotSpotCallout[] = []
  for (const block of snapshot.blocks) {
    if (block.kind !== 'hot-spot' || block.withdrawn) continue
    const callout = calloutOf(block)
    const target = typeof block.annotates === 'string' ? block.annotates : null
    if (target === null) {
      unannotated.push(callout)
      continue
    }
    const list = annotated.get(target) ?? []
    list.push(callout)
    annotated.set(target, list)
  }
  return { annotated, unannotated, count: snapshot.hotSpotCount }
}

/**
 * Client-only board view state — hide-withdrawn, the derived timeline layout,
 * and the hot-spot callout / list / count derivation. The board Pinia store
 * holds the server projection; this module owns view filters.
 */
export const useBoardViewState = (snapshot: Ref<BoardSnapshot>) => {
  const showWithdrawn = ref(false)
  const timeline = computed(() =>
    computeTimelineLayout(toLayoutSnapshot(snapshot.value), {
      includeWithdrawn: showWithdrawn.value,
    }),
  )
  const hotSpots = computed(() => deriveHotSpots(snapshot.value))

  return { showWithdrawn, timeline, hotSpots }
}
