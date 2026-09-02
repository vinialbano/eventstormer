import { describe, expect, it } from 'vitest'
import { computed, ref } from 'vue'
import type { TimelineLayout } from '~/domain-model-capture/domain/timeline/compute-timeline-layout.ts'
import { useSelectBlock, type SelectBlockView } from './use-select-block.ts'

const asTimeline = (layout: {
  tracks: { eventIds: string[]; ranks: Record<string, number> }[]
}): TimelineLayout =>
  ({
    tracks: layout.tracks,
    edges: [],
    attachments: {},
    pivotal: [],
  }) as unknown as TimelineLayout

const mountSelect = (
  blocks: SelectBlockView[],
  timelineTracks: { eventIds: string[]; ranks: Record<string, number> }[] = [],
) => {
  const blocksReference = ref(blocks)
  const timeline = computed(() => asTimeline({ tracks: timelineTracks }))
  return useSelectBlock(blocksReference, timeline)
}

// Suite: use-select-block
// Invariant: Selection guards and toolbar visibility follow event kind, placement, withdrawal, and last-placed state.
// Boundary IN: canPlace / canUnplace / canSequenceAfter, selectSticky lastPlacedId, showsActiveControls / showsReinstate.
// Boundary OUT: HTTP edits and wall gestures (BoardWall.drop.test.ts).

describe('useSelectBlock', () => {
  const blocks: SelectBlockView[] = [
    { id: 'eA', kind: 'domain-event', placement: 'timeline' },
    { id: 'eB', kind: 'domain-event', placement: 'backlog' },
    { id: 'a1', kind: 'actor', placement: 'backlog' },
    { id: 'w1', kind: 'domain-event', placement: 'backlog', withdrawn: true },
  ]

  it('canPlace only for live events not already on the timeline', () => {
    const select = mountSelect(blocks, [{ eventIds: ['eA'], ranks: { eA: 0 } }])

    select.selectSticky('eB')
    expect(select.canPlace.value).toBe(true)

    select.selectSticky('eA')
    expect(select.canPlace.value).toBe(false)

    select.selectSticky('a1')
    expect(select.canPlace.value).toBe(false)

    select.selectSticky('w1')
    expect(select.canPlace.value).toBe(false)
  })

  it('canUnplace only for live events on the timeline', () => {
    const select = mountSelect(blocks, [{ eventIds: ['eA'], ranks: { eA: 0 } }])

    select.selectSticky('eA')
    expect(select.canUnplace.value).toBe(true)

    select.selectSticky('eB')
    expect(select.canUnplace.value).toBe(false)

    select.selectSticky('a1')
    expect(select.canUnplace.value).toBe(false)

    select.selectSticky('w1')
    expect(select.canUnplace.value).toBe(false)
  })

  it('canSequenceAfter when a backlog event can place after a different last-placed timeline event', () => {
    const select = mountSelect(blocks, [{ eventIds: ['eA'], ranks: { eA: 0 } }])

    select.selectSticky('eA')
    select.selectSticky('eB')
    expect(select.canSequenceAfter.value).toBe(true)

    select.selectSticky('eA')
    expect(select.canSequenceAfter.value).toBe(false)

    select.lastPlacedId.value = null
    select.selectSticky('eB')
    expect(select.canSequenceAfter.value).toBe(false)
  })

  it('selectSticky updates lastPlacedId when the block is on the timeline', () => {
    const select = mountSelect(blocks, [{ eventIds: ['eA'], ranks: { eA: 0 } }])

    select.selectSticky('eB')
    expect(select.lastPlacedId.value).toBeNull()

    select.selectSticky('eA')
    expect(select.lastPlacedId.value).toBe('eA')
  })

  it('showsActiveControls for a selected live block that is not being edited', () => {
    const select = mountSelect(blocks)

    select.selectSticky('eB')
    expect(select.showsActiveControls('eB', false, null)).toBe(true)
    expect(select.showsActiveControls('eB', false, 'eB')).toBe(false)
    expect(select.showsActiveControls('eB', true, null)).toBe(false)
    expect(select.showsActiveControls('eA', false, null)).toBe(false)
  })

  it('showsReinstate only for a selected withdrawn block', () => {
    const select = mountSelect(blocks)

    select.selectSticky('w1')
    expect(select.showsReinstate('w1', true)).toBe(true)
    expect(select.showsReinstate('eB', false)).toBe(false)
    expect(select.showsReinstate('w1', false)).toBe(false)
  })
})
