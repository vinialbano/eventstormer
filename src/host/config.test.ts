import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { loadConfig } from './config.ts'

let dir: string

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'eventstormer-config-'))
})
afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe('loadConfig (S1-32)', () => {
  it('fails fast with a one-line fix message when ANTHROPIC_API_KEY is unset', () => {
    expect(() => loadConfig({})).toThrow(/ANTHROPIC_API_KEY is not set/)
  })

  it('does not require the key in scripted mode and wires a facilitator + defaults', () => {
    const config = loadConfig({
      FACILITATOR_MODE: 'scripted',
      EVENTSTORMER_DB: join(dir, 'e.db'),
      DATA_DIR: dir,
    })
    expect(config.facilitator).toBeDefined()
    expect(config.inFlight.sessions().size).toBe(0)
    expect(config.interpretationIntervalMs).toBe(750)
  })

  it('honours INTERPRETATION_INTERVAL_MS', () => {
    const config = loadConfig({
      ANTHROPIC_API_KEY: 'sk-test',
      EVENTSTORMER_DB: join(dir, 'e.db'),
      DATA_DIR: dir,
      INTERPRETATION_INTERVAL_MS: '250',
    })
    expect(config.interpretationIntervalMs).toBe(250)
  })
})
