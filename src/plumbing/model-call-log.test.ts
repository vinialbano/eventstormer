import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { logModelCall, type ModelCallEntry } from './model-call-log.ts'

const entry = (over: Partial<ModelCallEntry> = {}): ModelCallEntry => ({
  at: '2026-08-30T12:00:00.000Z',
  model: 'claude-sonnet-5',
  requestMessages: [{ role: 'user', content: 'A member borrowed a book.' }],
  responseText: '{"interpretation":[]}',
  parseResult: 'ok',
  warnings: [],
  usage: { inputTokens: 1200, outputTokens: 40 },
  costEstimateUsd: 0.0028,
  ...over,
})

describe('logModelCall — one JSONL line per call', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'eventstormer-modelcalls-'))
  })

  const rawLines = (at = dir): string[] =>
    readFileSync(join(at, 'model-calls.jsonl'), 'utf8').split('\n').filter(Boolean)
  const entries = (at = dir): ModelCallEntry[] =>
    rawLines(at).map((line) => JSON.parse(line) as ModelCallEntry)

  it('appends exactly one valid JSON line that round-trips the entry', () => {
    const e = entry()
    logModelCall(dir, e)
    expect(rawLines()).toHaveLength(1)
    expect(entries()[0]).toStrictEqual(e)
  })

  it('appends — a second call adds a line, keeps the first', () => {
    logModelCall(dir, entry({ responseText: 'first' }))
    logModelCall(dir, entry({ responseText: 'second' }))
    expect(entries().map((e) => e.responseText)).toStrictEqual(['first', 'second'])
  })

  it('records a schema-failure parseResult', () => {
    logModelCall(dir, entry({ parseResult: { error: 'invalid_union at interpretation[0]' } }))
    expect(entries()[0]?.parseResult).toStrictEqual({
      error: 'invalid_union at interpretation[0]',
    })
  })

  it('creates a missing data directory', () => {
    const nested = join(dir, 'a', 'b')
    logModelCall(nested, entry())
    expect(entries(nested)).toHaveLength(1)
  })
})
