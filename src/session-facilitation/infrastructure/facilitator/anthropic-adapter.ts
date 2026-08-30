import { OpenTelemetry } from '@ai-sdk/otel'
import { generateText, NoObjectGeneratedError, Output, registerTelemetry } from 'ai'
import type { ZodType } from 'zod'
import type { Clock } from '~/plumbing/clock.ts'
import { logModelCall } from '~/plumbing/model-call-log.ts'
import { estimateCost, type ModelName, type TokenUsage } from '~/plumbing/model-pricing.ts'
import { err, ok, type Result } from '~/plumbing/result.ts'
import type { Facilitator, FacilitatorFailure, FacilitatorInput } from './port.ts'
import { FacilitationTurnSchema, OpeningQuestionSchema } from './turn-schema.ts'

/**
 * The Anthropic adapter for the `Facilitator` port.
 *
 * - `generateText` + `Output.object`, `structuredOutputMode: 'outputFormat'`,
 *   `effort: 'low'`, no `temperature` (Sonnet 5 strips it — docs/ai-harness-gotchas.md).
 * - Model ladder: `claude-sonnet-5` → backoff → `claude-sonnet-5` → backoff →
 *   `claude-haiku-4-5`. A `provider-down` step (5xx / timeout / transport) walks
 *   to the next rung; the ladder exhausting returns `provider-down`.
 * - **One schema-retry total** across the whole ladder (not per rung) with the
 *   validation error fed back; a second schema failure returns `schema-invalid`.
 * - One `model-call-log` JSONL line per call, carrying `result.warnings`.
 *
 * `generate` and `sleep` are injected seams — every test mocks `generate` at the
 * `ai` boundary, so no test makes a real HTTP call (S1-30).
 */

interface FacilitatorGenerateArgs {
  model: ModelName
  schema: ZodType
  instructions: string
  prompt: string
}

export interface FacilitatorGenerateResult {
  output: unknown
  warnings: unknown
  responseText: string
  usage: TokenUsage
}

export type FacilitatorGenerate = (args: FacilitatorGenerateArgs) => Promise<FacilitatorGenerateResult>

interface LadderRung {
  model: ModelName
  backoffMs: number
}

const DEFAULT_LADDER: readonly LadderRung[] = [
  { model: 'claude-sonnet-5', backoffMs: 0 },
  { model: 'claude-sonnet-5', backoffMs: 2_000 },
  { model: 'claude-haiku-4-5', backoffMs: 4_000 },
]

export interface AnthropicFacilitatorDeps {
  dataDir: string
  clock: Clock
  generate?: FacilitatorGenerate
  sleep?: (ms: number) => Promise<void>
  ladder?: readonly LadderRung[]
}

let telemetryRegistered = false
const ensureTelemetry = (): void => {
  if (telemetryRegistered) return
  registerTelemetry(new OpenTelemetry())
  telemetryRegistered = true
}

const defaultGenerate: FacilitatorGenerate = async ({ model, schema, instructions, prompt }) => {
  ensureTelemetry()
  const { anthropic } = await import('@ai-sdk/anthropic')
  const result = await generateText({
    model: anthropic(model),
    output: Output.object({ schema }),
    providerOptions: { anthropic: { structuredOutputMode: 'outputFormat', effort: 'low' } },
    instructions,
    prompt,
  })
  const details = result.usage.inputTokenDetails
  return {
    output: result.output,
    warnings: result.warnings,
    responseText: JSON.stringify(result.output),
    usage: {
      inputTokens: result.usage.inputTokens ?? 0,
      outputTokens: result.usage.outputTokens ?? 0,
      ...(details.cacheReadTokens === undefined ? {} : { cacheReadTokens: details.cacheReadTokens }),
    },
  }
}

const classifyThrown = (e: unknown): FacilitatorFailure['kind'] => {
  if (NoObjectGeneratedError.isInstance(e)) return 'schema-invalid'
  const status = (e as { statusCode?: unknown }).statusCode
  if (typeof status === 'number' && status >= 400 && status < 500) return 'schema-invalid'
  return 'provider-down'
}

const messageOf = (e: unknown): string =>
  e instanceof Error ? e.message : typeof e === 'string' ? e : JSON.stringify(e)

type StepOutcome<T> =
  | { ok: true; value: T }
  | { ok: false; kind: 'provider-down' }
  | { ok: false; kind: 'schema-invalid'; detail: string }

export const createAnthropicFacilitator = (deps: AnthropicFacilitatorDeps): Facilitator => {
  const generate = deps.generate ?? defaultGenerate
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)))
  const ladder = deps.ladder ?? DEFAULT_LADDER

  const runStep = async <T>(
    model: ModelName,
    schema: ZodType<T>,
    instructions: string,
    prompt: string,
  ): Promise<StepOutcome<T>> => {
    let raw: FacilitatorGenerateResult
    try {
      raw = await generate({ model, schema, instructions, prompt })
    } catch (e) {
      const kind = classifyThrown(e)
      logModelCall(deps.dataDir, {
        at: deps.clock(),
        model,
        requestMessages: { instructions, prompt },
        responseText: '',
        parseResult: { error: messageOf(e) },
        warnings: undefined,
        usage: { inputTokens: 0, outputTokens: 0 },
        costEstimateUsd: 0,
      })
      return kind === 'schema-invalid'
        ? { ok: false, kind, detail: messageOf(e) }
        : { ok: false, kind }
    }

    const parsed = schema.safeParse(raw.output)
    const detail = parsed.success
      ? ''
      : parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
    logModelCall(deps.dataDir, {
      at: deps.clock(),
      model,
      requestMessages: { instructions, prompt },
      responseText: raw.responseText,
      parseResult: parsed.success ? 'ok' : { error: detail },
      warnings: raw.warnings,
      usage: raw.usage,
      costEstimateUsd: estimateCost(model, raw.usage),
    })
    return parsed.success
      ? { ok: true, value: parsed.data }
      : { ok: false, kind: 'schema-invalid', detail }
  }

  const call = async <T>(
    schema: ZodType<T>,
    input: FacilitatorInput,
  ): Promise<Result<T, FacilitatorFailure>> => {
    let schemaRetried = false

    for (const rung of ladder) {
      if (rung.backoffMs > 0) await sleep(rung.backoffMs)

      const attempt = await runStep(rung.model, schema, input.instructions, input.prompt)
      if (attempt.ok) return ok(attempt.value)
      if (attempt.kind === 'provider-down') continue

      if (schemaRetried) return err({ kind: 'schema-invalid', detail: attempt.detail })
      schemaRetried = true
      const retryPrompt = `${input.prompt}\n\n---\nYour previous response did not match the required schema:\n${attempt.detail}\nReturn only valid JSON matching the schema.`
      const retry = await runStep(rung.model, schema, input.instructions, retryPrompt)
      if (retry.ok) return ok(retry.value)
      if (retry.kind === 'schema-invalid') return err({ kind: 'schema-invalid', detail: retry.detail })
      // retry hit provider-down — walk to the next ladder rung
    }

    return err({ kind: 'provider-down' })
  }

  return {
    interpret: (input) => call(FacilitationTurnSchema, input),
    askOpening: (input) => call(OpeningQuestionSchema, input),
  }
}
