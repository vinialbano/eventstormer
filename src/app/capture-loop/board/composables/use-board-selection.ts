import { computed, ref, type ComputedRef, type Ref } from 'vue'
import type { TimelineLayout } from '~/domain-model-capture/domain/timeline/compute-timeline-layout.ts'
import type { BoardBlockInput } from '../layout.ts'
import { isEventKind } from '../semantic-edit.ts'

/** Selection state, placement eligibility, and toolbar action guards for the board wall. */
export const useBoardSelection = (
  blocks: Ref<BoardBlockInput[]>,
  timeline: ComputedRef<TimelineLayout>,
) => {
  const selectedId = ref<string | null>(null)
  const lastPlacedId = ref<string | null>(null)
  const withdrawAskId = ref<string | null>(null)

  const timelineEventIds = computed(
    () => new Set(timeline.value.tracks.flatMap((track) => track.eventIds.map(String))),
  )

  const selectSticky = (id: string): void => {
    selectedId.value = id
    if (withdrawAskId.value !== id) withdrawAskId.value = null
    const block = blocks.value.find((candidate) => candidate.id === id)
    if (block?.placement === 'timeline' || timelineEventIds.value.has(id)) lastPlacedId.value = id
  }

  const selectedBlock = computed(() => blocks.value.find((block) => block.id === selectedId.value))
  const selectedIsLiveEvent = computed(() => {
    const block = selectedBlock.value
    return block !== undefined && isEventKind(block.kind) && block.withdrawn !== true
  })
  const selectedOnTimeline = computed(() => {
    const id = selectedId.value
    if (id === null) return false
    return selectedBlock.value?.placement === 'timeline' || timelineEventIds.value.has(id)
  })
  const canPlace = computed(() => selectedIsLiveEvent.value && !selectedOnTimeline.value)
  const canUnplace = computed(() => selectedIsLiveEvent.value && selectedOnTimeline.value)
  const canSequenceAfter = computed(
    () => canPlace.value && lastPlacedId.value !== null && lastPlacedId.value !== selectedId.value,
  )
  const canMarkPivotal = computed(() => selectedIsLiveEvent.value && selectedBlock.value?.pivotal !== true)
  const canUnmarkPivotal = computed(() => selectedIsLiveEvent.value && selectedBlock.value?.pivotal === true)

  const showsActiveControls = (id: string, withdrawn: boolean, editingId: string | null): boolean =>
    selectedId.value === id && editingId !== id && !withdrawn
  const showsReinstate = (id: string, withdrawn: boolean): boolean => selectedId.value === id && withdrawn

  return {
    selectedId,
    lastPlacedId,
    withdrawAskId,
    timelineEventIds,
    selectSticky,
    selectedBlock,
    selectedOnTimeline,
    canPlace,
    canUnplace,
    canSequenceAfter,
    canMarkPivotal,
    canUnmarkPivotal,
    showsActiveControls,
    showsReinstate,
  }
}
