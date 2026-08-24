import { describe, expect, it } from 'vitest'
import { canReplay, OP_SCHEMA_VERSION, REPLAYABLE_OP_SCHEMA_VERSIONS } from './schema-version.ts'

describe('op schema version', () => {
  it('replays operations written by this build', () => {
    expect(canReplay(OP_SCHEMA_VERSION)).toBe(true)
  })

  it('refuses a version from a future build', () => {
    expect(canReplay(OP_SCHEMA_VERSION + 1)).toBe(false)
  })

  it('never drops a version it once supported', () => {
    for (let v = 1; v <= OP_SCHEMA_VERSION; v++) {
      expect(REPLAYABLE_OP_SCHEMA_VERSIONS).toContain(v)
    }
  })
})
