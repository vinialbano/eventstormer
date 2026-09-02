import { describe, expect, it } from 'vitest'
import type { BuildingBlockId } from '~/plumbing/ids.ts'
import {
  emptySnapshot,
  emptyWriteModel,
  type BuildingBlockKind,
  type SnapshotBlock,
  type WriteBlock,
} from './model.ts'

const bid = (value: string): BuildingBlockId => value as BuildingBlockId

describe('Board model', () => {
  it('emptyWriteModel has empty blocks, follows, and causedBy', () => {
    const writeModel = emptyWriteModel()
    expect(writeModel.blocks.size).toBe(0)
    expect(writeModel.follows.size).toBe(0)
    expect(writeModel.causedBy.size).toBe(0)
  })

  it('emptySnapshot has no blocks, empty topology, and position -1', () => {
    const snapshot = emptySnapshot()
    expect(snapshot.blocks.size).toBe(0)
    expect(snapshot.follows).toEqual([])
    expect(snapshot.causedBy).toEqual([])
    expect(snapshot.position).toBe(-1)
  })

  it('each empty factory returns a fresh instance', () => {
    expect(emptyWriteModel()).not.toBe(emptyWriteModel())
    expect(emptyWriteModel().blocks).not.toBe(emptyWriteModel().blocks)
    expect(emptySnapshot()).not.toBe(emptySnapshot())
  })

  it('the write model carries only kind and withdrawn — not label, placement, or provenance', () => {
    const writeBlock: WriteBlock = { kind: 'domain-event', withdrawn: false }
    const snapshotBlock: SnapshotBlock = {
      kind: 'domain-event',
      label: 'order placed',
      withdrawn: false,
      placement: 'backlog',
      pivotal: false,
      provenance: { accepter: { name: 'Dana' } },
    }
    expect(writeBlock).not.toHaveProperty('label')
    expect(writeBlock).not.toHaveProperty('placement')
    expect(snapshotBlock.label).toBe('order placed')
    expect(snapshotBlock.placement).toBe('backlog')
  })

  it('follows edges are event-to-event; causedBy edges are cause-to-effect', () => {
    const snapshot = emptySnapshot()
    const follows = [
      ...snapshot.follows,
      { predecessor: bid('e1'), successor: bid('e2') },
    ]
    const causedBy = [
      ...snapshot.causedBy,
      { cause: bid('a1'), effect: bid('e1') },
    ]
    expect(follows[0]).toEqual({ predecessor: bid('e1'), successor: bid('e2') })
    expect(causedBy[0]).toEqual({ cause: bid('a1'), effect: bid('e1') })
  })

  it('all four Building Block kinds are representable in the discriminated union', () => {
    const kinds: BuildingBlockKind[] = ['domain-event', 'actor', 'system', 'hot-spot']
    for (const kind of kinds) {
      const block: SnapshotBlock = {
        kind,
        label: 'x',
        withdrawn: false,
        placement: 'backlog',
        pivotal: false,
        provenance: { accepter: { name: 'Dana' } },
      }
      expect(block.kind).toBe(kind)
    }
  })
})
