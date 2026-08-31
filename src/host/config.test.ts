import { existsSync, mkdtempSync, rmSync } from 'node:fs'
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

describe('loadConfig', () => {
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

  it('creates the data directory and db path when they do not exist yet', () => {
    const nested = join(dir, 'fresh', 'nested')
    const config = loadConfig({
      FACILITATOR_MODE: 'scripted',
      DATA_DIR: nested,
      EVENTSTORMER_DB: join(nested, 'db', 'e.db'),
    })
    expect(config.store).toBeDefined()
    expect(existsSync(nested)).toBe(true)
    expect(existsSync(join(nested, 'db'))).toBe(true)
  })

  it('fails fast when FACILITATOR_MODEL is not a supported model', () => {
    expect(() =>
      loadConfig({
        ANTHROPIC_API_KEY: 'sk-test',
        EVENTSTORMER_DB: join(dir, 'e.db'),
        DATA_DIR: dir,
        FACILITATOR_MODEL: 'claude-opus-5',
      }),
    ).toThrow(/FACILITATOR_MODEL.*not supported/)
  })

  it('accepts a supported FACILITATOR_MODEL', () => {
    const config = loadConfig({
      ANTHROPIC_API_KEY: 'sk-test',
      EVENTSTORMER_DB: join(dir, 'e.db'),
      DATA_DIR: dir,
      FACILITATOR_MODEL: 'claude-haiku-4-5',
    })
    expect(config.facilitator).toBeDefined()
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
