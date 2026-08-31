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
  let directory: string

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'eventstormer-modelcalls-'))
  })

  const rawLines = (at = directory): string[] =>
    readFileSync(join(at, 'model-calls.jsonl'), 'utf8').split('\n').filter(Boolean)
  const entries = (at = directory): ModelCallEntry[] =>
    rawLines(at).map((line) => JSON.parse(line) as ModelCallEntry)

  it('appends exactly one valid JSON line that round-trips the entry', () => {
    const call = entry()
    logModelCall(directory, call)
    expect(rawLines()).toHaveLength(1)
    expect(entries()[0]).toStrictEqual(call)
  })

  it('appends — a second call adds a line, keeps the first', () => {
    logModelCall(directory, entry({ responseText: 'first' }))
    logModelCall(directory, entry({ responseText: 'second' }))
    expect(entries().map((call) => call.responseText)).toStrictEqual(['first', 'second'])
  })

  it('records a schema-failure parseResult', () => {
    logModelCall(directory, entry({ parseResult: { error: 'invalid_union at interpretation[0]' } }))
    expect(entries()[0]?.parseResult).toStrictEqual({
      error: 'invalid_union at interpretation[0]',
    })
  })

  it('creates a missing data directory', () => {
    const nested = join(directory, 'a', 'b')
    logModelCall(nested, entry())
    expect(entries(nested)).toHaveLength(1)
  })
})
