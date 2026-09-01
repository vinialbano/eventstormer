import { describe, expect, it } from 'vitest'
import { err, isErr } from '~/plumbing/result.ts'
import { emptySnapshot, emptyWriteModel, type Rejection } from './model.ts'

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

  it('a Rejection is a valid Result error and carries a systemic classification', () => {
    const rejection: Rejection = {
      kind: 'unknown-target',
      classification: 'systemic',
      target: 'e9',
    }
    const result = err(rejection)

    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.kind).toBe('unknown-target')
      expect(result.error.classification).toBe('systemic')
    }
  })
})
