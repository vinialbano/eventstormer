import { describe, expect, it } from 'vitest'
import { systemClock, type Clock } from './clock.ts'

const ISO_8601_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/

describe('Clock', () => {
  it('systemClock returns the current time as an ISO-8601 UTC string', () => {
    const before = Date.now()
    const stamp = systemClock()
    const after = Date.now()

    expect(stamp).toMatch(ISO_8601_UTC)
    expect(Date.parse(stamp)).toBeGreaterThanOrEqual(before)
    expect(Date.parse(stamp)).toBeLessThanOrEqual(after)
  })

  it('a fixed clock is substitutable and returns its constant', () => {
    const fixed: Clock = () => '2020-01-01T00:00:00.000Z'

    const read = (clock: Clock): string => clock()

    expect(read(fixed)).toBe('2020-01-01T00:00:00.000Z')
    expect(read(fixed)).toBe('2020-01-01T00:00:00.000Z')
  })
})
