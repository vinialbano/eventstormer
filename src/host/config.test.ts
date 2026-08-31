import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { isOk } from '~/plumbing/result.ts'
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

  it('warns and falls back to the default when FACILITATOR_MODEL is unsupported', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const config = loadConfig({
      ANTHROPIC_API_KEY: 'sk-test',
      EVENTSTORMER_DB: join(dir, 'e.db'),
      DATA_DIR: dir,
      FACILITATOR_MODEL: 'claude-opus-5',
    })
    expect(config.facilitator).toBeDefined()
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/FACILITATOR_MODEL.*not supported/))
    warn.mockRestore()
  })

  it('accepts a supported FACILITATOR_MODEL without warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const config = loadConfig({
      ANTHROPIC_API_KEY: 'sk-test',
      EVENTSTORMER_DB: join(dir, 'e.db'),
      DATA_DIR: dir,
      FACILITATOR_MODEL: 'claude-haiku-4-5',
    })
    expect(config.facilitator).toBeDefined()
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it('replays facilitator.example.json — the committed scripted-mode example stays valid', async () => {
    const config = loadConfig({
      FACILITATOR_MODE: 'scripted',
      SCRIPTED_FACILITATOR_FILE: resolve('facilitator.example.json'),
      EVENTSTORMER_DB: join(dir, 'e.db'),
      DATA_DIR: dir,
    })

    const opening = await config.facilitator.askOpening({ instructions: '', prompt: '' })
    expect(isOk(opening) && opening.value.scopeStatement.length).toBeGreaterThan(0)

    const turn = await config.facilitator.interpret({ instructions: '', prompt: '' })
    expect(isOk(turn) && turn.value.interpretation[0]?.track).toBe('propose-building-block')
    expect(isOk(turn) && turn.value.nextMove.move).toBe('ask')
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
