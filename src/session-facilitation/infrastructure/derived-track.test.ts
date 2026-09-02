import { DatabaseSync } from 'node:sqlite'
import { beforeEach, describe, expect, it } from 'vitest'
import { applySessionFacilitationMigrations } from './migrations.ts'
import { markDerivedTrack, readDerivedTrackKeys } from './derived-track.ts'

let db: DatabaseSync

beforeEach(() => {
  db = new DatabaseSync(':memory:')
  applySessionFacilitationMigrations(db)
})

describe('derived-track markers', () => {
  it('readDerivedTrackKeys returns an empty set when no rows exist', () => {
    expect(readDerivedTrackKeys(db)).toEqual(new Set())
  })

  it('markDerivedTrack records a contributionId::trackIndex key', () => {
    markDerivedTrack(db, 'c_1', 0)
    expect(readDerivedTrackKeys(db)).toEqual(new Set(['c_1::0']))
  })

  it('markDerivedTrack is idempotent — a repeat insert is a no-op', () => {
    markDerivedTrack(db, 'c_1', 1)
    markDerivedTrack(db, 'c_1', 1)
    expect(readDerivedTrackKeys(db)).toEqual(new Set(['c_1::1']))
  })

  it('readDerivedTrackKeys returns every distinct contribution and track index', () => {
    markDerivedTrack(db, 'c_1', 0)
    markDerivedTrack(db, 'c_1', 2)
    markDerivedTrack(db, 'c_2', 0)
    expect(readDerivedTrackKeys(db)).toEqual(new Set(['c_1::0', 'c_1::2', 'c_2::0']))
  })
})
