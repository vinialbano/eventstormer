import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { estimateCost } from '~/plumbing/model-pricing.ts'
import { isErr, isOk } from '~/plumbing/result.ts'
import {
  type AnthropicFacilitatorDeps,
  createAnthropicFacilitator,
  type FacilitatorGenerate,
  type FacilitatorGenerateResult,
} from './anthropic-adapter.ts'
import type { ModelCallEntry } from '~/plumbing/model-call-log.ts'

const VALID_TURN = { interpretation: [], nextMove: { move: 'acknowledge' } }
const VALID_OPENING = { questionText: 'What business are you mapping?', scopeStatement: 'Library lending.' }

const USAGE = { inputTokens: 1_000, outputTokens: 200, cacheReadTokens: 500 }

let dataDir: string
const clock = () => '2026-08-30T12:00:00.000Z'

beforeEach(() => {
  dataDir = mkdtempSync(join(tmpdir(), 'eventstormer-facilitator-'))
})
afterEach(() => {
  rmSync(dataDir, { recursive: true, force: true })
})

const readLog = (): ModelCallEntry[] =>
  readFileSync(join(dataDir, 'model-calls.jsonl'), 'utf8')
    .trim()
    .split('\n')
    .map((l) => JSON.parse(l) as ModelCallEntry)

/** A scripted `generate` — each call consumes the next scripted step. */
type Step = FacilitatorGenerateResult | { throw: unknown }

const scripted = (steps: Step[]): { generate: FacilitatorGenerate; models: string[] } => {
  const models: string[] = []
  let i = 0
  const generate: FacilitatorGenerate = (args) => {
    models.push(args.model)
    const step: Step = steps[Math.min(i, steps.length - 1)] ?? { throw: new Error('no step') }
    i += 1
    if ('throw' in step) return Promise.reject(step.throw instanceof Error ? step.throw : new Error('x'))
    return Promise.resolve(step)
  }
  return { generate, models }
}

const result = (output: unknown, warnings: unknown = []): FacilitatorGenerateResult => ({
  output,
  warnings,
  responseText: JSON.stringify(output),
  usage: USAGE,
})

const depsWith = (generate: FacilitatorGenerate, extra: Partial<AnthropicFacilitatorDeps> = {}) => {
  const slept: number[] = []
  const deps: AnthropicFacilitatorDeps = {
    dataDir,
    clock,
    generate,
    sleep: (ms) => {
      slept.push(ms)
      return Promise.resolve()
    },
    ...extra,
  }
  return { facilitator: createAnthropicFacilitator(deps), slept }
}

describe('anthropic adapter — happy path', () => {
  it('returns the parsed turn and writes one JSONL line with usage + a cost estimate', async () => {
    const { generate, models } = scripted([result(VALID_TURN)])
    const { facilitator } = depsWith(generate)

    const r = await facilitator.interpret({ instructions: 'sys', prompt: 'a member borrowed a book' })

    expect(isOk(r)).toBe(true)
    if (isOk(r)) expect(r.value).toEqual(VALID_TURN)
    expect(models).toEqual(['claude-sonnet-5'])

    const log = readLog()
    expect(log).toHaveLength(1)
    expect(log[0]?.model).toBe('claude-sonnet-5')
    expect(log[0]?.parseResult).toBe('ok')
    expect(log[0]?.usage).toEqual(USAGE)
    expect(log[0]?.costEstimateUsd).toBe(estimateCost('claude-sonnet-5', USAGE))
  })

  it('logs result.warnings verbatim', async () => {
    const warnings = [{ type: 'unsupported', feature: 'temperature' }]
    const { generate } = scripted([result(VALID_TURN, warnings)])
    const { facilitator } = depsWith(generate)

    await facilitator.interpret({ instructions: 'sys', prompt: 'x' })

    expect(readLog()[0]?.warnings).toEqual(warnings)
  })
})

describe('anthropic adapter — the model ladder on provider-down', () => {
  it('walks claude-sonnet-5 → claude-sonnet-5 → claude-haiku-4-5, backing off between rungs', async () => {
    const { generate, models } = scripted([
      { throw: Object.assign(new Error('bad gateway'), { statusCode: 503 }) },
      { throw: Object.assign(new Error('timeout'), { statusCode: 504 }) },
      result(VALID_TURN),
    ])
    const { facilitator, slept } = depsWith(generate)

    const r = await facilitator.interpret({ instructions: 'sys', prompt: 'x' })

    expect(isOk(r)).toBe(true)
    expect(models).toEqual(['claude-sonnet-5', 'claude-sonnet-5', 'claude-haiku-4-5'])
    expect(slept).toEqual([2_000, 4_000])
    expect(readLog()).toHaveLength(3)
  })

  it('treats a 429 rate limit as provider-down, not a terminal schema failure', async () => {
    const { generate, models } = scripted([
      { throw: Object.assign(new Error('rate limited'), { statusCode: 429 }) },
      result(VALID_TURN),
    ])
    const { facilitator } = depsWith(generate)

    const r = await facilitator.interpret({ instructions: 'sys', prompt: 'x' })

    expect(isOk(r)).toBe(true)
    expect(models).toEqual(['claude-sonnet-5', 'claude-sonnet-5'])
  })

  it('still treats a 400 bad request as schema-invalid — one retry, no laddering', async () => {
    const { generate, models } = scripted([
      { throw: Object.assign(new Error('bad request'), { statusCode: 400 }) },
    ])
    const { facilitator } = depsWith(generate)

    const r = await facilitator.interpret({ instructions: 'sys', prompt: 'x' })

    expect(isErr(r)).toBe(true)
    if (isErr(r)) expect(r.error.kind).toBe('schema-invalid')
    expect(models).toEqual(['claude-sonnet-5', 'claude-sonnet-5'])
  })

  it('treats a thrown error with no statusCode (e.g. an attempt-timeout abort) as provider-down', async () => {
    const { generate, models } = scripted([
      { throw: Object.assign(new Error('The operation was aborted due to timeout'), { name: 'TimeoutError' }) },
      result(VALID_TURN),
    ])
    const { facilitator } = depsWith(generate)

    const r = await facilitator.interpret({ instructions: 'sys', prompt: 'x' })

    expect(isOk(r)).toBe(true)
    expect(models).toEqual(['claude-sonnet-5', 'claude-sonnet-5'])
  })

  it('returns provider-down once the whole ladder is exhausted', async () => {
    const { generate, models } = scripted([{ throw: Object.assign(new Error('down'), { statusCode: 500 }) }])
    const { facilitator } = depsWith(generate)

    const r = await facilitator.interpret({ instructions: 'sys', prompt: 'x' })

    expect(isErr(r)).toBe(true)
    if (isErr(r)) expect(r.error).toEqual({ kind: 'provider-down' })
    expect(models).toEqual(['claude-sonnet-5', 'claude-sonnet-5', 'claude-haiku-4-5'])
  })
})

describe('anthropic adapter — FACILITATOR_MODEL primary', () => {
  it('uses the given model for the first two rungs, keeping claude-haiku-4-5 as the fallback', async () => {
    const { generate, models } = scripted([
      { throw: Object.assign(new Error('down'), { statusCode: 503 }) },
      { throw: Object.assign(new Error('down'), { statusCode: 503 }) },
      result(VALID_TURN),
    ])
    const { facilitator } = depsWith(generate, { model: 'claude-haiku-4-5' })

    await facilitator.interpret({ instructions: 'sys', prompt: 'x' })

    expect(models).toEqual(['claude-haiku-4-5', 'claude-haiku-4-5', 'claude-haiku-4-5'])
  })

  it('defaults the primary to claude-sonnet-5 when no model is given', async () => {
    const { generate, models } = scripted([result(VALID_TURN)])
    const { facilitator } = depsWith(generate)

    await facilitator.interpret({ instructions: 'sys', prompt: 'x' })

    expect(models).toEqual(['claude-sonnet-5'])
  })
})

describe('anthropic adapter — schema-invalid: one retry total, then terminal', () => {
  it('retries once with the error fed back, then returns schema-invalid — never laddering', async () => {
    const { generate, models } = scripted([result({ not: 'a turn' })])
    const { facilitator } = depsWith(generate)

    const r = await facilitator.interpret({ instructions: 'sys', prompt: 'x' })

    expect(isErr(r)).toBe(true)
    if (isErr(r)) expect(r.error.kind).toBe('schema-invalid')
    expect(models).toEqual(['claude-sonnet-5', 'claude-sonnet-5'])
    expect(readLog()).toHaveLength(2)
    expect(readLog()[0]?.parseResult).not.toBe('ok')
  })

  it('succeeds when the single retry produces a valid turn', async () => {
    const { generate, models } = scripted([result({ bad: true }), result(VALID_TURN)])
    const { facilitator } = depsWith(generate)

    const r = await facilitator.interpret({ instructions: 'sys', prompt: 'x' })

    expect(isOk(r)).toBe(true)
    expect(models).toEqual(['claude-sonnet-5', 'claude-sonnet-5'])
  })
})

describe('anthropic adapter — askOpening', () => {
  it('parses the opening question + proposed scope statement', async () => {
    const { generate } = scripted([result(VALID_OPENING)])
    const { facilitator } = depsWith(generate)

    const r = await facilitator.askOpening({ instructions: 'sys', prompt: 'new session' })

    expect(isOk(r)).toBe(true)
    if (isOk(r)) expect(r.value).toEqual(VALID_OPENING)
  })
})
